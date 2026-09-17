import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Bell, 
  Flame, 
  Award, 
  ExternalLink, 
  ShieldCheck, 
  Plus, 
  Check, 
  Download, 
  SlidersHorizontal,
  Mail,
  Video,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  WifiOff,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getRecruiterPipelineOffline, 
  saveRecruiterPipelineOffline 
} from '../../lib/offlineFavoritesService';

interface ProspectPipelineItem {
  id: string;
  athleteId: string;
  athleteName: string;
  sport: string;
  highSchool: string;
  classYear: string;
  pipelineStage: 'Watchlist' | 'Contacted' | 'Offered' | 'Committed' | 'Priority Target';
  recruitingNotes: string;
  alertOnTape: boolean;
  alertOnGameLog: boolean;
  alertThresholdPts: number;
  lastEvaluated: string;
}

const STAGES = ['ALL', 'Priority Target', 'Offered', 'Contacted', 'Watchlist', 'Committed'] as const;

export const RecruiterWatchlistHub: React.FC = () => {
  const [pipeline, setPipeline] = useState<ProspectPipelineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newProspectName, setNewProspectName] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [simulatedAlert, setSimulatedAlert] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchPipeline();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchPipeline = async () => {
    try {
      const res = await fetch('/api/recruiter/watchlist');
      if (res.ok) {
        const data = await res.json();
        const loadedPipeline = data.pipeline || [];
        setPipeline(loadedPipeline);
        saveRecruiterPipelineOffline(loadedPipeline);
      } else {
        // Fallback to offline cache
        const offlinePipeline = getRecruiterPipelineOffline();
        if (offlinePipeline.length > 0) {
          setPipeline(offlinePipeline);
        }
      }
    } catch (err) {
      console.warn('Network offline, reading pipeline from offline cache:', err);
      const offlinePipeline = getRecruiterPipelineOffline();
      if (offlinePipeline.length > 0) {
        setPipeline(offlinePipeline);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async (athleteId: string, athleteName: string, newStage: ProspectPipelineItem['pipelineStage']) => {
    try {
      const res = await fetch('/api/recruiter/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          athleteName,
          pipelineStage: newStage
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPipeline(data.pipeline);
        saveRecruiterPipelineOffline(data.pipeline);
        setSimulatedAlert(`Updated ${athleteName} to "${newStage}" stage.`);
        setTimeout(() => setSimulatedAlert(null), 3000);
      }
    } catch (err) {
      console.warn('Offline stage update applied locally:', err);
      const updated = pipeline.map(p => p.athleteId === athleteId ? { ...p, pipelineStage: newStage } : p);
      setPipeline(updated);
      saveRecruiterPipelineOffline(updated);
      setSimulatedAlert(`(Stadium Offline) Saved ${athleteName} to "${newStage}" stage.`);
      setTimeout(() => setSimulatedAlert(null), 3000);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Athlete Name', 'Sport', 'School', 'Class', 'Stage', 'Notes'];
    const rows = filteredList.map(p => [
      p.athleteName,
      p.sport,
      p.highSchool,
      p.classYear,
      p.pipelineStage,
      `"${p.recruitingNotes}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `just1play_recruiting_pipeline_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredList = pipeline.filter(item => {
    const matchesStage = selectedStage === 'ALL' || item.pipelineStage === selectedStage;
    const matchesSearch = item.athleteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.highSchool.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.sport.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Stadium Offline Banner */}
      {isOffline && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Stadium Offline Mode Active
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-mono font-bold">
                  SW CACHE ACTIVE
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-mono mt-0.5">
                Zero signal detected. Recruiter pipeline ({pipeline.length} prospects) is preserved and editable locally.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 shrink-0 hidden sm:inline-block">
            {pipeline.length} Prospects Cached
          </span>
        </div>
      )}

      {/* Top Banner Alert if stage updated */}
      <AnimatePresence>
        {simulatedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              {simulatedAlert}
            </span>
            <span className="text-[10px] uppercase font-mono text-emerald-400">Pipeline Synchronized</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header controls */}
      <div className="p-6 rounded-3xl bg-[#161C22]/90 border border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.4)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>NCAA / NAIA Scout Pro Hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
            Collegiate Recruiting Pipeline & Alert Matrix
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Track top tier prospects, manage scholarship stages, and receive instant alerts on verified 4K film and combine scores.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExportCsv}
            className="flex-1 md:flex-initial px-4 py-3 rounded-2xl bg-[#212A31] hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#00F2FE]" />
            <span>Export CSV Pipeline</span>
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Stages pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STAGES.map(stg => (
            <button
              key={stg}
              onClick={() => setSelectedStage(stg)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                selectedStage === stg
                  ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                  : 'bg-[#161C22] text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {stg}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prospects, school..."
            className="w-full bg-[#161C22] border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 font-sans focus:outline-none focus:border-[#00F2FE]"
          />
        </div>
      </div>

      {/* Pipeline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredList.map((item) => (
          <motion.div
            key={item.id}
            layout
            className="rounded-3xl bg-[#161C22] border border-slate-800 p-5 space-y-4 shadow-lg hover:border-[#00F2FE]/50 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-slate-800 text-slate-300">
                  {item.sport} • Class of {item.classYear}
                </span>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                  item.pipelineStage === 'Priority Target'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : item.pipelineStage === 'Offered'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : item.pipelineStage === 'Committed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                }`}>
                  {item.pipelineStage}
                </span>
              </div>

              {/* Athlete Info */}
              <div className="mt-3">
                <h3 className="text-lg font-black uppercase text-white tracking-tight flex items-center gap-2">
                  <span>{item.athleteName}</span>
                  <ShieldCheck className="w-4 h-4 text-[#00F2FE]" />
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  {item.highSchool}
                </p>
              </div>

              {/* Scout Notes */}
              <div className="mt-3 p-3 rounded-2xl bg-[#11171D] border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed">
                "{item.recruitingNotes}"
              </div>

              {/* Alert Triggers */}
              <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                  <Bell className="w-3 h-3" /> Alert on {item.alertThresholdPts}+ PTS
                </span>
                <span className="flex items-center gap-1 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  <Video className="w-3 h-3" /> Auto 4K Tape Push
                </span>
              </div>
            </div>

            {/* Quick Stage Transition Dropdown */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Stage:</span>
              <select
                value={item.pipelineStage}
                onChange={(e) => handleUpdateStage(item.athleteId, item.athleteName, e.target.value as any)}
                className="bg-[#11171D] border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:border-[#00F2FE] focus:outline-none cursor-pointer"
              >
                <option value="Watchlist">Watchlist</option>
                <option value="Contacted">Contacted</option>
                <option value="Priority Target">Priority Target</option>
                <option value="Offered">Offered</option>
                <option value="Committed">Committed</option>
              </select>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
