/**
 * High-Performance Client-Side Image Optimization Utility
 * Automatically downscales uploaded images to max 1920px (WebP format, 85% quality)
 * and creates a 400px thumbnail before writing to Firebase Storage.
 */

export interface ImageOptimizationOptions {
  maxDimension?: number; // default 1920px
  thumbnailDimension?: number; // default 400px
  quality?: number; // default 0.85
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export interface OptimizedUploadResult {
  fullResFile: File;
  thumbnailFile: File;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    originalSizeBytes: number;
    fullResSizeBytes: number;
    thumbnailSizeBytes: number;
    compressionRatio: number; // e.g. 0.85 (85% reduction)
  };
}

/**
 * Resizes and converts an image File or Blob to WebP format using HTML5 Canvas.
 */
export function compressImageToCanvas(
  fileOrBlob: File | Blob,
  maxDimension = 1920,
  quality = 0.85,
  fileName = 'optimized.webp'
): Promise<{ file: File; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // If not an image, resolve directly
    if (!fileOrBlob.type.startsWith('image/')) {
      const fallbackFile = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], fileName, { type: fileOrBlob.type });
      resolve({ file: fallbackFile, width: 0, height: 0 });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Calculate aspect ratio downscaling
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const fallback = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], fileName, { type: fileOrBlob.type });
        resolve({ file: fallback, width, height });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as WebP format with quality setting
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            const fallback = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], fileName, { type: fileOrBlob.type });
            resolve({ file: fallback, width, height });
            return;
          }

          const webpFileName = fileName.replace(/\.[^/.]+$/, '') + '.webp';
          const optimizedFile = new File([blob], webpFileName, {
            type: 'image/webp',
            lastModified: Date.now()
          });

          resolve({ file: optimizedFile, width, height });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for compression: ${err}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Optimizes an uploaded image for Firebase Storage:
 * 1. Downscales full-resolution image to max 1920px WebP at 85% quality.
 * 2. Creates a crisp 400px thumbnail WebP at 85% quality.
 */
export async function optimizeImageForStorage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedUploadResult> {
  const {
    maxDimension = 1920,
    thumbnailDimension = 400,
    quality = 0.85
  } = options;

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const originalSize = file.size;

  // 1. Generate Full-Res WebP (max 1920px)
  const fullResResult = await compressImageToCanvas(
    file,
    maxDimension,
    quality,
    `${baseName}_1920.webp`
  );

  // 2. Generate Thumbnail WebP (max 400px)
  const thumbResult = await compressImageToCanvas(
    file,
    thumbnailDimension,
    quality,
    `${baseName}_thumb_400.webp`
  );

  const fullResSize = fullResResult.file.size;
  const thumbSize = thumbResult.file.size;
  const compressionRatio = originalSize > 0 ? (1 - fullResSize / originalSize) : 0;

  console.log(
    `⚡ [imageCompressor] Optimized ${file.name} (${(originalSize / 1024 / 1024).toFixed(2)}MB): ` +
    `Full-Res -> ${(fullResSize / 1024).toFixed(1)}KB (${(compressionRatio * 100).toFixed(0)}% reduction), ` +
    `Thumb -> ${(thumbSize / 1024).toFixed(1)}KB`
  );

  return {
    fullResFile: fullResResult.file,
    thumbnailFile: thumbResult.file,
    metadata: {
      originalWidth: fullResResult.width,
      originalHeight: fullResResult.height,
      originalSizeBytes: originalSize,
      fullResSizeBytes: fullResSize,
      thumbnailSizeBytes: thumbSize,
      compressionRatio
    }
  };
}

/**
 * Legacy wrapper for single-file compression compatibility
 */
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
  useWebWorker?: boolean;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const maxDim = Math.max(options.maxWidth || 1920, options.maxHeight || 1920);
  const qual = options.quality || 0.85;
  const res = await compressImageToCanvas(file, maxDim, qual, file.name);
  return res.file;
}

/**
 * Converts a File or Blob into a Base64 Data URL string
 */
export function fileToDataUrl(fileOrBlob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(fileOrBlob);
  });
}

export default optimizeImageForStorage;
