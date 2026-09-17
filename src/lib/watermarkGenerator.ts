/**
 * Generates a high-quality watermarked version of an image file using client-side Canvas
 */
export async function createWatermarkedImage(
  file: File | Blob | string,
  watermarkText = 'JUST1PLAY • OFFICIAL MEDIA'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof file === 'string' ? file : URL.createObjectURL(file));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original master image
        ctx.drawImage(img, 0, 0);

        // Watermark typography & sizing relative to image width
        const fontSize = Math.max(24, Math.floor(canvas.width / 26));
        ctx.save();
        ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = Math.max(2, Math.floor(fontSize / 10));

        // Center diagonal watermark overlay
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(watermarkText, 0, 0);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();

        // Bottom corner brand badge
        ctx.save();
        const badgeHeight = Math.max(36, Math.floor(fontSize * 1.4));
        const badgeWidth = Math.max(180, Math.floor(fontSize * 7.5));
        const pad = Math.floor(fontSize * 0.8);
        const bx = canvas.width - badgeWidth - pad;
        const by = canvas.height - badgeHeight - pad;

        ctx.fillStyle = 'rgba(9, 13, 22, 0.75)';
        ctx.strokeStyle = 'rgba(0, 184, 212, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeWidth, badgeHeight, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = `800 ${Math.floor(fontSize * 0.45)}px system-ui, sans-serif`;
        ctx.fillStyle = '#00B8D4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('JUST1PLAY PRO PROOF', bx + badgeWidth / 2, by + badgeHeight / 2);
        ctx.restore();

        // Export as JPEG with 0.88 quality for fast network preview
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas watermark rendering fallback:', err);
        resolve(typeof file === 'string' ? file : URL.createObjectURL(file));
      }
    };

    img.onerror = (err) => {
      console.warn('Image load error for watermarking:', err);
      resolve(typeof file === 'string' ? file : URL.createObjectURL(file));
    };

    if (typeof file === 'string') {
      img.src = file;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Generates a watermarked Blob suitable for Firebase Storage upload
 */
export async function createWatermarkedBlob(
  file: File | Blob,
  watermarkText = 'JUST1PLAY • OFFICIAL MEDIA'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const fontSize = Math.max(24, Math.floor(canvas.width / 26));
        ctx.save();
        ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = Math.max(2, Math.floor(fontSize / 10));

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(watermarkText, 0, 0);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();

        // Bottom badge
        ctx.save();
        const badgeHeight = Math.max(36, Math.floor(fontSize * 1.4));
        const badgeWidth = Math.max(180, Math.floor(fontSize * 7.5));
        const pad = Math.floor(fontSize * 0.8);
        const bx = canvas.width - badgeWidth - pad;
        const by = canvas.height - badgeHeight - pad;

        ctx.fillStyle = 'rgba(9, 13, 22, 0.75)';
        ctx.strokeStyle = 'rgba(0, 184, 212, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeWidth, badgeHeight, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = `800 ${Math.floor(fontSize * 0.45)}px system-ui, sans-serif`;
        ctx.fillStyle = '#00B8D4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('JUST1PLAY PRO PROOF', bx + badgeWidth / 2, by + badgeHeight / 2);
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        console.warn('Watermarked blob creation fallback:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
