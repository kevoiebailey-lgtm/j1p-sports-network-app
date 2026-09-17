/**
 * Client-Side Canvas Watermark Renderer for Unpaid Photo Previews
 * 
 * Protects creator assets by rendering an off-screen Canvas watermark
 * ('shield_center' | 'diagonal_text' | 'corner_badge'), while guaranteeing
 * clean, un-watermarked high-res delivery for free albums and authenticated purchases.
 */

export type WatermarkStyle = 'shield_center' | 'diagonal_text' | 'corner_badge' | 'none';

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
 * Renders an off-screen Canvas watermark on an image.
 * 
 * @param sourceUrl High-res or source image URL
 * @param style 'shield_center' | 'diagonal_text' | 'corner_badge' | 'none'
 * @param label Custom brand label (default: 'JUST1PLAY PHOTOS')
 * @returns Promise<string> Data URL (JPEG, 0.82 quality) or clean sourceUrl if 'none'
 */
export async function renderWatermarkedImage(
  sourceUrl: string,
  style: WatermarkStyle,
  label = 'JUST1PLAY PHOTOS'
): Promise<string> {
  // If style is none or no sourceUrl, return sourceUrl immediately
  if (style === 'none' || !sourceUrl) {
    return sourceUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // Constrain canvas max dimension to 1600px to conserve mobile device RAM
        const maxDim = 1600;
        let targetWidth = img.naturalWidth || img.width || 800;
        let targetHeight = img.naturalHeight || img.height || 600;

        if (targetWidth > maxDim || targetHeight > maxDim) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
            targetWidth = maxDim;
          } else {
            targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
            targetHeight = maxDim;
          }
        }

        canvas.width = Math.max(1, targetWidth);
        canvas.height = Math.max(1, targetHeight);

        // Draw original source image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Apply selected Watermark Style
        if (style === 'shield_center') {
          // Style A: 'shield_center'
          // Compute center coordinates (cx, cy)
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const radius = Math.min(canvas.width, canvas.height) * 0.22;

          ctx.save();
          // Draw translucent circular shield
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(18, 19, 22, 0.45)';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(47, 211, 93, 0.6)';
          ctx.stroke();

          // Render "⚡ JUST1PLAY" header in bold white with drop-shadow
          const headerFontSize = Math.max(14, Math.round(radius * 0.25));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
          ctx.font = `900 ${headerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText('⚡ JUST1PLAY', cx, cy - radius * 0.16);

          // Subtext "PREVIEW PROOF" in cyan/mint
          const subFontSize = Math.max(10, Math.round(radius * 0.15));
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 4;
          ctx.font = `800 ${subFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
          ctx.fillStyle = '#00F0D0';
          ctx.fillText('PREVIEW PROOF', cx, cy + radius * 0.22);
          ctx.restore();

        } else if (style === 'diagonal_text') {
          // Style B: 'diagonal_text'
          ctx.save();
          // Translate to center and rotate -35 degrees
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((-35 * Math.PI) / 180);

          const diag = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
          const yInterval = 140;
          const fontSize = Math.max(13, Math.min(26, Math.round(canvas.width * 0.022)));

          ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 1;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const textToDraw = `${label.toUpperCase()} • PREVIEW ONLY`;
          const textMetrics = ctx.measureText(textToDraw);
          const xStep = Math.max(220, textMetrics.width + 70);

          let row = 0;
          for (let y = -diag; y <= diag; y += yInterval) {
            const offsetX = (row % 2 === 0) ? 0 : xStep / 2;
            for (let x = -diag - xStep; x <= diag + xStep; x += xStep) {
              ctx.fillText(textToDraw, x + offsetX, y);
            }
            row++;
          }
          ctx.restore();

        } else if (style === 'corner_badge') {
          // Style C: 'corner_badge'
          ctx.save();
          const badgeFontSize = Math.max(12, Math.min(18, Math.round(canvas.width * 0.016)));
          ctx.font = `bold ${badgeFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

          const badgeText = '⚡ JUST1PLAY PHOTOS';
          const metrics = ctx.measureText(badgeText);
          const padX = 14;
          const padY = 8;
          const dotRadius = 3.5;
          const dotSpacing = 8;
          const pillWidth = metrics.width + padX * 2 + dotRadius * 2 + dotSpacing;
          const pillHeight = badgeFontSize + padY * 2;
          const pillX = canvas.width - 28 - pillWidth;
          const pillY = canvas.height - 28 - pillHeight;

          // Draw rounded pill: fill rgba(18, 19, 22, 0.85), 1px stroke rgba(47, 211, 93, 0.5)
          drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
          ctx.fillStyle = 'rgba(18, 19, 22, 0.85)';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(47, 211, 93, 0.5)';
          ctx.stroke();

          // Emerald accent dot
          ctx.beginPath();
          ctx.arc(pillX + padX + dotRadius, pillY + pillHeight / 2, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#2FD35D';
          ctx.fill();

          // Render badge text
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 1;
          ctx.fillText(badgeText, pillX + padX + dotRadius * 2 + dotSpacing, pillY + pillHeight / 2);
          ctx.restore();
        }

        // Convert to data URL (JPEG, 0.82)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load image for watermarking: ${sourceUrl}`));
    };

    img.src = sourceUrl;
  });
}
