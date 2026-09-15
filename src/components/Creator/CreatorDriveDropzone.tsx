import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  Folder,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Film,
  Image as ImageIcon,
  HardDrive,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Trash2,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Layers,
  Lock
} from 'lucide-react';
import {
  signInWithGoogleDrive,
  getDriveAccessToken,
  fetchCreatorDriveFolders,
  createDriveFolder,
  uploadFileToDrive,
  makeDriveFileShareable,
  checkDrivePermissions,
  DriveFolderItem,
  DriveStorageQuota
} from '../../lib/googleDriveService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  driveFileId?: string;
  error?: string;
  isPublished?: boolean;
}

interface CreatorDriveDropzoneProps {
  onSuccess?: () => void;
  defaultFolderId?: string;
}

export const CreatorDriveDropzone: React.FC<CreatorDriveDropzoneProps> = ({
  onSuccess,
  defaultFolderId
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  // Auth & Folder State
  const [token, setToken] = useState<string | null>(getDriveAccessToken());
  const [isConnecting, setIsConnecting] = useState(false);
  const [quota, setQuota] = useState<DriveStorageQuota | null>(null);
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(defaultFolderId || '');
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  // New folder inline creation
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Queue & Upload state
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Media Publishing Defaults
  const [autoIndexToGallery, setAutoIndexToGallery] = useState(true);
  const [sport, setSport] = useState('Basketball');
  const [eventName, setEventName] = useState('Creator Showcase & Tournament');
  const [albumName, setAlbumName] = useState('Uploaded Assets');
  const [priceUSD, setPriceUSD] = useState('9.99');
  const [isMonetized, setIsMonetized] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load drive state on mount / token change
  useEffect(() => {
    const activeToken = getDriveAccessToken();
    if (activeToken) {
      setToken(activeToken);
      loadDriveDetails(activeToken);
    }
  }, []);

  const loadDriveDetails = async (authToken: string) => {
    setIsLoadingFolders(true);
    try {
      const [quotaData, folderList] = await Promise.allSettled([
        checkDrivePermissions(authToken),
        fetchCreatorDriveFolders(authToken)
      ]);

      if (quotaData.status === 'fulfilled') {
        setQuota(quotaData.value);
      }
      if (folderList.status === 'fulfilled') {
        setFolders(folderList.value);
      }
    } catch (err) {
      console.warn('[CreatorDriveDropzone] Error loading drive data:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleConnectDrive = async () => {
    setIsConnecting(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res?.accessToken) {
        setToken(res.accessToken);
        showToast('success', 'Google Drive Connected', 'Authorized for direct media uploads.');
        await loadDriveDetails(res.accessToken);
      }
    } catch (err: any) {
      console.error('Drive connection error:', err);
      showToast('error', 'Authentication Failed', err?.message || 'Could not connect Google Drive.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const created = await createDriveFolder(token, newFolderName.trim());
      setFolders((prev) => [created, ...prev]);
      setSelectedFolderId(created.id);
      setAlbumName(created.name);
      setNewFolderName('');
      setShowNewFolder(false);
      showToast('success', 'Folder Created', `Google Drive folder "${created.name}" is active.`);
    } catch (err: any) {
      showToast('error', 'Folder Creation Failed', err?.message || 'Could not create folder in Google Drive.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: UploadQueueItem[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type (photos, raw camera photos, videos)
      const isMedia =
        file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        file.name.match(/\.(jpg|jpeg|png|webp|heic|mp4|mov|m4v|webm|raw|cr2|nef|arw)$/i);

      if (!isMedia) {
        showToast('info', 'Skipped Non-Media File', `${file.name} is not a recognized photo or video.`);
        return;
      }

      let previewUrl = '';
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl,
        status: 'pending',
        progress: 0
      });
    });

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      showToast('info', 'Files Added', `${newItems.length} file(s) ready for Google Drive upload.`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
    // reset input so the same files can be re-added if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  // Upload Single Item
  const uploadSingleItem = async (item: UploadQueueItem, currentToken: string) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 20 } : q))
    );

    try {
      // 1. Upload to Google Drive folder
      const customDesc = `Uploaded by ${profile?.displayName || user?.displayName || 'Creator'} via Just1Play Studio`;
      const uploadedFile = await uploadFileToDrive(
        currentToken,
        item.file,
        selectedFolderId || undefined,
        customDesc
      );

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, progress: 60 } : q))
      );

      // 2. Set Public Sharing permission on Drive
      await makeDriveFileShareable(currentToken, uploadedFile.id);

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, progress: 85 } : q))
      );

      // 3. Index to Just1Play Media Gallery in Firestore if requested
      if (autoIndexToGallery && db && user?.uid) {
        const fileId = uploadedFile.id;
        const isVideo = item.file.type.startsWith('video/') || item.file.name.match(/\.(mp4|mov|m4v|webm)$/i);
        
        const previewSrc = isVideo
          ? `https://drive.google.com/file/d/${fileId}/preview`
          : `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
        const downloadSrc = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const thumbnailSrc = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;

        const cleanTitle = item.file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

        const docData = {
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          caption: `${sport} media: ${cleanTitle}`,
          eventName: eventName.trim() || 'Tournament Media',
          albumName: albumName.trim() || 'Creator Collection',
          sport,
          category: isVideo ? 'Game Film' : 'Game Action',
          tags: [sport.toLowerCase(), isVideo ? 'video' : 'photo', 'google-drive', 'creator-upload'],
          videoUrl: isVideo ? previewSrc : '',
          originalUrl: downloadSrc,
          watermarkedUrl: previewSrc,
          thumbnailUrl: thumbnailSrc,
          thumbUrl: thumbnailSrc,
          googleDriveFileId: fileId,
          driveFileId: fileId,
          isWatermarked: false,
          photographerId: user.uid,
          photographerName: profile?.displayName || user.displayName || 'Official Creator',
          photographer: profile?.displayName || user.displayName || 'Official Creator',
          hypesCount: 0,
          userHypes: {},
          isForSale: !!isMonetized,
          priceUSD: isMonetized ? parseFloat(priceUSD) || 9.99 : 0,
          price: isMonetized ? parseFloat(priceUSD) || 9.99 : 0,
          fileSize: item.file.size,
          mimeType: item.file.type,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'gallery'), docData);
      }

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'completed', progress: 100, driveFileId: uploadedFile.id, isPublished: autoIndexToGallery }
            : q
        )
      );
    } catch (err: any) {
      console.error(`Upload error for ${item.file.name}:`, err);
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'error', progress: 0, error: err?.message || 'Upload failed' }
            : q
        )
      );
    }
  };

  // Upload All Pending in Queue
  const handleUploadAll = async () => {
    const activeToken = getDriveAccessToken() || token;
    if (!activeToken) {
      showToast('error', 'Drive Not Connected', 'Please connect your Google Drive account first.');
      return;
    }

    const pendingItems = queue.filter((item) => item.status === 'pending' || item.status === 'error');
    if (pendingItems.length === 0) {
      showToast('info', 'No Files', 'Please select or drag media files to upload.');
      return;
    }

    setIsUploadingAll(true);

    // Process concurrently in chunks of 3
    const CHUNK_SIZE = 3;
    for (let i = 0; i < pendingItems.length; i += CHUNK_SIZE) {
      const chunk = pendingItems.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map((item) => uploadSingleItem(item, activeToken)));
    }

    setIsUploadingAll(false);
    showToast('success', 'Upload Batch Complete', 'Media files successfully saved to your Google Drive folder.');
    if (onSuccess) onSuccess();
  };

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const completedCount = queue.filter((i) => i.status === 'completed').length;
  const errorCount = queue.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Google Drive Authorization Bar */}
      <div className="p-6 rounded-3xl bg-[#171F2C]/90 border border-white/10 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <HardDrive className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white font-sans tracking-tight">
                  Google Drive Direct Media Ingestion
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                  Creator Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Drag and drop raw game photos &amp; 4K videos directly into your authorized Google Drive folders.
              </p>
            </div>
          </div>

          {!token ? (
            <button
              onClick={handleConnectDrive}
              disabled={isConnecting}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Connect Google Drive</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Drive Active ({quota?.userEmail || 'Connected'})</span>
              </div>
              <button
                onClick={() => token && loadDriveDetails(token)}
                disabled={isLoadingFolders}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Refresh Drive Folders"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingFolders ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Folder Selection & Destination Controller */}
        {token && (
          <div className="mt-5 pt-5 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5 mb-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-400" />
                <span>Destination Google Drive Folder</span>
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedFolderId}
                  onChange={(e) => {
                    setSelectedFolderId(e.target.value);
                    const sel = folders.find((f) => f.id === e.target.value);
                    if (sel) setAlbumName(sel.name);
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                >
                  <option value="">Root / My Drive</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewFolder(!showNewFolder)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-emerald-400 text-xs font-bold font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>New Folder</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00B8D4]" />
                <span>Auto-Publish to Just1Play Store</span>
              </label>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-700">
                <span className="text-xs text-slate-300 font-mono pl-1">
                  List items immediately in public gallery
                </span>
                <button
                  type="button"
                  onClick={() => setAutoIndexToGallery(!autoIndexToGallery)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    autoIndexToGallery ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      autoIndexToGallery ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline Create Folder Input */}
        {showNewFolder && token && (
          <form onSubmit={handleCreateFolder} className="mt-3 p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/40 flex items-center gap-2">
            <input
              type="text"
              required
              placeholder="e.g. 2026 Bay Area Championship Highlights"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
            />
            <button
              type="submit"
              disabled={isCreatingFolder || !newFolderName.trim()}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono uppercase cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              {isCreatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Folder'}
            </button>
            <button
              type="button"
              onClick={() => setShowNewFolder(false)}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden ${
          isDragging
            ? 'border-emerald-400 bg-emerald-500/10 scale-[0.99]'
            : 'border-slate-700 hover:border-emerald-500/60 bg-[#121824]/80 hover:bg-[#151D2C]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.mp4,.mov,.m4v,.webm,.heic,.raw,.cr2,.nef"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <UploadCloud className="w-10 h-10 stroke-[1.75]" />
        </div>

        <h3 className="text-base font-black uppercase tracking-tight text-white font-sans">
          Drag &amp; Drop Media Files to Upload
        </h3>
        <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
          Upload game photos, portraits, or raw 4K tournament film directly to your Google Drive. We handle automatic thumbnailing, permission grants, and gallery store indexing.
        </p>

        <div className="flex items-center gap-2 mt-4">
          <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono">
            JPG, PNG, HEIC, MP4, MOV
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold">
            Direct Cloud Upload
          </span>
        </div>
      </div>

      {/* 3. Media Metadata Details (when Auto-Indexing) */}
      {autoIndexToGallery && queue.length > 0 && (
        <div className="p-5 rounded-3xl bg-[#171F2C]/70 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Gallery Batch Metadata</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              Applied to indexed assets
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 font-mono">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
              >
                <option value="Basketball">Basketball</option>
                <option value="Football">Football</option>
                <option value="Soccer">Soccer</option>
                <option value="Track & Field">Track & Field</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Cheer">Cheer</option>
                <option value="Baseball">Baseball</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 font-mono">Event Name</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Event name"
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 font-mono">Album Name</label>
              <input
                type="text"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder="Album name"
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Pricing Config */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white font-mono">Monetize Downloads</div>
                <div className="text-[10px] text-slate-400 font-mono">Full-res uncompressed master file purchase price</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isMonetized && (
                <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 font-mono text-xs">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.99"
                    value={priceUSD}
                    onChange={(e) => setPriceUSD(e.target.value)}
                    className="w-16 bg-transparent text-white focus:outline-none font-mono"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsMonetized(!isMonetized)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                  isMonetized ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    isMonetized ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Upload Queue List */}
      {queue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-white font-mono">
                Upload Queue ({queue.length} files)
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                {pendingCount} Pending • {completedCount} Completed
              </span>
            </div>

            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="text-xs text-slate-400 hover:text-white font-mono transition-colors cursor-pointer"
                >
                  Clear Completed
                </button>
              )}

              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isUploadingAll || pendingCount === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isUploadingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading ({pendingCount} left)...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Start Upload to Google Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {queue.map((item) => {
              const isVideo = item.file.type.startsWith('video/') || item.file.name.match(/\.(mp4|mov|m4v|webm)$/i);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#141B2D]/80 border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                >
                  {/* Thumbnail / Icon */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isVideo ? (
                        <Film className="w-6 h-6 text-teal-400" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate font-mono">
                        {item.file.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>•</span>
                        <span className="capitalize">{isVideo ? '4K Video' : 'Photo'}</span>
                        {item.error && (
                          <span className="text-rose-400 font-bold">• {item.error}</span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {item.status === 'uploading' && (
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'pending' && (
                      <span className="text-[11px] font-mono text-slate-400">Ready</span>
                    )}

                    {item.status === 'uploading' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{item.progress}%</span>
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Uploaded</span>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-400 font-mono font-bold">
                        <AlertCircle className="w-4 h-4" />
                        <span>Failed</span>
                      </div>
                    )}

                    {item.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorDriveDropzone;
