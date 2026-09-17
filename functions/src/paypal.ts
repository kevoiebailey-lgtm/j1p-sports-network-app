import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

const paypalClientId = defineSecret("PAYPAL_CLIENT_ID");
const paypalClientSecret = defineSecret("PAYPAL_CLIENT_SECRET");

/**
 * Retrieve PayPal credentials from process.env with fallback to defineSecret
 */
function getPayPalCredentials() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID ||
    (typeof paypalClientId.value === "function" ? paypalClientId.value() : "");
  const clientSecret =
    process.env.PAYPAL_CLIENT_SECRET ||
    (typeof paypalClientSecret.value === "function" ? paypalClientSecret.value() : "");
  return { clientId, clientSecret };
}

/**
 * Resolve PayPal base URL based on environment
 */
function getPayPalHost(): string {
  const isLive =
    process.env.PAYPAL_MODE === "live" ||
    process.env.PAYPAL_ENV === "live" ||
    (process.env.NODE_ENV === "production" && process.env.PAYPAL_LIVE === "true");
  return isLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

/**
 * Obtain PayPal OAuth2 access token
 */
async function getPayPalAccessToken(clientId: string, clientSecret: string, host: string): Promise<string> {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${host}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to authenticate with PayPal (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Extract Firebase Auth token from headers or body
 */
function extractBearerToken(req: any): string | null {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === "string") {
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }
    return authHeader.trim();
  }
  if (typeof req.body?.idToken === "string") return req.body.idToken.trim();
  if (typeof req.body?.token === "string") return req.body.token.trim();
  if (typeof req.body?.authToken === "string") return req.body.authToken.trim();
  return null;
}

/**
 * 1. createPayPalOrder
 * - Accepts galleryId, photoId (optional), and purchaseType ('single_photo' | 'full_pass') in req.body.
 * - Verifies the caller's Firebase ID token using admin.auth().verifyIdToken().
 * - Fetches the authoritative price directly from the Firestore doc galleries/{galleryId}.
 * - Calls PayPal's /v2/checkout/orders endpoint to create an order with intent: "CAPTURE".
 * - Stores { uid, galleryId, photoId, purchaseType } in custom_id.
 * - Returns { orderId }.
 */
export const createPayPalOrder = onRequest(
  {
    cors: true,
    secrets: [paypalClientId, paypalClientSecret],
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    try {
      // 1. Verify caller's Firebase ID token
      const token = extractBearerToken(req);
      if (!token) {
        res.status(401).json({
          error: "Unauthorized: Missing Firebase ID token in Authorization header or body",
        });
        return;
      }

      let decodedToken: admin.auth.DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (authErr: any) {
        console.error("[PayPal] ID Token verification failed:", authErr);
        res.status(401).json({
          error: "Unauthorized: Invalid Firebase ID token",
          details: authErr.message || String(authErr),
        });
        return;
      }

      const uid = decodedToken.uid;
      if (!uid) {
        res.status(401).json({ error: "Unauthorized: User UID could not be determined" });
        return;
      }

      // 2. Parse and validate request parameters
      const { galleryId, photoId, purchaseType } = req.body || {};

      if (!galleryId || typeof galleryId !== "string") {
        res.status(400).json({ error: "Missing required string parameter: galleryId" });
        return;
      }

      if (!purchaseType || (purchaseType !== "single_photo" && purchaseType !== "full_pass")) {
        res.status(400).json({
          error: "Invalid or missing purchaseType. Must be either 'single_photo' or 'full_pass'",
        });
        return;
      }

      if (purchaseType === "single_photo" && !photoId) {
        res.status(400).json({
          error: "Missing required parameter: photoId is required when purchaseType is 'single_photo'",
        });
        return;
      }

      // 3. Fetch authoritative price directly from Firestore doc galleries/{galleryId}
      const galleryRef = db.collection("galleries").doc(galleryId);
      const gallerySnap = await galleryRef.get();

      let galleryData: any = null;
      if (gallerySnap.exists) {
        galleryData = gallerySnap.data();
      } else {
        // Fallback to albums/{galleryId} if gallery is archived or legacy
        const albumSnap = await db.collection("albums").doc(galleryId).get();
        if (albumSnap.exists) {
          galleryData = albumSnap.data();
        }
      }

      if (!galleryData) {
        res.status(404).json({ error: `Gallery document not found for ID: ${galleryId}` });
        return;
      }

      let authoritativePrice = 0;

      if (purchaseType === "full_pass") {
        if (typeof galleryData.fullAlbumPrice === "number" && galleryData.fullAlbumPrice > 0) {
          authoritativePrice = galleryData.fullAlbumPrice;
        } else if (typeof galleryData.bundlePrice === "number" && galleryData.bundlePrice > 0) {
          authoritativePrice = galleryData.bundlePrice;
        } else if (typeof galleryData.fullPassPrice === "number" && galleryData.fullPassPrice > 0) {
          authoritativePrice = galleryData.fullPassPrice;
        } else if (typeof galleryData.price === "number" && galleryData.price > 0) {
          authoritativePrice = galleryData.price;
        } else {
          authoritativePrice = 45.0; // Fallback default for full event digital pass
        }
      } else {
        // purchaseType === 'single_photo'
        if (typeof galleryData.singlePrice === "number" && galleryData.singlePrice > 0) {
          authoritativePrice = galleryData.singlePrice;
        } else if (typeof galleryData.singlePhotoPrice === "number" && galleryData.singlePhotoPrice > 0) {
          authoritativePrice = galleryData.singlePhotoPrice;
        } else if (typeof galleryData.photoPrice === "number" && galleryData.photoPrice > 0) {
          authoritativePrice = galleryData.photoPrice;
        } else if (typeof galleryData.price === "number" && galleryData.price > 0) {
          authoritativePrice = galleryData.price;
        } else {
          authoritativePrice = 10.0; // Fallback default for single photo download
        }

        // Check if individual photo has custom price set
        if (photoId) {
          if (Array.isArray(galleryData.photos)) {
            const matchedPhoto = galleryData.photos.find(
              (p: any) => p && (p.id === photoId || p.photoId === photoId)
            );
            if (matchedPhoto && typeof matchedPhoto.price === "number" && matchedPhoto.price > 0) {
              authoritativePrice = matchedPhoto.price;
            }
          }

          try {
            const subPhotoDoc = await galleryRef.collection("photos").doc(String(photoId)).get();
            if (subPhotoDoc.exists) {
              const subData = subPhotoDoc.data();
              if (subData && typeof subData.price === "number" && subData.price > 0) {
                authoritativePrice = subData.price;
              }
            }
          } catch (_) {}
        }
      }

      // 4. Retrieve PayPal credentials and call PayPal v2 checkout orders endpoint
      const { clientId, clientSecret } = getPayPalCredentials();
      if (!clientId || !clientSecret) {
        console.error("[PayPal] Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
        res.status(500).json({ error: "PayPal credentials not configured on server" });
        return;
      }

      const host = getPayPalHost();
      const accessToken = await getPayPalAccessToken(clientId, clientSecret, host);

      // Store { uid, galleryId, photoId, purchaseType } in custom_id
      const customPayload = {
        uid,
        galleryId,
        photoId: photoId ? String(photoId) : null,
        purchaseType,
      };
      const customId = JSON.stringify(customPayload);

      const formattedAmount = authoritativePrice.toFixed(2);
      const itemTitle =
        purchaseType === "full_pass"
          ? `Full Event Pass - Gallery ${galleryData.title || galleryId}`
          : `Single Photo Download - ${photoId || galleryId}`;

      const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: `j1p_${galleryId}_${photoId || "pass"}_${Date.now()}`,
            description: itemTitle.slice(0, 127),
            custom_id: customId,
            amount: {
              currency_code: "USD",
              value: formattedAmount,
            },
          },
        ],
        application_context: {
          brand_name: "Just1Play Sports",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
        },
      };

      const orderRes = await fetch(`${host}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const errorText = await orderRes.text();
        console.error("[PayPal] Order creation error:", orderRes.status, errorText);
        res.status(orderRes.status).json({
          error: "Failed to create PayPal order",
          details: errorText,
        });
        return;
      }

      const orderData = (await orderRes.json()) as { id: string; status?: string };
      const orderId = orderData.id;

      // Track order in Firestore root orders collection
      await db.collection("orders").doc(orderId).set(
        {
          id: orderId,
          orderId,
          buyerUid: uid,
          galleryId,
          photoId: photoId || null,
          purchaseType,
          amount: authoritativePrice,
          currency: "USD",
          itemTitle,
          status: "PENDING",
          paymentProcessor: "paypal",
          customId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Return { orderId }
      res.status(200).json({ orderId });
    } catch (err: any) {
      console.error("[PayPal] Error in createPayPalOrder:", err);
      res.status(500).json({
        error: "Internal Server Error in createPayPalOrder",
        details: err.message || String(err),
      });
    }
  }
);

/**
 * 2. capturePayPalOrder
 * - Accepts { orderId } in req.body.
 * - Calls PayPal's /v2/checkout/orders/{orderId}/capture endpoint.
 * - Once COMPLETED, parses custom_id.
 * - If purchaseType === 'full_pass', writes an unlock doc to users/{uid}/purchases/album_{galleryId}.
 * - If purchaseType === 'single_photo', writes an unlock doc to users/{uid}/purchased_photos/{photoId}
 *   and appends the uid to photoDoc.purchasedUserIds using FieldValue.arrayUnion.
 * - Creates an audit record in the root orders collection.
 * - Uses PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET from process.env.
 */
export const capturePayPalOrder = onRequest(
  {
    cors: true,
    secrets: [paypalClientId, paypalClientSecret],
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    try {
      // 1. Accept { orderId } in req.body
      const { orderId: bodyOrderId, orderID } = req.body || {};
      const orderId = bodyOrderId || orderID;

      if (!orderId || typeof orderId !== "string") {
        res.status(400).json({ error: "Missing required string parameter: orderId in req.body" });
        return;
      }

      // 2. Retrieve PayPal credentials
      const { clientId, clientSecret } = getPayPalCredentials();
      if (!clientId || !clientSecret) {
        console.error("[PayPal] Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
        res.status(500).json({ error: "PayPal credentials not configured on server" });
        return;
      }

      const host = getPayPalHost();
      const accessToken = await getPayPalAccessToken(clientId, clientSecret, host);

      // 3. Call PayPal's /v2/checkout/orders/{orderId}/capture endpoint
      let captureData: any = null;
      const captureRes = await fetch(`${host}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (captureRes.ok) {
        captureData = await captureRes.json();
      } else {
        // If order was already captured or requires lookup, inspect order status via GET
        const getOrderRes = await fetch(`${host}/v2/checkout/orders/${orderId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (getOrderRes.ok) {
          const fetchedOrder = await getOrderRes.json();
          if (fetchedOrder.status === "COMPLETED") {
            captureData = fetchedOrder;
          } else {
            const errText = await captureRes.text();
            res.status(captureRes.status).json({
              error: "PayPal order capture failed",
              details: errText,
            });
            return;
          }
        } else {
          const errText = await captureRes.text();
          res.status(captureRes.status).json({
            error: "PayPal order capture failed",
            details: errText,
          });
          return;
        }
      }

      // 4. Once COMPLETED, parse custom_id
      if (captureData.status !== "COMPLETED") {
        res.status(400).json({
          error: `PayPal order status is ${captureData.status}, expected COMPLETED`,
        });
        return;
      }

      const purchaseUnit = captureData.purchase_units?.[0];
      const capturePayment = purchaseUnit?.payments?.captures?.[0];
      const captureId = capturePayment?.id || captureData.id || orderId;
      const amountPaid = parseFloat(
        capturePayment?.amount?.value || purchaseUnit?.amount?.value || "0"
      );

      let customIdRaw: string | undefined =
        capturePayment?.custom_id || purchaseUnit?.custom_id;

      // Fallback: check stored order record in Firestore if not populated in capture payload
      if (!customIdRaw) {
        const storedOrderSnap = await db.collection("orders").doc(orderId).get();
        if (storedOrderSnap.exists) {
          customIdRaw = storedOrderSnap.data()?.customId;
        }
      }

      if (!customIdRaw) {
        res.status(400).json({
          error: "custom_id not found in order capture payload or database records",
        });
        return;
      }

      let parsedCustom: {
        uid?: string;
        galleryId?: string;
        photoId?: string;
        purchaseType?: string;
      } = {};

      try {
        parsedCustom = JSON.parse(customIdRaw);
      } catch (e) {
        res.status(400).json({
          error: "Failed to parse custom_id as JSON",
          custom_id: customIdRaw,
        });
        return;
      }

      const { uid, galleryId, photoId, purchaseType } = parsedCustom;

      if (!uid || !galleryId || !purchaseType) {
        res.status(400).json({
          error: "Missing required fields in custom_id (uid, galleryId, purchaseType)",
          parsedCustom,
        });
        return;
      }

      const batch = db.batch();

      // 5. If purchaseType === 'full_pass', write an unlock doc to users/{uid}/purchases/album_{galleryId}
      if (purchaseType === "full_pass") {
        const albumPurchaseRef = db
          .collection("users")
          .doc(uid)
          .collection("purchases")
          .doc(`album_${galleryId}`);

        batch.set(
          albumPurchaseRef,
          {
            id: `album_${galleryId}`,
            albumId: galleryId,
            galleryId,
            userId: uid,
            uid,
            purchaseType: "full_pass",
            type: "gallery_album",
            orderId,
            captureId,
            amount: amountPaid,
            currency: "USD",
            status: "COMPLETED",
            unlockedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // Parity write to users/{uid}/purchased_albums/{galleryId}
        const userAlbumRef = db
          .collection("users")
          .doc(uid)
          .collection("purchased_albums")
          .doc(galleryId);

        batch.set(
          userAlbumRef,
          {
            id: galleryId,
            albumId: galleryId,
            galleryId,
            userId: uid,
            uid,
            orderId,
            captureId,
            amount: amountPaid,
            status: "COMPLETED",
            unlockedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 6. If purchaseType === 'single_photo', write an unlock doc to users/{uid}/purchased_photos/{photoId}
      if (purchaseType === "single_photo") {
        const targetPhotoId = String(photoId || "photo");
        const userPhotoRef = db
          .collection("users")
          .doc(uid)
          .collection("purchased_photos")
          .doc(targetPhotoId);

        batch.set(
          userPhotoRef,
          {
            id: targetPhotoId,
            photoId: targetPhotoId,
            galleryId,
            userId: uid,
            uid,
            purchaseType: "single_photo",
            type: "gallery_photo",
            orderId,
            captureId,
            amount: amountPaid,
            currency: "USD",
            status: "COMPLETED",
            unlockedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 7. Create an audit record in the root orders collection
      const orderDocRef = db.collection("orders").doc(orderId);
      batch.set(
        orderDocRef,
        {
          id: orderId,
          orderId,
          buyerUid: uid,
          galleryId,
          photoId: photoId || null,
          purchaseType,
          amount: amountPaid,
          currency: "USD",
          itemTitle:
            purchaseType === "full_pass"
              ? `Full Event Pass - Gallery ${galleryId}`
              : `Single Photo Download - ${photoId || galleryId}`,
          status: "COMPLETED",
          paymentProcessor: "paypal",
          captureId,
          customId: customIdRaw,
          completedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();

      // 8. If purchaseType === 'single_photo', append the uid to photoDoc.purchasedUserIds using FieldValue.arrayUnion
      if (purchaseType === "single_photo" && photoId) {
        const targetPhotoId = String(photoId);

        // A. Check subcollection galleries/{galleryId}/photos/{targetPhotoId}
        try {
          const gPhotoRef = db
            .collection("galleries")
            .doc(galleryId)
            .collection("photos")
            .doc(targetPhotoId);
          const gPhotoSnap = await gPhotoRef.get();
          if (gPhotoSnap.exists) {
            await gPhotoRef.update({
              purchasedUserIds: FieldValue.arrayUnion(uid),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn(`[PayPal] Notice: galleries/${galleryId}/photos/${targetPhotoId} update:`, err);
        }

        // B. Check subcollection albums/{galleryId}/photos/{targetPhotoId}
        try {
          const aPhotoRef = db
            .collection("albums")
            .doc(galleryId)
            .collection("photos")
            .doc(targetPhotoId);
          const aPhotoSnap = await aPhotoRef.get();
          if (aPhotoSnap.exists) {
            await aPhotoRef.update({
              purchasedUserIds: FieldValue.arrayUnion(uid),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn(`[PayPal] Notice: albums/${galleryId}/photos/${targetPhotoId} update:`, err);
        }

        // C. Check root collection photos/{targetPhotoId}
        try {
          const rootPhotoRef = db.collection("photos").doc(targetPhotoId);
          const rootPhotoSnap = await rootPhotoRef.get();
          if (rootPhotoSnap.exists) {
            await rootPhotoRef.update({
              purchasedUserIds: FieldValue.arrayUnion(uid),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn(`[PayPal] Notice: photos/${targetPhotoId} update:`, err);
        }

        // D. Check root collection media/{targetPhotoId}
        try {
          const rootMediaRef = db.collection("media").doc(targetPhotoId);
          const rootMediaSnap = await rootMediaRef.get();
          if (rootMediaSnap.exists) {
            await rootMediaRef.update({
              purchasedUserIds: FieldValue.arrayUnion(uid),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn(`[PayPal] Notice: media/${targetPhotoId} update:`, err);
        }

        // E. Check embedded photos array on galleries/{galleryId} doc
        try {
          const gDocRef = db.collection("galleries").doc(galleryId);
          const gDocSnap = await gDocRef.get();
          if (gDocSnap.exists) {
            const gData = gDocSnap.data();
            if (Array.isArray(gData?.photos)) {
              let arrayModified = false;
              const updatedPhotos = gData.photos.map((p: any) => {
                if (p && (p.id === targetPhotoId || p.photoId === targetPhotoId)) {
                  arrayModified = true;
                  const currentUids = Array.isArray(p.purchasedUserIds) ? p.purchasedUserIds : [];
                  if (!currentUids.includes(uid)) {
                    return { ...p, purchasedUserIds: [...currentUids, uid] };
                  }
                }
                return p;
              });
              if (arrayModified) {
                await gDocRef.update({
                  photos: updatedPhotos,
                  updatedAt: FieldValue.serverTimestamp(),
                });
              }
            }
          }
        } catch (err) {
          console.warn(`[PayPal] Notice: galleries/${galleryId} embedded photos update:`, err);
        }
      }

      res.status(200).json({
        success: true,
        orderId,
        captureId,
        status: "COMPLETED",
        purchaseType,
        galleryId,
        photoId: photoId || null,
        uid,
      });
    } catch (err: any) {
      console.error("[PayPal] Error in capturePayPalOrder:", err);
      res.status(500).json({
        error: "Internal Server Error in capturePayPalOrder",
        details: err.message || String(err),
      });
    }
  }
);
