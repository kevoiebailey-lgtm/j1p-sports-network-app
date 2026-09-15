import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  HardDrive, 
  Database, 
  FolderMinus, 
  Terminal, 
  Copy, 
  Check, 
  X, 
  ChevronRight, 
  Sparkles, 
  CheckSquare, 
  Square,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';
import { 
  scanMediaGalleryInventory, 
  executeMediaGalleryClear, 
  DEFAULT_GALLERY_COLLECTIONS, 
  DEFAULT_GALLERY_STORAGE_PATHS,
  MediaGalleryScanResult,
  CleanerProgressUpdate,
  ClearMediaGallerySummary
} from '../../services/mediaGalleryCleanerService';
import { useToast } from '../../context/ToastContext';

interface MediaGalleryClearUtilityProps {
  isOpen?: boolean;
  onClose?: () => void;
  onClearComplete?: () => void;
  onCleared?: () => void;
  isEmbedded?: boolean;
}

const REQUIRED_CONFIRM_PHRASE = 'CLEAR MEDIA GALLERY';

export const MediaGalleryClearUtility: React.FC<MediaGalleryClearUtilityProps> = ({
  isOpen = true,
  onClose,
  onClearComplete,
  onCleared,
  isEmbedded = false
}) => {
  const { showToast } = useToast();

  // Scanning State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<MediaGalleryScanResult | null>(null);

  // Selections
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    DEFAULT_GALLERY_COLLECTIONS.map(c => c.name)
  );
  const [selectedStoragePaths, setSelectedStoragePaths] = useState<string[]>(
    DEFAULT_GALLERY_STORAGE_PATHS.map(p => p.path)
  );

  // Safety Confirmation States
  const [agreeFirestoreLoss, setAgreeFirestoreLoss] = useState<boolean>(false);
  const [agreeStorageLoss, setAgreeStorageLoss] = useState<boolean>(false);
  const [confirmPhraseInput, setConfirmPhraseInput] = useState<string>('');
  const [phraseCopied, setPhraseCopied] = useState<boolean>(false);

  // Execution State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<CleanerProgressUpdate[]>([]);
  const [summary, setSummary] = useState<ClearMediaGallerySummary | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Initial scan on mount
  useEffect(() => {
    handleRunScan();
  }, []);

  const handleRunScan = async () => {
    setIsScanning(true);
    setLogs([]);
    try {
      const res = await scanMediaGalleryInventory(
        DEFAULT_GALLERY_COLLECTIONS.map(c => c.name),
        DEFAULT_GALLERY_STORAGE_PATHS.map(p => p.path)
      );
      setScanResult(res);
    } catch (err: any) {
      console.error('Scan failed:', err);
      showToast('error', 'Inventory Scan Failed', err?.message || 'Could not scan Firebase inventory.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleCollection = (name: string) => {
    setSelectedCollections(prev => 
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const toggleStoragePath = (path: string) => {
    setSelectedStoragePaths(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const selectAll = () => {
    setSelectedCollections(DEFAULT_GALLERY_COLLECTIONS.map(c => c.name));
    setSelectedStoragePaths(DEFAULT_GALLERY_STORAGE_PATHS.map(p => p.path));
  };

  const deselectAll = () => {
    setSelectedCollections([]);
    setSelectedStoragePaths([]);
  };

  const isConfirmationSatisfied = 
    agreeFirestoreLoss &&
    agreeStorageLoss &&
    confirmPhraseInput.trim().toUpperCase() === REQUIRED_CONFIRM_PHRASE &&
    (selectedCollections.length > 0 || selectedStoragePaths.length > 0);

  const handleStartPurge = async () => {
    if (!isConfirmationSatisfied) return;

    setIsExecuting(true);
    setLogs([]);
    setSummary(null);
    setProgressPercent(5);

    try {
      const result = await executeMediaGalleryClear({
        collectionsToClear: selectedCollections,
        storagePathsToClear: selectedStoragePaths,
        onProgress: (update) => {
          setLogs(prev => [...prev, update]);
          if (update.phase === 'firestore') {
            const pct = Math.min(50, Math.round((update.current / (update.total || 1)) * 50));
            setProgressPercent(pct);
          } else if (update.phase === 'storage') {
            const pct = Math.min(95, 50 + Math.round((update.current / (update.total || 1)) * 45));
            setProgressPercent(pct);
          } else if (update.phase === 'completed') {
            setProgressPercent(100);
          }
        }
      });

      setSummary(result);
      if (result.success) {
        showToast(
          'success', 
          'Media Gallery Cleared Successfully', 
          `Deleted ${result.deletedDocsCount} Firestore records and ${result.deletedStorageFilesCount} Storage files in ${(result.durationMs / 1000).toFixed(1)}s.`
        );
        onClearComplete?.();
        onCleared?.();
        // Re-scan after clearing to refresh counts
        handleRunScan();
        // Reset safety inputs
        setAgreeFirestoreLoss(false);
        setAgreeStorageLoss(false);
        setConfirmPhraseInput('');
      } else {
        showToast('info', 'Wipe Finished with Warnings', `Encountered ${result.errors.length} non-fatal warning(s).`);
      }
    } catch (err: any) {
      console.error('Purge execution error:', err);
      showToast('error', 'Purge Failed', err?.message || 'Error occurred while clearing media gallery.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(REQUIRED_CONFIRM_PHRASE);
    setPhraseCopied(true);
    setConfirmPhraseInput(REQUIRED_CONFIRM_PHRASE);
    setTimeout(() => setPhraseCopied(false), 2000);
  };

  const content = (
    <div className="space-y-6 text-slate-100 text-left">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#161F2E] to-rose-950/20 border border-rose-800/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                <Trash2 className="w-3 h-3" />
                <span>Admin Storage & Firestore Purge Utility</span>
              </div>
              <h2 className="text-lg font-black italic uppercase text-white font-sans tracking-tight">
                Media Gallery & Vault <span className="text-rose-400">Cleaner Script</span>
              </h2>
              <p className="text-xs text-slate-300">
                Initialize and safely clear all media assets in Firebase Storage and documents in Firestore collections.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunScan}
            disabled={isScanning || isExecuting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono border border-white/10 hover:border-[#00F2FE]/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#00F2FE] ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Inventory'}</span>
          </button>
        </div>
      </div>

      {/* STEP 1: Inventory & Target Selection */}
      <div className="p-5 rounded-2xl bg-[#0F172A]/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#00F2FE]/20 text-[#00F2FE] flex items-center justify-center text-xs font-bold font-mono">1</span>
            <h3 className="text-sm font-black uppercase text-white tracking-wider">
              Select Target Collections & Storage Paths
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={isExecuting}
              className="text-[11px] font-bold text-[#00F2FE] hover:underline cursor-pointer"
            >
              Select All
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={deselectAll}
              disabled={isExecuting}
              className="text-[11px] font-bold text-slate-400 hover:underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Inventory Overview Badges */}
        {scanResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Firestore Docs</span>
              <span className="text-xl font-black text-[#00F2FE] font-mono">{scanResult.totalFirestoreDocs}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Storage Files</span>
              <span className="text-xl font-black text-rose-400 font-mono">{scanResult.totalStorageFiles}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Collections Selected</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{selectedCollections.length} / {DEFAULT_GALLERY_COLLECTIONS.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Storage Paths Selected</span>
              <span className="text-xl font-black text-amber-400 font-mono">{selectedStoragePaths.length} / {DEFAULT_GALLERY_STORAGE_PATHS.length}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Firestore Collections Checklist */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-[#00F2FE]" />
              <span>Firestore Collections ({selectedCollections.length})</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {DEFAULT_GALLERY_COLLECTIONS.map((col) => {
                const isSelected = selectedCollections.includes(col.name);
                const scanned = scanResult?.collections.find(c => c.name === col.name);
                const docCount = scanned ? scanned.count : 0;

                return (
                  <div
                    key={col.name}
                    onClick={() => !isExecuting && toggleCollection(col.name)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected 
                        ? 'bg-[#00F2FE]/10 border-[#00F2FE]/40 text-white' 
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#00F2FE]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold">{col.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                          docCount > 0 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {docCount} docs
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{col.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Firebase Storage Paths Checklist */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <HardDrive className="w-3.5 h-3.5 text-rose-400" />
              <span>Firebase Storage Paths ({selectedStoragePaths.length})</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {DEFAULT_GALLERY_STORAGE_PATHS.map((item) => {
                const isSelected = selectedStoragePaths.includes(item.path);
                const scanned = scanResult?.storagePaths.find(p => p.path === item.path);
                const fileCount = scanned ? scanned.fileCount : 0;

                return (
                  <div
                    key={item.path}
                    onClick={() => !isExecuting && toggleStoragePath(item.path)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected 
                        ? 'bg-rose-500/10 border-rose-500/40 text-white' 
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold truncate">{item.path}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                          fileCount > 0 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {fileCount} files
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: Safety Confirmation Shield */}
      <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-4">
        <div className="flex items-center gap-2 border-b border-rose-900/40 pb-3">
          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold font-mono">2</span>
          <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
            <span>Safety Confirmation Step</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono uppercase font-bold">MANDATORY</span>
          </h3>
        </div>

        {/* Safety Checkbox Acknowledgements */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/70 border border-rose-900/30 hover:border-rose-700/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={agreeFirestoreLoss}
              onChange={(e) => setAgreeFirestoreLoss(e.target.checked)}
              disabled={isExecuting}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
            />
            <span className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Firestore Deletion:</strong> I acknowledge that all documents, albums, metadata, and hypes inside the <span className="text-rose-400 font-mono font-bold">{selectedCollections.length} selected collection(s)</span> will be permanently and irreversibly deleted.
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/70 border border-rose-900/30 hover:border-rose-700/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={agreeStorageLoss}
              onChange={(e) => setAgreeStorageLoss(e.target.checked)}
              disabled={isExecuting}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
            />
            <span className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Storage Purge:</strong> I acknowledge that all 4K photo files, watermarks, covers, and media inside the <span className="text-rose-400 font-mono font-bold">{selectedStoragePaths.length} selected Storage path(s)</span> will be permanently erased from Google Cloud Storage.
            </span>
          </label>
        </div>

        {/* Phrase Verification Input */}
        <div className="p-4 rounded-xl bg-[#090D16] border border-rose-900/60 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Type <span className="text-rose-400 font-mono font-black">{REQUIRED_CONFIRM_PHRASE}</span> to confirm:
            </span>
            <button
              type="button"
              onClick={handleCopyPhrase}
              className="inline-flex items-center gap-1 text-[11px] text-[#00F2FE] hover:underline font-mono cursor-pointer"
            >
              {phraseCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{phraseCopied ? 'Auto-filled!' : 'Auto-fill phrase'}</span>
            </button>
          </div>

          <input
            type="text"
            value={confirmPhraseInput}
            onChange={(e) => setConfirmPhraseInput(e.target.value)}
            disabled={isExecuting}
            placeholder={`Type "${REQUIRED_CONFIRM_PHRASE}"`}
            className="w-full h-11 px-3.5 bg-[#161F2E] border border-rose-800/60 focus:border-rose-500 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-500 outline-none uppercase"
          />
        </div>

        {/* Purge Trigger Button */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-[11px] text-slate-400">
            {isConfirmationSatisfied ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Safety checks satisfied. Ready to purge.
              </span>
            ) : (
              <span className="text-amber-400/90 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Check both boxes and type phrase to unlock.
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleStartPurge}
            disabled={!isConfirmationSatisfied || isExecuting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider font-mono shadow-[0_0_25px_rgba(225,29,72,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Purge... ({progressPercent}%)</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Initialize Permanent Purge</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* STEP 3: Execution Progress & Live Terminal Output */}
      {(isExecuting || logs.length > 0) && (
        <div className="p-5 rounded-2xl bg-[#090D16] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#00F2FE]" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Execution Progress Console
              </span>
            </div>
            {isExecuting && (
              <span className="text-[10px] font-mono text-[#00F2FE] animate-pulse font-bold">
                LIVE LOGGING
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00F2FE] via-emerald-400 to-rose-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Terminal Console Output */}
          <div className="h-44 rounded-xl bg-black/80 p-3 font-mono text-[11px] overflow-y-auto space-y-1 border border-slate-900 select-text">
            {logs.map((log, idx) => (
              <div 
                key={idx} 
                className={`flex items-start gap-2 ${
                  log.type === 'success' 
                    ? 'text-emerald-400' 
                    : log.type === 'error' 
                      ? 'text-rose-400' 
                      : log.type === 'warn' 
                        ? 'text-amber-400' 
                        : 'text-slate-300'
                }`}
              >
                <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                <span className="break-all">{log.log}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Summary Alert */}
          {summary && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              summary.success 
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
            }`}>
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="space-y-1 text-xs">
                <div className="font-black uppercase tracking-wider text-white">
                  Media Gallery Cleaner Script Finished
                </div>
                <div>
                  Deleted <strong className="text-white">{summary.deletedDocsCount} Firestore documents</strong> and <strong className="text-white">{summary.deletedStorageFilesCount} Firebase Storage files</strong> across {summary.clearedCollections.length} collections and {summary.clearedStoragePaths.length} storage folders in {(summary.durationMs / 1000).toFixed(2)} seconds.
                </div>
                {summary.errors.length > 0 && (
                  <div className="text-[11px] text-rose-300 mt-1">
                    Warnings ({summary.errors.length}): {summary.errors.join('; ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#111827] border border-slate-700 w-full max-w-3xl rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={isExecuting}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        {content}
      </div>
    </div>
  );
};
