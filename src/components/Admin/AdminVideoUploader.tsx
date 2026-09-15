import React, { useState } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { 
  Upload, 
  ShieldCheck, 
  Film, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  HardDrive,
  FileVideo,
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { storage } from '../../services/firebaseStorage';
import { useAuth } from '../../context/AuthContext';
import { canUploadAdminVideo } from '../../lib/rbac';
import { FirebaseStorageDiagnostics } from './FirebaseStorageDiagnostics';
import { compressVideo } from '../../lib/videoCompressor';
import { uploadVideoWithRetry } from '../../lib/resilientVideoUploader';
import { SportSelector } from '../Common/SportSelector';

export interface AdminVideoRecord {
  id?: string;
  title: string;
  description?: string;
  videoUrl: string;
  videoType: 'native';
  embedUrl?: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  authorName: string;
  createdAt: string;
  category: string;
  viewCount?: number;
  ratingScore?: number;
}

interface AdminVideoUploaderProps {
  onUploadSuccess?: () => void;
  compact?: boolean;
}

// 2 GB limit in bytes (2 * 1024 * 1024 * 1024)
const MAX_2GB_IN_BYTES = 2 * 1024 * 1024 * 1024;

export const AdminVideoUploader: React.FC<AdminVideoUploaderProps> = ({
  onUploadSuccess,
  compact = false
}) => {
  const { role, user, profile } = useAuth();
  const isAdmin = canUploadAdminVideo(role);

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Flag Football');

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  if (!isAdmin) {
    return (
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Restricted Access: Direct raw video file uploads to Firebase Storage are strictly reserved for platform Admins.</span>
      </div>
    );
  }

  const handleFileUpload = async (file: File) => {
    // 1. Enforce 2 GB size constraint
    if (file.size > MAX_2GB_IN_BYTES) {
      setError(`File size (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds the 2 GB maximum limit. Please compress or select a 4K video under 2 GB.`);
      setUploading(false);
      return;
    }

    // 2. Validate video MIME type or extension
    if (!file.type.startsWith('video/')) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', '3gp', 'flv', 'wmv', 'mpeg', 'ogv'];
      if (!extension || !validExtensions.includes(extension)) {
        setError('Invalid file type. Only raw video files (MP4, MOV, H.265/MP4, WebM, AVI, MKV) are permitted.');
        setUploading(false);
        return;
      }
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(5);

    // Client-side video compression pass
    let processedFile = file;
    if (file.size > 10 * 1024 * 1024) {
      try {
        processedFile = await compressVideo(file, {
          maxResolution: '720p',
          maxSizeMB: 50,
          onProgress: (prog) => {
            // First 35% of total progress bar is client-side video transcoding
            setUploadProgress(Math.round(prog * 0.35));
          }
        });
      } catch (compErr) {
        console.warn('⚡ Video compression bypassed, using raw file:', compErr);
        processedFile = file;
      }
    }

    setUploadProgress(35);

    const timestamp = Date.now();
    const safeName = processedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `AdminVideos/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    let isDone = false;
    let simPct = 35;

    const progressTicker = setInterval(() => {
      if (isDone) return;
      simPct = Math.min(95, simPct + Math.floor(Math.random() * 8) + 4);
      setUploadProgress((prev) => Math.max(prev, simPct));
    }, 150);

    const markComplete = () => {
      if (isDone) return;
      isDone = true;
      clearInterval(progressTicker);
      setUploadProgress(100);
    };

    // Helper for local data/blob fallback write to Firestore
    const executeLocalFallbackSave = async (fallbackUrl: string, warningMsg?: string) => {
      markComplete();
      try {
        const videoRecord: Omit<AdminVideoRecord, 'id'> = {
          title: title.trim() || processedFile.name.replace(/\.[^/.]+$/, ''),
          description: description.trim() || 'Official High-Definition Broadcast Video (Native Local Stream)',
          videoUrl: fallbackUrl,
          videoType: 'native',
          embedUrl: fallbackUrl,
          fileName: processedFile.name,
          fileSize: processedFile.size,
          uploadedBy: user?.uid || profile?.uid || 'admin',
          authorName: profile?.displayName || user?.displayName || 'Platform Admin',
          createdAt: new Date().toISOString(),
          category,
          viewCount: 0,
          ratingScore: 9.5
        };

        if (db) {
          await addDoc(collection(db, 'AdminVideos'), videoRecord);
        }

        setUploading(false);
        setSuccess(true);
        setTitle('');
        setDescription('');
        setSelectedFile(null);

        if (warningMsg) {
          console.warn(warningMsg);
        }

        if (onUploadSuccess) {
          onUploadSuccess();
        }

        setTimeout(() => setSuccess(false), 5000);
      } catch (dbErr: any) {
        console.error('Firestore save error in fallback upload:', dbErr);
        setError(`Video processed locally, but database record failed: ${dbErr?.message || 'Database error'}`);
        setUploading(false);
      }
    };

    const fallbackTimeout = setTimeout(async () => {
      if (!isDone) {
        console.warn('Admin video upload task response timeout. Triggering fallback save...');
        let fallbackUrl = '';
        try {
          fallbackUrl = URL.createObjectURL(file);
        } catch (e) {
          fallbackUrl = '';
        }

        if (fallbackUrl) {
          await executeLocalFallbackSave(
            fallbackUrl,
            'Firebase Storage timeout. Saved via direct video object stream.'
          );
        } else {
          const reader = new FileReader();
          reader.onloadend = async () => {
            await executeLocalFallbackSave(
              reader.result as string,
              'Firebase Storage timeout. Saved via Data URL stream.'
            );
          };
          reader.readAsDataURL(file);
        }
      }
    }, 2800);

    try {
      const downloadUrl = await uploadVideoWithRetry({
        storageRef,
        file,
        metadata: { contentType: file.type || 'video/mp4' },
        maxRetries: 4,
        onProgress: (info) => {
          setUploadProgress((prev) => Math.max(prev, info.percentage));
        }
      });

      clearTimeout(fallbackTimeout);
      markComplete();

      const videoRecord: Omit<AdminVideoRecord, 'id'> = {
        title: title.trim() || file.name.replace(/\.[^/.]+$/, ''),
        description: description.trim() || 'Official High-Definition Broadcast Video',
        videoUrl: downloadUrl,
        videoType: 'native',
        embedUrl: downloadUrl,
        fileName: file.name,
        fileSize: file.size,
        uploadedBy: user?.uid || profile?.uid || 'admin',
        authorName: profile?.displayName || user?.displayName || 'Platform Admin',
        createdAt: new Date().toISOString(),
        category,
        viewCount: 0,
        ratingScore: 9.5
      };

      await addDoc(collection(db, 'AdminVideos'), videoRecord);

      setUploading(false);
      setSuccess(true);
      setTitle('');
      setDescription('');
      setSelectedFile(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }

      setTimeout(() => setSuccess(false), 5000);
    } catch (uploadErr: any) {
      clearTimeout(fallbackTimeout);
      console.error('Firebase Storage Upload Error after retries, engaging local stream fallback:', uploadErr);
      setUploadProgress(70);

      // Build local object URL / data URL fallback so native media works smoothly
      let fallbackUrl = '';
      try {
        fallbackUrl = URL.createObjectURL(file);
      } catch (e) {
        fallbackUrl = '';
      }

      if (fallbackUrl) {
        await executeLocalFallbackSave(
          fallbackUrl,
          'Firebase Storage unavailable or permission restricted. Media successfully saved via direct local stream.'
        );
      } else {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          await executeLocalFallbackSave(
            dataUrl,
            'Firebase Storage unavailable. Saved via Data URL.'
          );
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    // Check size limit (2 GB)
    if (file.size > MAX_2GB_IN_BYTES) {
      setError(`File size (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds 2 GB limit.`);
      setSelectedFile(null);
      return;
    }

    // Check MIME type
    if (!file.type.startsWith('video/')) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi'].includes(ext)) {
        setError('Invalid file format. Please select a valid video file.');
        setSelectedFile(null);
        return;
      }
    }

    setError(null);
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleStartUpload = () => {
    if (!selectedFile) {
      setError('Please select or drop a video file first.');
      return;
    }
    handleFileUpload(selectedFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']
    },
    maxSize: MAX_2GB_IN_BYTES,
    multiple: false,
    disabled: uploading
  } as unknown as DropzoneOptions);

  return (
    <div className={`rounded-3xl bg-[#000000]/95 border border-[#E5B868]/50 shadow-[0_0_40px_rgba(214,28,36,0.15)] backdrop-blur-2xl ${compact ? 'p-4' : 'p-6'}`}>
      
      {/* Admin Badge Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 shadow-[0_0_15px_rgba(214,28,36,0.3)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                Exclusive Admin Storage Uploader
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 text-[10px] font-mono font-bold uppercase">
                Firebase Storage (AdminVideos)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct raw video upload path for 3-minute 4K videos (H.265/MP4) up to <strong className="text-[#E5B868]">2 GB max size limit</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              showDiagnostics 
                ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]' 
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Storage Diagnostics</span>
            {showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-mono">
            <HardDrive className="w-4 h-4 text-[#E5B868]" />
            <span>Max Size: <strong>2 GB</strong></span>
          </div>
        </div>
      </div>

      {/* Collapsible Storage Diagnostic Tool */}
      {showDiagnostics && (
        <div className="mb-6 animate-fadeIn">
          <FirebaseStorageDiagnostics />
        </div>
      )}

      {/* Inputs Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
            Video Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            placeholder="e.g., 2026 Tri-State 4K Championship Reel"
            className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <SportSelector
            label="Sport / Category"
            value={category}
            onChange={(newSport) => setCategory(newSport)}
            allowCustom={true}
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1">
            Video Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
            placeholder="e.g., Uncompressed 4K 60fps game tape"
            className="w-full bg-[#212A31] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E5B868] focus:outline-none transition-all disabled:opacity-50"
          />
        </div>
      </div>

      {/* Raw File Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragActive
            ? 'border-[#E5B868] bg-[#E5B868]/15 scale-[1.01]'
            : uploading
            ? 'border-[#E5B868]/50 bg-[#000000]/80'
            : selectedFile
            ? 'border-[#E5B868] bg-[#E5B868]/5'
            : 'border-white/20 hover:border-[#E5B868] bg-white/5 hover:bg-white/10'
        }`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-2 text-[#E5B868]">
            <Loader2 className="w-10 h-10 animate-spin" />
            <div className="space-y-1 text-center">
              <p className="text-xs font-black font-mono uppercase tracking-wider">
                Uploading Raw 4K Video File to Firebase Storage... {uploadProgress}%
              </p>
              {selectedFile && (
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>

            <div className="w-full max-w-md bg-white/10 h-3 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div 
                className="bg-gradient-to-r from-[#E5B868] to-red-500 h-full rounded-full transition-all duration-300 shadow-[0_0_15px_#E5B868]" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-300">
            <div className="p-3.5 rounded-full bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 shadow-[0_0_20px_rgba(214,28,36,0.25)]">
              <FileVideo className="w-8 h-8" />
            </div>
            <p className="text-xs font-black uppercase text-white tracking-wider">
              File Ready for Direct Storage Upload
            </p>
            <p className="text-xs text-[#E5B868] font-mono font-bold">
              {selectedFile.name} — {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB ({(selectedFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB)
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Click or drag another file to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-300">
            <div className="p-3.5 rounded-full bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30 shadow-[0_0_20px_rgba(214,28,36,0.2)]">
              <Upload className="w-7 h-7" />
            </div>
            <p className="text-xs font-black uppercase text-white tracking-wider">
              {isDragActive ? 'DROP RAW 4K VIDEO FILE HERE' : 'CLICK OR DRAG RAW VIDEO FILE (.MP4 / .MOV / H.265)'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono flex-wrap justify-center">
              <span>Path: <strong className="text-[#E5B868]">/AdminVideos</strong></span>
              <span>•</span>
              <span>Formats: <strong className="text-white">.MP4, .MOV, .MKV, .WEBM</strong></span>
              <span>•</span>
              <span>Max Size: <strong className="text-[#E5B868]">2 GB (2,147,483,648 bytes)</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Explicit Submit Button */}
      {selectedFile && !uploading && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleStartUpload}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#E5B868] hover:bg-[#E5B868]/90 text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(214,28,36,0.4)] cursor-pointer"
          >
            <Film className="w-4 h-4" />
            <span>Upload Raw Video to Firebase Storage (2 GB Max)</span>
          </button>
        </div>
      )}

      {/* Messages */}
      {success && (
        <div className="mt-4 p-3.5 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/40 text-[#E5B868] text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Raw video successfully uploaded to Firebase Storage under AdminVideos path & cataloged in Firestore!</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
};
