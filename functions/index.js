const functions = require('firebase-functions');
const admin = require('firebase-admin');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Helper: Configure PayPal Environment
 */
function getPayPalClient() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID ||
    (functions.config().paypal && functions.config().paypal.client_id) ||
    '';
  const clientSecret =
    process.env.PAYPAL_CLIENT_SECRET ||
    (functions.config().paypal && functions.config().paypal.client_secret) ||
    '';
  const environmentMode = (
    process.env.PAYPAL_MODE ||
    (functions.config().paypal && functions.config().paypal.mode) ||
    'sandbox'
  ).toLowerCase();

  if (!clientId || !clientSecret) {
    console.warn('[PayPal SDK] Notice: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not set. Using sandbox fallback.');
  }

  let environment;
  if (environmentMode === 'live' || environmentMode === 'production') {
    environment = new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  } else {
    environment = new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
  }

  return new checkoutNodeJssdk.core.PayPalHttpClient(environment);
}

// ----------------------------------------------------
// WORKFLOW A: PHOTO DIGITAL DOWNLOAD ($2.00 OR CUSTOM SET PRICE)
// ----------------------------------------------------

/**
 * 1. Create Photo Download Order
 * Supports $2.00 default or custom photographer/director price.
 */
exports.createPhotoDownloadOrder = functions.https.onCall(async (data, context) => {
  const {
    photoId,
    mediaId,
    galleryId,
    photoTitle,
    title,
    price = 2.0,
    amount,
    storageFilePath,
    storagePath,
    eventId,
  } = data || {};

  const targetPhotoId = photoId || mediaId;
  if (!targetPhotoId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing photoId or mediaId.');
  }

  const userId = (context.auth && context.auth.uid) || (data && data.userId) || 'guest';
  const finalPrice = parseFloat(amount || price || 2.0).toFixed(2);
  const mediaTitle = photoTitle || title || `High-Resolution Photo #${targetPhotoId}`;
  const targetStoragePath = storageFilePath || storagePath || '';

  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: `photo_${targetPhotoId}`,
        description: `High-Resolution Photo Download (#${targetPhotoId}): ${mediaTitle}`,
        custom_id: JSON.stringify({
          type: 'photo_download',
          photoId: targetPhotoId,
          galleryId: galleryId || 'main',
          userId,
          storageFilePath: targetStoragePath,
          eventId: eventId || '',
        }),
        amount: {
          currency_code: 'USD',
          value: finalPrice,
        },
      },
    ],
    application_context: {
      brand_name: 'Just1Play Media Vault',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
    },
  });

  try {
    const client = getPayPalClient();
    const orderResponse = await client.execute(request);
    const order = orderResponse.result;

    // Record order in Firestore for tracking
    await db.collection('paypal_orders').doc(order.id).set(
      {
        orderId: order.id,
        type: 'photo_download',
        photoId: targetPhotoId,
        mediaId: targetPhotoId,
        galleryId: galleryId || 'main',
        title: mediaTitle,
        storageFilePath: targetStoragePath,
        storagePath: targetStoragePath,
        eventId: eventId || '',
        amount: parseFloat(finalPrice),
        currency: 'USD',
        userId,
        status: order.status || 'CREATED',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      orderId: order.id,
      orderID: order.id,
      success: true,
      status: order.status,
      links: order.links,
      photoId: targetPhotoId,
    };
  } catch (err) {
    console.error('Error creating photo order:', err);
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }
    throw new functions.https.HttpsError('internal', err.message || 'Unable to initiate photo checkout.');
  }
});

/**
 * 2. Capture Photo Payment & Return Temporary Signed Download Link
 */
exports.capturePhotoDownloadPayment = functions.https.onCall(async (data, context) => {
  const orderId = (data && (data.orderID || data.orderId)) || '';
  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId is required.');
  }

  const userId = (context.auth && context.auth.uid) || (data && data.userId) || 'guest';
  const { photoId: reqPhotoId, storageFilePath: reqStoragePath, storagePath: altStoragePath } = data || {};

  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const client = getPayPalClient();
    let captureResult;
    try {
      const response = await client.execute(request);
      captureResult = response.result;
    } catch (paypalErr) {
      console.warn('PayPal capture retry or lookup:', paypalErr.message);
      const getRequest = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
      const getResponse = await client.execute(getRequest);
      captureResult = getResponse.result;
    }

    if (captureResult.status === 'COMPLETED') {
      // Lookup stored order metadata
      const orderDoc = await db.collection('paypal_orders').doc(orderId).get();
      const storedOrder = orderDoc.exists ? orderDoc.data() || {} : {};

      const customIdStr =
        captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ||
        captureResult.purchase_units?.[0]?.custom_id ||
        '';
      let customMeta = {};
      if (customIdStr) {
        try {
          customMeta = JSON.parse(customIdStr);
        } catch (_) {}
      }

      const photoId =
        reqPhotoId ||
        storedOrder.photoId ||
        storedOrder.mediaId ||
        customMeta.photoId ||
        `photo_${Date.now()}`;
      const storageFilePath =
        reqStoragePath ||
        altStoragePath ||
        storedOrder.storageFilePath ||
        storedOrder.storagePath ||
        customMeta.storageFilePath ||
        '';
      const amountPaid = parseFloat(
        captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ||
          storedOrder.amount ||
          '2.00'
      );
      const title = storedOrder.title || data.title || `High-Resolution Photo #${photoId}`;

      const batch = db.batch();

      // 1. Record purchase in users/{userId}/purchased_photos/{photoId}
      if (userId && userId !== 'guest') {
        const photoRef = db.collection('users').doc(userId).collection('purchased_photos').doc(String(photoId));
        batch.set(
          photoRef,
          {
            photoId: String(photoId),
            storageFilePath,
            storagePath: storageFilePath,
            title,
            paypalOrderId: orderId,
            amountPaid,
            purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // Also record in purchased_media for multi-vault parity
        const mediaRef = db.collection('users').doc(userId).collection('purchased_media').doc(String(photoId));
        batch.set(
          mediaRef,
          {
            mediaId: String(photoId),
            photoId: String(photoId),
            title,
            storagePath: storageFilePath,
            unlocked: true,
            downloadAllowed: true,
            purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentMethod: 'paypal',
            paypalOrderId: orderId,
            amountPaid,
          },
          { merge: true }
        );

        // In-app Notification
        const notifRef = db.collection('notifications').doc(`paypal_photo_${orderId}`);
        batch.set(
          notifRef,
          {
            recipientUid: userId,
            userId,
            type: 'MEDIA_PURCHASE_UNLOCKED',
            title: '📸 High-Res Photo Download Ready!',
            message: `Your payment for "${title}" succeeded. Your download is ready.`,
            photoId: String(photoId),
            mediaId: String(photoId),
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Update paypal_orders status
      const paypalOrderRef = db.collection('paypal_orders').doc(orderId);
      batch.set(
        paypalOrderRef,
        {
          status: 'COMPLETED',
          amountPaid,
          capturedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();

      // 2. Generate a secure, 15-minute temporary signed download URL
      let signedUrl = '';
      if (storageFilePath) {
        try {
          const bucket = storage.bucket();
          const file = bucket.file(storageFilePath);
          const [generatedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // Valid for 15 minutes
          });
          signedUrl = generatedUrl;
        } catch (signedErr) {
          console.warn('Could not generate signed URL from storage path:', signedErr.message);
          // Fallback to storageFilePath if it is already an HTTPS URL
          if (storageFilePath.startsWith('http')) {
            signedUrl = storageFilePath;
          }
        }
      }

      return {
        success: true,
        downloadUrl: signedUrl || (storageFilePath.startsWith('http') ? storageFilePath : null),
        orderId,
        photoId,
      };
    } else {
      return { success: false, status: captureResult.status };
    }
  } catch (err) {
    console.error('Photo capture error:', err);
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }
    throw new functions.https.HttpsError('internal', err.message || 'Failed capturing photo payment.');
  }
});

// ----------------------------------------------------
// WORKFLOW B: TOURNAMENT REGISTRATION (SPLIT-FEE & MULTI-PARTY)
// ----------------------------------------------------

/**
 * 3. Create Tournament Order with Host Payout & Platform Fee
 */
exports.createTournamentPaymentOrder = functions.https.onCall(async (data, context) => {
  const {
    tournamentId,
    eventId: passedEventId,
    teamId: customTeamId,
    teamName,
    directorPayPalEmail,
    entryFee,
    amount,
    totalFeeDollars,
    divisionId,
    divisionName,
    coachUserId,
    headCoachName,
    headCoachEmail,
  } = data || {};

  const targetTournamentId = tournamentId || passedEventId;
  if (!targetTournamentId || !teamName) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required parameters: tournamentId (or eventId) and teamName.'
    );
  }

  const userId = (context.auth && context.auth.uid) || coachUserId || 'anonymous';
  const totalAmountNum = parseFloat(entryFee || amount || totalFeeDollars || 400.0);
  const totalAmountFormatted = totalAmountNum.toFixed(2);
  const platformFeeFormatted = (totalAmountNum * 0.1).toFixed(2); // 10% platform commission cut
  const teamId = customTeamId || `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Construct Purchase Unit (Multi-party payout if directorPayPalEmail is provided)
  const purchaseUnit = {
    reference_id: `tournament_${targetTournamentId}_team_${teamId}`,
    description: `Tournament Registration Fee: ${teamName}`,
    custom_id: JSON.stringify({
      type: 'tournament_registration',
      tournamentId: targetTournamentId,
      eventId: targetTournamentId,
      teamId,
      teamName,
      divisionId: divisionId || '',
      divisionName: divisionName || divisionId || '',
      directorPayPalEmail: directorPayPalEmail || '',
      coachUserId: userId,
      headCoachName: headCoachName || 'Coach',
      headCoachEmail: headCoachEmail || '',
    }),
    amount: {
      currency_code: 'USD',
      value: totalAmountFormatted,
    },
  };

  // Add Payee & Platform Fee if Tournament Director email provided for instant payout
  if (directorPayPalEmail && directorPayPalEmail.includes('@')) {
    purchaseUnit.payee = {
      email_address: directorPayPalEmail,
    };
    purchaseUnit.payment_instruction = {
      disbursement_mode: 'INSTANT',
      platform_fees: [
        {
          amount: {
            currency_code: 'USD',
            value: platformFeeFormatted,
          },
        },
      ],
    };
  }

  const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [purchaseUnit],
    application_context: {
      brand_name: 'Just1Play Tournaments',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
    },
  });

  try {
    const client = getPayPalClient();
    const orderResponse = await client.execute(request);
    const order = orderResponse.result;

    // Log the created order in Firestore
    await db.collection('paypal_orders').doc(order.id).set(
      {
        orderId: order.id,
        type: 'tournament_registration',
        status: order.status || 'CREATED',
        tournamentId: targetTournamentId,
        eventId: targetTournamentId,
        teamId,
        teamName,
        divisionId: divisionId || '',
        divisionName: divisionName || divisionId || '',
        directorPayPalEmail: directorPayPalEmail || null,
        amount: totalAmountNum,
        platformFee: parseFloat(platformFeeFormatted),
        currency: 'USD',
        coachUserId: userId,
        headCoachName: headCoachName || 'Coach',
        headCoachEmail: headCoachEmail || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      orderId: order.id,
      orderID: order.id,
      success: true,
      status: order.status,
      links: order.links,
      teamId,
    };
  } catch (err) {
    console.error('Tournament order creation error:', err);
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }
    throw new functions.https.HttpsError('internal', err.message || 'Unable to create tournament order.');
  }
});

/**
 * 4. Capture Tournament Payment & Update Brackets / Teams
 */
exports.captureTournamentPayment = functions.https.onCall(async (data, context) => {
  const orderId = (data && (data.orderID || data.orderId)) || '';
  if (!orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId is required.');
  }

  const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const client = getPayPalClient();
    let captureResult;
    try {
      const response = await client.execute(request);
      captureResult = response.result;
    } catch (paypalErr) {
      console.warn('PayPal capture retry/lookup:', paypalErr.message);
      const getRequest = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
      const getResponse = await client.execute(getRequest);
      captureResult = getResponse.result;
    }

    if (captureResult.status === 'COMPLETED') {
      const orderDoc = await db.collection('paypal_orders').doc(orderId).get();
      const storedOrderData = orderDoc.exists ? orderDoc.data() || {} : {};

      const customIdStr =
        captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ||
        captureResult.purchase_units?.[0]?.custom_id ||
        '';
      let customMeta = {};
      if (customIdStr) {
        try {
          customMeta = JSON.parse(customIdStr);
        } catch (_) {}
      }

      const tournamentId =
        data.tournamentId ||
        data.eventId ||
        storedOrderData.tournamentId ||
        storedOrderData.eventId ||
        customMeta.tournamentId ||
        customMeta.eventId ||
        '';
      const teamId =
        data.teamId || storedOrderData.teamId || customMeta.teamId || `team_${Date.now()}`;
      const teamName =
        data.teamName || storedOrderData.teamName || customMeta.teamName || 'Registered Team';
      const divisionId =
        data.divisionId || storedOrderData.divisionId || customMeta.divisionId || '';
      const divisionName =
        data.divisionName || storedOrderData.divisionName || customMeta.divisionName || divisionId;
      const coachUserId =
        data.coachUserId ||
        storedOrderData.coachUserId ||
        customMeta.coachUserId ||
        (context.auth && context.auth.uid) ||
        'anonymous';
      const headCoachName =
        data.headCoachName || storedOrderData.headCoachName || customMeta.headCoachName || 'Head Coach';
      const headCoachEmail =
        data.headCoachEmail || storedOrderData.headCoachEmail || customMeta.headCoachEmail || '';

      const captureId =
        captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id || captureResult.id || orderId;
      const amountPaid = parseFloat(
        captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ||
          storedOrderData.amount ||
          '400.00'
      );

      const crypto = require('crypto');
      const verificationToken = crypto.randomUUID ? crypto.randomUUID() : `token_${Date.now()}`;
      const checkInQrHash = crypto
        .createHash('sha256')
        .update(`${tournamentId}:${teamId}:${verificationToken}`)
        .digest('hex');

      const batch = db.batch();

      // 1. Update paypal_orders
      const paypalOrderRef = db.collection('paypal_orders').doc(orderId);
      batch.set(
        paypalOrderRef,
        {
          status: 'COMPLETED',
          captureId,
          amountPaid,
          capturedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Audit log in paypal_payments
      const paymentLogRef = db.collection('paypal_payments').doc(orderId);
      batch.set(
        paymentLogRef,
        {
          orderId,
          captureId,
          type: 'tournament_registration',
          tournamentId: tournamentId || null,
          eventId: tournamentId || null,
          teamId,
          teamName,
          divisionId,
          divisionName,
          amount: amountPaid,
          currency: 'USD',
          payer: captureResult.payer || null,
          status: 'completed',
          coachUserId,
          headCoachEmail,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Update team entry status in tournaments/{tournamentId}/teams/{teamId}
      const teamPayload = {
        id: teamId,
        teamId,
        name: teamName,
        teamName,
        divisionId,
        divisionName,
        tournamentId: tournamentId || null,
        eventId: tournamentId || null,
        coachUserId,
        headCoachName,
        headCoachEmail,
        paymentStatus: 'PAID',
        registrationStatus: 'Fully Paid',
        paymentMethod: 'paypal',
        paypalOrderId: orderId,
        paypalCaptureId: captureId,
        amountPaid,
        rosterLocked: false,
        verificationToken,
        checkInQrHash,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (tournamentId) {
        const tournamentTeamRef = db.collection('tournaments').doc(tournamentId).collection('teams').doc(teamId);
        batch.set(tournamentTeamRef, teamPayload, { merge: true });

        const eventTeamRef = db.collection('events').doc(tournamentId).collection('teams').doc(teamId);
        batch.set(eventTeamRef, teamPayload, { merge: true });

        const eventRef = db.collection('events').doc(tournamentId);
        batch.set(
          eventRef,
          {
            registeredTeamCount: admin.firestore.FieldValue.increment(1),
            registeredCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      const rootTeamRef = db.collection('teams').doc(teamId);
      batch.set(rootTeamRef, teamPayload, { merge: true });

      // 4. Log to live activity stream
      const activityRef = db.collection('activity').doc();
      batch.set(activityRef, {
        type: 'TOURNAMENT_REGISTRATION',
        title: `🏆 ${teamName} registered for the tournament!`,
        message: `${teamName} has completed registration and payment for ${divisionName || 'division'}.`,
        tournamentId: tournamentId || null,
        eventId: tournamentId || null,
        teamId,
        teamName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 5. In-App Notification to Coach
      if (coachUserId && coachUserId !== 'anonymous') {
        const notifRef = db.collection('notifications').doc(`paypal_reg_${orderId}`);
        batch.set(
          notifRef,
          {
            recipientUid: coachUserId,
            userId: coachUserId,
            recipientEmail: headCoachEmail,
            type: 'TOURNAMENT_REGISTRATION_PAID',
            title: `🎉 Registration Paid: ${teamName}`,
            message: `Your team ${teamName} is confirmed & paid via PayPal for ${divisionName || 'the tournament'}.`,
            tournamentId: tournamentId || null,
            eventId: tournamentId || null,
            teamId,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await batch.commit();

      return {
        success: true,
        orderId,
        captureId,
        status: captureResult.status,
        teamId,
        tournamentId,
        amountPaid,
      };
    } else {
      return { success: false, status: captureResult.status };
    }
  } catch (err) {
    console.error('Tournament capture error:', err);
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }
    throw new functions.https.HttpsError('internal', err.message || 'Payment capture failed.');
  }
});

// ----------------------------------------------------
// REAL-TIME SCOUT ALERTS & WEBHOOK INTEGRATIONS
// ----------------------------------------------------

/**
 * Cloud Function: Send Real-Time Push Notification on Scout Inquiry Creation
 */
exports.onScoutInquiryCreated = functions.firestore
  .document('scout_inquiries/{inquiryId}')
  .onCreate(async (snapshot, context) => {
    const inquiryData = snapshot.data();
    const inquiryId = context.params.inquiryId;

    if (!inquiryData) return null;

    const recipientId = inquiryData.recipientId || inquiryData.athleteId;
    const scoutName = inquiryData.scoutName || inquiryData.senderName || 'A verified scout';
    const organization = inquiryData.organization || inquiryData.school || 'College Athletics';
    const messagePreview = inquiryData.message || inquiryData.notes || 'Sent you an evaluation inquiry.';

    if (!recipientId) return null;

    try {
      const tokensSnapshot = await admin
        .firestore()
        .collection('users')
        .doc(recipientId)
        .collection('fcmTokens')
        .get();

      if (tokensSnapshot.empty) return null;

      const fcmTokens = [];
      tokensSnapshot.forEach((doc) => {
        const tokenData = doc.data();
        if (tokenData && tokenData.token) {
          fcmTokens.push(tokenData.token);
        }
      });

      if (fcmTokens.length === 0) return null;

      const payload = {
        tokens: fcmTokens,
        notification: {
          title: '⚡ New Scout Alert!',
          body: `${scoutName} from ${organization} sent you an inquiry.`,
        },
        data: {
          inquiryId: String(inquiryId),
          scoutName: String(scoutName),
          organization: String(organization),
          message: String(messagePreview).slice(0, 100),
          url: 'https://app.just1play.com/locker-room',
          click_action: '/locker-room',
        },
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            vibrate: [200, 100, 200],
          },
          fcmOptions: {
            link: 'https://app.just1play.com/locker-room',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log(`Delivered ${response.successCount} scout notification(s).`);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (
              error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(fcmTokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          const batch = admin.firestore().batch();
          tokensSnapshot.forEach((doc) => {
            if (failedTokens.includes(doc.data().token)) {
              batch.delete(doc.ref);
            }
          });
          await batch.commit();
        }
      }

      return { success: true, delivered: response.successCount };
    } catch (error) {
      console.error('Error sending FCM push notification:', error);
      return { error: error.message };
    }
  });

/**
 * Helper: Resolve Subscription Tier and Flags
 */
function resolveTierDetails(tierIdInput, amountCents, planNameInput) {
  const normalized = (tierIdInput || '').toLowerCase();
  if (normalized.includes('director') || (amountCents && amountCents >= 25000)) {
    return {
      tierId: 'director',
      planName: planNameInput || 'Tournament Director Enterprise',
      isNCAAPro: false,
      isCoachPass: false,
      isDirectorEnterprise: true,
    };
  }
  if (normalized.includes('recruiter') || normalized.includes('coach') || (amountCents && amountCents >= 9000)) {
    return {
      tierId: 'recruiter',
      planName: planNameInput || 'College Coach All-Access',
      isNCAAPro: false,
      isCoachPass: true,
      isDirectorEnterprise: false,
    };
  }
  return {
    tierId: 'athlete',
    planName: planNameInput || 'Athlete NIL Pro',
    isNCAAPro: true,
    isCoachPass: false,
    isDirectorEnterprise: false,
  };
}

/**
 * Helper: Sync Stripe Subscription with Firestore User Profile
 */
async function syncSubscriptionToUserProfile(stripe, subscription, eventType, hintUserId, hintEmail) {
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const metadata = subscription.metadata || {};

  const firstItem = subscription.items && subscription.items.data && subscription.items.data[0];
  const price = firstItem && firstItem.price;
  const amountCents = (price && price.unit_amount) || 0;
  const interval = price && price.recurring && price.recurring.interval === 'year' ? 'annual' : 'monthly';

  const tierInfo = resolveTierDetails(metadata.tierId, amountCents, metadata.planName);
  const isActive = status === 'active' || status === 'trialing';

  let targetUserId = hintUserId || metadata.userId || metadata.uid || null;
  let targetUserEmail = hintEmail || metadata.email || null;

  if (!targetUserId && customerId) {
    const userQuery = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
    if (!userQuery.empty) {
      targetUserId = userQuery.docs[0].id;
      const data = userQuery.docs[0].data();
      targetUserEmail = targetUserEmail || (data && data.email) || null;
    }
  }

  if (!targetUserId && !targetUserEmail && customerId) {
    try {
      const cust = await stripe.customers.retrieve(customerId);
      if (cust && !cust.deleted && cust.email) {
        targetUserEmail = cust.email;
      }
    } catch (e) {
      console.warn('Customer retrieve note:', e.message);
    }
  }

  if (!targetUserId && targetUserEmail) {
    const emailQuery = await db.collection('users').where('email', '==', targetUserEmail).limit(1).get();
    if (!emailQuery.empty) {
      targetUserId = emailQuery.docs[0].id;
    }
  }

  const currentPeriodStartIso = new Date(subscription.current_period_start * 1000).toISOString();
  const currentPeriodEndIso = new Date(subscription.current_period_end * 1000).toISOString();
  const canceledAtIso = subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null;

  const batch = db.batch();

  if (targetUserId) {
    const userDocRef = db.collection('users').doc(targetUserId);
    batch.set(
      userDocRef,
      {
        subscriptionTier: tierInfo.tierId,
        subscriptionStatus: status,
        subscriptionPlanName: tierInfo.planName,
        subscriptionBillingCycle: interval,
        stripeCustomerId: customerId || null,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: (price && price.id) || null,
        subscriptionCurrentPeriodStart: currentPeriodStartIso,
        subscriptionCurrentPeriodEnd: currentPeriodEndIso,
        subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        subscriptionCanceledAt: canceledAtIso,
        hasActiveSubscription: isActive,
        isNCAAPro: isActive && tierInfo.isNCAAPro,
        isCoachPass: isActive && tierInfo.isCoachPass,
        isDirectorEnterprise: isActive && tierInfo.isDirectorEnterprise,
        subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const userSubRef = userDocRef.collection('subscriptions').doc(subscriptionId);
    batch.set(
      userSubRef,
      {
        subscriptionId,
        status,
        tierId: tierInfo.tierId,
        planName: tierInfo.planName,
        billingCycle: interval,
        amountTotal: amountCents / 100,
        currency: (price && price.currency) || 'usd',
        currentPeriodStart: currentPeriodStartIso,
        currentPeriodEnd: currentPeriodEndIso,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: canceledAtIso,
        lastEvent: eventType,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  const globalSubRef = db.collection('subscriptions').doc(subscriptionId);
  batch.set(
    globalSubRef,
    {
      id: subscriptionId,
      subscriptionId,
      userId: targetUserId || null,
      customerId: customerId || null,
      customerEmail: targetUserEmail || null,
      tierId: tierInfo.tierId,
      planName: tierInfo.planName,
      status,
      billingCycle: interval,
      amountTotal: amountCents / 100,
      currency: (price && price.currency) || 'usd',
      currentPeriodStart: currentPeriodStartIso,
      currentPeriodEnd: currentPeriodEndIso,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt: canceledAtIso,
      livemode: subscription.livemode || false,
      lastEventType: eventType,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (targetUserId) {
    const notifRef = db.collection('notifications').doc(`sub_notif_${subscriptionId}_${Date.now()}`);
    let notifTitle = `🌟 Subscription Active: ${tierInfo.planName}`;
    let notifMessage = `Your ${tierInfo.planName} subscription is now ${status}. Verified badges & all-access features are ready.`;

    if (status === 'canceled') {
      notifTitle = `⚠️ Subscription Canceled: ${tierInfo.planName}`;
      notifMessage = `Your ${tierInfo.planName} subscription has ended. You can reactivate anytime in account settings.`;
    } else if (status === 'past_due') {
      notifTitle = `⚠️ Payment Action Required: ${tierInfo.planName}`;
      notifMessage = `Payment renewal for your ${tierInfo.planName} subscription was declined. Please update your payment method.`;
    }

    batch.set(
      notifRef,
      {
        recipientUid: targetUserId,
        userId: targetUserId,
        recipientEmail: targetUserEmail || '',
        type: 'SUBSCRIPTION_STATUS_CHANGE',
        title: notifTitle,
        message: notifMessage,
        subscriptionId,
        tierId: tierInfo.tierId,
        status,
        read: false,
        createdAt: new Date().toISOString(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
}

/**
 * Cloud Function: Stripe Webhook HTTP Endpoint
 */
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  if (!stripeSecretKey) {
    res.status(500).send('STRIPE_SECRET_KEY is not configured.');
    return;
  }

  let StripeConstructor;
  try {
    StripeConstructor = require('stripe');
  } catch (e) {
    res.status(500).send('Stripe SDK package missing in functions.');
    return;
  }

  const stripe = new StripeConstructor(stripeSecretKey);
  const sig = req.headers['stripe-signature'] || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const eventType = event.type;

  try {
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};

      if (session.mode === 'subscription' || meta.type === 'subscription' || meta.tierId) {
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription && session.subscription.id;
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionToUserProfile(
            stripe,
            subscription,
            eventType,
            session.client_reference_id || meta.userId,
            (session.customer_details && session.customer_details.email) || session.customer_email
          );
        }
      }
    }

    if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated') {
      const subscription = event.data.object;
      await syncSubscriptionToUserProfile(stripe, subscription, eventType);
    }

    if (eventType === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await syncSubscriptionToUserProfile(stripe, subscription, eventType);
    }

    if (eventType === 'invoice.payment_succeeded' || eventType === 'invoice.paid') {
      const invoice = event.data.object;
      const subId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription && invoice.subscription.id;
      if (subId) {
        const subscription = await stripe.subscriptions.retrieve(subId);
        await syncSubscriptionToUserProfile(stripe, subscription, eventType, undefined, invoice.customer_email);
      }
    }

    if (eventType === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription && invoice.subscription.id;
      if (subId) {
        const subscription = await stripe.subscriptions.retrieve(subId);
        await syncSubscriptionToUserProfile(stripe, subscription, eventType, undefined, invoice.customer_email);
      }
    }

    res.status(200).json({ received: true, eventType });
  } catch (handlerErr) {
    console.error('Error handling webhook event:', handlerErr);
    res.status(500).json({ error: handlerErr.message });
  }
});

exports.stripeWebhook = exports.handleStripeWebhook;

// ----------------------------------------------------
// UNIVERSAL PAYPAL CHECKOUT v2 HANDLERS
// ----------------------------------------------------

/**
 * 1. createPayPalOrder
 * - Accepts galleryId, photoId (optional), and purchaseType ('single_photo' | 'full_pass') in req.body.
 * - Verifies caller's Firebase ID token using admin.auth().verifyIdToken().
 * - Fetches authoritative price directly from the Firestore doc galleries/{galleryId}.
 * - Calls PayPal's /v2/checkout/orders endpoint to create an order with intent: "CAPTURE".
 * - Stores { uid, galleryId, photoId, purchaseType } in custom_id.
 * - Returns { orderId }.
 */
exports.createPayPalOrder = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1].trim();
    } else if (req.body && (req.body.idToken || req.body.token)) {
      token = req.body.idToken || req.body.token;
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Missing Firebase ID token' });
      return;
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (e) {
      res.status(401).json({ error: 'Unauthorized: Invalid Firebase ID token', details: e.message });
      return;
    }

    const uid = decodedToken.uid;
    const { galleryId, photoId, purchaseType } = req.body || {};

    if (!galleryId) {
      res.status(400).json({ error: 'galleryId is required' });
      return;
    }

    if (!purchaseType || (purchaseType !== 'single_photo' && purchaseType !== 'full_pass')) {
      res.status(400).json({ error: "purchaseType must be 'single_photo' or 'full_pass'" });
      return;
    }

    // Fetch authoritative price directly from Firestore doc galleries/{galleryId}
    const gallerySnap = await db.collection('galleries').doc(galleryId).get();
    let galleryData = gallerySnap.exists ? gallerySnap.data() : null;
    if (!galleryData) {
      const albumSnap = await db.collection('albums').doc(galleryId).get();
      if (albumSnap.exists) galleryData = albumSnap.data();
    }

    if (!galleryData) {
      res.status(404).json({ error: `Gallery doc not found for ID: ${galleryId}` });
      return;
    }

    let authoritativePrice = 0;
    if (purchaseType === 'full_pass') {
      authoritativePrice =
        galleryData.fullAlbumPrice ||
        galleryData.bundlePrice ||
        galleryData.fullPassPrice ||
        galleryData.price ||
        45.0;
    } else {
      authoritativePrice =
        galleryData.singlePrice ||
        galleryData.singlePhotoPrice ||
        galleryData.photoPrice ||
        galleryData.price ||
        10.0;

      if (photoId && Array.isArray(galleryData.photos)) {
        const found = galleryData.photos.find((p) => p && (p.id === photoId || p.photoId === photoId));
        if (found && typeof found.price === 'number') authoritativePrice = found.price;
      }
    }

    const client = getPayPalClient();
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer('return=representation');

    const customId = JSON.stringify({
      uid,
      galleryId,
      photoId: photoId || null,
      purchaseType,
    });

    const description = purchaseType === 'full_pass'
      ? `Full Event Pass - Gallery ${galleryData.title || galleryId}`
      : `Single Photo Download - ${photoId || galleryId}`;

    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `j1p_${galleryId}_${photoId || 'pass'}_${Date.now()}`,
          description: description.slice(0, 127),
          custom_id: customId,
          amount: {
            currency_code: 'USD',
            value: Number(authoritativePrice).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Just1Play Sports',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    });

    const orderResponse = await client.execute(request);
    const orderId = orderResponse.result.id;

    // Track order in root orders collection
    await db.collection('orders').doc(orderId).set({
      id: orderId,
      orderId,
      buyerUid: uid,
      galleryId,
      photoId: photoId || null,
      purchaseType,
      amount: Number(authoritativePrice),
      currency: 'USD',
      itemTitle: description,
      status: 'PENDING',
      paymentProcessor: 'paypal',
      customId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.status(200).json({ orderId });
  } catch (err) {
    console.error('createPayPalOrder error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. capturePayPalOrder
 * - Accepts { orderId } in req.body.
 * - Calls PayPal's /v2/checkout/orders/{orderId}/capture endpoint.
 * - Once COMPLETED, parses custom_id.
 * - If purchaseType === 'full_pass', writes an unlock doc to users/{uid}/purchases/album_{galleryId}.
 * - If purchaseType === 'single_photo', writes an unlock doc to users/{uid}/purchased_photos/{photoId}
 *   and appends the uid to photoDoc.purchasedUserIds using FieldValue.arrayUnion.
 * - Creates an audit record in the root orders collection.
 */
exports.capturePayPalOrder = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { orderId: rawOrderId, orderID } = req.body || {};
    const orderId = rawOrderId || orderID;
    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' });
      return;
    }

    const client = getPayPalClient();
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    let captureResult;
    try {
      const response = await client.execute(request);
      captureResult = response.result;
    } catch (paypalErr) {
      console.warn('PayPal capture retry or lookup:', paypalErr.message);
      const getRequest = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
      const getResponse = await client.execute(getRequest);
      captureResult = getResponse.result;
    }

    if (captureResult.status !== 'COMPLETED') {
      res.status(400).json({ error: `PayPal order status is ${captureResult.status}, expected COMPLETED` });
      return;
    }

    const purchaseUnit = captureResult.purchase_units?.[0];
    const captureItem = purchaseUnit?.payments?.captures?.[0];
    const captureId = captureItem?.id || captureResult.id || orderId;
    const amountPaid = parseFloat(captureItem?.amount?.value || purchaseUnit?.amount?.value || '0');

    let customIdRaw = captureItem?.custom_id || purchaseUnit?.custom_id;
    if (!customIdRaw) {
      const storedOrderSnap = await db.collection('orders').doc(orderId).get();
      if (storedOrderSnap.exists) {
        customIdRaw = storedOrderSnap.data()?.customId;
      }
    }

    if (!customIdRaw) {
      res.status(400).json({ error: 'custom_id not found in order data' });
      return;
    }

    let parsedCustom = {};
    try {
      parsedCustom = JSON.parse(customIdRaw);
    } catch (e) {
      res.status(400).json({ error: 'Failed to parse custom_id as JSON' });
      return;
    }

    const { uid, galleryId, photoId, purchaseType } = parsedCustom;
    if (!uid || !galleryId || !purchaseType) {
      res.status(400).json({ error: 'custom_id missing required fields (uid, galleryId, purchaseType)' });
      return;
    }

    const batch = db.batch();

    if (purchaseType === 'full_pass') {
      const albumPurchaseRef = db.collection('users').doc(uid).collection('purchases').doc(`album_${galleryId}`);
      batch.set(albumPurchaseRef, {
        id: `album_${galleryId}`,
        albumId: galleryId,
        galleryId,
        userId: uid,
        uid,
        purchaseType: 'full_pass',
        type: 'gallery_album',
        orderId,
        captureId,
        amount: amountPaid,
        currency: 'USD',
        status: 'COMPLETED',
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      const userAlbumRef = db.collection('users').doc(uid).collection('purchased_albums').doc(galleryId);
      batch.set(userAlbumRef, {
        id: galleryId,
        albumId: galleryId,
        galleryId,
        userId: uid,
        uid,
        orderId,
        captureId,
        amount: amountPaid,
        status: 'COMPLETED',
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    if (purchaseType === 'single_photo') {
      const targetPhotoId = String(photoId || 'photo');
      const userPhotoRef = db.collection('users').doc(uid).collection('purchased_photos').doc(targetPhotoId);
      batch.set(userPhotoRef, {
        id: targetPhotoId,
        photoId: targetPhotoId,
        galleryId,
        userId: uid,
        uid,
        purchaseType: 'single_photo',
        type: 'gallery_photo',
        orderId,
        captureId,
        amount: amountPaid,
        currency: 'USD',
        status: 'COMPLETED',
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    const orderDocRef = db.collection('orders').doc(orderId);
    batch.set(orderDocRef, {
      id: orderId,
      orderId,
      buyerUid: uid,
      galleryId,
      photoId: photoId || null,
      purchaseType,
      amount: amountPaid,
      currency: 'USD',
      itemTitle: purchaseType === 'full_pass'
        ? `Full Event Pass - Gallery ${galleryId}`
        : `Single Photo Download - ${photoId || galleryId}`,
      status: 'COMPLETED',
      paymentProcessor: 'paypal',
      captureId,
      customId: customIdRaw,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();

    // Append uid to photoDoc.purchasedUserIds using FieldValue.arrayUnion
    if (purchaseType === 'single_photo' && photoId) {
      const targetPhotoId = String(photoId);
      try {
        const gPhotoRef = db.collection('galleries').doc(galleryId).collection('photos').doc(targetPhotoId);
        const gPhotoSnap = await gPhotoRef.get();
        if (gPhotoSnap.exists) {
          await gPhotoRef.update({
            purchasedUserIds: admin.firestore.FieldValue.arrayUnion(uid),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (_) {}

      try {
        const rootPhotoRef = db.collection('photos').doc(targetPhotoId);
        const rootPhotoSnap = await rootPhotoRef.get();
        if (rootPhotoSnap.exists) {
          await rootPhotoRef.update({
            purchasedUserIds: admin.firestore.FieldValue.arrayUnion(uid),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (_) {}
    }

    res.status(200).json({
      success: true,
      orderId,
      captureId,
      status: 'COMPLETED',
      purchaseType,
      galleryId,
      photoId: photoId || null,
      uid,
    });
  } catch (err) {
    console.error('capturePayPalOrder error:', err);
    res.status(500).json({ error: err.message });
  }
});
