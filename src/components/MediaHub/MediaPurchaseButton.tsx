import React, { useState, useEffect } from "react";
import {
  Download,
  Lock,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileImage,
  Film,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export interface MediaPurchaseButtonProps {
  mediaId: string;
  title?: string;
  mediaType?: "single_photo" | "full_pass";
  storagePath?: string;
  eventId?: string;
  previewUrl?: string;
  isUnlocked?: boolean;
  className?: string;
  onDownloadStarted?: () => void;
}

export const MediaPurchaseButton: React.FC<MediaPurchaseButtonProps> = ({
  mediaId,
  title = "4K Action Shot",
  mediaType = "single_photo",
  storagePath = "media_vault/photo_4k.jpg",
  eventId,
  previewUrl,
  isUnlocked: initialUnlocked = false,
  className = "",
  onDownloadStarted,
}) => {
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState<boolean>(initialUnlocked);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const price = mediaType === "single_photo" ? 15.0 : 45.0;
  const isVideo = mediaType === "full_pass";

  // Check if current user has already purchased this asset
  useEffect(() => {
    let isMounted = true;
    const checkPurchaseEntitlement = async () => {
      if (!user || !db || isUnlocked) return;
      try {
        const purchasesRef = collection(db, "users", user.uid, "purchases");
        const q = query(purchasesRef, where("mediaId", "==", mediaId));
        const snap = await getDocs(q);
        if (!snap.empty && isMounted) {
          setIsUnlocked(true);
        }
      } catch (err: any) {
        console.warn("Could not check user purchase entitlement:", err.message);
      }
    };

    checkPurchaseEntitlement();
    return () => {
      isMounted = false;
    };
  }, [user, mediaId, isUnlocked]);

  // Handle Initiating PayPal Checkout
  const handlePurchase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        userId: user?.uid || "guest",
        userEmail: user?.email || "",
        mediaId,
        mediaType,
        title,
        storagePath,
        eventId: eventId || "",
        origin: window.location.origin,
      };

      const res = await fetch("/api/checkout/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to create media checkout session.");
      }

      // Redirect to PayPal Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error("Media purchase error:", err);
      setErrorMsg(err.message || "Failed to start media checkout.");
      setLoading(false);
    }
  };

  // Handle Instant Download of 4K High-Res Original
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/media/signed-download-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId,
          storagePath,
          title,
        }),
      });

      const data = await res.json();
      const targetUrl = data.downloadUrl || previewUrl || "https://images.unsplash.com/photo-1546519638-68e109498ffc";

      if (onDownloadStarted) {
        onDownloadStarted();
      }

      // Automated client download trigger
      const anchor = document.createElement("a");
      anchor.href = targetUrl;
      anchor.download = `${title.toLowerCase().replace(/\s+/g, "_")}_4k_original.${isVideo ? "mp4" : "jpg"}`;
      anchor.target = "_blank";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (err: any) {
      console.error("Download URL fetch error:", err);
      setErrorMsg("Download link error. Please try again.");
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  if (isUnlocked) {
    return (
      <button
        id={`download-media-btn-${mediaId}`}
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 disabled:opacity-50 ${className}`}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Fetching 4K Asset...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Download 4K Original (Unlocked)</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        id={`buy-media-btn-${mediaId}`}
        type="button"
        onClick={handlePurchase}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting PayPal...</span>
          </>
        ) : (
          <>
            {isVideo ? <Film className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}
            <span>
              {isVideo ? `Buy Full-Game Media Pass ($${price})` : `Buy 4K Download ($${price})`}
            </span>
            <ArrowRight className="h-3.5 w-3.5 opacity-70" />
          </>
        )}
      </button>
      {errorMsg && <span className="text-[10px] text-destructive">{errorMsg}</span>}
    </div>
  );
};

export default MediaPurchaseButton;
