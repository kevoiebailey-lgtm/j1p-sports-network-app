import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Loader2, 
  Layers, 
  Camera, 
  Tag, 
  Users, 
  Calendar,
  Lock,
  Eye,
  Sliders
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { createWatermarkedImage, createWatermarkedBlob } from '../../lib/watermarkGenerator';
import { uploadMediaAsset, STORAGE_FOLDERS } from '../../services/storageService';
import { GalleryMediaItem } from '../../types';

interface AdminBatchUploadDeskProps {
  onUploadSuccess?: () => void;
  isOpen: boolean;
  onClose: () => void;
  initialAlbumName?: string;
  initialEventName?: string;
  initialSport?: string;
  initialCategory?: string;
}

interface QueuedFile {
  file: File;
  previewUrl: string;
  watermarkedPreviewUrl?: string;
  name: string;
  size: number;
}

const CATEGORIES = [
  'Game Action',
  'Tournaments',
  'Combine / Laser',
  'Team Portraits'
];

const SPORTS = [
  'Football',
  'Basketball',
  'Soccer',
  'Track & Field',
  'Cheer',
  'Volleyball',
  'Baseball',
  'Lacrosse'
];

export const AdminBatchUploadDesk: React.FC<AdminBatchUploadDeskProps> = ({
  onUploadSuccess,
  isOpen,
  onClose,
  initialAlbumName = '',
  initialEventName = '',
  initialSport = 'Basketball',
  initialCategory = 'Game Action'
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [eventName, setEventName] = useState(initialEventName);
  const [albumName, setAlbumName] = useState(initialAlbumName);
  const [category, setCategory] = useState(initialCategory);
  const [sport, setSport] = useState(initialSport);
  const [teamNames, setTeamNames] = useState('');
  const [photographerCredit, setPhotographerCredit] = useState(profile?.displayName || 'Apex Pro Media');
  const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Sync with initial props when changed or opened
  React.useEffect(() => {
    if (initialAlbumName) setAlbumName(initialAlbumName);
    if (initialEventName) setEventName(initialEventName);
    if (initialSport) setSport(initialSport);
    if (initialCategory) setCategory(initialCategory);
  }, [initialAlbumName, initialEventName, initialSport, initialCategory, isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: QueuedFile[] = acceptedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setFiles((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxSize: 25 * 1024 * 1024 // 25MB max per image
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      showToast('error', 'No Photos Selected', 'Please select or drag in at least one photo to publish.');
      return;
    }

    if (!eventName.trim()) {
      showToast('error', 'Missing Event Name', 'Please provide an event or tournament title.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const parsedTeams = teamNames
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const galleryRef = collection(db, 'gallery');
      const mediaVaultRef = collection(db, 'media_vault');

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        
        // 1. Upload original photo to Firebase Storage under /media_vault/photos/
        const storageDownloadUrl = await uploadMediaAsset(
          item.file,
          STORAGE_FOLDERS.MEDIA_VAULT_PHOTOS,
          (fileProgress) => {
            const overallProgress = Math.round(
              ((i + fileProgress / 100) / files.length) * 85
            ) + 10;
            setUploadProgress(overallProgress);
          }
        );

        // 2. Generate and upload watermarked version if enabled
        let watermarkedUrl = storageDownloadUrl;
        if (isWatermarkEnabled) {
          try {
            const wmBlob = await createWatermarkedBlob(item.file);
            const wmFile = new File([wmBlob], `wm_${item.file.name}`, { type: 'image/jpeg' });
            watermarkedUrl = await uploadMediaAsset(wmFile, STORAGE_FOLDERS.MEDIA_VAULT_PHOTOS);
          } catch (wmErr) {
            console.warn('Watermark generation notice, using master url:', wmErr);
            watermarkedUrl = storageDownloadUrl;
          }
        }

        const resolvedAlbumName = albumName.trim() || eventName.trim() || 'General Event Media';
        const resolvedEventName = eventName.trim() || albumName.trim() || 'Sports Event';

        const mediaDoc = {
          imageUrl: storageDownloadUrl,
          originalUrl: storageDownloadUrl,
          watermarkedUrl: isWatermarkEnabled ? watermarkedUrl : storageDownloadUrl,
          previewUrl: isWatermarkEnabled ? watermarkedUrl : storageDownloadUrl,
          mediaUrl: storageDownloadUrl,
          thumbUrl: isWatermarkEnabled ? watermarkedUrl : storageDownloadUrl,
          isWatermarked: isWatermarkEnabled,
          photographerId: user?.uid || 'admin-photographer',
          photographerName: photographerCredit.trim() || 'Official Media Partner',
          eventName: resolvedEventName,
          albumName: resolvedAlbumName,
          albumTitle: resolvedAlbumName,
          category,
          sport,
          teams: parsedTeams,
          title: `${resolvedEventName} • Action Shot #${i + 1}`,
          caption: `${category} highlight captured at ${resolvedEventName}`,
          hypesCount: Math.floor(Math.random() * 15) + 5,
          userHypes: {},
          createdAt: serverTimestamp(),
          resolution: '4K Ultra-HD (3840x2160)',
          tags: [sport.toLowerCase(), category.toLowerCase(), ...parsedTeams.map((t) => t.toLowerCase())],
          price: 9.99
        };

        const docRef = await addDoc(galleryRef, mediaDoc);

        // Also dual-index into media_vault collection
        try {
          await addDoc(mediaVaultRef, {
            title: mediaDoc.title,
            originalUrl: storageDownloadUrl,
            previewUrl: watermarkedUrl,
            mediaType: 'image',
            sport,
            category,
            creatorId: user?.uid || 'admin',
            creatorName: photographerCredit.trim() || 'Official Media Partner',
            creatorRole: profile?.role || 'admin',
            sourceGalleryId: docRef.id,
            createdAt: serverTimestamp()
          });
        } catch (vErr) {
          console.warn('Vault dual-index notice:', vErr);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 90) + 10);
      }

      showToast('success', '⚡ Batch Upload Complete', `Successfully uploaded ${files.length} 4K media item(s) to /media_vault/ and published to the Photo Vault.`);
      setFiles([]);
      if (onUploadSuccess) onUploadSuccess();
      onClose();
    } catch (err: any) {
      console.error('Batch upload error:', err);
      const friendlyMessage = err?.message || 'Failed to upload media items to storage.';
      showToast('error', 'Upload Error', friendlyMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bg-[#263238] border border-[#00B8D4]/40 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden text-white animate-fadeIn">
      {/* Decorative Cyan Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#00B8D4]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00B8D4]/20 border border-[#00B8D4]/50 flex items-center justify-center text-[#00B8D4] shrink-0 shadow-[0_0_12px_rgba(0,184,212,0.3)]">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Admin / Photographer Batch Upload Desk
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#00B8D4]/15 border border-[#00B8D4]/40 text-[#00B8D4] text-[10px] font-black uppercase">
                Pro Vault
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Bulk-upload high-resolution game action shots, team portraits & combine media with automated watermarking.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          aria-label="Close upload desk"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleBatchUpload} className="space-y-5 relative z-10">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragActive 
              ? 'border-[#00B8D4] bg-[#00B8D4]/10 scale-[1.01]' 
              : 'border-slate-600 hover:border-[#00B8D4]/60 bg-slate-900/60 hover:bg-slate-900/80'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-[#00B8D4]/15 border border-[#00B8D4]/40 flex items-center justify-center text-[#00B8D4] shadow-[0_0_15px_rgba(0,184,212,0.2)]">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Drag & drop multiple high-res photos, or <span className="text-[#00B8D4] underline">browse files</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supports JPG, PNG, WEBP up to 25MB per image.
              </p>
            </div>
          </div>
        </div>

        {/* Selected Files Preview Grid */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Selected Images ({files.length})</span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-2 bg-slate-900/70 border border-slate-700/60 rounded-xl">
              {files.map((item, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800 aspect-square">
                  <img 
                    src={item.previewUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-600/90 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] font-mono text-slate-300 px-1 rounded truncate max-w-[90%]">
                    {(item.size / (1024 * 1024)).toFixed(1)}MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Event or Game Name *
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. High School Football Game, Varsity Basketball, or Tournament"
              required
              className="w-full h-11 px-3.5 bg-slate-900/80 border border-slate-700 focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] rounded-xl text-xs sm:text-sm text-white outline-none transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Can be any event, high school game, matchup, or tournament.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Album / Matchup Name (Optional)
            </label>
            <input
              type="text"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              placeholder="e.g. Lincoln High vs Oak Ridge - 4th Quarter"
              className="w-full h-11 px-3.5 bg-slate-900/80 border border-slate-700 focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] rounded-xl text-xs sm:text-sm text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Photographer Credit *
            </label>
            <input
              type="text"
              value={photographerCredit}
              onChange={(e) => setPhotographerCredit(e.target.value)}
              placeholder="e.g. Apex Media Lab • Mark Davis"
              required
              className="w-full h-11 px-3.5 bg-slate-900/80 border border-slate-700 focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] rounded-xl text-xs sm:text-sm text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 bg-slate-900/80 border border-slate-700 focus:border-[#00B8D4] rounded-xl text-xs sm:text-sm text-white outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Sport
            </label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full h-11 px-3 bg-slate-900/80 border border-slate-700 focus:border-[#00B8D4] rounded-xl text-xs sm:text-sm text-white outline-none"
            >
              {SPORTS.map((sp) => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Team Names (comma separated)
            </label>
            <input
              type="text"
              value={teamNames}
              onChange={(e) => setTeamNames(e.target.value)}
              placeholder="e.g. Bergen Lightning, North Jersey Vipers"
              className="w-full h-11 px-3.5 bg-slate-900/80 border border-slate-700 focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] rounded-xl text-xs sm:text-sm text-white outline-none transition-all"
            />
          </div>
        </div>

        {/* Watermark Switch Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isWatermarkEnabled ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-slate-800 text-slate-400'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Auto-Overlay JUST1PLAY Watermark onto Public Previews
              </p>
              <p className="text-[11px] text-slate-400">
                Protects photographer copyright with semi-transparent brand overlay. Clean high-res master is preserved for verified buyers.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isWatermarkEnabled}
              onChange={(e) => setIsWatermarkEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B8D4]" />
          </label>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-[#00B8D4]">
              <span>Publishing High-Resolution Vault Items...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00B8D4] to-[#FF6A00] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit & Cancel Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isUploading || files.length === 0}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_20px_rgba(0,184,212,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Vault Items...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#090D16]" />
                <span>Publish {files.length} Photo{files.length === 1 ? '' : 's'} to Vault</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
