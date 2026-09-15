import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Film, 
  Play, 
  Pause, 
  Scissors, 
  Download, 
  Share2, 
  Flame, 
  Clock, 
  Check, 
  Copy, 
  Tv, 
  Smartphone,
  Tag,
  Zap,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AiHighlightClipperModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle?: string;
  sport?: string;
  videoUrl?: string;
}

export interface HighlightClip {
  id: string;
  timestamp: string;
  durationSeconds: number;
  title: string;
  category: string;
  viralScore: number;
  scoutTag: string;
  caption: string;
}

export const AiHighlightClipperModal: React.FC<AiHighlightClipperModalProps> = ({
  isOpen,
  onClose,
  gameTitle = 'State Championship Game 1',
  sport = 'Flag Football',
  videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [copiedCaptionIndex, setCopiedCaptionIndex] = useState<number | null>(null);

  const [reelData, setReelData] = useState<{
    reelTitle: string;
    socialHook: string;
    recommendedMusicTempo: string;
    clips: HighlightClip[];
  }>({
    reelTitle: `${gameTitle} - Viral Play Highlights`,
    socialHook: 'Watch this wild 4th quarter sequence! 😱🔥',
    recommendedMusicTempo: 'Trap / High Energy (140 BPM)',
    clips: [
      {
        id: 'clip-1',
        timestamp: '01:15',
        durationSeconds: 12,
        title: '45-Yard Laser Strike Down the Seam',
        category: 'Touchdown Pass',
        viralScore: 96,
        scoutTag: 'Elite Arm Strength & Pocket Poise',
        caption: 'Dropping dimes under heavy blitz pressure! 🎯 Sub-4.5 speed on the route. #Just1Play #HighlightReel #Recruiting'
      },
      {
        id: 'clip-2',
        timestamp: '03:40',
        durationSeconds: 10,
        title: 'Goal-Line 4th Down Swat',
        category: 'Defensive Stop',
        viralScore: 92,
        scoutTag: 'Closing Burst & Ball Tracking',
        caption: 'Clutch defensive stand with game on the line! 🛡️ Not in our house. #DefenseWinsChampionships #ScoutMatrix'
      },
      {
        id: 'clip-3',
        timestamp: '05:22',
        durationSeconds: 9,
        title: 'Acrobatic Toe-Tap Sideline Catch',
        category: 'Catch of the Day',
        viralScore: 98,
        scoutTag: 'Exceptional Body Control',
        caption: 'Unbelievable boundary awareness! SportsCenter Top 10 worthy catch 🔥 #Just1Play #Top10 #Playmaker'
      },
      {
        id: 'clip-4',
        timestamp: '07:50',
        durationSeconds: 15,
        title: 'Walk-Off Pick-Six Game Winner',
        category: 'Game Winner',
        viralScore: 99,
        scoutTag: 'Clutch Situational Instincts',
        caption: 'GAME OVER! Interception returned for the walk-off touchdown! 🏆⚡ #WalkOff #StateChamps #Just1Play'
      }
    ]
  });

  if (!isOpen) return null;

  const currentClip = reelData.clips[activeClipIndex] || reelData.clips[0];

  const handleRunAiAutoClipper = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/gemini/clip-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameTitle,
          sport,
          videoDuration: '08:45',
          rawTimestamps: reelData.clips.map(c => ({ time: c.timestamp, title: c.title }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReelData({
          reelTitle: data.reelTitle || reelData.reelTitle,
          socialHook: data.socialHook || reelData.socialHook,
          recommendedMusicTempo: data.recommendedMusicTempo || reelData.recommendedMusicTempo,
          clips: data.clips || reelData.clips
        });
      }
    } catch (err) {
      console.warn('Highlight clipper error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCaption = (caption: string, index: number) => {
    navigator.clipboard.writeText(caption);
    setCopiedCaptionIndex(index);
    setTimeout(() => setCopiedCaptionIndex(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-[#12171E] border border-[#2D3748] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748] bg-[#161C22]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#00F2FE]/15 border border-[#00F2FE]/30 text-[#00F2FE]">
              <Scissors className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white font-mono tracking-wide flex items-center gap-2">
                <span>AI HIGHLIGHT AUTO-CLIPPER & SOCIAL REEL STUDIO</span>
                <span className="text-[10px] text-[#00F2FE] bg-[#00F2FE]/15 px-2 py-0.5 rounded border border-[#00F2FE]/30 font-mono">
                  GEMINI VISION
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8] font-sans">
                Automatically extracts viral plays, generates 9:16 vertical shorts, and crafts ready-to-post captions for {gameTitle}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#18212C] p-4 rounded-2xl border border-[#2D3748]">
            <div>
              <h3 className="text-sm font-bold text-white font-mono">{reelData.reelTitle}</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Suggested Hook: <span className="text-[#00F2FE] font-bold">"{reelData.socialHook}"</span> • Audio: {reelData.recommendedMusicTempo}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Aspect Ratio Selector */}
              <div className="flex items-center bg-[#0F141A] p-1 rounded-xl border border-[#2D3748]">
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    aspectRatio === '9:16'
                      ? 'bg-[#00F2FE] text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>9:16 Reels</span>
                </button>
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    aspectRatio === '16:9'
                      ? 'bg-[#00F2FE] text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>16:9 Broadcast</span>
                </button>
              </div>

              {/* Re-Analyze AI Button */}
              <button
                onClick={handleRunAiAutoClipper}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-black font-mono text-xs font-black transition-all shadow-[0_0_12px_rgba(0,242,254,0.3)] cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Clipping...' : 'Auto-Extract AI Plays'}</span>
              </button>
            </div>
          </div>

          {/* Video Player & Clip Scrubber Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Video Preview Player Container */}
            <div className="lg:col-span-7 flex flex-col items-center bg-[#0F141A] border border-[#2D3748] rounded-2xl p-4">
              <div
                className={`w-full relative rounded-xl overflow-hidden bg-black border border-[#2D3748] flex items-center justify-center ${
                  aspectRatio === '9:16' ? 'max-w-[280px] aspect-[9/16]' : 'aspect-video'
                }`}
              >
                {/* Fallback Image or Video Element */}
                <img
                  src="https://images.unsplash.com/photo-1546519638-68e109498ffc?w=900&auto=format&fit=crop&q=80"
                  alt="Clip Preview"
                  className="w-full h-full object-cover opacity-80"
                />

                {/* Scorebug Overlay inside Video Frame */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-xs font-mono">
                  <span className="text-[#00F2FE] font-black">{sport.toUpperCase()}</span>
                  <span className="text-white font-bold">{currentClip?.timestamp || '01:15'}</span>
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#00F2FE]/90 text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.6)] cursor-pointer hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-black ml-1" />
                  </div>
                </div>

                {/* Bottom Watermark Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-white/80 bg-black/50 px-2 py-1 rounded">
                  <span>Just1Play Sports Matrix</span>
                  <span className="text-[#F59E0B] font-bold">VIRAL SCORE: {currentClip?.viralScore}/100</span>
                </div>
              </div>

              {/* Clip Timeline Scrubber Bar */}
              <div className="w-full mt-4 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Timeline Start: <strong className="text-white">{currentClip?.timestamp}</strong></span>
                  <span>Duration: <strong className="text-[#00F2FE]">{currentClip?.durationSeconds}s</strong></span>
                </div>
                <div className="w-full bg-[#1E2630] h-3 rounded-full relative overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#00F2FE] to-[#10B981] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (activeClipIndex + 1) * 25)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Clip Selector List & Instagram Caption Exporter */}
            <div className="lg:col-span-5 space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-[#00F2FE]" />
                <span>Detected AI Highlight Moments ({reelData.clips.length})</span>
              </h4>

              <div className="space-y-3">
                {reelData.clips.map((clip, index) => {
                  const isSelected = activeClipIndex === index;
                  return (
                    <div
                      key={clip.id}
                      onClick={() => setActiveClipIndex(index)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#18212C] border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.25)]'
                          : 'bg-[#0F141A] border-[#2D3748] hover:border-[#4A5568]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#161C22] border border-[#2D3748] text-[#00F2FE]">
                              {clip.timestamp}
                            </span>
                            <span className="text-xs font-bold text-white">{clip.title}</span>
                          </div>
                          <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">
                            {clip.category} • Tag: <span className="text-[#10B981] font-bold">{clip.scoutTag}</span>
                          </p>
                        </div>

                        {/* Viral Score Badge */}
                        <span className="flex items-center gap-1 text-[11px] font-black font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-1 rounded-lg border border-[#F59E0B]/30 shrink-0">
                          <Flame className="w-3 h-3 fill-[#F59E0B]" />
                          <span>{clip.viralScore}</span>
                        </span>
                      </div>

                      {/* Ready-to-copy social caption box */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-[#2D3748]/60">
                          <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mb-1">
                            <span>Ready-to-Post TikTok/IG Caption:</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCaption(clip.caption, index);
                              }}
                              className="flex items-center gap-1 text-[#00F2FE] hover:underline cursor-pointer"
                            >
                              {copiedCaptionIndex === index ? (
                                <>
                                  <Check className="w-3 h-3 text-[#10B981]" />
                                  <span className="text-[#10B981]">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Caption</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-[#CBD5E1] bg-[#12171E] p-2.5 rounded-xl border border-[#2D3748] leading-relaxed">
                            {clip.caption}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#161C22] border-t border-[#2D3748]">
          <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <Zap className="w-4 h-4 text-[#00F2FE]" />
            <span>Clips formatted with 4K bitrate export & dynamic audio leveling</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                alert(`Exporting ${currentClip?.title} in ${aspectRatio} format for direct upload to TikTok and Instagram Reels!`);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-black font-mono font-black text-xs transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {aspectRatio} Clip</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
