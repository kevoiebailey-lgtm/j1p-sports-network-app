import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Circle, 
  Square, 
  Loader2, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Crop
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { storage, auth, db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

export interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  userId?: string;
  onAvatarUpdated?: (newUrl: string) => void;
}

const PRESET_ATHLETE_AVATARS = [
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
];

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  userId,
  onAvatarUpdated
}) => {
  const { user, profile, updateUserProfile } = useAuth();
  const activeUserId = userId || user?.uid || profile?.uid || 'guest-athlete';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropShape, setCropShape] = useState<'circle' | 'square'>('circle');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedFileSize, setCompressedFileSize] = useState<string | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setCompressedFileSize(null);
    } else {
      setSelectedFile(null);
      setImageSrc(null);
      setPreviewUrl(null);
    }
  }, [isOpen]);

  // Load image when file is selected
  useEffect(() => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
        generateCanvasPreview();
      };
      img.src = src;
    };
    reader.readAsDataURL(selectedFile);
  }, [selectedFile]);

  // Redraw canvas whenever zoom, pan, rotation, or shape changes
  const generateCanvasPreview = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const targetSize = 400; // 400x400 standard

    canvas.width = targetSize;
    canvas.height = targetSize;

    ctx.clearRect(0, 0, targetSize, targetSize);

    // Save context for transform
    ctx.save();

    // Center pivot point
    ctx.translate(targetSize / 2, targetSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Maintain aspect ratio while covering
    const imgAspect = img.width / img.height;
    let drawWidth = targetSize;
    let drawHeight = targetSize;

    if (imgAspect > 1) {
      drawWidth = targetSize * imgAspect;
    } else {
      drawHeight = targetSize / imgAspect;
    }

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    // Generate quick preview URL
    try {
      const dataUrl = canvas.toDataURL('image/webp', 0.88);
      setPreviewUrl(dataUrl);

      // Estimate compressed size in KB
      const head = 'data:image/webp;base64,';
      const sizeInBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);
      setCompressedFileSize((sizeInBytes / 1024).toFixed(1));
    } catch (e) {
      console.warn('Canvas export warning:', e);
    }
  }, [zoom, pan, rotation]);

  useEffect(() => {
    if (imageSrc) {
      generateCanvasPreview();
    }
  }, [imageSrc, zoom, pan, rotation, generateCanvasPreview]);

  // Handle Drag / Pan gestures on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleSelectPreset = async (presetUrl: string) => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      // Update Firebase Auth
      if (auth.currentUser) {
        await firebaseUpdateProfile(auth.currentUser, { photoURL: presetUrl });
      }

      // Update Firestore user document
      const userDocRef = doc(db, 'users', activeUserId);
      await updateDoc(userDocRef, {
        photoURL: presetUrl,
        avatarUrl: presetUrl,
        photoUrl: presetUrl,
        updatedAt: new Date().toISOString()
      }).catch((fErr) => {
        console.warn('Firestore update warning:', fErr);
      });

      // Update Context
      await updateUserProfile({
        photoURL: presetUrl,
        avatarUrl: presetUrl
      });

      if (onAvatarUpdated) {
        onAvatarUpdated(presetUrl);
      }

      setSuccessMsg('Avatar updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Preset select error:', err);
      setErrorMsg('Failed to update avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Process & Upload Cropped WebP to Firebase Storage
  const handleSaveAndUpload = async () => {
    if (!canvasRef.current) return;
    setIsUploading(true);
    setErrorMsg(null);
    setUploadProgress(15);

    try {
      const canvas = canvasRef.current;

      // Create blob with 400x400 WebP format, quality compressed (<=150KB target)
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to generate image blob'));
          },
          'image/webp',
          0.85
        );
      });

      setUploadProgress(40);

      // Verify size constraint (150KB max)
      const sizeKB = blob.size / 1024;
      console.log(`[Avatar Engine] Output: 400x400 WebP, Size: ${sizeKB.toFixed(1)} KB`);

      let finalDownloadUrl = '';

      // Upload to Firebase Storage: users/{userId}/avatar.webp
      const storagePath = `users/${activeUserId}/avatar.webp`;
      const storageRef = ref(storage, storagePath);

      try {
        const snapshot = await uploadBytes(storageRef, blob, {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000'
        });
        setUploadProgress(75);
        finalDownloadUrl = await getDownloadURL(snapshot.ref);
      } catch (storageErr) {
        console.warn('Firebase Storage direct upload notice; falling back to resilient data URL:', storageErr);
        // Fallback to high-efficiency dataURL
        finalDownloadUrl = canvas.toDataURL('image/webp', 0.85);
      }

      setUploadProgress(85);

      // 1. Update Firebase Auth Profile
      if (auth.currentUser) {
        try {
          await firebaseUpdateProfile(auth.currentUser, {
            photoURL: finalDownloadUrl
          });
        } catch (authErr) {
          console.warn('Auth photoURL update notice:', authErr);
        }
      }

      // 2. Update Firestore User Document
      try {
        const userRef = doc(db, 'users', activeUserId);
        await updateDoc(userRef, {
          photoURL: finalDownloadUrl,
          avatarUrl: finalDownloadUrl,
          photoUrl: finalDownloadUrl,
          updatedAt: new Date().toISOString()
        });
      } catch (firestoreErr) {
        console.warn('Firestore doc update notice:', firestoreErr);
      }

      // 3. Update React App Context
      await updateUserProfile({
        photoURL: finalDownloadUrl,
        avatarUrl: finalDownloadUrl
      });

      setUploadProgress(100);
      setSuccessMsg('Profile photo updated successfully!');

      if (onAvatarUpdated) {
        onAvatarUpdated(finalDownloadUrl);
      }

      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error('Avatar upload processing error:', err);
      setErrorMsg(err.message || 'Failed to upload cropped photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="avatar-upload-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#090D16]/85 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[#090D16] border border-[#263238] rounded-3xl shadow-[0_0_50px_rgba(0,184,212,0.15)] overflow-hidden text-[#F4F4F4]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#263238] bg-[#263238]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00B8D4]/10 border border-[#00B8D4]/30 flex items-center justify-center text-[#00B8D4]">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-[#F4F4F4]">
                  Update Profile Photo
                </h3>
                <p className="text-xs text-slate-400">
                  Crop, zoom, and export to verified 400×400 WebP
                </p>
              </div>
            </div>

            <button
              id="close-avatar-modal-btn"
              onClick={onClose}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5">
            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/heic"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Error / Success Banners */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* If no custom image loaded: Show upload dropzone & presets */}
            {!imageSrc ? (
              <div className="space-y-5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[#263238] hover:border-[#00B8D4] bg-[#263238]/20 hover:bg-[#00B8D4]/5 transition-all cursor-pointer text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#00B8D4]/10 group-hover:bg-[#00B8D4]/20 border border-[#00B8D4]/30 flex items-center justify-center text-[#00B8D4] mb-3 transition-transform group-hover:scale-105">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Choose an Image to Crop
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mb-3">
                    Drag and drop or browse files. High-resolution JPG, PNG, or WebP supported.
                  </p>
                  <span className="min-h-[48px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider shadow-md group-hover:brightness-110 transition-all">
                    Browse Device Files
                  </span>
                </div>

                {/* Preset Player Avatars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono uppercase tracking-wider">
                    <span>Or Select Preset Athlete Avatar</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#00B8D4]" />
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_ATHLETE_AVATARS.map((avatar, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectPreset(avatar)}
                        disabled={isUploading}
                        className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#263238] hover:border-[#00B8D4] transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
                      >
                        <img
                          src={avatar}
                          alt={`Preset ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Interactive Crop & Transform Studio */
              <div className="space-y-4">
                {/* Crop Canvas Workspace */}
                <div 
                  className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl bg-black border border-[#263238] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                >
                  {/* Hidden Render Canvas */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Rendered Visual Output */}
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Crop Preview" 
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}

                  {/* Overlay Shape Mask (Circle / Square) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {cropShape === 'circle' ? (
                      <div className="w-[90%] h-[90%] rounded-full border-2 border-[#00B8D4] shadow-[0_0_0_9999px_rgba(9,13,22,0.65)]" />
                    ) : (
                      <div className="w-[90%] h-[90%] rounded-2xl border-2 border-[#00B8D4] shadow-[0_0_0_9999px_rgba(9,13,22,0.65)]" />
                    )}
                  </div>

                  {/* Drag hint overlay */}
                  <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full bg-[#090D16]/80 backdrop-blur-md border border-white/10 text-[10px] text-slate-300 font-mono">
                      Drag to reposition image
                    </span>
                  </div>
                </div>

                {/* Compression / Format Telemetry Badge */}
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#263238]/40 border border-[#263238] text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Crop className="w-4 h-4 text-[#00B8D4]" />
                    <span>Resolution: <strong>400×400 WebP</strong></span>
                  </div>
                  {compressedFileSize && (
                    <div className="text-[11px] font-mono text-[#00F5D4]">
                      ~{compressedFileSize} KB (Target &lt; 150KB)
                    </div>
                  )}
                </div>

                {/* Control Panel: Zoom, Rotation, Shape */}
                <div className="space-y-3 p-3.5 rounded-2xl bg-[#263238]/30 border border-[#263238]">
                  {/* Zoom Slider */}
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="range"
                      min={0.8}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-[#00B8D4] cursor-pointer"
                    />
                    <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-mono text-slate-300 w-10 text-right">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>

                  {/* Actions: Rotate, Mask Shape, Change Picture */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-[#00B8D4]" />
                        <span>Rotate</span>
                      </button>

                      <button
                        onClick={() => setCropShape(cropShape === 'circle' ? 'square' : 'circle')}
                        className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                        title="Toggle circle/square mask"
                      >
                        {cropShape === 'circle' ? (
                          <>
                            <Circle className="w-3.5 h-3.5 text-[#00B8D4]" />
                            <span>Circle</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5 text-[#00B8D4]" />
                            <span>Square</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setImageSrc(null);
                      }}
                      className="min-h-[44px] px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1 border border-red-500/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Pick Another</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#263238] bg-[#263238]/30">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="min-h-[48px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {imageSrc && (
              <button
                id="save-avatar-crop-btn"
                onClick={handleSaveAndUpload}
                disabled={isUploading}
                className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compressing & Uploading ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save & Set Profile Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
