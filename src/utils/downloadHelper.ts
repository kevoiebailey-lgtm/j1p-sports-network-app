/**
 * Reliable Direct Blob and Streaming Proxy Download Utility
 * 
 * Solves iOS Safari and desktop Chrome blank screen / new tab issues
 * when downloading purchased or free high-res photos.
 */

export async function downloadPhotoFile(mediaUrl: string, filename?: string): Promise<void> {
  if (!mediaUrl) {
    console.error('[downloadPhotoFile] No media URL provided.');
    return;
  }

  const cleanFilename = filename && filename.trim() 
    ? filename.trim() 
    : `just1play_photo_${Date.now()}.jpg`;

  try {
    // Attempt client-side blob download first
    const response = await fetch(mediaUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Network response was not ok (status ${response.status})`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL after small delay
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);
  } catch (err) {
    console.warn('[downloadPhotoFile] Direct client fetch failed (CORS/Network), switching to server streaming proxy:', err);
    // Fallback: Use server streaming proxy which bypasses browser CORS and forces Content-Disposition: attachment
    const proxyUrl = `/api/media/download?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(cleanFilename)}`;
    
    // Create hidden anchor with direct proxy download
    const fallbackLink = document.createElement('a');
    fallbackLink.href = proxyUrl;
    fallbackLink.download = cleanFilename;
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }
}

/**
 * Client-side helper to request a signed photo download URL from the server handler
 * Evaluates permissions (authentication, admin status, ownership/purchase, watermarkEnabled)
 * and returns the appropriate signed download URL.
 */
export async function requestSignedPhotoDownloadUrl(options: {
  photoId: string;
  galleryId?: string;
  albumId?: string;
  authToken?: string;
  userId?: string;
  originalUrl?: string;
  watermarkedUrl?: string;
  filename?: string;
}): Promise<{
  downloadUrl: string;
  isOriginal: boolean;
  watermarkApplied: boolean;
  permissionReason: string;
} | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.authToken) {
      headers['Authorization'] = `Bearer ${options.authToken}`;
    }
    const res = await fetch('/api/media/photo-download-url', {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        downloadUrl: data.downloadUrl || data.url,
        isOriginal: Boolean(data.isOriginal),
        watermarkApplied: Boolean(data.watermarkApplied),
        permissionReason: data.permissionReason || 'watermarked_proof',
      };
    }
  } catch (e) {
    console.warn('[requestSignedPhotoDownloadUrl] Notice requesting signed photo URL:', e);
  }
  return null;
}

export default downloadPhotoFile;
