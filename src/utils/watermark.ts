import { downloadPhotoFile } from './downloadHelper';

/**
 * Creator-Grade Watermarking and Asset Protection Utility
 * 
 * Generates an anti-theft diagonal repeating watermark grid across the full image
 * with a sleek anchored brand badge, and provides a secure download pipeline.
 */

export interface WatermarkOptions {
  text?: string;
  badgeText?: string;
  style?: 'full_mesh' | 'badge_only' | 'off' | 'diagonal' | 'full_protection' | string;
  opacity?: number;
  rotationDegrees?: number; // e.g. -35 to -45
  gridSpacing?: number;     // ~120px apart
  badgeFillColor?: string;  // rgba(18, 19, 22, 0.85)
  badgeBorderColor?: string;// rgba(47, 211, 93, 0.4)
  accentColor?: string;
  textColor?: string;
  quality?: number;
}

// In-memory cache for rendered previews to maximize UI performance
const previewCache = new Map<string, string>();

/**
 * Graceful rounded rectangle helper for canvas rendering
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  // Fallback for environments lacking native roundRect
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renders an anti-theft protected preview of an image with:
 * - Step A: Full-canvas diagonal repeating watermark grid ("JUST1PLAY PHOTOS • PREVIEW")
 * - Step B: Anchored sleek brand badge in bottom-right corner ("⚡ JUST1PLAY PHOTOS")
 *
 * @param imageUrl Source master or high-res image URL
 * @param options Customization options for style, opacity, spacing, and branding
 * @returns Promise<string> Base64 Data URL of the watermarked preview
 */
export async function renderProtectedPreview(
  imageUrl: string,
  options: WatermarkOptions = {}
): Promise<string> {
  if (!imageUrl) return '';

  const {
    text = 'JUST1PLAY PHOTOS • PREVIEW',
    badgeText = '⚡ JUST1PLAY PHOTOS',
    style = 'full_mesh',
    opacity = 0.15,
    rotationDegrees = -40,
    gridSpacing = 120,
    badgeFillColor = 'rgba(18, 19, 22, 0.85)',
    badgeBorderColor = 'rgba(47, 211, 93, 0.4)',
    accentColor = '#2FD35D',
    quality = 0.85
  } = options;

  // If watermarking is explicitly disabled, return the clean image URL directly
  if (style === 'off') {
    return imageUrl;
  }

  // Check in-memory cache first
  const cacheKey = `${imageUrl}__${style}__${opacity}__${gridSpacing}__${text}__${badgeText}`;
  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width || 1200;
        const height = img.naturalHeight || img.height || 800;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        // Draw original clean master onto off-screen canvas
        ctx.drawImage(img, 0, 0, width, height);

        // ====================================================================
        // STEP A: Diagonal Repeating Watermark Grid
        // ====================================================================
        if (style !== 'badge_only') {
          ctx.save();

          // Center-point rotation by -35 to -45 degrees (default: -40 degrees)
          const angleRad = (rotationDegrees * Math.PI) / 180;
          ctx.translate(width / 2, height / 2);
          ctx.rotate(angleRad);
          ctx.translate(-width / 2, -height / 2);

          // Proportional responsive typography
          const fontSize = Math.max(15, Math.min(26, Math.round(width * 0.022)));
          ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Anti-theft drop shadow for visibility across dark & light jerseys
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1.5;
          ctx.shadowOffsetY = 1.5;
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

          // Full diagonal bounds to tile entire rotated canvas
          const diagonal = Math.hypot(width, height);
          const stepY = Math.max(80, gridSpacing);
          const stepX = Math.max(180, fontSize * 14);

          const startX = -diagonal;
          const endX = width + diagonal;
          const startY = -diagonal;
          const endY = height + diagonal;

          let rowIdx = 0;
          for (let y = startY; y <= endY; y += stepY) {
            // Stagger alternating rows for dynamic anti-theft coverage
            const xOffset = (rowIdx % 2 === 0) ? 0 : stepX / 2;
            for (let x = startX + xOffset; x <= endX; x += stepX) {
              ctx.fillText(text.toUpperCase(), x, y);
            }
            rowIdx++;
          }

          ctx.restore();
        }

        // ====================================================================
        // STEP B: Anchored Sleek Brand Badge (Bottom-Right Corner)
        // ====================================================================
        ctx.save();
        // Reset any shadows from Step A
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        const badgeHeight = Math.max(30, Math.min(46, Math.round(height * 0.05)));
        const badgeFontSize = Math.max(11, Math.min(15, Math.round(badgeHeight * 0.44)));
        const badgePaddingX = Math.round(badgeHeight * 0.55);
        const margin = Math.max(14, Math.round(width * 0.022));

        // Prepare badge font for accurate measurement
        ctx.font = `800 ${badgeFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

        // Split badge into lightning bolt and text
        const boltPrefix = '⚡ ';
        const brandText = badgeText.replace(/^⚡\s*/, '');
        const boltWidth = ctx.measureText(boltPrefix).width;
        const brandWidth = ctx.measureText(brandText).width;
        const badgeWidth = boltWidth + brandWidth + badgePaddingX * 2;

        const badgeX = width - badgeWidth - margin;
        const badgeY = height - badgeHeight - margin;
        const pillRadius = badgeHeight / 2;

        // Render Pill Container: rgba(18, 19, 22, 0.85) with 1px border rgba(47, 211, 93, 0.4)
        drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, pillRadius);
        ctx.fillStyle = badgeFillColor;
        ctx.fill();

        ctx.strokeStyle = badgeBorderColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Render Badge Text: ⚡ in vibrant teal / emerald, JUST1PLAY PHOTOS in crisp white
        const textY = badgeY + badgeHeight / 2 + (badgeFontSize * 0.35);
        let currentTextX = badgeX + badgePaddingX;

        // 1. Lightning bolt
        ctx.fillStyle = accentColor;
        ctx.textAlign = 'left';
        ctx.fillText(boltPrefix, currentTextX, textY);
        currentTextX += boltWidth;

        // 2. Brand text in crisp white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(brandText, currentTextX, textY);

        ctx.restore();

        // Export composed preview as compressed Data URL
        const previewDataUrl = canvas.toDataURL('image/jpeg', quality);
        previewCache.set(cacheKey, previewDataUrl);
        resolve(previewDataUrl);
      } catch (err) {
        console.warn('Canvas rendering protection error, falling back to source:', err);
        resolve(imageUrl);
      }
    };

    img.onerror = () => {
      // Fallback if image fails to load or crossOrigin blocked
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}

/**
 * Downloads the clean high-resolution master asset for free galleries or paid unlocks
 */
export async function downloadCleanMaster(
  sourceUrl: string,
  filename: string = 'Just1Play_Photo_Clean.jpg'
): Promise<void> {
  if (!sourceUrl) throw new Error('No source URL provided for download');
  await downloadPhotoFile(sourceUrl, filename);
}

/**
 * Generates a watermarked Blob directly (useful for background uploads)
 */
export async function createProtectedPreviewBlob(
  imageUrl: string,
  options?: WatermarkOptions
): Promise<Blob> {
  const dataUrl = await renderProtectedPreview(imageUrl, options);
  const response = await fetch(dataUrl);
  return await response.blob();
}

export default {
  renderProtectedPreview,
  downloadCleanMaster,
  createProtectedPreviewBlob
};
