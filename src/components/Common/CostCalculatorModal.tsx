import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  X, 
  Database, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Activity, 
  Users, 
  MessageSquare, 
  FileEdit, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Info, 
  RotateCcw,
  Zap,
  HardDrive,
  Globe,
  Gauge
} from 'lucide-react';
import { firestoreCacheService, CacheTelemetry } from '../../services/firestoreCacheService';
import { firestoreWriteQueue, WriteQueueState } from '../../services/firestoreWriteQueueService';
import { firestoreBatchTelemetry, BatchTelemetry } from '../../services/firestoreBatchService';

interface CostCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Preset configurations
interface ScalePreset {
  label: string;
  badge: string;
  dau: number;
  postsPerUser: number;
  commentsPerPost: number;
  readsPerUser: number;
}

const PRESETS: ScalePreset[] = [
  {
    label: 'Community League',
    badge: '10K MAU',
    dau: 3000,
    postsPerUser: 0.2,
    commentsPerPost: 3,
    readsPerUser: 25
  },
  {
    label: 'Regional Tournament',
    badge: '50K MAU',
    dau: 15000,
    postsPerUser: 0.3,
    commentsPerPost: 5,
    readsPerUser: 35
  },
  {
    label: '100K Scale Target',
    badge: '100K MAU',
    dau: 30000,
    postsPerUser: 0.35,
    commentsPerPost: 6,
    readsPerUser: 45
  },
  {
    label: 'National Prep Media',
    badge: '500K MAU',
    dau: 150000,
    postsPerUser: 0.4,
    commentsPerPost: 8,
    readsPerUser: 50
  },
  {
    label: 'Mass Scale Viral',
    badge: '1M MAU',
    dau: 300000,
    postsPerUser: 0.5,
    commentsPerPost: 10,
    readsPerUser: 60
  }
];

export const CostCalculatorModal: React.FC<CostCalculatorModalProps> = ({ isOpen, onClose }) => {
  // Primary User Inputs
  const [dau, setDau] = useState<number>(30000); // 30,000 DAU (~100,000 MAU)
  const [postsPerUserPerDay, setPostsPerUserPerDay] = useState<number>(0.35); // 0.35 posts per active user/day
  const [commentsPerPost, setCommentsPerPost] = useState<number>(6); // 6 comments per post
  
  // Advanced Settings
  const [readsPerUserPerDay, setReadsPerUserPerDay] = useState<number>(45); // feed views + query reads
  const [likesPerPost, setLikesPerPost] = useState<number>(8); // reactions per post
  const [includeFreeTier, setIncludeFreeTier] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Live Firestore Cache Service & Write Queue Telemetry
  const [cacheTelemetry, setCacheTelemetry] = useState<CacheTelemetry>(firestoreCacheService.getTelemetry());
  const [queueState, setQueueState] = useState<WriteQueueState>(firestoreWriteQueue.getState());
  const [batchTelemetry, setBatchTelemetry] = useState<BatchTelemetry>(firestoreBatchTelemetry.getTelemetry());

  useEffect(() => {
    const unsubCache = firestoreCacheService.subscribeToTelemetry((telemetry) => {
      setCacheTelemetry(telemetry);
    });
    const unsubQueue = firestoreWriteQueue.subscribe((state) => {
      setQueueState(state);
    });
    const unsubBatch = firestoreBatchTelemetry.subscribe((telemetry) => {
      setBatchTelemetry(telemetry);
    });
    return () => {
      unsubCache();
      unsubQueue();
      unsubBatch();
    };
  }, []);

  // Constants (Blaze Plan official pricing)
  const DAYS_PER_MONTH = 30;
  const ESTIMATED_MAU = Math.round(dau * 3.33); // Standard 30% DAU/MAU ratio
  
  // Firebase Blaze Rates
  const PRICE_PER_100K_READS = 0.06; // $0.06 per 100k
  const PRICE_PER_100K_WRITES = 0.18; // $0.18 per 100k
  const PRICE_PER_GB_STORAGE = 0.18; // $0.18 per GB/mo
  const PRICE_PER_GB_EGRESS = 0.12; // $0.12 per GB

  // Free Tier monthly allowances
  const FREE_READS_PER_MONTH = includeFreeTier ? 50000 * DAYS_PER_MONTH : 0; // 1.5M reads/mo
  const FREE_WRITES_PER_MONTH = includeFreeTier ? 20000 * DAYS_PER_MONTH : 0; // 600K writes/mo
  const FREE_STORAGE_GB = includeFreeTier ? 1.0 : 0; // 1 GB free
  const FREE_EGRESS_GB = includeFreeTier ? 10.0 : 0; // 10 GB free

  // Calculate detailed monthly usage metrics
  const calculations = useMemo(() => {
    // 1. Monthly Post Volume
    const totalMonthlyPosts = Math.round(dau * postsPerUserPerDay * DAYS_PER_MONTH);
    const totalMonthlyComments = Math.round(totalMonthlyPosts * commentsPerPost);
    const totalMonthlyLikes = Math.round(totalMonthlyPosts * likesPerPost);
    const totalMonthlyProfileActions = Math.round(dau * 0.1 * DAYS_PER_MONTH); // e.g. status/follow writes

    // Total Document Writes
    const totalWrites = totalMonthlyPosts + totalMonthlyComments + totalMonthlyLikes + totalMonthlyProfileActions;
    const billableWrites = Math.max(0, totalWrites - FREE_WRITES_PER_MONTH);
    const writeCost = (billableWrites / 100000) * PRICE_PER_100K_WRITES;

    // 2. Monthly Document Reads
    // User feed scrolling + live scoreboard listeners + comment loads + profile views
    const directFeedReads = Math.round(dau * readsPerUserPerDay * DAYS_PER_MONTH);
    const commentThreadReads = Math.round(totalMonthlyPosts * (commentsPerPost + 1) * 0.4); // ~40% posts viewed deeply
    const liveScoreAndMatrixReads = Math.round(dau * 12 * DAYS_PER_MONTH);

    const totalReads = directFeedReads + commentThreadReads + liveScoreAndMatrixReads;
    const billableReads = Math.max(0, totalReads - FREE_READS_PER_MONTH);
    const readCost = (billableReads / 100000) * PRICE_PER_100K_READS;

    // 3. Storage & Bandwidth
    // Approx 1.2 KB per post metadata + comments
    const monthlyDataCreatedGB = (totalWrites * 1.5) / (1024 * 1024); // in GB
    const billableStorageGB = Math.max(0, monthlyDataCreatedGB - FREE_STORAGE_GB);
    const storageCost = billableStorageGB * PRICE_PER_GB_STORAGE;

    // Egress: payload per read (~1.8 KB average)
    const monthlyEgressGB = (totalReads * 1.8) / (1024 * 1024);
    const billableEgressGB = Math.max(0, monthlyEgressGB - FREE_EGRESS_GB);
    const egressCost = billableEgressGB * PRICE_PER_GB_EGRESS;

    // 4. Totals
    const totalMonthlyCost = writeCost + readCost + storageCost + egressCost;
    const costPerActiveUser = ESTIMATED_MAU > 0 ? (totalMonthlyCost / ESTIMATED_MAU) : 0;
    const dailyCost = totalMonthlyCost / DAYS_PER_MONTH;

    return {
      totalMonthlyPosts,
      totalMonthlyComments,
      totalMonthlyLikes,
      totalWrites,
      billableWrites,
      writeCost,
      totalReads,
      billableReads,
      readCost,
      storageCost,
      egressCost,
      monthlyDataCreatedGB,
      monthlyEgressGB,
      totalMonthlyCost,
      dailyCost,
      costPerActiveUser
    };
  }, [
    dau, 
    postsPerUserPerDay, 
    commentsPerPost, 
    readsPerUserPerDay, 
    likesPerPost, 
    includeFreeTier, 
    DAYS_PER_MONTH, 
    ESTIMATED_MAU
  ]);

  const handleApplyPreset = (preset: ScalePreset) => {
    setDau(preset.dau);
    setPostsPerUserPerDay(preset.postsPerUser);
    setCommentsPerPost(preset.commentsPerPost);
    setReadsPerUserPerDay(preset.readsPerUser);
  };

  const handleReset = () => {
    setDau(30000);
    setPostsPerUserPerDay(0.35);
    setCommentsPerPost(6);
    setReadsPerUserPerDay(45);
    setLikesPerPost(8);
    setIncludeFreeTier(true);
  };

  const handleCopySummary = () => {
    const summaryText = `🔥 Just1Play Firestore Blaze Plan Cost Projection
• Scale: ${dau.toLocaleString()} DAU (~${ESTIMATED_MAU.toLocaleString()} MAU)
• Posts: ${postsPerUserPerDay} posts/user/day (${calculations.totalMonthlyPosts.toLocaleString()} posts/mo)
• Comments: ${commentsPerPost} comments/post (${calculations.totalMonthlyComments.toLocaleString()} comments/mo)
----------------------------------------
📊 Monthly Cost Estimate: $${calculations.totalMonthlyCost.toFixed(2)}/mo ($${calculations.dailyCost.toFixed(2)}/day)
• Reads (${calculations.totalReads.toLocaleString()} reads): $${calculations.readCost.toFixed(2)}
• Writes (${calculations.totalWrites.toLocaleString()} writes): $${calculations.writeCost.toFixed(2)}
• Storage & Egress: $${(calculations.storageCost + calculations.egressCost).toFixed(2)}
• Effective Cost / Active User: $${(calculations.costPerActiveUser * 100).toFixed(4)}¢ / user / month
Calculated with Google Cloud Firebase Blaze pricing.`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="cost-calculator-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-[#161C22] border border-[#2D3748] rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-[#1E2630] via-[#161C22] to-[#1E2630] border-b border-[#2D3748] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white uppercase font-mono tracking-wide">
                    Firestore Blaze Cost Calculator
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">
                    PAY-AS-YOU-GO
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans">
                  Estimate real-time database reads, writes, and cloud bills based on active traffic & social posting volume.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1E2630] hover:bg-[#2D3748] text-slate-300 hover:text-white border border-[#2D3748] text-xs font-mono transition-colors"
                title="Reset to default settings"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-[#1E2630] hover:bg-[#2D3748] text-slate-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto custom-scrollbar">
            
            {/* Quick Presets Bar */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Scale Archetype Presets</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESETS.map((preset) => {
                  const isSelected = dau === preset.dau && postsPerUserPerDay === preset.postsPerUser;
                  return (
                    <button
                      key={preset.badge}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-white shadow-md' 
                          : 'bg-[#1E2630]/60 hover:bg-[#1E2630] border-[#2D3748] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-[#F59E0B] text-black' : 'bg-slate-800 text-[#F59E0B]'
                        }`}>
                          {preset.badge}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-bold truncate text-white">
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {preset.dau.toLocaleString()} DAU
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Interactive Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Input 1: Daily Active Users */}
              <div className="p-4 rounded-xl bg-[#1E2630] border border-[#2D3748] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white text-xs font-bold font-mono">
                    <Users className="w-4 h-4 text-[#00F2FE]" />
                    <span>Daily Active Users (DAU)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#00F2FE] bg-[#00F2FE]/10 px-2 py-0.5 rounded border border-[#00F2FE]/30">
                    ~{ESTIMATED_MAU.toLocaleString()} MAU
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={100}
                      max={2000000}
                      step={1000}
                      value={dau}
                      onChange={(e) => setDau(Math.max(1, Number(e.target.value) || 0))}
                      className="w-full bg-[#161C22] border border-[#2D3748] focus:border-[#00F2FE] rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none transition-colors"
                    />
                    <span className="text-xs font-mono text-slate-400 shrink-0">Users/day</span>
                  </div>

                  <input
                    type="range"
                    min={1000}
                    max={500000}
                    step={1000}
                    value={dau}
                    onChange={(e) => setDau(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>1K</span>
                    <span>100K</span>
                    <span>500K</span>
                  </div>
                </div>
              </div>

              {/* Input 2: Posts Per User */}
              <div className="p-4 rounded-xl bg-[#1E2630] border border-[#2D3748] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white text-xs font-bold font-mono">
                    <FileEdit className="w-4 h-4 text-[#F59E0B]" />
                    <span>Avg Posts / User / Day</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/30">
                    {postsPerUserPerDay} / day
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0.01}
                      max={10}
                      step={0.05}
                      value={postsPerUserPerDay}
                      onChange={(e) => setPostsPerUserPerDay(Math.max(0.01, Number(e.target.value) || 0.01))}
                      className="w-full bg-[#161C22] border border-[#2D3748] focus:border-[#F59E0B] rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none transition-colors"
                    />
                    <span className="text-xs font-mono text-slate-400 shrink-0">Posts</span>
                  </div>

                  <input
                    type="range"
                    min={0.05}
                    max={2.0}
                    step={0.05}
                    value={postsPerUserPerDay}
                    onChange={(e) => setPostsPerUserPerDay(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>0.05 (Casual)</span>
                    <span>1.0 (Active)</span>
                    <span>2.0 (Heavy)</span>
                  </div>
                </div>
              </div>

              {/* Input 3: Comments Per Post */}
              <div className="p-4 rounded-xl bg-[#1E2630] border border-[#2D3748] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white text-xs font-bold font-mono">
                    <MessageSquare className="w-4 h-4 text-[#10B981]" />
                    <span>Comments / Post</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
                    {commentsPerPost} comments
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={commentsPerPost}
                      onChange={(e) => setCommentsPerPost(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-[#161C22] border border-[#2D3748] focus:border-[#10B981] rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none transition-colors"
                    />
                    <span className="text-xs font-mono text-slate-400 shrink-0">Comments</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={commentsPerPost}
                    onChange={(e) => setCommentsPerPost(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#10B981]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>0</span>
                    <span>15</span>
                    <span>30+</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Highlighted Results Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E2630] via-[#1A222C] to-[#161C22] border-2 border-[#F59E0B]/50 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                {/* Total Monthly Bill Display */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      <span>Estimated Monthly Blaze Bill</span>
                    </span>
                    {includeFreeTier && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                        Spark Free Tier Included
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl sm:text-5xl font-black text-white font-mono tracking-tight">
                      ${calculations.totalMonthlyCost.toFixed(2)}
                    </span>
                    <span className="text-sm font-mono text-slate-400 font-semibold">
                      / month
                    </span>
                    <span className="text-xs font-mono text-[#00F2FE] bg-[#00F2FE]/10 px-2 py-1 rounded border border-[#00F2FE]/30">
                      ~${calculations.dailyCost.toFixed(2)} / day
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Servicing <strong className="text-white">{dau.toLocaleString()} DAU</strong> (~{ESTIMATED_MAU.toLocaleString()} Monthly Active Users) producing <strong className="text-white">{calculations.totalMonthlyPosts.toLocaleString()} posts</strong> and <strong className="text-white">{calculations.totalMonthlyComments.toLocaleString()} comments</strong> per month.
                  </p>
                </div>

                {/* Per-User Efficiency Metric */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 shrink-0">
                  <div className="p-3 rounded-xl bg-[#161C22] border border-[#2D3748] text-right space-y-1">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">
                      Cost Per Active User
                    </div>
                    <div className="text-lg font-black font-mono text-[#10B981]">
                      ${(calculations.costPerActiveUser).toFixed(4)}
                      <span className="text-xs font-sans text-slate-400 font-normal"> / user / mo</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      (Under ${(calculations.costPerActiveUser * 100).toFixed(2)}¢ per athlete/fan)
                    </div>
                  </div>

                  <button
                    onClick={handleCopySummary}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-mono font-bold text-xs transition-all shadow-md active:scale-95"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Summary Copied!' : 'Copy Breakdown'}</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Cost Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Card 1: Document Reads */}
              <div className="p-3.5 rounded-xl bg-[#1E2630] border border-[#2D3748] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#00F2FE]" />
                    <span>Document Reads</span>
                  </span>
                  <span className="font-bold text-[#00F2FE]">${calculations.readCost.toFixed(2)}</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {calculations.totalReads.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 leading-tight">
                  Rate: <strong>$0.06</strong> / 100k reads<br />
                  Free Tier: 1.5M reads/mo
                </div>
              </div>

              {/* Card 2: Document Writes */}
              <div className="p-3.5 rounded-xl bg-[#1E2630] border border-[#2D3748] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <FileEdit className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Document Writes</span>
                  </span>
                  <span className="font-bold text-[#F59E0B]">${calculations.writeCost.toFixed(2)}</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {calculations.totalWrites.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 leading-tight">
                  Rate: <strong>$0.18</strong> / 100k writes<br />
                  Free Tier: 600K writes/mo
                </div>
              </div>

              {/* Card 3: Storage & Metadata */}
              <div className="p-3.5 rounded-xl bg-[#1E2630] border border-[#2D3748] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>DB Storage (Text/JSON)</span>
                  </span>
                  <span className="font-bold text-[#10B981]">${calculations.storageCost.toFixed(2)}</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {calculations.monthlyDataCreatedGB.toFixed(2)} GB
                </div>
                <div className="text-[11px] text-slate-400 leading-tight">
                  Rate: <strong>$0.18</strong> / GB / mo<br />
                  Free Tier: 1.0 GB
                </div>
              </div>

              {/* Card 4: Network Egress */}
              <div className="p-3.5 rounded-xl bg-[#1E2630] border border-[#2D3748] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-purple-400" />
                    <span>Network Egress</span>
                  </span>
                  <span className="font-bold text-purple-400">${calculations.egressCost.toFixed(2)}</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {calculations.monthlyEgressGB.toFixed(2)} GB
                </div>
                <div className="text-[11px] text-slate-400 leading-tight">
                  Rate: <strong>$0.12</strong> / GB<br />
                  Free Tier: 10 GB/mo
                </div>
              </div>

            </div>

            {/* Toggle Advanced Parameters */}
            <div className="pt-2 border-t border-[#2D3748]">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{showAdvanced ? 'Hide Advanced Architecture Adjustments' : 'Show Advanced Architecture Adjustments (Reads/user, Reactions, Free Tier)'}</span>
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-2 overflow-hidden"
                  >
                    {/* Read Activity */}
                    <div className="p-3.5 rounded-xl bg-[#1A222C] border border-[#2D3748] space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Feed Reads / User / Day:</span>
                        <strong className="text-white">{readsPerUserPerDay} reads</strong>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={120}
                        step={5}
                        value={readsPerUserPerDay}
                        onChange={(e) => setReadsPerUserPerDay(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                      />
                    </div>

                    {/* Reaction Activity */}
                    <div className="p-3.5 rounded-xl bg-[#1A222C] border border-[#2D3748] space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Likes / Reactions / Post:</span>
                        <strong className="text-white">{likesPerPost} likes</strong>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={likesPerPost}
                        onChange={(e) => setLikesPerPost(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
                      />
                    </div>

                    {/* Free tier toggle */}
                    <div className="p-3.5 rounded-xl bg-[#1A222C] border border-[#2D3748] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono font-bold text-white">Spark Free Allowance</div>
                        <div className="text-[10px] text-slate-400">Subtract 50k reads/20k writes daily</div>
                      </div>
                      <button
                        onClick={() => setIncludeFreeTier(!includeFreeTier)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          includeFreeTier ? 'bg-[#10B981]' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          includeFreeTier ? 'right-1' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Live Firestore Cache Service Telemetry */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#00F2FE]/10 via-[#1E2630] to-[#10B981]/10 border border-[#00F2FE]/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00F2FE]/20 flex items-center justify-center border border-[#00F2FE]/40">
                    <Gauge className="w-4 h-4 text-[#00F2FE]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Live Local-First Cache Telemetry
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Active session performance using IndexedDB & SWR cache layer
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-mono font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span>0-Latency Active</span>
                  </span>
                  <button
                    onClick={() => firestoreCacheService.resetTelemetry()}
                    className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-[#2D3748] transition-colors"
                  >
                    Reset Stats
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Cache Hits (0-Cost)</div>
                  <div className="text-base font-black font-mono text-[#10B981]">{cacheTelemetry.cacheHits}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Served locally</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Server Reads</div>
                  <div className="text-base font-black font-mono text-slate-300">{cacheTelemetry.serverReads}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Network round-trips</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Reads Saved</div>
                  <div className="text-base font-black font-mono text-[#00F2FE]">{cacheTelemetry.estimatedReadsSaved}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Free from billing</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Est. $ Saved</div>
                  <div className="text-base font-black font-mono text-[#F59E0B]">
                    ${cacheTelemetry.estimatedDollarsSaved.toFixed(5)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">@ $0.06/100k reads</div>
                </div>
              </div>
            </div>

            {/* Live Firestore Write Queue & Coalescing Telemetry */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F59E0B]/10 via-[#1E2630] to-[#8B5CF6]/10 border border-[#F59E0B]/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center border border-[#F59E0B]/40">
                    <Zap className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Live Write Queue & Mutation Coalescing
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Offline write buffer & deduplication engine preventing burst retry costs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    queueState.isOnline 
                      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30' 
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${queueState.isOnline ? 'bg-[#10B981] animate-pulse' : 'bg-amber-400'}`} />
                    <span>{queueState.isOnline ? 'Online Sync Active' : 'Offline Buffering'}</span>
                  </span>
                  <button
                    onClick={() => firestoreWriteQueue.resetStats()}
                    className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-[#2D3748] transition-colors"
                  >
                    Reset Stats
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Pending in Buffer</div>
                  <div className="text-base font-black font-mono text-[#00F2FE]">{queueState.pendingCount}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Held in LocalStorage</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Total Synced</div>
                  <div className="text-base font-black font-mono text-[#10B981]">{queueState.syncedCount}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Automatic background sync</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Coalesced Writes</div>
                  <div className="text-base font-black font-mono text-[#F59E0B]">{queueState.coalescedCount}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Deduplicated from billing</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Est. Write $ Saved</div>
                  <div className="text-base font-black font-mono text-[#8B5CF6]">
                    ${((queueState.coalescedCount * 0.18) / 100000).toFixed(5)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">@ $0.18/100k writes</div>
                </div>
              </div>
            </div>

            {/* Live Firestore Atomic Batching Telemetry */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#00F2FE]/10 via-[#1E2630] to-[#10B981]/10 border border-[#00F2FE]/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00F2FE]/20 flex items-center justify-center border border-[#00F2FE]/40">
                    <Layers className="w-4 h-4 text-[#00F2FE]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Live Atomic Batch Writer & Request Aggregation
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Bundles small writes into atomic 500-op chunks, eliminating multiple round-trips
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border bg-[#00F2FE]/15 text-[#00F2FE] border-[#00F2FE]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] animate-pulse" />
                    <span>Active Batch Engine</span>
                  </span>
                  <button
                    onClick={() => firestoreBatchTelemetry.reset()}
                    className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-[#2D3748] transition-colors"
                  >
                    Reset Stats
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Batched Ops</div>
                  <div className="text-base font-black font-mono text-[#00F2FE]">{batchTelemetry.totalOperationsBatched}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Aggregated operations</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Atomic Batches</div>
                  <div className="text-base font-black font-mono text-[#10B981]">{batchTelemetry.totalBatchesCommitted}</div>
                  <div className="text-[9px] text-slate-500 font-mono">writeBatch commits</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Requests Saved</div>
                  <div className="text-base font-black font-mono text-[#F59E0B]">{batchTelemetry.networkRequestsSaved}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Roundtrips avoided</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#161C22]/90 border border-white/5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Est. Batch $ Saved</div>
                  <div className="text-base font-black font-mono text-[#8B5CF6]">
                    ${batchTelemetry.estimatedCostSavingsDollars.toFixed(5)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">@ $0.18/100k writes</div>
                </div>
              </div>
            </div>

            {/* Architectural Optimization Guide for Just1Play */}
            <div className="p-4 rounded-xl bg-[#1E2630]/80 border border-[#2D3748] space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F59E0B] uppercase">
                <Info className="w-4 h-4 text-[#F59E0B]" />
                <span>How Just1Play Keeps 100K User Costs Under $50/mo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span><strong>Embedded Arrays for Likes/Reactions:</strong> Avoids creating sub-collection documents for simple counter increments.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span><strong>Query Pagination (`limit: 20`):</strong> Feeds load incrementally as users scroll instead of querying thousands of records.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span><strong>Offline & Memory Caching:</strong> IndexedDB cache prevents redundant billing reads on repeat profile and tournament visits.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span><strong>External Video Streaming:</strong> Highlight tapes are embedded via YouTube, Vimeo, and video CDNs to prevent raw storage egress charges.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-[#1E2630] border-t border-[#2D3748] flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="https://firebase.google.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-slate-400 hover:text-[#F59E0B] flex items-center gap-1.5 transition-colors"
            >
              <span>View Official Firebase Pricing Matrix</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#2D3748] hover:bg-slate-600 text-white font-mono text-xs font-bold transition-colors"
              >
                Close Calculator
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
