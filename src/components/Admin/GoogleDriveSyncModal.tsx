import React, { useState } from 'react';
import { 
  FolderSync, 
  HardDrive, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ExternalLink, 
  FolderPlus,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
  Tag,
  Trophy,
  DollarSign
} from 'lucide-react';
import { 
  collection, 
  writeBatch, 
  doc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, ensureAuthUser, sanitizeFirestorePayload } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logActivity } from '../../services/activityStreamService';
import { 
  extractDriveFolderId, 
  fetchDriveFolderImages, 
  openGoogleDrivePicker,
  getDriveImageUrls,
  DriveImageFile,
  signInWithGoogleDrive,
  getDriveAccessToken
} from '../../services/googleDriveService';
import { GalleryMediaItem } from '../../types';
import { GoogleDriveImportLoadingState, ImportStage } from '../Drive/GoogleDriveImportLoadingState';

interface GoogleDriveSyncModalProps {
  onSuccess?: () => void;
  onClose?: () => void;
  creatorId?: string;
  creatorName?: string;
  isCreatorPortal?: boolean;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({ 
  onSuccess, 
  onClose,
  creatorId,
  creatorName: customCreatorName,
  isCreatorPortal = false
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [folderInput, setFolderInput] = useState('');
  const [eventName, setEventName] = useState('West Coast Invitational 2026');
  const [albumName, setAlbumName] = useState('');
  const [sport, setSport] = useState('Basketball');
  const [category, setCategory] = useState('Game Action');
  const [price, setPrice] = useState('9.99');
  
  // Scanning & Ingestion State
  const [importStage, setImportStage] = useState<ImportStage>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentCount, setCurrentCount] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalBatches, setTotalBatches] = useState(1);
  const [scannedFiles, setScannedFiles] = useState<DriveImageFile[]>([]);
  const [detectedFolderName, setDetectedFolderName] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);

  const isScanning = importStage === 'scanning' || importStage === 'authorizing';
  const isSyncing = importStage === 'processing' || importStage === 'syncing';

  // Scan Folder
  const handleScanFolder = async (overrideFolderId?: string) => {
    const rawId = overrideFolderId || extractDriveFolderId(folderInput);
    if (!rawId) {
      showToast('error', 'Invalid Google Drive Link', 'Please paste a valid Google Drive folder link or folder ID.');
      return;
    }

    setImportStage('authorizing');
    setStatusMessage('Checking Google Drive authorization...');
    setErrorMessage('');
    setScannedFiles([]);
    setCurrentCount(0);
    setSyncProgress(10);

    try {
      let activeToken = getDriveAccessToken();
      
      // If no cached token in memory, try to initiate Google Drive OAuth login
      if (!activeToken) {
        try {
          setStatusMessage('Requesting OAuth 2.0 credentials...');
          const authRes = await signInWithGoogleDrive();
          activeToken = authRes?.accessToken || null;
        } catch (authErr: any) {
          console.warn('[Google Drive Scan] Pre-auth notice:', authErr);
        }
      }

      setImportStage('scanning');
      setStatusMessage('Scanning folder contents and indexing high-resolution photos...');
      setSyncProgress(30);

      const result = await fetchDriveFolderImages(rawId, activeToken || undefined);
      
      setSyncProgress(90);
      setScannedFiles(result.files);
      setDetectedFolderName(result.folderName);
      if (!albumName.trim() && result.folderName) {
        setAlbumName(result.folderName);
      }

      setSyncProgress(100);
      setImportStage('idle');

      if (result.files.length === 0) {
        showToast('info', 'Empty Folder', 'No image files found in the specified Google Drive folder. Ensure folder permissions are set to Anyone with the link or sign in.');
      } else {
        showToast('success', 'Folder Scanned', `Discovered ${result.files.length} high-resolution images ready to import!`);
      }
    } catch (err: any) {
      console.error('[Google Drive Scan Error]:', err);
      const isAuthError = err?.message?.includes('unregistered callers') || 
                          err?.message?.includes('401') || 
                          err?.message?.includes('403') ||
                          err?.message?.includes('OAuth') ||
                          err?.message?.includes('identity');

      if (isAuthError) {
        try {
          setImportStage('authorizing');
          setStatusMessage('Prompting for Google Drive access authorization...');
          showToast('info', 'Authorizing Google Drive', 'Please approve Google Drive access in the popup window to scan private albums.');
          const authRes = await signInWithGoogleDrive();
          if (authRes?.accessToken) {
            setImportStage('scanning');
            setStatusMessage('Authorization verified! Scanning folder contents...');
            const retryResult = await fetchDriveFolderImages(rawId, authRes.accessToken);
            setScannedFiles(retryResult.files);
            setDetectedFolderName(retryResult.folderName);
            if (!albumName.trim() && retryResult.folderName) {
              setAlbumName(retryResult.folderName);
            }
            setImportStage('idle');
            showToast('success', 'Folder Scanned', `Discovered ${retryResult.files.length} high-resolution images!`);
            return;
          }
        } catch (retryErr: any) {
          console.error('[Google Drive Retry Auth Error]:', retryErr);
        }
      }
      setImportStage('error');
      setErrorMessage(err?.message || 'Could not scan Google Drive folder. Please click "Connect Account" to grant access.');
      showToast('error', 'Google Drive Scan Failed', err?.message || 'Could not scan Google Drive folder. Please click "Connect Account" to grant access.');
    }
  };

  // Google Picker Trigger
  const handleOpenPicker = async () => {
    try {
      await openGoogleDrivePicker({
        selectFoldersOnly: true,
        onSelect: (result) => {
          if (result.folderId) {
            setFolderInput(`https://drive.google.com/drive/folders/${result.folderId}`);
            if (result.folderName) {
              setAlbumName(result.folderName);
              setDetectedFolderName(result.folderName);
            }
            handleScanFolder(result.folderId);
          }
        },
        onCancel: () => {}
      });
    } catch (err: any) {
      console.error('[Picker Error]:', err);
      showToast('error', 'Picker Unavailable', err?.message || 'Please use direct folder link input.');
    }
  };

  // Perform Batch Ingestion to Firestore
  const handleBatchSync = async () => {
    if (scannedFiles.length === 0) {
      showToast('error', 'No Photos Found', 'Scan a folder with images before importing.');
      return;
    }
    if (!db) {
      showToast('error', 'Database Error', 'Firestore connection unavailable.');
      return;
    }

    setImportStage('processing');
    setStatusMessage('Preparing direct media URLs and watermarks...');
    setErrorMessage('');
    setSyncProgress(5);
    setCurrentCount(0);

    try {
      // Ensure authenticated user exists before write operations
      await ensureAuthUser();

      const resolvedCreatorId = creatorId || user?.uid || 'google-drive-sync';
      const authorName = customCreatorName || profile?.displayName || user?.displayName || 'Official Media Crew';
      const cleanSport = sport.replace(/^[^\w\s&]+/, '').trim() || 'Basketball';
      const targetAlbum = albumName.trim() || detectedFolderName || 'Tournament Album';
      const targetEvent = eventName.trim() || 'Showcase Tournament';
      const unitPrice = parseFloat(price) || 9.99;
      const nowIso = new Date().toISOString();

      // Chunk in batches of 400 (Firestore limit is 500 operations per batch)
      const chunkSize = 400;
      const calculatedTotalBatches = Math.ceil(scannedFiles.length / chunkSize);
      setTotalBatches(calculatedTotalBatches);
      
      let processed = 0;
      const allOriginalUrls: string[] = [];
      const allWatermarkedUrls: string[] = [];

      setImportStage('syncing');

      for (let i = 0; i < scannedFiles.length; i += chunkSize) {
        const batchIndex = Math.floor(i / chunkSize) + 1;
        setCurrentBatch(batchIndex);
        setStatusMessage(`Committing Batch ${batchIndex} of ${calculatedTotalBatches} (${Math.min(i + chunkSize, scannedFiles.length)} / ${scannedFiles.length} photos)...`);

        const chunk = scannedFiles.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((file, index) => {
          const driveUrls = getDriveImageUrls(file.id);
          // Preview URL (high-res thumbnail) renders reliably in <img> tags without Google Drive virus scan redirects
          const bestPreviewUrl = driveUrls.previewUrl;
          const bestDirectUrl = driveUrls.previewUrl || driveUrls.directDownloadUrl;

          allOriginalUrls.push(bestDirectUrl);
          allWatermarkedUrls.push(bestPreviewUrl);

          const cleanTitle = file.name
            ? file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
            : `Shot #${i + index + 1}`;

          const newDocRef = doc(collection(db, 'gallery'));

          const itemData = sanitizeFirestorePayload({
            originalUrl: bestDirectUrl,
            imageUrl: bestDirectUrl,
            url: bestDirectUrl,
            watermarkedUrl: bestPreviewUrl,
            previewUrl: bestPreviewUrl,
            thumbnailUrl: driveUrls.thumbnailUrl,
            isWatermarked: true,
            photographerId: resolvedCreatorId,
            photographerName: authorName,
            eventName: targetEvent,
            albumName: targetAlbum,
            category: category,
            sport: cleanSport,
            teams: [],
            title: cleanTitle,
            caption: `${cleanTitle} from ${targetEvent}`,
            hypesCount: 0,
            userHypes: {},
            createdAt: nowIso,
            resolution: '4K Ultra-HD (Google Drive)',
            tags: [cleanSport.toLowerCase(), category.toLowerCase(), 'gdrive', isCreatorPortal ? 'creator-media' : 'official'],
            price: unitPrice,
            googleDriveFileId: file.id,
            googleDriveMimeType: file.mimeType || 'image/jpeg',
            serverCreatedAt: serverTimestamp()
          });

          batch.set(newDocRef, itemData);
        });

        await batch.commit();
        processed += chunk.length;
        setCurrentCount(processed);
        setSyncProgress(Math.round((processed / scannedFiles.length) * 85));
      }

      setStatusMessage('Creating structured album catalog & activity stream broadcast...');

      // Also persist to 'albums' collection so it renders in MediaGalleryView real-time
      const coverPhotoUrl = allWatermarkedUrls[0] || allOriginalUrls[0] || '';
      const coverWatermarkedUrl = allWatermarkedUrls[0] || coverPhotoUrl;
      const albumSlug = targetAlbum.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `album-${Date.now()}`;
      const albumDocRef = doc(db, 'albums', albumSlug);

      const albumData = sanitizeFirestorePayload({
        title: targetAlbum,
        description: `Imported album from Google Drive with ${scannedFiles.length} high-resolution sports photos.`,
        coverPhotoUrl: coverPhotoUrl,
        coverUrl: coverPhotoUrl,
        imageUrl: coverPhotoUrl,
        watermarkedCoverUrl: coverWatermarkedUrl,
        mediaUrls: allOriginalUrls,
        watermarkedMediaUrls: allWatermarkedUrls,
        photos: scannedFiles.map((file, idx) => {
          const driveUrls = getDriveImageUrls(file.id);
          return {
            id: file.id,
            name: file.name || `Photo #${idx + 1}`,
            title: file.name ? file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : `Photo #${idx + 1}`,
            originalUrl: allOriginalUrls[idx] || driveUrls.previewUrl,
            imageUrl: allOriginalUrls[idx] || driveUrls.previewUrl,
            watermarkedUrl: allWatermarkedUrls[idx] || driveUrls.previewUrl,
            previewUrl: allWatermarkedUrls[idx] || driveUrls.previewUrl,
            thumbnailUrl: driveUrls.thumbnailUrl,
            price: unitPrice
          };
        }),
        price: unitPrice,
        sport: cleanSport,
        category: category,
        eventName: targetEvent,
        authorId: resolvedCreatorId,
        authorName: authorName,
        authorRole: isCreatorPortal ? 'Creator' : (profile?.role || 'Tournament Director'),
        authorAvatar: profile?.photoURL || user?.photoURL || '',
        photoCount: scannedFiles.length,
        isGoogleDriveSync: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await setDoc(albumDocRef, albumData, { merge: true });

      setSyncProgress(95);

      // Log to real-time Activity Stream
      try {
        const previewThumbs = scannedFiles.slice(0, 4).map(f => f.thumbnailLink || f.webContentLink || coverWatermarkedUrl || coverPhotoUrl).filter(Boolean);
        await logActivity({
          type: 'album_sync',
          title: `New Album Synced: ${targetAlbum}`,
          description: `${authorName} synced ${scannedFiles.length} photos from Google Drive for ${targetEvent}`,
          authorId: resolvedCreatorId,
          authorName: authorName,
          authorAvatar: profile?.photoURL || user?.photoURL || '',
          authorRole: isCreatorPortal ? 'creator' : 'director',
          sport: cleanSport,
          targetId: albumDocRef.id,
          targetUrl: '/gallery',
          thumbnailUrl: coverWatermarkedUrl || coverPhotoUrl,
          coverPhotoUrl: coverWatermarkedUrl || coverPhotoUrl,
          previewUrls: previewThumbs.length > 0 ? previewThumbs : [coverWatermarkedUrl || coverPhotoUrl].filter(Boolean),
          mediaType: 'image',
          metadata: {
            albumId: albumDocRef.id,
            albumName: targetAlbum,
            eventName: targetEvent,
            photoCount: scannedFiles.length,
            previewUrls: previewThumbs,
            source: 'google_drive'
          }
        });
      } catch (actErr) {
        console.warn('[Activity Stream Log Notice]:', actErr);
      }

      // Broadcast window events for live views
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('just1play:gallery-updated', { 
          detail: { albumName: targetAlbum, photoCount: scannedFiles.length } 
        }));
        window.dispatchEvent(new CustomEvent('just1play:activity-updated', {
          detail: { type: 'album_synced', albumName: targetAlbum }
        }));
      }

      setSyncProgress(100);
      setImportStage('complete');

      showToast(
        'success', 
        'Google Drive Sync Complete!', 
        `Successfully imported and published ${scannedFiles.length} photos to "${targetAlbum}".`
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1200);
    } catch (err: any) {
      console.error('[Batch Sync Error]:', err);
      setImportStage('error');
      setErrorMessage(err?.message || 'Could not complete batch sync.');
      showToast('error', 'Sync Failed', err?.message || 'Could not complete batch sync.');
    }
  };

  return (
    <div className={`p-6 rounded-2xl ${isCreatorPortal ? 'bg-[#181F2A] border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.15)]' : 'bg-[#141B2D] border-cyan-500/30 shadow-[0_0_50px_rgba(0,184,212,0.15)]'} border text-white max-w-4xl mx-auto space-y-6 animate-fadeIn`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${isCreatorPortal ? 'bg-gradient-to-tr from-rose-500/20 to-amber-500/30 border-rose-400/40 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border-cyan-400/40 text-cyan-300 shadow-[0_0_20px_rgba(0,184,212,0.3)]'} border flex items-center justify-center`}>
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black italic uppercase font-sans tracking-tight text-white">
                Google Drive <span className={isCreatorPortal ? 'text-rose-400' : 'text-cyan-400'}>{isCreatorPortal ? 'Creator Media Importer' : 'Media Ingestion Engine'}</span>
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full ${isCreatorPortal ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'} border font-mono text-[10px] font-bold uppercase`}>
                OAuth 2.0 Connected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isCreatorPortal 
                ? 'Sync photos and tournament albums from your own Google Drive and set per-photo sales pricing.' 
                : 'Instantly index high-res SD card tournament folders without uploading file-by-file.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                showToast('info', 'Connecting Google Drive', 'Opening Google authorization dialog...');
                const res = await signInWithGoogleDrive();
                if (res?.accessToken) {
                  showToast('success', 'Google Drive Connected', 'OAuth 2.0 authorization verified. You can now scan albums!');
                }
              } catch (e: any) {
                showToast('error', 'Auth Failed', e?.message || 'Could not connect Google Drive.');
              }
            }}
            type="button"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Connect Account</span>
          </button>
          <button
            onClick={handleOpenPicker}
            type="button"
            className={`px-4 py-2 rounded-xl ${isCreatorPortal ? 'bg-gradient-to-r from-rose-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_20px_rgba(0,184,212,0.3)]'} text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer`}
          >
            <FolderPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Select via Google Picker</span>
          </button>
        </div>
      </div>

      {/* Dynamic Loading State / Feedback Banner */}
      {importStage !== 'idle' && (
        <GoogleDriveImportLoadingState
          stage={importStage}
          progress={syncProgress}
          currentCount={currentCount}
          totalCount={scannedFiles.length}
          currentBatch={currentBatch}
          totalBatches={totalBatches}
          statusMessage={statusMessage}
          folderName={detectedFolderName || folderInput}
          albumName={albumName}
          isCreatorPortal={isCreatorPortal}
          recentThumbnails={scannedFiles}
          errorMessage={errorMessage}
          onRetry={() => {
            if (scannedFiles.length > 0) {
              handleBatchSync();
            } else {
              handleScanFolder();
            }
          }}
          onCancel={() => {
            setImportStage('idle');
          }}
        />
      )}

      {/* Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Drive Folder Link / ID */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center justify-between">
            <span>Google Drive Folder URL or ID</span>
            <span className="text-[10px] text-cyan-400 lowercase">https://drive.google.com/drive/folders/...</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste Google Drive folder link or folder ID..."
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-mono"
            />
            <button
              onClick={() => handleScanFolder()}
              disabled={isScanning || isSyncing || !folderInput.trim()}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,184,212,0.3)] transition-all cursor-pointer"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderSync className="w-4 h-4" />}
              <span>{isScanning ? 'Scanning...' : 'Scan Folder'}</span>
            </button>
          </div>
        </div>

        {/* Event Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Tournament / Event</span>
          </label>
          <input
            type="text"
            placeholder="e.g. West Coast Showcase 2026"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
          />
        </div>

        {/* Album Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            <span>Album Title</span>
          </label>
          <input
            type="text"
            placeholder={detectedFolderName || 'e.g. Day 1 Court 3 Action'}
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
          />
        </div>

        {/* Sport */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-slate-300">Sport</label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all"
          >
            <option value="Basketball">🏀 Basketball</option>
            <option value="Football">🏈 Football</option>
            <option value="Soccer">⚽ Soccer</option>
            <option value="Track">🏃 Track & Field</option>
            <option value="Volleyball">🏐 Volleyball</option>
            <option value="Cheer">📣 Cheer</option>
            <option value="Baseball">⚾ Baseball</option>
            <option value="Lacrosse">🥍 Lacrosse</option>
          </select>
        </div>

        {/* Price Per High-Res Download */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Single Photo Download Price ($)</span>
          </label>
          <input
            type="number"
            step="0.50"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all font-mono"
          />
        </div>

      </div>

      {/* Scanned Files Preview Grid */}
      {scannedFiles.length > 0 && importStage === 'idle' && (
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-white uppercase">
                {scannedFiles.length} Photos Detected in &quot;{detectedFolderName || 'Folder'}&quot;
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Ready to create album &amp; apply watermarks
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950/80 border border-slate-800">
            {scannedFiles.slice(0, 24).map((file, idx) => (
              <div key={file.id || idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-900 border border-slate-800 group">
                <img
                  src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w300`}
                  alt={file.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
            ))}
            {scannedFiles.length > 24 && (
              <div className="aspect-square rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex flex-col items-center justify-center text-cyan-400 text-center p-1">
                <span className="text-xs font-black">+{scannedFiles.length - 24}</span>
                <span className="text-[9px] uppercase font-mono">more</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleBatchSync}
          disabled={isSyncing || isScanning || scannedFiles.length === 0}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(0,184,212,0.4)] transition-all cursor-pointer"
        >
          {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
          <span>{isSyncing ? 'Importing Photos...' : `Sync ${scannedFiles.length || ''} Photos to Gallery`}</span>
        </button>
      </div>

    </div>
  );
};

export default GoogleDriveSyncModal;

