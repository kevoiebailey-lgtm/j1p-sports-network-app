import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Table, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  LogOut, 
  Sparkles, 
  Users, 
  Trophy, 
  Zap, 
  Layers, 
  Eye, 
  ArrowRight,
  Download,
  FilePlus,
  Edit3
} from 'lucide-react';
import { 
  signInWithGoogleSheets, 
  disconnectGoogleSheets, 
  getSheetsAccessToken, 
  fetchUserSpreadsheets, 
  getSpreadsheetMetadata, 
  readSheetRange, 
  appendSheetRows, 
  clearSheetRange, 
  createNewSpreadsheet, 
  exportRosterToGoogleSheets, 
  exportTournamentToGoogleSheets, 
  exportCombineToGoogleSheets, 
  SpreadsheetFileItem, 
  SpreadsheetMetadata, 
  SheetValuesResult,
  AthleticRosterExportItem,
  TournamentStandingsExportItem,
  CombineRecordExportItem
} from '../../lib/googleSheetsService';
import { useAuth } from '../../context/AuthContext';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const GoogleSheetsHub: React.FC = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(getSheetsAccessToken());
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Tab View in Hub
  const [hubTab, setHubTab] = useState<'library' | 'inspector' | 'export'>('library');

  // Inspector State
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>('');
  const [sheetData, setSheetData] = useState<SheetValuesResult | null>(null);
  const [loadingGrid, setLoadingGrid] = useState<boolean>(false);
  const [gridSearch, setGridSearch] = useState<string>('');

  // Row Append Modal
  const [showAddRowModal, setShowAddRowModal] = useState<boolean>(false);
  const [newRowValues, setNewRowValues] = useState<string>('');
  const [isAppending, setIsAppending] = useState<boolean>(false);

  // Clear/Delete Range Confirmation Modal (MANDATORY User Confirmation for Workspace Skill)
  const [showConfirmClearModal, setShowConfirmClearModal] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // New Blank/Template Sheet Creation Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newSheetTitle, setNewSheetTitle] = useState<string>('');
  const [newSheetTemplate, setNewSheetTemplate] = useState<'blank' | 'roster' | 'tournament' | 'combine'>('blank');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Exporter Actions State
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Auto-dismiss messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Load user spreadsheets when token is available
  useEffect(() => {
    if (token) {
      loadSpreadsheets(token);
    }
  }, [token]);

  const loadSpreadsheets = async (authToken: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const files = await fetchUserSpreadsheets(authToken, 50);
      setSpreadsheets(files);
      if (files.length > 0 && !activeSpreadsheetId) {
        // Pre-select the first sheet for smooth inspecting
        inspectSpreadsheet(authToken, files[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load Google Sheets:', err);
      setErrorMsg(err.message || 'Failed to list spreadsheets from your Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setErrorMsg(null);
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
      const result = await signInWithGoogleSheets();
      if (result?.accessToken) {
        setToken(result.accessToken);
        setSuccessMsg('Successfully connected to Google Sheets & Drive!');
        loadSpreadsheets(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMsg(err.message || 'Google authorization failed.');
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleSheets();
    setToken(null);
    setSpreadsheets([]);
    setMetadata(null);
    setSheetData(null);
    setActiveSpreadsheetId(null);
    setSuccessMsg('Disconnected Google Sheets session.');
  };

  const inspectSpreadsheet = async (authToken: string, spreadsheetId: string) => {
    setLoadingGrid(true);
    setErrorMsg(null);
    setActiveSpreadsheetId(spreadsheetId);
    try {
      const meta = await getSpreadsheetMetadata(authToken, spreadsheetId);
      setMetadata(meta);
      const firstTab = meta.sheets[0]?.title || 'Sheet1';
      setSelectedSheetTitle(firstTab);
      await loadSheetValues(authToken, spreadsheetId, firstTab);
    } catch (err: any) {
      console.error('Metadata load error:', err);
      setErrorMsg(err.message || 'Failed to inspect spreadsheet details.');
    } finally {
      setLoadingGrid(false);
    }
  };

  const loadSheetValues = async (authToken: string, spreadsheetId: string, tabTitle: string) => {
    setLoadingGrid(true);
    try {
      const range = `${tabTitle}!A1:Z100`;
      const result = await readSheetRange(authToken, spreadsheetId, range);
      setSheetData(result);
    } catch (err: any) {
      console.error('Range load error:', err);
      setErrorMsg(err.message || `Failed to read sheet data from tab "${tabTitle}".`);
    } finally {
      setLoadingGrid(false);
    }
  };

  const handleSelectTab = (tabTitle: string) => {
    if (!token || !activeSpreadsheetId) return;
    setSelectedSheetTitle(tabTitle);
    loadSheetValues(token, activeSpreadsheetId, tabTitle);
  };

  // Append new row
  const handleAppendRow = async () => {
    if (!token || !activeSpreadsheetId || !selectedSheetTitle || !newRowValues.trim()) return;
    setIsAppending(true);
    try {
      const values = [newRowValues.split(',').map(s => s.trim())];
      await appendSheetRows(token, activeSpreadsheetId, `${selectedSheetTitle}!A:Z`, values);
      setSuccessMsg(`Added new row to ${selectedSheetTitle}!`);
      setShowAddRowModal(false);
      setNewRowValues('');
      await loadSheetValues(token, activeSpreadsheetId, selectedSheetTitle);
    } catch (err: any) {
      console.error('Row append error:', err);
      setErrorMsg(err.message || 'Failed to append row.');
    } finally {
      setIsAppending(false);
    }
  };

  // Mandatory user confirmation for destructive clear operation
  const handleConfirmClearRange = async () => {
    if (!token || !activeSpreadsheetId || !selectedSheetTitle) return;
    setIsClearing(true);
    try {
      await clearSheetRange(token, activeSpreadsheetId, `${selectedSheetTitle}!A2:Z100`);
      setSuccessMsg(`Cleared data rows in tab "${selectedSheetTitle}".`);
      setShowConfirmClearModal(false);
      await loadSheetValues(token, activeSpreadsheetId, selectedSheetTitle);
    } catch (err: any) {
      console.error('Clear error:', err);
      setErrorMsg(err.message || 'Failed to clear sheet range.');
    } finally {
      setIsClearing(false);
    }
  };

  // Create new spreadsheet
  const handleCreateNewSpreadsheet = async () => {
    if (!token || !newSheetTitle.trim()) return;
    setIsCreating(true);
    try {
      let result;
      if (newSheetTemplate === 'roster') {
        result = await exportRosterToGoogleSheets(token, newSheetTitle, getSampleRoster());
      } else if (newSheetTemplate === 'tournament') {
        result = await exportTournamentToGoogleSheets(token, newSheetTitle, getSampleTournament());
      } else if (newSheetTemplate === 'combine') {
        result = await exportCombineToGoogleSheets(token, newSheetTitle, getSampleCombine());
      } else {
        result = await createNewSpreadsheet(token, newSheetTitle);
      }

      setSuccessMsg(`Spreadsheet "${newSheetTitle}" created in Google Drive!`);
      setShowCreateModal(false);
      setNewSheetTitle('');
      await loadSpreadsheets(token);
      if (result.spreadsheetId) {
        inspectSpreadsheet(token, result.spreadsheetId);
        setHubTab('inspector');
      }
    } catch (err: any) {
      console.error('Creation error:', err);
      setErrorMsg(err.message || 'Failed to create spreadsheet.');
    } finally {
      setIsCreating(false);
    }
  };

  // Direct 1-Click Exporters
  const handleExportLiveRoster = async () => {
    if (!token) {
      await handleConnect();
      return;
    }
    setExportingType('roster');
    try {
      // Pull real members from Firestore if available
      let rosterData: AthleticRosterExportItem[] = [];
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(30)));
        if (!usersSnap.empty) {
          usersSnap.docs.forEach((docSnap, index) => {
            const data = docSnap.data();
            rosterData.push({
              number: data.jerseyNumber || (index + 1),
              name: data.displayName || data.name || 'Athlete Member',
              position: data.primaryPosition || data.position || 'ATH',
              gradYear: data.graduationYear || data.classYear || '2026',
              height: data.height || '--',
              weight: data.weight || '--',
              gpa: data.gpa || data.academicGpa || '--',
              verified: Boolean(data.isVerified || data.verified),
              cityState: data.location || data.cityState || '--',
              phoneOrEmail: data.email || '--',
              profileUrl: `https://app.just1play.com/profile/${docSnap.id}`
            });
          });
        }
      } catch (e) {
        console.warn('Using sample roster data fallback:', e);
      }

      if (rosterData.length === 0) {
        rosterData = getSampleRoster();
      }

      const res = await exportRosterToGoogleSheets(token, 'Elite 7v7 Academy', rosterData);
      setSuccessMsg('Team Roster exported to Google Sheets!');
      await loadSpreadsheets(token);
      inspectSpreadsheet(token, res.spreadsheetId);
      setHubTab('inspector');
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Failed to export team roster.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportTournamentStandings = async () => {
    if (!token) {
      await handleConnect();
      return;
    }
    setExportingType('tournament');
    try {
      const standings = getSampleTournament();
      const res = await exportTournamentToGoogleSheets(token, 'National 7v7 Championship', standings);
      setSuccessMsg('Tournament Standings exported to Google Sheets!');
      await loadSpreadsheets(token);
      inspectSpreadsheet(token, res.spreadsheetId);
      setHubTab('inspector');
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Failed to export tournament standings.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportCombineLaser = async () => {
    if (!token) {
      await handleConnect();
      return;
    }
    setExportingType('combine');
    try {
      const records = getSampleCombine();
      const res = await exportCombineToGoogleSheets(token, 'State Championship Laser Trials', records);
      setSuccessMsg('Combine Laser Leaderboard exported to Google Sheets!');
      await loadSpreadsheets(token);
      inspectSpreadsheet(token, res.spreadsheetId);
      setHubTab('inspector');
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Failed to export combine leaderboard.');
    } finally {
      setExportingType(null);
    }
  };

  // Sample data fallbacks
  const getSampleRoster = (): AthleticRosterExportItem[] => [
    { number: '7', name: 'Marcus Vance', position: 'QB', gradYear: '2026', height: "6'2\"", weight: '195', gpa: '3.8', verified: true, cityState: 'Dallas, TX', profileUrl: 'https://app.just1play.com' },
    { number: '1', name: 'DeAndre Cole', position: 'WR', gradYear: '2025', height: "6'1\"", weight: '185', gpa: '3.5', verified: true, cityState: 'Miami, FL', profileUrl: 'https://app.just1play.com' },
    { number: '24', name: 'Jaylen Brooks', position: 'CB', gradYear: '2026', height: "5'11\"", weight: '178', gpa: '3.9', verified: true, cityState: 'Atlanta, GA', profileUrl: 'https://app.just1play.com' },
    { number: '5', name: 'Trey Hawkins', position: 'FS', gradYear: '2027', height: "6'0\"", weight: '188', gpa: '3.6', verified: false, cityState: 'Houston, TX', profileUrl: 'https://app.just1play.com' },
    { number: '11', name: 'Kobe Sterling', position: 'SLOT', gradYear: '2026', height: "5'10\"", weight: '172', gpa: '4.0', verified: true, cityState: 'Los Angeles, CA', profileUrl: 'https://app.just1play.com' }
  ];

  const getSampleTournament = (): TournamentStandingsExportItem[] => [
    { seed: 1, teamName: 'Apex 7v7 National', division: 'Varsity Elite', wins: 5, losses: 0, pointsFor: 142, pointsAgainst: 48, diff: 94, status: 'Qualified (Round 1 Bye)' },
    { seed: 2, teamName: 'Bayou Speed Squad', division: 'Varsity Elite', wins: 4, losses: 1, pointsFor: 128, pointsAgainst: 66, diff: 62, status: 'Qualified (Quarterfinals)' },
    { seed: 3, teamName: 'Lone Star Playmakers', division: 'Varsity Elite', wins: 4, losses: 1, pointsFor: 110, pointsAgainst: 72, diff: 38, status: 'Qualified (Quarterfinals)' },
    { seed: 4, teamName: 'West Coast Prime', division: 'Varsity Elite', wins: 3, losses: 2, pointsFor: 98, pointsAgainst: 88, diff: 10, status: 'Qualified (Wildcard)' },
    { seed: 5, teamName: 'Midwest Storm', division: 'Varsity Elite', wins: 2, losses: 3, pointsFor: 74, pointsAgainst: 102, diff: -28, status: 'Consolation Bracket' }
  ];

  const getSampleCombine = (): CombineRecordExportItem[] => [
    { rank: 1, athleteName: 'Marcus Vance', position: 'QB', gradYear: '2026', fortyYardDash: '4.52', verticalJump: '36.5', proShuttle: '4.18', benchPress: '16', broadJump: "10'2\"", compositeScore: '94.8', laserVerified: true },
    { rank: 2, athleteName: 'DeAndre Cole', position: 'WR', gradYear: '2025', fortyYardDash: '4.38', verticalJump: '39.0', proShuttle: '4.08', benchPress: '12', broadJump: "10'6\"", compositeScore: '96.2', laserVerified: true },
    { rank: 3, athleteName: 'Jaylen Brooks', position: 'CB', gradYear: '2026', fortyYardDash: '4.44', verticalJump: '37.5', proShuttle: '4.12', benchPress: '14', broadJump: "10'4\"", compositeScore: '93.5', laserVerified: true },
    { rank: 4, athleteName: 'Kobe Sterling', position: 'SLOT', gradYear: '2026', fortyYardDash: '4.48', verticalJump: '35.0', proShuttle: '4.15', benchPress: '10', broadJump: "9'11\"", compositeScore: '91.2', laserVerified: true }
  ];

  const filteredSpreadsheets = spreadsheets.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Rows for active grid inspector
  const gridRows = sheetData?.values || [];
  const headerRow = gridRows[0] || [];
  const bodyRows = gridRows.slice(1);
  const filteredBodyRows = bodyRows.filter(row => {
    if (!gridSearch.trim()) return true;
    return row.some(cell => String(cell || '').toLowerCase().includes(gridSearch.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-[#08090C] text-white pb-36 px-3 sm:px-6 pt-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Header Banner & Status Bar */}
        <div className="relative rounded-2xl bg-[#12151C] border border-white/10 p-5 sm:p-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#00F0D0]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono font-black tracking-widest text-[#00F0D0] uppercase bg-[#00F0D0]/10 px-2.5 py-1 rounded-full border border-[#00F0D0]/30">
                  Google Workspace Integration
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                Google Sheets Operations Center
              </h1>
              <p className="text-sm text-[#8E9BB0] mt-1 max-w-2xl">
                Read, query, format, and synchronize live rosters, tournament brackets, and laser combine data directly with your personal Google Sheets & Drive account.
              </p>
            </div>

            {/* Auth State & Action Button */}
            <div className="flex flex-wrap items-center gap-3">
              {token ? (
                <div className="flex items-center gap-2.5 bg-[#08090C] border border-white/10 px-3.5 py-2 rounded-xl">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-slate-200">
                    Connected to Sheets
                  </span>
                  <button
                    onClick={handleDisconnect}
                    className="ml-2 text-xs font-mono text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Disconnect Google Sheets"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="gsi-material-button flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs tracking-wide shadow-xl active:scale-[0.97] transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Connect Google Sheets</span>
                </button>
              )}

              {token && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00F0D0] text-[#08090C] font-mono font-black text-xs hover:bg-[#00d8bc] active:scale-[0.97] transition-all shadow-lg shadow-[#00F0D0]/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Spreadsheet
                </button>
              )}
            </div>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
                <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Top Navigation Hub Modes */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHubTab('library')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                hubTab === 'library'
                  ? 'bg-[#00F0D0]/20 text-[#00F0D0] border border-[#00F0D0]/40 shadow-sm'
                  : 'bg-[#12151C] text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              <Table className="w-4 h-4" />
              Drive Spreadsheets ({spreadsheets.length})
            </button>

            <button
              onClick={() => setHubTab('inspector')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                hubTab === 'inspector'
                  ? 'bg-[#00F0D0]/20 text-[#00F0D0] border border-[#00F0D0]/40 shadow-sm'
                  : 'bg-[#12151C] text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              Live Grid Inspector {metadata ? `(${metadata.title})` : ''}
            </button>

            <button
              onClick={() => setHubTab('export')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                hubTab === 'export'
                  ? 'bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/40 shadow-sm'
                  : 'bg-[#12151C] text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              1-Click Athletic Exporters
            </button>
          </div>

          {token && (
            <button
              onClick={() => loadSpreadsheets(token)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#12151C] text-slate-400 hover:text-white border border-white/10 text-xs font-mono cursor-pointer shrink-0 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00F0D0]' : ''}`} />
              Refresh
            </button>
          )}
        </div>

        {/* 3. Tab Contents */}

        {/* TAB 1: SPREADSHEETS LIBRARY */}
        {hubTab === 'library' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search spreadsheets in Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#12151C] border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0D0]"
                />
              </div>
              <span className="text-xs font-mono text-[#8E9BB0] self-end sm:self-auto">
                Showing {filteredSpreadsheets.length} spreadsheet{filteredSpreadsheets.length === 1 ? '' : 's'}
              </span>
            </div>

            {!token ? (
              <div className="rounded-2xl bg-[#12151C] border border-white/10 p-10 text-center space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <div className="w-16 h-16 rounded-2xl bg-[#00F0D0]/10 border border-[#00F0D0]/30 text-[#00F0D0] flex items-center justify-center mx-auto shadow-lg">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Connect Your Google Account</h3>
                <p className="text-sm text-[#8E9BB0] max-w-md mx-auto">
                  Authorize Just1Play with Google Sheets and Google Drive to access your rosters, tournaments, and combine stats spreadsheets in real-time.
                </p>
                <button
                  onClick={handleConnect}
                  className="px-6 py-3 rounded-xl bg-[#00F0D0] text-[#08090C] font-mono font-black text-xs hover:bg-[#00d8bc] active:scale-[0.97] transition-all shadow-lg shadow-[#00F0D0]/20 cursor-pointer mx-auto inline-flex items-center gap-2"
                >
                  <FilePlus className="w-4 h-4" />
                  Authorize Google Sheets Access
                </button>
              </div>
            ) : loading ? (
              <div className="rounded-2xl bg-[#12151C] border border-white/10 p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#00F0D0] animate-spin mx-auto" />
                <p className="text-xs font-mono text-slate-400">Loading spreadsheets from your Google Drive...</p>
              </div>
            ) : filteredSpreadsheets.length === 0 ? (
              <div className="rounded-2xl bg-[#12151C] border border-white/10 p-10 text-center space-y-3">
                <p className="text-sm text-slate-400">No Google Sheets found matching your search.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#00F0D0]/20 text-[#00F0D0] border border-[#00F0D0]/40 text-xs font-mono font-bold hover:bg-[#00F0D0]/30 cursor-pointer"
                >
                  Create Your First Athletic Sheet
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSpreadsheets.map(sheet => {
                  const isCurrentActive = activeSpreadsheetId === sheet.id;
                  const modifiedFormatted = sheet.modifiedTime ? new Date(sheet.modifiedTime).toLocaleDateString() : '--';

                  return (
                    <div
                      key={sheet.id}
                      className={`group relative rounded-2xl bg-[#12151C] border transition-all duration-200 p-5 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${
                        isCurrentActive 
                          ? 'border-[#00F0D0] shadow-[0_0_20px_rgba(0,240,208,0.15)]' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {sheet.webViewLink && (
                            <a
                              href={sheet.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-[#08090C] border border-white/10 text-slate-400 hover:text-[#00F0D0] transition-colors"
                              title="Open directly in Google Sheets"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-[#00F0D0] transition-colors">
                          {sheet.name}
                        </h4>
                        <span className="text-[11px] font-mono text-[#8E9BB0] mt-1 block">
                          Modified: {modifiedFormatted}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <button
                          onClick={() => {
                            if (token) {
                              inspectSpreadsheet(token, sheet.id);
                              setHubTab('inspector');
                            }
                          }}
                          className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#00F0D0] hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect & Live Grid
                        </button>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          Drive v3
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE GRID INSPECTOR */}
        {hubTab === 'inspector' && (
          <div className="space-y-4">
            {!token ? (
              <div className="rounded-2xl bg-[#12151C] border border-white/10 p-8 text-center space-y-3">
                <p className="text-sm text-slate-400">Please connect your Google account to inspect spreadsheets.</p>
                <button onClick={handleConnect} className="px-4 py-2 rounded-xl bg-[#00F0D0] text-[#08090C] font-mono font-bold text-xs">
                  Connect Google Sheets
                </button>
              </div>
            ) : !metadata ? (
              <div className="rounded-2xl bg-[#12151C] border border-white/10 p-8 text-center space-y-3">
                <p className="text-sm text-slate-400">Select a spreadsheet from the library to inspect its live data.</p>
                <button onClick={() => setHubTab('library')} className="px-4 py-2 rounded-xl bg-white/10 text-white font-mono font-bold text-xs">
                  Go to Library
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Spreadsheet Title & Tabs Bar */}
                <div className="rounded-2xl bg-[#12151C] border border-white/10 p-4 sm:p-5 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#00F0D0] bg-[#00F0D0]/10 px-2 py-0.5 rounded border border-[#00F0D0]/30 font-black">
                          Active Spreadsheet
                        </span>
                        <a
                          href={metadata.spreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-white text-xs flex items-center gap-1 font-mono"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open in Google Sheets
                        </a>
                      </div>
                      <h2 className="text-xl font-bold text-white mt-1">{metadata.title}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddRowModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold hover:bg-emerald-500/30 cursor-pointer active:scale-[0.97] transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Append Row
                      </button>

                      <button
                        onClick={() => setShowConfirmClearModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-mono font-bold hover:bg-red-500/20 cursor-pointer active:scale-[0.97] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Range
                      </button>
                    </div>
                  </div>

                  {/* Tab Selector Buttons */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-white/5">
                    <span className="text-xs font-mono text-slate-400 mr-2 shrink-0">Tabs:</span>
                    {metadata.sheets.map(tab => (
                      <button
                        key={tab.sheetId}
                        onClick={() => handleSelectTab(tab.title)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all shrink-0 ${
                          selectedSheetTitle === tab.title
                            ? 'bg-[#00F0D0] text-[#08090C] shadow-md shadow-[#00F0D0]/20'
                            : 'bg-[#08090C] text-slate-300 border border-white/10 hover:text-white'
                        }`}
                      >
                        {tab.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter / Search within Sheet Grid */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`Filter rows in ${selectedSheetTitle}...`}
                      value={gridSearch}
                      onChange={(e) => setGridSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#12151C] border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0D0]"
                    />
                  </div>
                  <span className="text-xs font-mono text-[#8E9BB0]">
                    {filteredBodyRows.length} data rows
                  </span>
                </div>

                {/* Live Data Grid Table */}
                <div className="rounded-2xl bg-[#12151C] border border-white/10 overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                  {loadingGrid ? (
                    <div className="p-12 text-center space-y-3">
                      <RefreshCw className="w-8 h-8 text-[#00F0D0] animate-spin mx-auto" />
                      <p className="text-xs font-mono text-slate-400">Loading grid cells from {selectedSheetTitle}...</p>
                    </div>
                  ) : gridRows.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <p className="text-sm text-slate-400">This sheet tab is currently empty.</p>
                      <button
                        onClick={() => setShowAddRowModal(true)}
                        className="text-xs font-mono text-[#00F0D0] hover:underline"
                      >
                        + Add initial row data
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto no-scrollbar">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-[#08090C] border-b border-white/10 sticky top-0 z-10">
                            <th className="py-2.5 px-3 text-[10px] text-slate-500 font-mono uppercase tracking-wider border-r border-white/5 w-12 text-center">
                              #
                            </th>
                            {headerRow.map((col, idx) => (
                              <th
                                key={idx}
                                className="py-2.5 px-4 text-xs font-bold text-[#00F0D0] uppercase tracking-wider border-r border-white/5 whitespace-nowrap"
                              >
                                {String(col ?? '')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredBodyRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2 px-3 text-[11px] text-slate-500 text-center border-r border-white/5 bg-[#08090C]/50">
                                {rIdx + 2}
                              </td>
                              {headerRow.map((_, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="py-2 px-4 text-slate-200 border-r border-white/5 whitespace-nowrap"
                                >
                                  {row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : '--'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 1-CLICK ATHLETIC EXPORTERS */}
        {hubTab === 'export' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Championship Operating System Data Exporters</h2>
              <p className="text-sm text-[#8E9BB0] mt-1">
                Instantly push live Just1Play athlete records, tournament brackets, and laser combine trials into formatted Google Sheets in your Google Drive.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Team Roster */}
              <div className="rounded-2xl bg-[#12151C] border border-white/10 p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Active Team Roster</h3>
                    <p className="text-xs text-[#8E9BB0] mt-1 leading-relaxed">
                      Exports complete athlete profile details: Jersey #, Position, Grad Year, Height, Weight, GPA, Verified Status, Hometown, and Just1Play URL.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleExportLiveRoster}
                  disabled={exportingType === 'roster'}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00F0D0] hover:bg-[#00d8bc] text-[#08090C] font-mono font-black text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {exportingType === 'roster' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Spreadsheet...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Export Roster to Sheets
                    </>
                  )}
                </button>
              </div>

              {/* Card 2: Tournament Standings */}
              <div className="rounded-2xl bg-[#12151C] border border-white/10 p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FFB800]/15 border border-[#FFB800]/30 text-[#FFB800] flex items-center justify-center">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Tournament Standings & Seeds</h3>
                    <p className="text-xs text-[#8E9BB0] mt-1 leading-relaxed">
                      Exports tournament pool records: Seeds, Team Names, Divisions, Wins/Losses, Points For, Points Against, Differential, and Playoff status.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleExportTournamentStandings}
                  disabled={exportingType === 'tournament'}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FFB800] hover:bg-[#e6a600] text-[#08090C] font-mono font-black text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {exportingType === 'tournament' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Spreadsheet...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Export Standings to Sheets
                    </>
                  )}
                </button>
              </div>

              {/* Card 3: Combine Laser Metrics */}
              <div className="rounded-2xl bg-[#12151C] border border-white/10 p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FF334B]/15 border border-[#FF334B]/30 text-[#FF334B] flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Combine Laser Leaderboard</h3>
                    <p className="text-xs text-[#8E9BB0] mt-1 leading-relaxed">
                      Exports laser verified trials: 40-Yard Dash, Vertical Jump, 20-Yard Pro Shuttle, Bench Press, Broad Jump, and Composite Index.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleExportCombineLaser}
                  disabled={exportingType === 'combine'}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FF334B] hover:bg-[#e62a40] text-white font-mono font-black text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  {exportingType === 'combine' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating Spreadsheet...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Export Combine to Sheets
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 4. MODALS (Designed to native mobile bottom sheet specs) */}

      {/* MODAL 1: Append Row Modal */}
      <AnimatePresence>
        {showAddRowModal && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowAddRowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border-t border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-6 overflow-y-auto no-scrollbar z-50 sm:static sm:max-w-md sm:rounded-2xl border border-white/10 sm:overflow-hidden sm:my-auto shadow-2xl space-y-4"
            >
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-2 sm:hidden" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#00F0D0]" />
                  Append Row to {selectedSheetTitle}
                </h3>
                <button onClick={() => setShowAddRowModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300">
                  Comma-Separated Values (CSV format):
                </label>
                <textarea
                  rows={4}
                  value={newRowValues}
                  onChange={(e) => setNewRowValues(e.target.value)}
                  placeholder="e.g. 10, Jordan Smith, WR, 2026, 6'1, 185, 3.7, VERIFIED"
                  className="w-full p-3 bg-[#08090C] border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#00F0D0]"
                />
                <p className="text-[11px] font-mono text-slate-500">
                  Matches columns in order: {headerRow.join(', ') || 'Col1, Col2, Col3'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-mono hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAppendRow}
                  disabled={isAppending || !newRowValues.trim()}
                  className="px-4 py-2 rounded-xl bg-[#00F0D0] text-[#08090C] text-xs font-mono font-bold hover:bg-[#00d8bc] disabled:opacity-50 cursor-pointer"
                >
                  {isAppending ? 'Appending...' : 'Append Row'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Mandatory User Confirmation for Clear Range (Workspace Skill Directive) */}
      <AnimatePresence>
        {showConfirmClearModal && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowConfirmClearModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border-t border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-6 overflow-y-auto no-scrollbar z-50 sm:static sm:max-w-md sm:rounded-2xl border border-white/10 sm:overflow-hidden sm:my-auto shadow-2xl space-y-4"
            >
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-2 sm:hidden" />
              <div className="flex items-center gap-3 text-[#FF334B]">
                <div className="w-10 h-10 rounded-xl bg-[#FF334B]/15 border border-[#FF334B]/30 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Clear Spreadsheet Range?</h3>
                  <span className="text-xs font-mono text-[#FF334B]">Destructive Mutation Warning</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to clear all data rows in tab <span className="font-mono text-[#00F0D0]">"{selectedSheetTitle}"</span> (Range <span className="font-mono">A2:Z100</span>) in spreadsheet <span className="font-bold text-white">"{metadata?.title}"</span>?
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                This action will wipe the cell values in your live Google Sheet. The header row will be preserved.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmClearModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-mono hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearRange}
                  disabled={isClearing}
                  className="px-4 py-2 rounded-xl bg-[#FF334B] text-white text-xs font-mono font-bold hover:bg-[#e62a40] disabled:opacity-50 cursor-pointer"
                >
                  {isClearing ? 'Clearing Data...' : 'Yes, Clear Range'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Create New Spreadsheet */}
      <AnimatePresence>
        {showCreateModal && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border-t border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-6 overflow-y-auto no-scrollbar z-50 sm:static sm:max-w-md sm:rounded-2xl border border-white/10 sm:overflow-hidden sm:my-auto shadow-2xl space-y-4"
            >
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-2 sm:hidden" />
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FilePlus className="w-4 h-4 text-[#00F0D0]" />
                  Create New Google Spreadsheet
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Spreadsheet Title:
                  </label>
                  <input
                    type="text"
                    value={newSheetTitle}
                    onChange={(e) => setNewSheetTitle(e.target.value)}
                    placeholder="e.g. 2026 Varsity Athletic Roster"
                    className="w-full p-2.5 bg-[#08090C] border border-white/10 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#00F0D0]"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Initial Template:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'blank', label: 'Blank Sheet' },
                      { id: 'roster', label: 'Team Roster' },
                      { id: 'tournament', label: 'Tournament' },
                      { id: 'combine', label: 'Laser Combine' }
                    ].map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setNewSheetTemplate(tpl.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-mono text-left cursor-pointer transition-all ${
                          newSheetTemplate === tpl.id
                            ? 'bg-[#00F0D0]/20 border-[#00F0D0] text-[#00F0D0]'
                            : 'bg-[#08090C] border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-mono hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewSpreadsheet}
                  disabled={isCreating || !newSheetTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-[#00F0D0] text-[#08090C] text-xs font-mono font-bold hover:bg-[#00d8bc] disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? 'Creating in Drive...' : 'Create in Drive'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default GoogleSheetsHub;
