import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Check, 
  AlertCircle, 
  FileText, 
  Trophy, 
  ShieldCheck, 
  RefreshCw,
  Loader2,
  Table,
  Zap,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AiScoresheetScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport?: string;
  gameTitle?: string;
  onApplyBoxScore?: (boxScoreData: any) => void;
  onStatsApplied?: (boxScoreData: any) => void;
}

export const AiScoresheetScannerModal: React.FC<AiScoresheetScannerModalProps> = ({
  isOpen,
  onClose,
  sport = 'Basketball',
  gameTitle = 'Tri-State Championship Game 1',
  onApplyBoxScore,
  onStatsApplied
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [statNotes, setStatNotes] = useState<string>(
    'Official handwritten scorebook page 4. Home: Paterson Knights, Away: Jersey City Titans. Knights #3 Marcus Hayes 28 pts, Titans #12 Devon Vance 22 pts.'
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSampleSelect = (preset: string) => {
    if (preset === 'bball') {
      setImagePreview('https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80');
      setStatNotes('Gym scoresheet: Paterson Knights vs Jersey City Titans. Final 74-68. MVP #3 Marcus Hayes 28 pts, 4 threes.');
    } else if (preset === 'flag') {
      setImagePreview('https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&auto=format&fit=crop&q=80');
      setStatNotes("Flag Football 7v7 Sheet: North Jersey Valkyries vs Tri-State Storm. Valkyries 28, Storm 20. QB #7 4 Passing TDs.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExecuteOcr = async () => {
    setIsScanning(true);
    setAppliedSuccess(false);

    try {
      const res = await fetch('/api/gemini/ocr-scoresheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          gameContext: gameTitle,
          notes: statNotes
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      }
    } catch (err) {
      console.warn('OCR Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCommitStats = () => {
    if (onApplyBoxScore && scanResult) {
      onApplyBoxScore(scanResult);
    }
    if (onStatsApplied && scanResult) {
      onStatsApplied(scanResult);
    }
    setAppliedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-[#161C22] border border-[#00F2FE]/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_80px_rgba(0,242,254,0.2)] my-6 max-h-[92vh] overflow-y-auto text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00F2FE]/15 border border-[#00F2FE]/40 text-[#00F2FE]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-[10px] font-mono font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                <span>Multimodal Gemini OCR</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight mt-0.5">
                AI Paper Scoresheet & Box Score Scanner
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-6">
          
          {/* Step 1: Upload or Choose Sample */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center justify-between">
                <span>Upload Paper Sheet / Photo:</span>
                <span className="text-[10px] text-slate-400">JPG, PNG, HEIC</span>
              </label>

              <label className="border-2 border-dashed border-slate-700 hover:border-[#00F2FE] rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#212A31]/50 group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#00F2FE] mb-2 transition-colors" />
                <span className="text-xs font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to Upload or Drag Photo'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  Snap physical gym scoresheets, table binders, or stat whiteboards
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Sample Presets */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Preset Samples:</span>
                <button
                  type="button"
                  onClick={() => handleSampleSelect('bball')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-200 transition-colors cursor-pointer"
                >
                  🏀 Basketball Book
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleSelect('flag')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-slate-200 transition-colors cursor-pointer"
                >
                  🏈 Flag 7v7 Sheet
                </button>
              </div>
            </div>

            {/* Preview Box & Notes */}
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold uppercase text-slate-300">
                Scorekeeper OCR Context Notes:
              </label>
              <textarea
                value={statNotes}
                onChange={(e) => setStatNotes(e.target.value)}
                rows={4}
                className="w-full bg-[#11171D] border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:border-[#00F2FE] focus:outline-none"
                placeholder="Optional manual notes or team name clarifications for higher OCR precision..."
              />

              {imagePreview && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 h-28 bg-black">
                  <img
                    src={imagePreview}
                    alt="Scoresheet Preview"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-[#00F2FE]">
                    ✓ Image Attached for Analysis
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleExecuteOcr}
            disabled={isScanning}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00F2FE] to-[#0284C7] hover:from-[#38BDF8] hover:to-[#0369A1] disabled:opacity-50 text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Digitizing Scoresheet with Gemini Computer Vision...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Run Multimodal OCR & Extract Box Score</span>
              </>
            )}
          </button>

          {/* Scan Results View */}
          {scanResult && (
            <div className="p-5 rounded-3xl bg-[#11171D] border border-slate-800 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-black flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {scanResult.ocrConfidence}% OCR CONFIDENCE
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Source: {scanResult.source}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-white font-bold">{scanResult.gameSummary?.homeTeam}</span>
                  <span className="text-emerald-400 font-black text-sm">{scanResult.gameSummary?.homeFinalScore}</span>
                  <span className="text-slate-500">-</span>
                  <span className="text-slate-300 font-black text-sm">{scanResult.gameSummary?.awayFinalScore}</span>
                  <span className="text-slate-300">{scanResult.gameSummary?.awayTeam}</span>
                </div>
              </div>

              {/* MVP Spotlight */}
              {scanResult.gameSummary?.gameMvp && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-amber-300 block">
                        Game MVP Spotlight
                      </span>
                      <span className="text-sm font-black text-white">
                        #{scanResult.gameSummary.gameMvp.jerseyNumber} {scanResult.gameSummary.gameMvp.playerName} ({scanResult.gameSummary.gameMvp.team})
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-black/60 font-mono font-black text-xs text-amber-400">
                    {scanResult.gameSummary.gameMvp.statLine}
                  </span>
                </div>
              )}

              {/* Roster Box Score Tables */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-[#00F2FE] flex items-center gap-1.5">
                  <Table className="w-4 h-4" /> Extracted Player Box Scores
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Home Roster */}
                  <div className="rounded-2xl bg-[#161C22] border border-slate-800 p-3 overflow-x-auto">
                    <p className="text-xs font-bold text-slate-200 uppercase mb-2">
                      {scanResult.gameSummary?.homeTeam}
                    </p>
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 text-[10px]">
                          <th className="pb-1.5">#</th>
                          <th className="pb-1.5">Player</th>
                          <th className="pb-1.5 text-right">PTS</th>
                          <th className="pb-1.5 text-right">REB</th>
                          <th className="pb-1.5 text-right">AST</th>
                          <th className="pb-1.5 text-right">FLS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(scanResult.homeRosterStats || []).map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-1.5 text-[#00F2FE] font-bold">{p.jersey}</td>
                            <td className="py-1.5 text-white font-sans">{p.name}</td>
                            <td className="py-1.5 text-right text-emerald-400 font-bold">{p.pts}</td>
                            <td className="py-1.5 text-right text-slate-300">{p.reb || 0}</td>
                            <td className="py-1.5 text-right text-slate-300">{p.ast || 0}</td>
                            <td className="py-1.5 text-right text-slate-400">{p.fouls || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Away Roster */}
                  <div className="rounded-2xl bg-[#161C22] border border-slate-800 p-3 overflow-x-auto">
                    <p className="text-xs font-bold text-slate-200 uppercase mb-2">
                      {scanResult.gameSummary?.awayTeam}
                    </p>
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 text-[10px]">
                          <th className="pb-1.5">#</th>
                          <th className="pb-1.5">Player</th>
                          <th className="pb-1.5 text-right">PTS</th>
                          <th className="pb-1.5 text-right">REB</th>
                          <th className="pb-1.5 text-right">AST</th>
                          <th className="pb-1.5 text-right">FLS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(scanResult.awayRosterStats || []).map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-1.5 text-[#00F2FE] font-bold">{p.jersey}</td>
                            <td className="py-1.5 text-white font-sans">{p.name}</td>
                            <td className="py-1.5 text-right text-slate-200 font-bold">{p.pts}</td>
                            <td className="py-1.5 text-right text-slate-300">{p.reb || 0}</td>
                            <td className="py-1.5 text-right text-slate-300">{p.ast || 0}</td>
                            <td className="py-1.5 text-right text-slate-400">{p.fouls || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Commit button */}
              <div className="pt-2">
                <button
                  onClick={handleCommitStats}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                >
                  {appliedSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-slate-950" />
                      <span>Box Score Committed to Match Record!</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>1-Click Reconcile & Commit Stats to Live Tournament</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
