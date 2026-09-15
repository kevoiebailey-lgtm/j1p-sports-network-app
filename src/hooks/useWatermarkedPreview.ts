import { useState, useEffect } from 'react';
import { WatermarkStyle, renderWatermarkedImage } from '../utils/watermarkRenderer';

// In-memory cache keyed by `${rawUrl}_${style}` across sessions/navigations
const watermarkCache = new Map<string, string>();

export interface WatermarkedPreviewState {
  previewUrl: string;
  isWatermarked: boolean;
  loading: boolean;
  corsFallback: boolean;
}

/**
 * Reactive Caching Hook for Watermarked Previews.
 * 
 * Protects creator photos by dynamically rendering an off-screen Canvas watermark
 * for unpaid assets with an in-memory cache, while ensuring clean, high-res delivery
 * for free albums or verified purchasers.
 * 
 * @param rawUrl The source/master photo URL
 * @param isFree Whether the gallery or photo is free to access/download
 * @param isPurchased Whether the current user has purchased this photo or album
 * @param style 'shield_center' | 'diagonal_text' | 'corner_badge' | 'none'
 * @param label Optional brand label (default: 'JUST1PLAY PHOTOS')
 */
export function useWatermarkedPreview(
  rawUrl: string,
  isFree: boolean,
  isPurchased: boolean,
  style: WatermarkStyle = 'shield_center',
  label = 'JUST1PLAY PHOTOS'
): WatermarkedPreviewState {
  const requiresWatermark = !isFree && !isPurchased && style !== 'none' && Boolean(rawUrl);
  const cacheKey = rawUrl ? `${rawUrl}_${style}` : '';

  // Initial calculation from in-memory cache
  const cachedUrl = (requiresWatermark && cacheKey) ? watermarkCache.get(cacheKey) : undefined;

  const [state, setState] = useState<WatermarkedPreviewState>(() => {
    if (!requiresWatermark) {
      return {
        previewUrl: rawUrl || '',
        isWatermarked: false,
        loading: false,
        corsFallback: false,
      };
    }
    if (cachedUrl) {
      return {
        previewUrl: cachedUrl,
        isWatermarked: true,
        loading: false,
        corsFallback: false,
      };
    }
    return {
      previewUrl: rawUrl || '',
      isWatermarked: true,
      loading: true,
      corsFallback: false,
    };
  });

  useEffect(() => {
    // Free, purchased, or style === 'none' requires no watermark
    if (!requiresWatermark) {
      setState({
        previewUrl: rawUrl || '',
        isWatermarked: false,
        loading: false,
        corsFallback: false,
      });
      return;
    }

    // Check in-memory cache
    if (cacheKey && watermarkCache.has(cacheKey)) {
      const cached = watermarkCache.get(cacheKey)!;
      setState({
        previewUrl: cached,
        isWatermarked: true,
        loading: false,
        corsFallback: false,
      });
      return;
    }

    let isCancelled = false;
    setState((prev) => ({
      ...prev,
      previewUrl: prev.previewUrl || rawUrl,
      isWatermarked: true,
      loading: true,
      corsFallback: false,
    }));

    renderWatermarkedImage(rawUrl, style, label)
      .then((watermarkedDataUrl) => {
        if (isCancelled) return;
        if (cacheKey) {
          watermarkCache.set(cacheKey, watermarkedDataUrl);
        }
        setState({
          previewUrl: watermarkedDataUrl,
          isWatermarked: true,
          loading: false,
          corsFallback: false,
        });
      })
      .catch((err) => {
        if (isCancelled) return;
        // CORS / Error Fallback:
        // If canvas drawing fails due to tainted canvas or cross-origin restrictions,
        // resolve previewUrl: rawUrl and flag corsFallback: true
        console.warn('Canvas watermark rendering fallback activated for URL:', rawUrl, err);
        setState({
          previewUrl: rawUrl,
          isWatermarked: true,
          loading: false,
          corsFallback: true,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [rawUrl, isFree, isPurchased, style, label, requiresWatermark, cacheKey]);

  return state;
}

export default useWatermarkedPreview;
