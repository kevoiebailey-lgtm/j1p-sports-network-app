import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Film,
  Video,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Folder,
  FolderPlus,
  Lock,
  Globe,
  Sparkles,
  DollarSign,
  Tag,
  Users,
  Calendar,
  Layers,
  Link as LinkIcon,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  signInWithGoogleDrive,
  getDriveAccessToken,
  uploadFileToDrive,
  makeDriveFileShareable,
  createDriveFolder,
  fetchDriveFolders,
  DriveFolderItem
} from '../../lib/googleDriveService';

interface GoogleDriveVideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (item: any) => void;
  initialSport?: string;
  initialEventName?: string;
  initialAlbumName?: string;
}

const SPORTS_LIST = [
  'Basketball',
  'Football',
  'Soccer',
  'Track & Field',
  'Cheer',
  'Volleyball',
  'Baseball',
  'Lacrosse',
  'Wrestling'
];

const CATEGORIES_LIST = [
  'Game Film',
  'Game Highlights',
  'Combine / Laser Drills',
  'Player Scouting Tape',
  'Team Hype Reel',
  'Post-Game Interview'
];

export const GoogleDriveVideoUploadModal: React.FC<GoogleDriveVideoUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  initialSport = 'Basketball',
  initialEventName = '',
  initialAlbumName = ''
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  // Mode: Direct Upload vs Link Existing Drive URL
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');

  // Google Drive Auth state
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [driveFolders, setDriveFolders] = useState<DriveFolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Link Existing Drive Video State
  const [existingDriveUrl, setExistingDriveUrl] = useState('');

  // Video Metadata
  const [title, setTitle] = useState('');
  const [eventName, setEventName] = useState(initialEventName || 'Tournament Game Film');
  const [albumName, setAlbumName] = useState(initialAlbumName || 'Game Film & Highlights');
  const [sport, setSport] = useState(initialSport || 'Basketball');
  const [category, setCategory] = useState('Game Film');
  const [teams, setTeams] = useState('');
  const [taggedAthletes, setTaggedAthletes] = useState('');
  const [description, setDescription] = useState('');
  const [isForSale, setIsForSale] = useState(false);
  const [priceUSD, setPriceUSD] = useState('14.99');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Drive token on mount / open
  useEffect(() => {
    if (isOpen) {
      const token = getDriveAccessToken();
      if (token) {
        setIsDriveConnected(true);
        loadFolders(token);
      } else {
        setIsDriveConnected(false);
      }
    }
  }, [isOpen]);

  const loadFolders = async (token: string) => {
    try {
      const folders = await fetchDriveFolders(token);
      setDriveFolders(folders);
    } catch (err) {
      console.warn('[Drive Video Upload] Could not load folders:', err);
    }
  };

  const handleConnectDrive = async () => {
    setIsAuthorizing(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res?.accessToken) {
        setIsDriveConnected(true);
        showToast('success', 'Google Drive Connected', 'Authorized for direct 4K game film uploads.');
        await loadFolders(res.accessToken);
      }
    } catch (err: any) {
      console.error('Google Drive Auth Error:', err);
      showToast('error', 'Drive Authorization Failed', err.message || 'Could not connect Google Drive account.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const token = getDriveAccessToken();
    if (!token) return;

    setIsCreatingFolder(true);
    try {
      const newFolder = await createDriveFolder(token, newFolderName.trim());
      setDriveFolders(prev => [newFolder, ...prev]);
      setSelectedFolderId(newFolder.id);
      setNewFolderName('');
      setShowNewFolderInput(false);
      showToast('success', 'Folder Created', `Album folder "${newFolder.name}" ready.`);
    } catch (err: any) {
      showToast('error', 'Folder Creation Failed', err.message || 'Could not create folder in Google Drive.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|m4v|webm|mkv|avi|ts)$/i)) {
        showToast('error', 'Invalid File Format', 'Please choose a valid raw video file (.mp4, .mov, .webm, .m4v).');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);

      if (!title) {
        // Auto-generate title from filename without extension
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|m4v|webm|mkv|avi|ts)$/i)) {
        showToast('error', 'Invalid File Format', 'Please choose a valid raw video file (.mp4, .mov, .webm, .m4v).');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);

      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const parseDriveUrlToId = (url: string): string | null => {
    if (!url) return null;
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (fileMatch && fileMatch[1]) return fileMatch[1];
    if (idMatch && idMatch[1]) return idMatch[1];
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'upload') {
      if (!selectedFile) {
        showToast('error', 'No Video Selected', 'Please select a raw video file to upload.');
        return;
      }

      const token = getDriveAccessToken();
      if (!token) {
        showToast('error', 'Drive Not Authorized', 'Please sign in to Google Drive to upload video directly.');
        return;
      }

      setIsUploading(true);
      setUploadProgressPercent(15);
      setUploadStatusText('Uploading 4K video directly to your Google Drive...');

      try {
        // 1. Upload to Google Drive
        const uploadedDriveFile = await uploadFileToDrive(
          token,
          selectedFile,
          selectedFolderId || undefined,
          `${title} - Just1Play Tournament Film`
        );

        setUploadProgressPercent(70);
        setUploadStatusText('Setting video streaming permissions on Google Drive...');

        // 2. Make Shareable (Public embed for playback)
        await makeDriveFileShareable(token, uploadedDriveFile.id);

        setUploadProgressPercent(90);
        setUploadStatusText('Indexing game film to Just1Play Media Gallery...');

        // 3. Index to Firestore
        const fileId = uploadedDriveFile.id;
        const streamingUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const driveThumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;

        const teamsArray = teams
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

        const athletesArray = taggedAthletes
          .split(',')
          .map(a => a.trim())
          .filter(Boolean);

        const newGalleryDoc = {
          title: title.trim() || selectedFile.name,
          caption: description.trim() || `${sport} tournament film: ${title}`,
          eventName: eventName.trim() || 'Tournament Game Film',
          albumName: albumName.trim() || 'Game Film & Highlights',
          sport,
          category,
          teams: teamsArray,
          tags: [...athletesArray, sport, category, 'GoogleDrive', 'GameFilm'],
          videoUrl: streamingUrl,
          originalUrl: downloadUrl,
          watermarkedUrl: streamingUrl,
          thumbnailUrl: driveThumbUrl,
          thumbUrl: driveThumbUrl,
          googleDriveFileId: fileId,
          driveFileId: fileId,
          isWatermarked: false,
          photographerId: user?.uid || '',
          photographerName: profile?.displayName || 'Just1Play Media Creator',
          photographer: profile?.displayName || 'Just1Play Media Creator',
          hypesCount: 0,
          userHypes: {},
          isForSale: !!isForSale,
          priceUSD: isForSale ? parseFloat(priceUSD) || 14.99 : 0,
          resolution: '4K Ultra-HD 60FPS',
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'gallery'), newGalleryDoc);

        setUploadProgressPercent(100);
        setUploadStatusText('Finished!');

        showToast('success', 'Game Film Published', `"${title}" is now live in the 4K Media Gallery.`);
        
        if (onUploadSuccess) {
          onUploadSuccess({ id: docRef.id, ...newGalleryDoc });
        }

        handleClose();
      } catch (err: any) {
        console.error('Upload Error:', err);
        showToast('error', 'Upload Failed', err.message || 'Failed to upload video to Google Drive.');
      } finally {
        setIsUploading(false);
      }
    } else {
      // Link Existing Google Drive URL Mode
      const fileId = parseDriveUrlToId(existingDriveUrl);
      if (!fileId) {
        showToast('error', 'Invalid Google Drive URL', 'Please paste a valid Google Drive link (e.g. drive.google.com/file/d/...)');
        return;
      }

      setIsUploading(true);
      setUploadStatusText('Indexing existing Google Drive video...');

      try {
        const streamingUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const driveThumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;

        const teamsArray = teams
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

        const athletesArray = taggedAthletes
          .split(',')
          .map(a => a.trim())
          .filter(Boolean);

        const newGalleryDoc = {
          title: title.trim() || 'Google Drive Game Film',
          caption: description.trim() || `${sport} Game Film`,
          eventName: eventName.trim() || 'Tournament Game Film',
          albumName: albumName.trim() || 'Game Film & Highlights',
          sport,
          category,
          teams: teamsArray,
          tags: [...athletesArray, sport, category, 'GoogleDrive', 'GameFilm'],
          videoUrl: streamingUrl,
          originalUrl: downloadUrl,
          watermarkedUrl: streamingUrl,
          thumbnailUrl: driveThumbUrl,
          thumbUrl: driveThumbUrl,
          googleDriveFileId: fileId,
          driveFileId: fileId,
          isWatermarked: false,
          photographerId: user?.uid || '',
          photographerName: profile?.displayName || 'Just1Play Media Creator',
          photographer: profile?.displayName || 'Just1Play Media Creator',
          hypesCount: 0,
          userHypes: {},
          isForSale: !!isForSale,
          priceUSD: isForSale ? parseFloat(priceUSD) || 14.99 : 0,
          resolution: '4K Ultra-HD',
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'gallery'), newGalleryDoc);

        showToast('success', 'Game Film Linked', `"${title || 'Film'}" added to the 4K Media Gallery.`);
        
        if (onUploadSuccess) {
          onUploadSuccess({ id: docRef.id, ...newGalleryDoc });
        }

        handleClose();
      } catch (err: any) {
        console.error('Link Error:', err);
        showToast('error', 'Link Failed', err.message || 'Failed to index Google Drive video.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setTitle('');
    setDescription('');
    setTeams('');
    setTaggedAthletes('');
    setExistingDriveUrl('');
    setIsUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-3xl bg-[#0F172A] border border-[#24324F] rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#1E293B] bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00B8D4]/20 to-[#38BDF8]/20 border border-[#00B8D4]/50 flex items-center justify-center text-[#00B8D4] shadow-[0_0_20px_rgba(0,184,212,0.2)]">
              <Film className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">Upload Raw Game Film</h2>
                <span className="px-2 py-0.5 rounded-md bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4] text-[10px] font-mono font-black uppercase">
                  Google Drive 4K
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload master MP4/MOV videos directly to your Google Drive for unlimited streaming.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Direct Upload vs Link Existing */}
        <div className="px-6 pt-4 pb-2 border-b border-[#1E293B] flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#00B8D4] text-slate-950 shadow-[0_0_15px_rgba(0,184,212,0.3)]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Raw Video File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-[#00B8D4] text-slate-950 shadow-[0_0_15px_rgba(0,184,212,0.3)]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Link Existing Google Drive Video</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {activeTab === 'upload' ? (
            <>
              {/* Google Drive Connection Banner */}
              {!isDriveConnected ? (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#090D16] to-[#090D16] border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Authorize Google Drive Storage</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Connect your Google Drive so raw 4K videos upload directly to your personal cloud.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    disabled={isAuthorizing}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer shrink-0"
                  >
                    {isAuthorizing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Authorize Drive</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Google Drive Connected & Ready for 4K Ingestion</span>
                  </div>

                  {/* Destination Folder Picker */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono focus:outline-none focus:border-[#00B8D4]"
                    >
                      <option value="">Root (My Drive)</option>
                      {driveFolders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                      title="New Drive Folder"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Create New Folder Inline Bar */}
              {showNewFolderInput && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New Folder Name (e.g. 2026 Midwest Showcase Film)"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00B8D4]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    disabled={isCreatingFolder || !newFolderName.trim()}
                    className="px-3 py-1.5 rounded-lg bg-[#00B8D4] text-slate-950 text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
                  </button>
                </div>
              )}

              {/* Video File Drag & Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  selectedFile
                    ? 'border-[#00B8D4] bg-[#00B8D4]/5'
                    : 'border-slate-700 hover:border-[#00B8D4] bg-slate-900/50 hover:bg-slate-900/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.mov,.m4v,.webm,.mkv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-3 w-full max-w-md">
                    <div className="w-14 h-14 rounded-2xl bg-[#00B8D4]/20 border border-[#00B8D4]/40 text-[#00B8D4] flex items-center justify-center mx-auto shadow-lg">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white truncate">{selectedFile.name}</h4>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {selectedFile.type || 'Video Stream'}
                      </p>
                    </div>
                    <span className="inline-block text-[11px] font-mono text-[#00B8D4] uppercase tracking-wider">
                      Click or drag to change video
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                      <Video className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Choose Master Video File</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Drag and drop your raw game tape, highlights, or combine drills here. Supports MP4, MOV, WEBM up to 4K resolution.
                      </p>
                    </div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#00B8D4]/20 border border-[#00B8D4]/30 text-[#00B8D4] text-xs font-bold uppercase tracking-wider">
                      Select 4K Video
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Link Existing Google Drive Video Tab */
            <div className="space-y-3 p-5 rounded-2xl bg-slate-900 border border-slate-700">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5 text-[#00B8D4]" />
                <span>Google Drive Video Link</span>
              </label>
              <p className="text-xs text-slate-400">
                Paste any shared Google Drive video link. We will extract the file ID and configure streaming playback instantly.
              </p>
              <input
                type="url"
                required={activeTab === 'link'}
                placeholder="https://drive.google.com/file/d/1A2B3C4D.../view?usp=sharing"
                value={existingDriveUrl}
                onChange={(e) => setExistingDriveUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00B8D4] font-mono"
              />
            </div>
          )}

          {/* Metadata Section */}
          <div className="space-y-4 pt-2 border-t border-[#1E293B]">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#00B8D4]" />
              <span>Video Metadata & Game Details</span>
            </h3>

            {/* Video Title */}
            <div>
              <label className="text-xs font-bold text-slate-300">Video Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Q4 Game-Winning Fastbreak & Laser Dunks"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00B8D4]"
              />
            </div>

            {/* Sport & Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Sport *</label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-[#00B8D4]"
                >
                  {SPORTS_LIST.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-[#00B8D4]"
                >
                  {CATEGORIES_LIST.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Event Name & Album Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Event / Tournament Name</label>
                <input
                  type="text"
                  placeholder="e.g. 2026 Midwest Elite Invitational"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00B8D4]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Album / Reel Collection</label>
                <input
                  type="text"
                  placeholder="e.g. Finals Highlight Tape"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00B8D4]"
                />
              </div>
            </div>

            {/* Teams & Tagged Athletes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300">Teams / Matchup (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Oakland Tech, Lincoln High"
                  value={teams}
                  onChange={(e) => setTeams(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00B8D4]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Tagged Athletes (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Jordan Bell, Marcus Curry"
                  value={taggedAthletes}
                  onChange={(e) => setTaggedAthletes(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00B8D4]"
                />
              </div>
            </div>

            {/* Monetization / Paywall Setting */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF6A00]/20 text-[#FF6A00] flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Enable Creator Download Monetization</h4>
                  <p className="text-[11px] text-slate-400">
                    Charge athletes & parents for full-resolution uncompressed master video downloads.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isForSale && (
                  <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700">
                    <span className="text-xs text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.99"
                      value={priceUSD}
                      onChange={(e) => setPriceUSD(e.target.value)}
                      className="w-16 bg-transparent text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsForSale(!isForSale)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isForSale ? 'bg-[#FF6A00]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      isForSale ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-[#00B8D4]/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#00B8D4] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadStatusText}</span>
                </span>
                <span className="text-white font-bold">{uploadProgressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00B8D4] to-[#38BDF8] transition-all duration-300"
                  style={{ width: `${uploadProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#1E293B] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading || (activeTab === 'upload' && !selectedFile)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#38BDF8] hover:opacity-90 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,184,212,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Game Film...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4 stroke-[2.5]" />
                  <span>{activeTab === 'upload' ? 'Upload to Drive & Publish' : 'Link & Publish Film'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default GoogleDriveVideoUploadModal;
