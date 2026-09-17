import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { compressImage } from '../lib/imageCompressor';
import { safeAddDoc } from '../lib/firestoreQuotaGuard';
import { fileToDataUrl } from '../lib/imageCompressor';

export const uploadAthleteHighlight = async (
  file: File,
  athleteId: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  // Compress photo before uploading to avoid storage and egress costs
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1200,
        quality: 0.8,
        maxSizeMB: 0.5
      });
    } catch (err) {
      console.warn('Image compression fallback in uploadService:', err);
    }
  }

  return new Promise((resolve, reject) => {
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    const storageRef = ref(storage, `highlights/${athleteId}/${Date.now()}_${fileToUpload.name}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 100;
        onProgress(progress);
      },
      async (error) => {
        console.warn('Firebase Storage upload notice in uploadAthleteHighlight, using resilient fallback:', error);
        try {
          let fallbackUrl = '';
          try {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('title', fileName);
            formData.append('category', 'highlights');
            const res = await fetch('/api/creator/upload-asset', { method: 'POST', body: formData });
            if (res.ok) {
              const data = await res.json();
              if (data?.url) fallbackUrl = data.url;
            }
          } catch (sErr) {
            console.warn('Server upload fallback notice in uploadAthleteHighlight:', sErr);
          }
          if (!fallbackUrl) {
            fallbackUrl = await fileToDataUrl(fileToUpload);
          }

          try {
            if (db) {
              await safeAddDoc(collection(db, 'gallery'), {
                mediaUrl: fallbackUrl,
                imageUrl: fallbackUrl,
                createdAt: new Date().toISOString(),
                title: fileName,
                type: 'photo',
                athleteId: athleteId,
                uploadedBy: athleteId
              });
            }
          } catch (docErr) {
            console.warn('Firestore gallery document creation notice:', docErr);
          }
          resolve(fallbackUrl);
        } catch (fallbackErr) {
          reject(error);
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // Explicitly write resulting download URL to Firestore 'gallery' collection via safeAddDoc
          try {
            if (db) {
              await safeAddDoc(collection(db, 'gallery'), {
                mediaUrl: downloadUrl,
                imageUrl: downloadUrl,
                createdAt: new Date().toISOString(),
                title: fileName,
                type: 'photo',
                athleteId: athleteId,
                uploadedBy: athleteId
              });
            }
          } catch (docErr) {
            console.warn('Firestore gallery document creation notice:', docErr);
          }

          resolve(downloadUrl);
        } catch (err) {
          console.warn('Error retrieving download URL, falling back to data URL:', err);
          try {
            const fallbackDataUrl = await fileToDataUrl(fileToUpload);
            resolve(fallbackDataUrl);
          } catch {
            reject(err);
          }
        }
      }
    );
  });
};

