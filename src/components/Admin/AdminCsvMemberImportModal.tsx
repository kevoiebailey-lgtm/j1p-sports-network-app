import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { CsvMemberImportService } from '../../services/csvMemberImportService';
import { ParsedMemberRecord, CsvImportProgress, CsvImportSummary } from '../../types/csvImport';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Users, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Search, 
  Lock,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';

interface AdminCsvMemberImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (summary: CsvImportSummary) => void;
}

type PreviewTab = 'all' | 'valid' | 'invalid';

export const AdminCsvMemberImportModal: React.FC<AdminCsvMemberImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const { role, profile } = useAuth();
  const isAdmin = role === 'admin' || profile?.role === 'admin';

  // Upload & Parse States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [records, setRecords] = useState<ParsedMemberRecord[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [validRows, setValidRows] = useState<number>(0);
  const [invalidRows, setInvalidRows] = useState<number>(0);

  // Table Filters & Search
  const [activeTab, setActiveTab] = useState<PreviewTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Progress & Execution States
  const [progress, setProgress] = useState<CsvImportProgress>({
    status: 'idle',
    currentBatch: 0,
    totalBatches: 0,
    processedCount: 0,
    totalCount: 0,
    percentage: 0,
    message: ''
  });
  const [summaryReport, setSummaryReport] = useState<CsvImportSummary | null>(null);

  // Handle File Drop / Select
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setParseError('Please upload a valid .csv file format.');
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setIsParsing(true);
    setSummaryReport(null);
    setProgress({
      status: 'parsing',
      currentBatch: 0,
      totalBatches: 0,
      processedCount: 0,
      totalCount: 0,
      percentage: 0,
      message: 'Parsing CSV data & validating column structures...'
    });

    try {
      const result = await CsvMemberImportService.parseAndValidateCsv(file);
      setRecords(result.records);
      setTotalRows(result.totalRows);
      setValidRows(result.validRows);
      setInvalidRows(result.invalidRows);
      setProgress(prev => ({ ...prev, status: 'ready', message: `Validated ${result.records.length} records.` }));
    } catch (err: any) {
      console.error('CSV Parsing Error:', err);
      setParseError(err.message || 'Failed to parse CSV file. Ensure standard comma-separated format.');
      setRecords([]);
      setTotalRows(0);
      setValidRows(0);
      setInvalidRows(0);
      setProgress(prev => ({ ...prev, status: 'error', message: 'Parsing failed.' }));
    } finally {
      setIsParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleReset = () => {
    setSelectedFile(null);
    setRecords([]);
    setTotalRows(0);
    setValidRows(0);
    setInvalidRows(0);
    setParseError(null);
    setSummaryReport(null);
    setSearchQuery('');
    setActiveTab('all');
    setProgress({
      status: 'idle',
      currentBatch: 0,
      totalBatches: 0,
      processedCount: 0,
      totalCount: 0,
      percentage: 0,
      message: ''
    });
  };

  // Filtered Records for Preview Table
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Tab filter
      if (activeTab === 'valid' && !rec.isValid) return false;
      if (activeTab === 'invalid' && rec.isValid) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.displayName.toLowerCase().includes(q);
        const matchesEmail = rec.email.toLowerCase().includes(q);
        const matchesSport = rec.sport.toLowerCase().includes(q);
        const matchesTeam = rec.teamName.toLowerCase().includes(q);
        const matchesRole = rec.role.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesSport || matchesTeam || matchesRole;
      }
      return true;
    });
  }, [records, activeTab, searchQuery]);

  // Execute Firestore Batch Import
  const handleStartImport = async () => {
    if (validRows === 0) return;
    setParseError(null);

    try {
      const result = await CsvMemberImportService.batchImportMembersToFirestore(records, (p) => {
        setProgress(p);
      });

      const finalSummary: CsvImportSummary = {
        ...result.summary,
        fileName: selectedFile?.name || 'Members.csv',
        fileSizeBytes: selectedFile?.size || 0,
      };

      setSummaryReport(finalSummary);
      if (onImportComplete) {
        onImportComplete(finalSummary);
      }
    } catch (err: any) {
      console.error('Import Execution Error:', err);
      setParseError(err.message || 'Failed to complete batch import to Firestore.');
      setProgress(prev => ({ ...prev, status: 'error', message: 'Batch write interrupted.' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fadeIn">
      
      {/* Modal Card Container: Dark Slate (#161C22) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-5xl rounded-3xl bg-[#161C22] border border-slate-700/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
      >
        
        {/* 1. MODAL HEADER */}
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1E2630]/60">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.15)] shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white font-sans tracking-tight">
                  IMPORT MEMBERS VIA <span className="text-[#F59E0B]">CSV</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Batch-ingest athlete, coach, and scout rosters into Firestore collections with live validation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Download Sample Template CTA */}
            <button
              onClick={() => CsvMemberImportService.downloadSampleTemplate()}
              className="px-4 py-2.5 rounded-xl bg-[#1E2630] hover:bg-slate-700/80 border border-[#F59E0B]/40 hover:border-[#F59E0B] text-[#F59E0B] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              title="Download standard CSV template with required columns"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV Template</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-700/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ADMIN SECURITY CHECK */}
        {!isAdmin && (
          <div className="p-8 text-center bg-[#161C22] flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase font-sans">Admin Privilege Required</h3>
            <p className="text-xs text-slate-400 max-w-md">
              CSV roster batch writes are restricted to Just1Play platform administrators. Please sign in with an administrator account.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase"
            >
              Close
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Error Banner */}
            {parseError && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold uppercase tracking-wider text-rose-300">Import Error</div>
                  <div className="mt-0.5 text-slate-300">{parseError}</div>
                </div>
                <button onClick={() => setParseError(null)} className="text-rose-400 hover:text-rose-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STATE 1: SUMMARY REPORT (Completed) */}
            {summaryReport ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Emerald Green Success Banner */}
                <div className="p-6 rounded-3xl bg-[#1E2630] border border-[#10B981]/40 shadow-[0_0_40px_rgba(16,185,129,0.15)] flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#10B981]/20 border border-[#10B981] flex items-center justify-center text-[#10B981] shrink-0">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold uppercase tracking-widest text-[#10B981]">
                        Batch Ingestion Completed
                      </div>
                      <h3 className="text-2xl font-black italic uppercase text-white font-sans">
                        {summaryReport.importedCount} MEMBERS PROVISIONED
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Successfully written to Firestore collections (<code className="text-slate-300 font-mono">/users</code> & <code className="text-slate-300 font-mono">/members</code>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2.5 rounded-2xl bg-[#161C22] border border-slate-700/80 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Total Processed</div>
                      <div className="text-lg font-black text-white">{summaryReport.totalRows}</div>
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 text-center">
                      <div className="text-[10px] text-[#10B981] uppercase font-mono font-bold">Imported</div>
                      <div className="text-lg font-black text-[#10B981]">{summaryReport.importedCount}</div>
                    </div>
                    {summaryReport.invalidRows > 0 && (
                      <div className="px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                        <div className="text-[10px] text-rose-400 uppercase font-mono font-bold">Skipped</div>
                        <div className="text-lg font-black text-rose-400">{summaryReport.invalidRows}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Imported Members Quick Directory */}
                <div className="rounded-2xl bg-[#1E2630] border border-slate-800 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-300">
                      <Database className="w-4 h-4 text-[#F59E0B]" />
                      <span>Provisioned Member Records ({summaryReport.records.filter(r => r.isValid).length})</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Timestamp: {new Date(summaryReport.importedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 text-xs">
                    {summaryReport.records.filter(r => r.isValid).map((record, idx) => (
                      <div key={record.id || idx} className="p-3 px-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-[#F59E0B]">
                            {record.firstName?.[0] || 'M'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{record.displayName}</span>
                              <span className="px-2 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono uppercase">
                                {record.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{record.email} • {record.teamName || record.sport}</div>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[11px]">
                          <span className="text-slate-400">{record.sport}</span>
                          {record.graduationYear && <span className="text-slate-500 ml-1.5 font-bold">'{record.graduationYear.slice(-2)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-xl bg-[#1E2630] hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-slate-700 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Import Another CSV</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
                  >
                    Done & Return to Users
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* STATE 2: UPLOAD & PREVIEW */}
                {!selectedFile ? (
                  /* DRAG AND DROP ZONE */
                  <div
                    {...getRootProps()}
                    className={`p-10 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center bg-[#1E2630]/60 ${
                      isDragActive 
                        ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-[0_0_30px_rgba(245,158,11,0.2)]' 
                        : isDragReject
                          ? 'border-rose-500 bg-rose-500/5'
                          : 'border-slate-700 hover:border-[#F59E0B]/60 hover:bg-[#1E2630]'
                    }`}
                  >
                    <input {...getInputProps()} />
                    
                    <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                      <UploadCloud className="w-8 h-8" />
                    </div>

                    <h3 className="text-lg font-black italic uppercase text-white font-sans tracking-wide">
                      DRAG & DROP YOUR <span className="text-[#F59E0B]">.CSV ROSTER FILE</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      or click to browse from your computer. Accepts standard comma-separated athlete, coach, or scout files.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">firstName</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">lastName</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">email</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">phone</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">role</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">sport</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">graduationYear</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">teamName</span>
                    </div>

                    <button
                      type="button"
                      className="mt-6 px-6 py-3 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
                    >
                      Select .CSV File
                    </button>
                  </div>
                ) : (
                  /* FILE SELECTED & VALIDATION PREVIEW */
                  <div className="space-y-5">
                    
                    {/* Active File Header Card */}
                    <div className="p-4 rounded-2xl bg-[#1E2630] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] shrink-0">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{selectedFile.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {isParsing ? 'Parsing contents...' : `Parsed ${totalRows} total rows.`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleReset}
                          disabled={progress.status === 'importing'}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Change File</span>
                        </button>
                      </div>
                    </div>

                    {/* METRIC PILLS & TABS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Total Count */}
                      <div 
                        onClick={() => setActiveTab('all')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          activeTab === 'all'
                            ? 'bg-[#1E2630] border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                            : 'bg-[#1E2630]/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase">
                          <span>Total Scanned Rows</span>
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="text-2xl font-black text-white mt-1">{totalRows}</div>
                      </div>

                      {/* Valid Rows - Emerald Green */}
                      <div 
                        onClick={() => setActiveTab('valid')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          activeTab === 'valid'
                            ? 'bg-[#1E2630] border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                            : 'bg-[#1E2630]/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[#10B981] text-[10px] font-mono uppercase font-bold">
                          <span>Ready To Ingest (Valid)</span>
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        </div>
                        <div className="text-2xl font-black text-[#10B981] mt-1">
                          {validRows} <span className="text-xs font-mono font-normal text-slate-400">({totalRows > 0 ? Math.round((validRows/totalRows)*100) : 0}%)</span>
                        </div>
                      </div>

                      {/* Invalid Rows - Rose/Amber */}
                      <div 
                        onClick={() => setActiveTab('invalid')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          activeTab === 'invalid'
                            ? 'bg-[#1E2630] border-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                            : 'bg-[#1E2630]/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-rose-400 text-[10px] font-mono uppercase font-bold">
                          <span>Invalid / Skipped</span>
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        </div>
                        <div className="text-2xl font-black text-rose-400 mt-1">
                          {invalidRows}
                        </div>
                      </div>
                    </div>

                    {/* TABLE SEARCH & CONTROLS */}
                    <div className="p-3 rounded-2xl bg-[#1E2630] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filter preview rows by name, email, sport..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#161C22] border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B] font-sans"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 self-end sm:self-auto">
                        <span>Showing {filteredRecords.length} of {records.length}</span>
                      </div>
                    </div>

                    {/* PREVIEW DATA TABLE */}
                    <div className="rounded-2xl bg-[#1E2630] border border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-[#161C22] border-b border-slate-800 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 z-10">
                            <tr>
                              <th className="py-3 px-4 w-12">Row</th>
                              <th className="py-3 px-4">Validation Status</th>
                              <th className="py-3 px-4">Full Name</th>
                              <th className="py-3 px-4">Email</th>
                              <th className="py-3 px-4">Phone</th>
                              <th className="py-3 px-4">Role</th>
                              <th className="py-3 px-4">Sport</th>
                              <th className="py-3 px-4">Grad Year</th>
                              <th className="py-3 px-4">Team / School</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-xs font-sans">
                            {filteredRecords.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-8 text-center text-slate-500 font-mono text-xs">
                                  No rows matching the selected filter.
                                </td>
                              </tr>
                            ) : (
                              filteredRecords.map((record) => (
                                <tr 
                                  key={record.id}
                                  className={`hover:bg-white/[0.02] transition-colors ${
                                    !record.isValid ? 'bg-rose-950/20' : ''
                                  }`}
                                >
                                  {/* Row # */}
                                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                                    #{record.rowNumber}
                                  </td>

                                  {/* Validation Status */}
                                  <td className="py-3 px-4">
                                    {record.isValid ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-[10px] font-mono font-bold uppercase">
                                        <Check className="w-3 h-3" />
                                        Valid
                                      </span>
                                    ) : (
                                      <div className="flex flex-col gap-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-mono font-bold uppercase">
                                          <AlertCircle className="w-3 h-3 shrink-0" />
                                          Invalid
                                        </span>
                                        <span className="text-[10px] text-rose-300/80 font-mono leading-tight">
                                          {record.errors.join(', ')}
                                        </span>
                                      </div>
                                    )}
                                    {record.warnings.length > 0 && record.isValid && (
                                      <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">
                                        Note: {record.warnings.join('; ')}
                                      </div>
                                    )}
                                  </td>

                                  {/* Name */}
                                  <td className="py-3 px-4 font-bold text-white">
                                    {record.displayName || <span className="text-rose-400 italic">Empty</span>}
                                  </td>

                                  {/* Email */}
                                  <td className="py-3 px-4 font-mono text-slate-300">
                                    {record.email || <span className="text-rose-400 italic">Missing</span>}
                                  </td>

                                  {/* Phone */}
                                  <td className="py-3 px-4 font-mono text-slate-400">
                                    {record.phone || '—'}
                                  </td>

                                  {/* Role */}
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-mono uppercase font-bold">
                                      {record.role}
                                    </span>
                                  </td>

                                  {/* Sport */}
                                  <td className="py-3 px-4 font-mono text-slate-300">
                                    {record.sport}
                                  </td>

                                  {/* Grad Year */}
                                  <td className="py-3 px-4 font-mono text-slate-300">
                                    {record.graduationYear || '—'}
                                  </td>

                                  {/* Team Name */}
                                  <td className="py-3 px-4 text-slate-300 font-sans">
                                    {record.teamName || '—'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* PROGRESS BAR (While Importing) */}
                    {progress.status === 'importing' && (
                      <div className="p-4 rounded-2xl bg-[#1E2630] border border-[#F59E0B]/40 space-y-2 animate-fadeIn shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-[#F59E0B] flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            {progress.message}
                          </span>
                          <span className="font-bold text-white">{progress.percentage}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-[#F59E0B] to-[#10B981] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress.percentage}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* ACTION FOOTER */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
                      <div className="text-xs text-slate-400 font-mono">
                        Targeting collections: <code className="text-slate-200">/users</code> & <code className="text-slate-200">/members</code> via atomic writeBatch.
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                          onClick={onClose}
                          disabled={progress.status === 'importing'}
                          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={handleStartImport}
                          disabled={validRows === 0 || progress.status === 'importing'}
                          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {progress.status === 'importing' ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Importing {validRows} Members...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-4 h-4" />
                              <span>Confirm & Batch Import {validRows} Members</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </>
            )}

          </div>
        )}

      </motion.div>
    </div>
  );
};
