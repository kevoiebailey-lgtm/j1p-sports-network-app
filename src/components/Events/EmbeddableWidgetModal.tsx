import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Code, Copy, Check, Eye, Smartphone, Globe, Sparkles, Trophy } from 'lucide-react';

interface EmbeddableWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId?: string;
  tournamentName?: string;
}

export const EmbeddableWidgetModal: React.FC<EmbeddableWidgetModalProps> = ({
  isOpen,
  onClose,
  tournamentId = "t-tristate-2026",
  tournamentName = "Tri-State Elite High School Championship 2026"
}) => {
  const [widgetType, setWidgetType] = useState<'scoreboard' | 'bracket' | 'mvp_ticker'>('scoreboard');
  const [theme, setTheme] = useState<'dark' | 'light' | 'neon'>('dark');
  const [width, setWidth] = useState<string>('100%');
  const [height, setHeight] = useState<number>(380);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const embedUrl = `${window.location.origin}/embed/${widgetType}/${tournamentId}?theme=${theme}`;
  const iframeSnippet = `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  scrolling="no"
  allow="autoplay; fullscreen"
  style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);"
></iframe>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(iframeSnippet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-[#141C24] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-[#212A31] via-[#1a252f] to-[#212A31] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00F2FE] to-[#0284C7] flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(0,242,254,0.4)]">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Embeddable Tournament Widget
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30">
                    Live Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Embed live scoreboard, bracket & stats into local media blogs & team websites
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Configuration & Preview */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Widget Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                  Widget Display Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'scoreboard', label: 'Scoreboard' },
                    { id: 'bracket', label: 'Bracket Tree' },
                    { id: 'mvp_ticker', label: 'Leaderboard' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setWidgetType(item.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        widgetType === item.id
                          ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.4)] font-black'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                  Color Theme Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dark', label: 'Obsidian Dark' },
                    { id: 'light', label: 'Clean Light' },
                    { id: 'neon', label: 'Cyber Neon' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTheme(item.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        theme === item.id
                          ? 'bg-slate-700 text-white border border-slate-500 shadow'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Embed Code Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                    HTML Embed Code
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-xs font-mono font-bold text-[#00F2FE] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto select-all leading-relaxed">
                  {iframeSnippet}
                </pre>
              </div>
            </div>

            {/* RIGHT: Live Interactive Preview */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" /> Live Interactive Preview
                </span>
                <span className="text-[10px] font-mono text-slate-500">Auto-updating every 5s</span>
              </div>

              {/* Mock Widget Container */}
              <div className={`p-5 rounded-3xl border transition-all ${
                theme === 'light' 
                  ? 'bg-slate-100 border-slate-300 text-slate-900' 
                  : theme === 'neon'
                  ? 'bg-[#0f172a] border-[#00F2FE]/50 shadow-[0_0_30px_rgba(0,242,254,0.2)] text-white'
                  : 'bg-[#1a232c] border-slate-700 text-white'
              }`}>
                {/* Scoreboard Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3 border-current/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-mono font-black uppercase tracking-wider text-red-500">
                        LIVE • 4TH QUARTER 1:14
                      </span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">Court 1 - Main Arena</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center items-center py-2">
                    <div className="p-3 rounded-2xl bg-black/20 space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wide">Paterson Knights</h4>
                      <div className="text-4xl font-black font-mono text-[#00F2FE]">74</div>
                      <span className="text-[10px] font-mono opacity-70">18 Fouls • 2 TO Remaining</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/20 space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-wide">Jersey City Titans</h4>
                      <div className="text-4xl font-black font-mono text-amber-400">68</div>
                      <span className="text-[10px] font-mono opacity-70">16 Fouls • 1 TO Remaining</span>
                    </div>
                  </div>

                  {/* Leader line */}
                  <div className="p-2.5 rounded-xl bg-black/30 flex items-center justify-between text-xs font-mono">
                    <span className="opacity-70">Top Performer:</span>
                    <strong className="text-[#00F2FE]">Marcus Hayes (#3) - 28 PTS, 4 3PM</strong>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono opacity-50 pt-1">
                    <span>⚡ Powered by Just1Play Sports Network</span>
                    <span className="hover:underline cursor-pointer">View Tournament Bracket →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Supports WordPress, Webflow, Squarespace, Wix, and custom HTML</span>
            <button
              onClick={handleCopyCode}
              className="px-5 py-2 rounded-xl bg-[#00F2FE] text-slate-950 font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,242,254,0.3)]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Embed Snippet</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
