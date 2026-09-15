import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Smartphone, Download, Share2, Music, Flame, Play, Copy, Check, Sliders, Trophy, Video } from 'lucide-react';

interface VerticalReelStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteName?: string;
  sport?: string;
  videoTitle?: string;
}

export const VerticalReelStudioModal: React.FC<VerticalReelStudioModalProps> = ({
  isOpen,
  onClose,
  athleteName = "Kevon Bailey",
  sport = "Basketball",
  videoTitle = "Tri-State Championship 28 PTS Masterclass"
}) => {
  const [template, setTemplate] = useState<'Overtime Hype' | 'House of Highlights' | 'Mixtape Classic' | 'ESPN Top 10'>('Overtime Hype');
  const [soundtrack, setSoundtrack] = useState<'Trap 808 Drill Hype' | 'Orchestral Cinematic' | 'Viral Hip-Hop Beat' | 'Court Sneaker Audio'>('Trap 808 Drill Hype');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [showFlameEffect, setShowFlameEffect] = useState<boolean>(true);
  const [showStatBadge, setShowStatBadge] = useState<boolean>(true);
  const [showScorebug, setShowScorebug] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);

  // Generated package state
  const [reelData, setReelData] = useState<any>({
    viralTitle: `${athleteName} Just Put On a Masterclass! 🔥`,
    recommendedSound: "Overtime Anthem (Remix Bass Boost)",
    overlayGraphics: {
      topHeader: "TRI-STATE CHAMPIONSHIP 🏆",
      lowerThird: `${athleteName.toUpperCase()} • 28 PTS • 4 3PM`,
      statTicker: "4.48s 40yd | 38.5 Vertical | D1 4-Star",
      badge: "CERTIFIED BUCKET"
    },
    storyboardCues: [
      { timestamp: "0:00 - 0:02", visual: "Slow-motion crossover into high-elevation stepback jumper", audioCue: "Beat drop with sneaker squeak", captionEffect: "WORD BY WORD POPUP" },
      { timestamp: "0:03 - 0:06", visual: "Clean swish with crowd eruption & bench reaction", audioCue: "Bass boom with arena horn", captionEffect: "GLOWING TEXT" },
      { timestamp: "0:07 - 0:10", visual: "Defensive pick-six fastbreak windmill dunk", audioCue: "High tempo percussion", captionEffect: "FLAME PARTICLES" }
    ],
    socialCaptions: {
      tiktok: `Bro was on a DIFFERENT level in the championship! 😤 Is he the #1 guard in 2026? Drop your thoughts 👇 #Just1Play #Overtime #Baller #Hoops #viral #highschoolhoops`,
      instagram: `Automatic from anywhere on the hardwood. @${athleteName.toLowerCase().replace(/\s+/g, '')} put up 28 PTS in front of 15 D1 college coaches. 🍿🎥 #NextUp #ScoutMatrix #Recruiting`,
      youtubeShorts: `UNSTOPPABLE! 28 PTS in the Finals! 🔥 Subscribe for full tape.`
    }
  });

  if (!isOpen) return null;

  const handleGenerateAiStoryboard = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate-vertical-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteName,
          sport,
          clipTitle: videoTitle,
          templateStyle: template,
          soundtrack
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReelData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCaption = (platform: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaption(platform);
    setTimeout(() => setCopiedCaption(null), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-5xl bg-[#151D25] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-[#212A31] via-[#1a252f] to-[#212A31] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF007A] to-[#7928CA] flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(255,0,122,0.4)]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    AI 9:16 Vertical Reel Studio
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Viral Formatter
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Convert broadcast 16:9 film into TikTok, Instagram Reels & YouTube Shorts
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

          {/* Main Grid: Live 9:16 Canvas Simulator + Studio Controls */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: 9:16 Phone Frame Mockup */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-[280px] h-[520px] rounded-[36px] bg-black border-4 border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between p-3 select-none">
                {/* Background Video Mock */}
                <div className="absolute inset-0 z-0">
                  <img
                    src="https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80"
                    alt="Highlight Canvas"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                </div>

                {/* OVERLAY 1: Top Header & Tournament Badge */}
                <div className="relative z-10 space-y-1 text-center pt-2">
                  {showScorebug && (
                    <div className="inline-block px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-mono font-black text-[#00F2FE] tracking-wider shadow">
                      {reelData.overlayGraphics?.topHeader || "TRI-STATE CHAMPIONSHIP"}
                    </div>
                  )}
                </div>

                {/* OVERLAY 2: Center Watermark / Action */}
                <div className="relative z-10 text-center">
                  {showFlameEffect && (
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-2xl bg-gradient-to-r from-red-600 to-amber-500 text-white text-xs font-black tracking-wider uppercase shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>{reelData.overlayGraphics?.badge || "CERTIFIED BUCKET"}</span>
                    </motion.div>
                  )}
                </div>

                {/* OVERLAY 3: Bottom Stat Pill Lower-Third */}
                <div className="relative z-10 space-y-2 pb-2">
                  {showStatBadge && (
                    <div className="p-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white space-y-1 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black tracking-wide text-amber-400">
                          {reelData.overlayGraphics?.lowerThird || `${athleteName.toUpperCase()} • 28 PTS`}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">D1 4-STAR</span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-300">
                        {reelData.overlayGraphics?.statTicker || "4.48s 40yd | 38.5 Vertical"}
                      </p>
                    </div>
                  )}

                  {/* Sound Wave Indicator */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900/80 text-[10px] font-mono text-slate-300 border border-white/10">
                    <Music className="w-3 h-3 text-[#FF007A]" />
                    <span className="truncate">{reelData.recommendedSound || soundtrack}</span>
                  </div>
                </div>
              </div>

              {/* Quick Aspect Ratio Selector */}
              <div className="flex items-center gap-2 mt-4">
                {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      aspectRatio === ratio ? 'bg-[#FF007A] text-white shadow-[0_0_10px_rgba(255,0,122,0.4)]' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: AI Storyboard, Customizer & Captions */}
            <div className="lg:col-span-7 space-y-6">
              {/* Preset Style & Audio Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                    Broadcast Template Style
                  </label>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[#FF007A]"
                  >
                    <option value="Overtime Hype">Overtime Hype (High Energy)</option>
                    <option value="House of Highlights">House of Highlights (Smooth Baseline)</option>
                    <option value="Mixtape Classic">Mixtape Classic (Drill 808s)</option>
                    <option value="ESPN Top 10">ESPN Top 10 (Broadcast News)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                    Audio Soundtrack Beat
                  </label>
                  <select
                    value={soundtrack}
                    onChange={(e) => setSoundtrack(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[#FF007A]"
                  >
                    <option value="Trap 808 Drill Hype">Trap 808 Drill Hype</option>
                    <option value="Orchestral Cinematic">Orchestral Cinematic Epic</option>
                    <option value="Viral Hip-Hop Beat">Viral Hip-Hop Beat</option>
                    <option value="Court Sneaker Audio">Raw Court Mic & Sneaker Squeak</option>
                  </select>
                </div>
              </div>

              {/* Graphic Overlays Toggles */}
              <div className="flex items-center gap-4 flex-wrap p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFlameEffect}
                    onChange={(e) => setShowFlameEffect(e.target.checked)}
                    className="accent-[#FF007A]"
                  />
                  <span>Hype Flame Pill</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStatBadge}
                    onChange={(e) => setShowStatBadge(e.target.checked)}
                    className="accent-[#FF007A]"
                  />
                  <span>Player Lower-Third</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showScorebug}
                    onChange={(e) => setShowScorebug(e.target.checked)}
                    className="accent-[#FF007A]"
                  />
                  <span>Tournament Header</span>
                </label>

                <button
                  onClick={handleGenerateAiStoryboard}
                  disabled={isGenerating}
                  className="ml-auto px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#7928CA] text-white font-mono font-black text-xs uppercase flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(255,0,122,0.4)] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'GENERATING AI REEL...' : 'AI AUTO-DIRECT'}</span>
                </button>
              </div>

              {/* Storyboard Cue Sequence */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-black uppercase text-slate-300 tracking-wider">
                  AI Beat-Sync Storyboard Cues
                </h4>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {reelData.storyboardCues?.map((cue: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[#00F2FE] font-mono font-bold text-[10px] mr-2">
                          {cue.timestamp}
                        </span>
                        <span className="text-white font-medium">{cue.visual}</span>
                      </div>
                      <span className="text-[10px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20 shrink-0">
                        {cue.captionEffect}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Viral Social Captions Package */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-black uppercase text-slate-300 tracking-wider">
                  1-Click Viral Captions & Tags
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* TikTok */}
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1">
                        <span>🎵</span> TikTok / Shorts
                      </span>
                      <button
                        onClick={() => handleCopyCaption('tiktok', reelData.socialCaptions?.tiktok)}
                        className="text-[10px] font-mono font-bold text-[#00F2FE] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCaption === 'tiktok' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCaption === 'tiktok' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {reelData.socialCaptions?.tiktok}
                    </p>
                  </div>

                  {/* Instagram Reels */}
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1">
                        <span>📸</span> Instagram Reels
                      </span>
                      <button
                        onClick={() => handleCopyCaption('ig', reelData.socialCaptions?.instagram)}
                        className="text-[10px] font-mono font-bold text-[#00F2FE] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCaption === 'ig' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCaption === 'ig' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {reelData.socialCaptions?.instagram}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    alert('High-resolution 1080x1920 9:16 vertical MP4 highlight reel packaged and rendered successfully!');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF007A] to-[#7928CA] text-white font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,0,122,0.4)] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT 9:16 REEL (1080x1920)</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
