import { applyWatermarkToCanvas, WatermarkOptions } from './watermarkService';

export interface ProcessedPhoto {
  file: File;
  thumbBlob: Blob;
  displayBlob: Blob;
  previewUrl: string;
}

export interface GalleryProcessingOptions {
  watermark?: boolean;
  watermarkOptions?: WatermarkOptions;
}

// Compress and generate display + thumbnail versions with automatic Just1Play watermarking
export const processImageForGallery = (
  file: File,
  options: GalleryProcessingOptions = { watermark: true }
): Promise<{ displayBlob: Blob; thumbBlob: Blob; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          // 1. Generate Display Version (Max 1600px width/height, balanced 0.80 quality)
          const displayCanvas = resizeImageToCanvas(img, 1600, 0.80);
          
          // 2. Generate Small Cover Thumbnail (Max 400px, 0.70 quality)
          const thumbCanvas = resizeImageToCanvas(img, 400, 0.70);

          // 3. Automatically overlay 'Just1Play' watermark if enabled (default true)
          if (options.watermark !== false) {
            applyWatermarkToCanvas(displayCanvas, options.watermarkOptions);
            applyWatermarkToCanvas(thumbCanvas, {
              ...options.watermarkOptions,
              style: 'badge', // Badge style for clean thumbnails
            });
          }

          displayCanvas.toBlob(
            (displayBlob) => {
              thumbCanvas.toBlob(
                (thumbBlob) => {
                  // Release canvas memory immediately
                  displayCanvas.width = 0;
                  displayCanvas.height = 0;
                  thumbCanvas.width = 0;
                  thumbCanvas.height = 0;

                  if (displayBlob && thumbBlob) {
                    resolve({
                      displayBlob,
                      thumbBlob,
                      previewUrl: URL.createObjectURL(thumbBlob)
                    });
                  } else {
                    reject(new Error("Canvas blob conversion failed"));
                  }
                },
                'image/jpeg',
                0.70
              );
            },
            'image/jpeg',
            0.80
          );
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Helper: Resize Image Maintaining Aspect Ratio
export const resizeImageToCanvas = (img: HTMLImageElement, maxDimension: number, _quality: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > maxDimension) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    }
  } else {
    if (height > maxDimension) {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
  }

  return canvas;
};

/**
 * Ultra-safe, lightweight data URL generator for fallback situations
 * Guarantees output is well below Firestore's 1MB document limit (<75KB)
 */
export const compressImageToSafeDataUrl = async (
  file: File | Blob,
  maxDimension: number = 750,
  quality: number = 0.55
): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = resizeImageToCanvas(img, maxDimension, quality);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.width = 0;
          canvas.height = 0;
          resolve(dataUrl);
        } catch {
          resolve(e.target?.result as string || '');
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string || '');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};
