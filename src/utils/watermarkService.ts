export { 
  renderProtectedPreview, 
  downloadCleanMaster, 
  createProtectedPreviewBlob 
} from './watermark';

export interface WatermarkOptions {
  text?: string;
  subtext?: string;
  style?: 'badge' | 'diagonal' | 'full_protection';
  opacity?: number;
  applyToThumbnail?: boolean;
  accentColor?: string;
  textColor?: string;
}

/**
 * Just1Play Watermark Service
 * Overlays professional, branded "Just1Play" watermarks onto HTML5 canvases
 * with athletic #FF6A00 brand styling.
 */

/**
 * Apply Just1Play watermark directly to an HTMLCanvasElement
 */
export function applyWatermarkToCanvas(
  canvas: HTMLCanvasElement,
  options: WatermarkOptions = {}
): HTMLCanvasElement {
  const {
    text = 'JUST1PLAY',
    subtext = 'OFFICIAL ATHLETE MEDIA',
    style = 'badge', // Default to clean footer watermark badge, leaving picture body clear
    opacity = 0.22,
    accentColor = '#FF6A00', // Just1Play Signature Orange Accent
    textColor = '#FFFFFF',
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;

  ctx.save();

  // 1. DIAGONAL TILED WATERMARK (Full Protection against unauthorized screenshots)
  if (style === 'diagonal' || style === 'full_protection') {
    ctx.save();

    // Rotate context around center
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);

    // Calculate font size proportional to image size
    const fontSize = Math.max(16, Math.round(width * 0.038));
    ctx.font = `900 italic ${fontSize}px sans-serif, system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textToDraw = `${text} • ${subtext}`;
    const xStep = fontSize * 12;
    const yStep = fontSize * 4;

    // Expand grid bounds to cover canvas when rotated
    const startX = -width * 0.5;
    const endX = width * 1.5;
    const startY = -height * 0.5;
    const endY = height * 1.5;

    for (let y = startY; y < endY; y += yStep) {
      for (let x = startX; x < endX; x += xStep) {
        // Offset alternating rows
        const currentX = (y / yStep) % 2 === 0 ? x : x + xStep / 2;

        // Subtle dark outline shadow
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.8})`;
        ctx.fillText(textToDraw, currentX + 1.5, y + 1.5);

        // Semi-transparent main text
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillText(textToDraw, currentX, y);
      }
    }

    ctx.restore();
  }

  // 2. BRANDED BOTTOM-RIGHT CORNER BADGE
  if (style === 'badge' || style === 'full_protection') {
    ctx.save();

    const badgeHeight = Math.max(28, Math.round(height * 0.055));
    const paddingX = badgeHeight * 0.5;
    const paddingY = badgeHeight * 0.25;

    const mainFontSize = Math.max(11, Math.round(badgeHeight * 0.42));
    const subFontSize = Math.max(8, Math.round(badgeHeight * 0.26));

    ctx.font = `900 italic ${mainFontSize}px sans-serif, system-ui`;
    const mainWidth = ctx.measureText(text).width;

    ctx.font = `700 ${subFontSize}px sans-serif, system-ui`;
    const subWidth = ctx.measureText(subtext).width;

    const contentWidth = Math.max(mainWidth, subWidth) + badgeHeight * 0.8;
    const pillWidth = contentWidth + paddingX * 2;
    const pillHeight = badgeHeight + paddingY * 0.5;

    const margin = Math.max(12, Math.round(width * 0.02));
    const badgeX = width - pillWidth - margin;
    const badgeY = height - pillHeight - margin;

    // Draw Dark Translucent Backdrop Pill
    ctx.fillStyle = 'rgba(8, 10, 14, 0.88)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    const radius = pillHeight / 2;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, pillWidth, pillHeight, radius);
    ctx.fill();

    // Draw Orange Pill Border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 106, 0, 0.5)';
    ctx.lineWidth = Math.max(1, Math.round(badgeHeight * 0.04));
    ctx.stroke();

    // Draw Orange Glowing Logo Dot
    const dotX = badgeX + paddingX + badgeHeight * 0.2;
    const dotY = badgeY + pillHeight / 2;
    const dotRadius = Math.max(3, badgeHeight * 0.12);

    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';

    // Draw Main Text ("JUST1PLAY")
    const textX = dotX + dotRadius * 2 + 8;
    const textY = badgeY + paddingY + mainFontSize * 0.85;

    ctx.font = `900 italic ${mainFontSize}px sans-serif, system-ui`;
    ctx.textAlign = 'left';

    // "JUST1" in white
    ctx.fillStyle = textColor;
    ctx.fillText('JUST1', textX, textY);

    const just1Width = ctx.measureText('JUST1').width;

    // "PLAY" in Orange
    ctx.fillStyle = accentColor;
    ctx.fillText('PLAY', textX + just1Width, textY);

    // Draw Subtext ("OFFICIAL ATHLETE MEDIA")
    ctx.font = `800 ${subFontSize}px sans-serif, system-ui`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText(subtext, textX, textY + subFontSize + 3);

    ctx.restore();
  }

  ctx.restore();
  return canvas;
}

/**
 * Process an Image file and return a watermarked Blob
 */
export async function watermarkImageFile(
  file: File,
  options: WatermarkOptions = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        applyWatermarkToCanvas(canvas, options);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          'image/jpeg',
          0.88
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export type DownloadProgressCallback = (percent: number, statusText: string) => void;

/**
 * Download a photo with or without watermark directly to user device with detailed progress callbacks
 */
export async function downloadPhotoWithPreference(
  imageUrl: string,
  fileName: string,
  applyWatermark: boolean = false,
  watermarkOptions?: WatermarkOptions,
  onProgress?: DownloadProgressCallback
): Promise<void> {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const downloadFileName = `Just1Play_${sanitizedName}${applyWatermark ? '_watermarked' : '_clean'}.jpg`;

  if (onProgress) onProgress(15, 'Establishing connection to media server...');

  // If watermark is NOT requested (clean download), trigger direct file download
  if (!applyWatermark) {
    try {
      if (onProgress) onProgress(35, 'Fetching full 4K clean asset...');
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Fetch failed');

      if (onProgress) onProgress(75, 'Preparing uncompressed master image...');
      const blob = await response.blob();
      
      if (onProgress) onProgress(90, 'Writing file to local device...');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      if (onProgress) onProgress(100, 'Download complete!');
      return;
    } catch {
      if (onProgress) onProgress(80, 'Finalizing download link...');
      // Fallback if cross-origin fetch is blocked
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = downloadFileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onProgress) onProgress(100, 'Download complete!');
      return;
    }
  }

  // If watermark IS requested: render to canvas, apply watermark, and trigger download
  try {
    if (onProgress) onProgress(30, 'Loading 4K image onto render engine...');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for watermarking'));
    });

    if (onProgress) onProgress(60, 'Rendering canvas & applying Just1Play 4K branding...');
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 1600;
    canvas.height = img.naturalHeight || img.height || 1000;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(img, 0, 0);
    applyWatermarkToCanvas(canvas, watermarkOptions || { style: 'badge' });

    if (onProgress) onProgress(85, 'Encoding high-quality JPEG master...');
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });

    if (blob) {
      if (onProgress) onProgress(95, 'Writing file to local device...');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      if (onProgress) onProgress(100, 'Download complete!');
    } else {
      throw new Error('Blob generation failed');
    }
  } catch (err) {
    console.warn('Canvas watermarking download fallback:', err);
    if (onProgress) onProgress(90, 'Applying fallback download...');
    // Fallback to direct download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = downloadFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onProgress) onProgress(100, 'Download complete!');
  }
}

