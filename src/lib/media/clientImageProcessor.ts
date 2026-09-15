/**
 * Client-Side Multi-Worker Watermark & Thumbnail Engine
 * Direct-to-Cloud High-Speed Image Processing Pipeline
 */

export interface ProcessedImageDerivative {
  id: string;
  originalFile: File;
  compressedMasterBlob: Blob; // Pre-compressed DSLR / mobile master: max 2560px, 85% JPEG quality
  thumbBlob: Blob;            // Fast thumbnail: max 400px, 80% WebP/JPEG quality
  previewBlob: Blob;          // Watermarked display proof: max 1400px, 85% WebP/JPEG quality
  width: number;
  height: number;
  aspectRatio: number;
  filename: string;
  thumbPreviewUrl: string;
  watermarkedPreviewUrl: string;
}

export interface ProcessingProgressCallback {
  (stage: 'decoding' | 'compressing' | 'thumbnail' | 'watermark' | 'complete', percent: number): void;
}

/**
 * Load image file into an ImageBitmap or HTMLImageElement with EXIF orientation corrected.
 */
async function loadSourceImage(
  file: File
): Promise<{ source: ImageBitmap | HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  // Prefer createImageBitmap with modern orientation handling
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image' as any,
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          try {
            bitmap.close();
          } catch {
            // ignore
          }
        },
      };
    } catch {
      // Fallback to standard Image loading below
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => {
          URL.revokeObjectURL(url);
        },
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to decode image: ${file.name} (${err})`));
    };

    img.src = url;
  });
}

/**
 * Scale dimensions proportionally to fit inside maxDimension
 */
function calculateScaledDimensions(
  origW: number,
  origH: number,
  maxDimension: number
): { width: number; height: number } {
  if (origW <= maxDimension && origH <= maxDimension) {
    return { width: origW, height: origH };
  }

  if (origW >= origH) {
    const scale = maxDimension / origW;
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(origH * scale)),
    };
  } else {
    const scale = maxDimension / origH;
    return {
      width: Math.max(1, Math.round(origW * scale)),
      height: maxDimension,
    };
  }
}

/**
 * Helper to convert canvas to Blob, defaulting to WebP with JPEG fallback
 */
function canvasToBlobAsync(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mimeType: 'image/webp' | 'image/jpeg',
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if ('convertToBlob' in canvas) {
      (canvas as OffscreenCanvas)
        .convertToBlob({ type: mimeType, quality })
        .then(resolve)
        .catch(() => {
          // Fallback to jpeg if webp unsupported
          (canvas as OffscreenCanvas)
            .convertToBlob({ type: 'image/jpeg', quality })
            .then(resolve)
            .catch(reject);
        });
    } else {
      const htmlCanvas = canvas as HTMLCanvasElement;
      htmlCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to jpeg
            htmlCanvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) resolve(fallbackBlob);
                else reject(new Error('Canvas toBlob generated null'));
              },
              'image/jpeg',
              quality
            );
          }
        },
        mimeType,
        quality
      );
    }
  });
}

/**
 * Apply elegant repeating diagonal watermark stamp with drop shadow
 */
function applyWatermarkPattern(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  text: string = 'JUST1PLAY'
) {
  ctx.save();

  // Repeating diagonal lattice parameters
  const angle = -Math.PI / 6; // -30 degrees
  const stepX = Math.max(220, Math.floor(width / 3.8));
  const stepY = Math.max(140, Math.floor(height / 4.2));
  const fontSize = Math.max(26, Math.floor(Math.min(width, height) / 22));

  ctx.font = `900 ${fontSize}px "Inter", "Impact", -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Apply subtle drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = Math.max(4, Math.floor(fontSize * 0.18));
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Diagonal rotation over oversized canvas area to cover corners cleanly
  const hypotenuse = Math.sqrt(width * width + height * height);
  const startOffset = -hypotenuse / 2;
  const endOffset = hypotenuse * 1.5;

  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);
  ctx.translate(-width / 2, -height / 2);

  for (let x = startOffset; x <= endOffset; x += stepX) {
    for (let y = startOffset; y <= endOffset; y += stepY) {
      // Stroke contour for contrast against light areas
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = Math.max(2, Math.floor(fontSize / 12));
      ctx.strokeText(text, x, y);

      // Semi-transparent high-contrast white fill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.fillText(text, x, y);

      // Sub-brand badge text underneath main stamp
      const subFontSize = Math.max(10, Math.floor(fontSize * 0.32));
      ctx.font = `700 ${subFontSize}px -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(0, 184, 212, 0.55)'; // Cyan accent
      ctx.fillText('OFFICIAL WATERMARKED PROOF', x, y + fontSize * 0.65);

      // Reset main font
      ctx.font = `900 ${fontSize}px "Inter", "Impact", -apple-system, sans-serif`;
    }
  }

  ctx.restore();

  // Add discreet bottom corner protection pill
  ctx.save();
  const pillW = Math.max(170, Math.floor(width * 0.22));
  const pillH = Math.max(34, Math.floor(pillW * 0.2));
  const pillX = width - pillW - 16;
  const pillY = height - pillH - 16;

  ctx.fillStyle = 'rgba(10, 15, 26, 0.82)';
  ctx.strokeStyle = 'rgba(0, 184, 212, 0.7)';
  ctx.lineWidth = 1.5;

  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(pillX, pillY, pillW, pillH, 6);
  } else {
    ctx.rect(pillX, pillY, pillW, pillH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.font = `800 ${Math.max(11, Math.floor(pillH * 0.42))}px -apple-system, sans-serif`;
  ctx.fillStyle = '#00B8D4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JUST1PLAY PRO PROOF', pillX + pillW / 2, pillY + pillH / 2);

  ctx.restore();
}

/**
 * Process a single image file to produce Thumbnail and Watermarked Preview derivatives.
 */
export async function processImageForIngest(
  file: File,
  options?: {
    watermarkText?: string;
    onProgress?: ProcessingProgressCallback;
  }
): Promise<ProcessedImageDerivative> {
  const { watermarkText = 'JUST1PLAY', onProgress } = options || {};

  onProgress?.('decoding', 15);
  const { source, width: origW, height: origH, cleanup } = await loadSourceImage(file);

  try {
    const aspectRatio = origW / (origH || 1);

    // 1. Pre-Compressed Master Derivative (max dimension 2560px, JPEG quality 0.85)
    // Compresses raw DSLR / mobile photos down from 20-50MB to ~800KB-1.5MB to protect memory & bandwidth
    onProgress?.('compressing', 35);
    const masterDims = calculateScaledDimensions(origW, origH, 2560);

    let masterCanvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      masterCanvas = new OffscreenCanvas(masterDims.width, masterDims.height);
    } else {
      masterCanvas = document.createElement('canvas');
      masterCanvas.width = masterDims.width;
      masterCanvas.height = masterDims.height;
    }

    const masterCtx = masterCanvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;
    if (!masterCtx) throw new Error('Could not obtain master 2D canvas context');

    masterCtx.imageSmoothingEnabled = true;
    masterCtx.imageSmoothingQuality = 'high';
    masterCtx.drawImage(source as any, 0, 0, masterDims.width, masterDims.height);

    const compressedMasterBlob = await canvasToBlobAsync(masterCanvas, 'image/jpeg', 0.85);

    // Release master canvas memory immediately
    masterCanvas.width = 0;
    masterCanvas.height = 0;

    // 2. Thumbnail Derivative (max dimension 400px, WebP quality 0.80)
    onProgress?.('thumbnail', 60);
    const thumbDims = calculateScaledDimensions(origW, origH, 400);

    let thumbCanvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      thumbCanvas = new OffscreenCanvas(thumbDims.width, thumbDims.height);
    } else {
      thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = thumbDims.width;
      thumbCanvas.height = thumbDims.height;
    }

    const thumbCtx = thumbCanvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;
    if (!thumbCtx) throw new Error('Could not obtain thumbnail 2D canvas context');

    thumbCtx.imageSmoothingEnabled = true;
    thumbCtx.imageSmoothingQuality = 'high';
    thumbCtx.drawImage(source as any, 0, 0, thumbDims.width, thumbDims.height);

    const thumbBlob = await canvasToBlobAsync(thumbCanvas, 'image/webp', 0.80);

    // Release thumbnail canvas memory immediately
    thumbCanvas.width = 0;
    thumbCanvas.height = 0;

    // 3. Watermarked Preview Derivative (max dimension 1400px, WebP quality 0.85)
    onProgress?.('watermark', 85);
    const previewDims = calculateScaledDimensions(origW, origH, 1400);

    let previewCanvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      previewCanvas = new OffscreenCanvas(previewDims.width, previewDims.height);
    } else {
      previewCanvas = document.createElement('canvas');
      previewCanvas.width = previewDims.width;
      previewCanvas.height = previewDims.height;
    }

    const previewCtx = previewCanvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;
    if (!previewCtx) throw new Error('Could not obtain preview 2D canvas context');

    previewCtx.imageSmoothingEnabled = true;
    previewCtx.imageSmoothingQuality = 'high';
    previewCtx.drawImage(source as any, 0, 0, previewDims.width, previewDims.height);

    // Apply diagonal watermark
    applyWatermarkPattern(previewCtx, previewDims.width, previewDims.height, watermarkText);

    const previewBlob = await canvasToBlobAsync(previewCanvas, 'image/webp', 0.85);

    // Release preview canvas memory immediately
    previewCanvas.width = 0;
    previewCanvas.height = 0;

    onProgress?.('complete', 100);

    const id = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const thumbPreviewUrl = URL.createObjectURL(thumbBlob);
    const watermarkedPreviewUrl = URL.createObjectURL(previewBlob);

    return {
      id,
      originalFile: file,
      compressedMasterBlob,
      thumbBlob,
      previewBlob,
      width: origW,
      height: origH,
      aspectRatio,
      filename: file.name,
      thumbPreviewUrl,
      watermarkedPreviewUrl,
    };
  } finally {
    cleanup();
  }
}

/**
 * Standalone client-side image pre-compressor
 * Enforces max bounds: max 2560px width/height, 80-85% JPEG quality.
 */
export async function precompressImageFile(
  file: File,
  maxDimension: number = 2560,
  quality: number = 0.85
): Promise<{ blob: Blob; width: number; height: number; aspectRatio: number }> {
  const { source, width: origW, height: origH, cleanup } = await loadSourceImage(file);
  try {
    const scaled = calculateScaledDimensions(origW, origH, maxDimension);
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(scaled.width, scaled.height);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = scaled.width;
      canvas.height = scaled.height;
    }
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!ctx) throw new Error('Unable to obtain canvas 2D context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source as any, 0, 0, scaled.width, scaled.height);

    const blob = await canvasToBlobAsync(canvas, 'image/jpeg', quality);
    canvas.width = 0;
    canvas.height = 0;

    return {
      blob,
      width: scaled.width,
      height: scaled.height,
      aspectRatio: origW / (origH || 1),
    };
  } finally {
    cleanup();
  }
}
