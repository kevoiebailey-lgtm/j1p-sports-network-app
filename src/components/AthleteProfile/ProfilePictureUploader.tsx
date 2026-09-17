import React, { useState } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { Camera, Loader2, CheckCircle2, AlertCircle, Upload, Zap } from 'lucide-react';
import { storage, auth, db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { compressImage } from '../../lib/imageCompressor';

interface ProfilePictureUploaderProps {
  currentPhotoUrl?: string;
  onSuccess?: (newUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({
  currentPhotoUrl,
  onSuccess,
  size = 'md'
}) => {
  const { user, profile, updateUserProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const activePhotoUrl = profile?.photoURL || profile?.avatarUrl || currentPhotoUrl || user?.photoURL || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80';

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    let file = acceptedFiles[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setProgress(5);

    // Fast client-side image compression (down to 800x800 max for avatar)
    try {
      file = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
    } catch (cErr) {
      console.warn('Image compression skipped:', cErr);
    }

    const targetUid = user?.uid || profile?.uid || 'guest-user';
    const storageRef = ref(storage, `profile-pictures/${targetUid}_${Date.now()}_${file.name}`);

    try {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(pct);
        },
        (err) => {
          console.warn('Firebase Storage upload failed, falling back to local image data:', err);
          try {
            const reader = new FileReader();
            reader.onload = async (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) {
                if (auth.currentUser) {
                  try {
                    await firebaseUpdateProfile(auth.currentUser, { photoURL: dataUrl });
                  } catch (pErr) {
                    console.warn('Could not update Auth photoURL fallback:', pErr);
                  }
                }
                if (targetUid) {
                  try {
                    const userRef = doc(db, 'users', targetUid);
                    await updateDoc(userRef, {
                      photoURL: dataUrl,
                      photoUrl: dataUrl,
                      avatarUrl: dataUrl,
                      updatedAt: new Date().toISOString()
                    });
                  } catch (uErr) {
                    console.warn('Could not update Firestore user photoURL fallback:', uErr);
                  }
                }
                await updateUserProfile({
                  photoURL: dataUrl,
                  avatarUrl: dataUrl
                });
                setUploading(false);
                setSuccess(true);
                if (onSuccess) onSuccess(dataUrl);
                setTimeout(() => setSuccess(false), 3000);
              } else {
                setError('Failed to process image file.');
                setUploading(false);
              }
            };
            reader.readAsDataURL(file);
          } catch (fallbackErr) {
            console.error('Profile photo upload fallback error:', fallbackErr);
            setError('Failed to upload image. Please try again.');
            setUploading(false);
          }
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // 1. Update Firebase Auth user photoURL if signed in
          if (auth.currentUser) {
            try {
              await firebaseUpdateProfile(auth.currentUser, { photoURL: downloadUrl });
            } catch (e) {
              console.warn('Could not update Firebase Auth photoURL:', e);
            }
          }

          // 2. Update Firestore user document
          if (targetUid) {
            try {
              const userRef = doc(db, 'users', targetUid);
              await updateDoc(userRef, {
                photoURL: downloadUrl,
                photoUrl: downloadUrl,
                avatarUrl: downloadUrl,
                updatedAt: new Date().toISOString()
              });
            } catch (e) {
              console.warn('Could not update Firestore user photoURL:', e);
            }
          }

          // 3. Update AuthContext state
          await updateUserProfile({
            photoURL: downloadUrl,
            avatarUrl: downloadUrl
          });

          setUploading(false);
          setSuccess(true);
          if (onSuccess) onSuccess(downloadUrl);

          setTimeout(() => setSuccess(false), 3000);
        }
      );
    } catch (err) {
      console.error('Error starting photo upload:', err);
      setError('An error occurred during image upload.');
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: false
  } as unknown as DropzoneOptions);

  const dimensionClasses = size === 'sm' ? 'w-20 h-20' : size === 'lg' ? 'w-36 h-36' : 'w-28 h-28';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular Frosted Glass Upload Zone */}
      <div
        {...getRootProps()}
        className={`relative ${dimensionClasses} rounded-full overflow-hidden border-2 transition-all duration-300 cursor-pointer group shadow-[0_0_25px_rgba(214,28,36,0.25)] ${
          isDragActive
            ? 'border-[#E5B868] bg-[#E5B868]/20 scale-105'
            : 'border-white/20 hover:border-[#E5B868] bg-black/40 backdrop-blur-xl'
        }`}
      >
        <input {...getInputProps()} />

        {/* Current Image */}
        <img
          src={activePhotoUrl}
          alt="Profile Avatar"
          className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300 opacity-90"
        />

        {/* Circular Frosted Overlay on Hover or Uploading */}
        <div
          className={`absolute inset-0 rounded-full backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-300 ${
            uploading || isDragActive ? 'opacity-100 bg-black/70' : 'opacity-0 group-hover:opacity-100 bg-black/60'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center text-[#E5B868]">
              <Loader2 className="w-6 h-6 animate-spin mb-1" />
              <span className="text-[10px] font-black font-mono">{progress}%</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-white">
              <Camera className="w-6 h-6 text-[#E5B868] group-hover:scale-110 transition-transform mb-0.5" />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-200">
                {isDragActive ? 'DROP HERE' : 'CHANGE PHOTO'}
              </span>
            </div>
          )}
        </div>

        {/* Camera Badge Corner Icon */}
        <div className="absolute bottom-1 right-1 p-1.5 rounded-full bg-[#E5B868] text-black shadow-lg border border-black/40 group-hover:scale-110 transition-transform">
          <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </div>

      {/* Helper & Feedback Text */}
      <div className="text-center">
        {uploading && (
          <p className="text-xs text-[#E5B868] font-mono animate-pulse flex items-center justify-center gap-1">
            <Upload className="w-3.5 h-3.5" /> Uploading to Firebase Storage... {progress}%
          </p>
        )}
        {success && (
          <p className="text-xs text-[#E5B868] font-bold flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Profile picture updated!
          </p>
        )}
        {error && (
          <p className="text-xs text-rose-400 font-bold flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
        {!uploading && !success && !error && (
          <p className="text-[11px] text-slate-400 font-medium">
            Drag & drop or click to upload profile image (JPG, PNG, max 5MB)
          </p>
        )}
      </div>
    </div>
  );
};
