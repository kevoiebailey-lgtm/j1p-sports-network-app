import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HardDrive, 
  UploadCloud, 
  FolderPlus, 
  Search, 
  RefreshCw, 
  Film, 
  Image as ImageIcon, 
  FileText, 
  Folder, 
  Trash2, 
  ExternalLink, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X, 
  ShieldCheck, 
  ArrowRight,
  Download,
  Share2,
  Sparkles,
  LogOut
} from 'lucide-react';
import { BentoCard } from '../BentoCard';
import { 
  signInWithGoogleDrive, 
  disconnectGoogleDrive, 
  fetchDriveFiles, 
  uploadFileToDrive, 
  createDriveFolder, 
  deleteDriveFile, 
  DriveFileItem,
  getDriveAccessToken
} from '../../lib/googleDriveService';
import { useAuth } from '../../context/AuthContext';

export const GoogleDriveVault: React.FC = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(getDriveAccessToken());
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'video' | 'image' | 'document' | 'folder'>('all');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<DriveFileItem | null>(null);

  // Mandatory Delete Confirmation Modal
  const [deletingFile, setDeletingFile] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Import to Just1Play status
  const [importedFileIds, setImportedFileIds] = useState<string[]>([]);

  // Load Drive files when token is available
  useEffect(() => {
    if (token) {
      loadFiles(token);
    }
  }, [token]);

  const loadFiles = async (authToken: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const driveItems = await fetchDriveFiles(authToken);
      setFiles(driveItems);
    } catch (err: any) {
      console.error('Drive fetch error:', err);
      setErrorMsg(err?.message || 'Failed to connect to Google Drive API.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res?.accessToken) {
        setToken(res.accessToken);
        setSuccessMsg('Successfully connected to Google Drive!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Drive connection error:', err);
      setErrorMsg(err?.message || 'Failed to authenticate with Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
    setToken(null);
    setFiles([]);
    setSuccessMsg('Disconnected from Google Drive.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName.trim()) return;

    setLoading(true);
    try {
      await createDriveFolder(token, newFolderName.trim());
      setSuccessMsg(`Folder "${newFolderName}" created successfully in Google Drive!`);
      setNewFolderName('');
      setShowFolderModal(false);
      await loadFiles(token);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create folder in Google Drive.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !fileToUpload) return;

    setUploading(true);
    setErrorMsg(null);
    try {
      await uploadFileToDrive(token, fileToUpload);
      setSuccessMsg(`File "${fileToUpload.name}" successfully uploaded to Google Drive!`);
      setFileToUpload(null);
      setShowUploadModal(false);
      await loadFiles(token);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload file to Google Drive.');
    } finally {
      setUploading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Mandatory User Confirmation for File Deletion
  const handleConfirmDelete = async () => {
    if (!token || !deletingFile) return;

    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await deleteDriveFile(token, deletingFile.id);
      setSuccessMsg(`File "${deletingFile.name}" permanently deleted from Google Drive.`);
      setFiles(prev => prev.filter(f => f.id !== deletingFile.id));
      setDeletingFile(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete file from Google Drive.');
    } finally {
      setIsDeleting(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleImportToJust1Play = (file: DriveFileItem) => {
    setImportedFileIds(prev => [...prev, file.id]);
    setSuccessMsg(`Linked "${file.name}" to your Just1Play Media Hub highlights!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeCategory === 'video') return f.mimeType.includes('video');
    if (activeCategory === 'image') return f.mimeType.includes('image');
    if (activeCategory === 'document') return f.mimeType.includes('pdf') || f.mimeType.includes('document') || f.mimeType.includes('sheet') || f.mimeType.includes('text');
    if (activeCategory === 'folder') return f.mimeType.includes('folder');

    return true;
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) return <Folder className="w-5 h-5 text-amber-400" />;
    if (mimeType.includes('video')) return <Film className="w-5 h-5 text-rose-400" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-5 h-5 text-indigo-400" />;
    return <FileText className="w-5 h-5 text-slate-300" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-[#000000] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868] text-xs font-black uppercase tracking-wider">
              <HardDrive className="w-4 h-4" />
              <span>CLOUD MEDIA INTEGRATION</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight leading-none">
              GOOGLE DRIVE <span className="text-[#E5B868]">CLOUD VAULT</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Seamlessly sync, backup, and stream game film, athlete highlights, scout breakdown reports, and tournament media directly from your personal Google Drive account.
            </p>
          </div>

          {/* Connection Status Badge & OAuth Sign In */}
          <div className="shrink-0 w-full md:w-auto">
            {!token ? (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/15 space-y-3 text-center">
                <p className="text-xs text-slate-300 font-bold">
                  Connect Google Drive with user permission to access & backup sports media files.
                </p>

                {/* Google Sign In Material Button Standard UI */}
                <button
                  onClick={handleConnectDrive}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-xl transition-all border border-slate-300 cursor-pointer hover:scale-[1.02]"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span className="font-extrabold uppercase tracking-wider text-slate-900">
                    {loading ? 'Connecting Drive...' : 'Sign in with Google Drive'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="bg-[#E5B868]/10 p-4 rounded-2xl border border-[#E5B868]/40 space-y-3">
                <div className="flex items-center gap-2 text-[#E5B868] text-xs font-black uppercase">
                  <ShieldCheck className="w-5 h-5 text-[#E5B868]" />
                  <span>Google Drive Connected</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300">
                  Account: <span className="text-white font-bold">{user?.email || 'Authenticated User'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadFiles(token)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(214,28,36,0.4)] flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Sync Vault</span>
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-2 bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 rounded-xl text-xs font-bold uppercase transition-all"
                    title="Disconnect Google Drive"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/40 rounded-2xl text-xs font-bold text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-[#E5B868]/10 border border-[#E5B868]/40 rounded-2xl text-xs font-bold text-[#E5B868] flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(214,28,36,0.2)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#E5B868]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Vault Content */}
      {token && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#000000] p-4 rounded-3xl border border-white/10">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google Drive files..."
                className="w-full bg-[#212A31] border border-white/15 rounded-2xl pl-10 pr-4 py-2 text-xs text-white focus:border-[#E5B868] focus:outline-none"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
              {(['all', 'video', 'image', 'document', 'folder'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {cat === 'all' && 'All'}
                  {cat === 'video' && 'Videos 🎥'}
                  {cat === 'image' && 'Photos 📸'}
                  {cat === 'document' && 'Docs 📄'}
                  {cat === 'folder' && 'Folders 📁'}
                </button>
              ))}
            </div>

            {/* Upload & Folder Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowFolderModal(true)}
                className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/15 text-white font-bold text-xs uppercase border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>New Folder</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(214,28,36,0.5)] flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload File</span>
              </button>
            </div>
          </div>

          {/* Drive Files Grid */}
          {loading && files.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs animate-pulse">
              Loading files from Google Drive REST API...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-12 text-center bg-[#000000] rounded-3xl border border-white/10 space-y-3">
              <HardDrive className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-black text-white uppercase">No Drive Files Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No items match your search or category filter. Upload game film or photos to your Google Drive to see them here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
                const isImported = importedFileIds.includes(file.id);
                return (
                  <BentoCard key={file.id} glow className="flex flex-col justify-between group">
                    <div className="space-y-3">
                      {/* Thumbnail or File Header */}
                      <div className="relative aspect-video rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center group-hover:border-[#E5B868]/50 transition-all">
                        {file.thumbnailLink ? (
                          <img
                            src={file.thumbnailLink}
                            alt={file.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="p-4 text-center space-y-1">
                            {getFileIcon(file.mimeType)}
                            <span className="text-[10px] font-mono text-slate-400 block uppercase">
                              {file.mimeType.split('/').pop()}
                            </span>
                          </div>
                        )}

                        {file.mimeType.includes('video') && (
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-all group/btn"
                          >
                            <div className="p-3 rounded-full bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.8)] transform group-hover/btn:scale-110 transition-transform">
                              <Play className="w-5 h-5 fill-black ml-0.5" />
                            </div>
                          </button>
                        )}
                      </div>

                      {/* File Title & Info */}
                      <div>
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0">{getFileIcon(file.mimeType)}</span>
                          <h4 className="text-xs font-extrabold text-white line-clamp-2 leading-snug" title={file.name}>
                            {file.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                          <span>{file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'Drive File'}</span>
                          {file.size && <span>• {(parseInt(file.size.toString(), 10) / (1024 * 1024)).toFixed(1)} MB</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 mt-3">
                      <button
                        onClick={() => handleImportToJust1Play(file)}
                        disabled={isImported}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                          isImported 
                            ? 'bg-red-600/20 text-red-500 border border-red-600/30'
                            : 'bg-[#E5B868]/10 hover:bg-[#E5B868] text-[#E5B868] hover:text-black border border-[#E5B868]/30'
                        }`}
                        title="Import highlight to Just1Play Media Hub"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isImported ? 'LINKED' : 'IMPORT'}</span>
                      </button>

                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all"
                          title="Open in Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Mandatory Delete Confirmation Trigger */}
                      <button
                        onClick={() => setDeletingFile(file)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-all"
                        title="Delete file from Google Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </BentoCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* UPLOAD FILE MODAL */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border border-[#E5B868]/40 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-[#E5B868] flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  UPLOAD TO GOOGLE DRIVE
                </span>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 rounded-full bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Select Local Game Film, Photo or Document:
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-[#E5B868] focus:outline-none file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[#E5B868] file:text-black"
                  />
                </div>

                <p className="text-[11px] text-slate-400 font-mono">
                  File will be securely uploaded directly to your Google Drive account storage with full user permission.
                </p>

                <button
                  type="submit"
                  disabled={uploading || !fileToUpload}
                  className="w-full py-3 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(214,28,36,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploading ? 'Uploading to Drive...' : 'START GOOGLE DRIVE UPLOAD'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* NEW FOLDER MODAL */}
        {showFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4" />
                  CREATE DRIVE FOLDER
                </span>
                <button
                  onClick={() => setShowFolderModal(false)}
                  className="p-1 rounded-full bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Folder Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. 'Just1Play - 2026 Season Game Film'"
                    className="w-full bg-[#212A31] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !newFolderName.trim()}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all"
                >
                  CREATE FOLDER IN DRIVE
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* MANDATORY DESTRUCTIVE CONFIRMATION DIALOG */}
        {deletingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#000000] border border-rose-500/50 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase border-b border-white/10 pb-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>CONFIRM GOOGLE DRIVE DELETION</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Are you sure you want to delete <span className="font-extrabold text-white">"{deletingFile.name}"</span> from your Google Drive storage?
                </p>
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-[11px] text-rose-300 font-mono">
                  ⚠️ This destructive action will permanently remove this item from Google Drive.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeletingFile(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.4)] flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'DELETE FILE FROM DRIVE'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* FILE PREVIEW MODAL */}
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/90 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-[#000000] border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-rose-400" />
                  <span className="text-xs font-black uppercase text-white truncate max-w-md">
                    {previewFile.name}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1 rounded-full bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                {previewFile.webViewLink ? (
                  <iframe
                    src={previewFile.webViewLink.replace('/view', '/preview')}
                    className="w-full h-full border-0"
                    allow="autoplay"
                    title={previewFile.name}
                  />
                ) : (
                  <div className="text-center p-6 space-y-2 text-slate-400">
                    <p>Preview stream not supported directly for this file format.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={previewFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#E5B868] text-black font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-[0_0_12px_rgba(214,28,36,0.5)]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Screen in Google Drive</span>
                </a>

                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 bg-white/10 text-white font-bold text-xs rounded-xl"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
