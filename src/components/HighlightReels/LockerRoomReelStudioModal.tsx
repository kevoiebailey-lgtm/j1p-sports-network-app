import React, { useState } from 'react';
import { 
  Film, 
  Scissors, 
  Play, 
  Pause, 
  Share2, 
  Download, 
  Sparkles, 
  Clock, 
  Tag, 
  X, 
  CheckCircle2,
  Video,
  Volume2
} from 'lucide-react';

interface ReelClip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  tag: 'Touchdown' | 'Interception' | 'Juke / Ankle Breaker' | 'Dunk' | 'Clutch Stop';
  player: string;
  speed: number;
}

interface LockerRoomReelStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle?: string;
  videoUrl?: string;
}

export const LockerRoomReelStudioModal: React.FC<LockerRoomReelStudioModalProps> = ({
  isOpen,
  onClose,
  gameTitle = 'National Semifinal • SoCal Elite vs Philly Pride',
  videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(14.5);
  const [duration, setDuration] = useState(120.0);
  const [clipStart, setClipStart] = useState(12.0);
  const [clipEnd, setClipEnd] = useState(24.0);
  const [clipTag, setClipTag] = useState<'Touchdown' | 'Interception' | 'Juke / Ankle Breaker' | 'Dunk' | 'Clutch Stop'>('Touchdown');
  const [playerName, setPlayerName] = useState('Marcus Sterling (#1)');
  const [isExporting, setIsExporting] = useState(false);
  const [savedClips, setSavedClips] = useState<ReelClip[]>([
    { id: '1', title: '45yd Deep Bomb Touchdown', startTime: 12.0, endTime: 24.0, tag: 'Touchdown', player: 'Marcus Sterling (#1)', speed: 1.0 },
    { id: '2', title: 'Goal Line Pick-Six Interception', startTime: 48.0, endTime: 58.0, tag: 'Interception', player: 'Trey Hawkins (#11)', speed: 1.0 }
  ]);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveClip = () => {
    const newClip: ReelClip = {
      id: `clip-${Date.now()}`,
      title: `${clipTag} by ${playerName}`,
      startTime: clipStart,
      endTime: clipEnd,
      tag: clipTag,
      player: playerName,
      speed: 1.0
    };
    setSavedClips(prev => [newClip, ...prev]);
    setNotification(`⚡ Highlight Clip Saved: "${newClip.title}" (${(clipEnd - clipStart).toFixed(1)}s)`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExportReel = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setNotification('🏆 HD Recruiting Reel Compiled and ready for download!');
      setTimeout(() => setNotification(null), 3500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#12171E] border border-[#2D3748] rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748] bg-[#161C22]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00F2FE]/15 border border-[#00F2FE]/30 text-[#00F2FE]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wide flex items-center gap-2">
                <span>LOCKER ROOM HIGHLIGHT CLIPPER &amp; REEL STUDIO</span>
                <span className="text-[10px] text-[#00F2FE] bg-[#00F2FE]/15 px-2 py-0.5 rounded border border-[#00F2FE]/30">
                  4K / 1080P PRO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {gameTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Workspace */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {notification && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{notification}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Video Player Mockup & Timeline Scrubber */}
            <div className="lg:col-span-2 space-y-4">
              <div className="relative aspect-video rounded-2xl bg-black border border-[#2D3748] overflow-hidden flex items-center justify-center group shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-[#00F2FE]/20 border border-[#00F2FE]/40 flex items-center justify-center text-[#00F2FE] mx-auto shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                    <Video className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-mono text-slate-400">Broadcasting 60 FPS Game Stream Feed</p>
                </div>

                {/* Overlaid Score & Tag Watermark */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>REC 1080P • {currentTime.toFixed(1)}s</span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono">
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[#00F2FE] font-bold">
                    Tagged: {clipTag} ({playerName})
                  </div>
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-slate-300">
                    Range: {clipStart.toFixed(1)}s - {clipEnd.toFixed(1)}s ({(clipEnd - clipStart).toFixed(1)}s clip)
                  </div>
                </div>
              </div>

              {/* Timeline Scrubber & In/Out Setters */}
              <div className="p-4 rounded-2xl bg-[#161C22] border border-[#2D3748] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Playhead: {currentTime.toFixed(1)}s / {duration.toFixed(1)}s</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setClipStart(currentTime)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 text-[10px] font-black uppercase cursor-pointer"
                    >
                      Set In ({currentTime.toFixed(1)}s)
                    </button>
                    <button
                      onClick={() => setClipEnd(currentTime)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-[10px] font-black uppercase cursor-pointer"
                    >
                      Set Out ({currentTime.toFixed(1)}s)
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.5}
                  value={currentTime}
                  onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                />
              </div>

            </div>

            {/* Right: Clip Metadata Form & Saved Reel Queue */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#161C22] border border-[#2D3748] space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#00F2FE] flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Highlight Clip Tagging</span>
                </h3>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Play Category</label>
                  <select
                    value={clipTag}
                    onChange={(e: any) => setClipTag(e.target.value)}
                    className="w-full bg-[#0F141A] border border-[#2D3748] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                  >
                    <option value="Touchdown">Touchdown</option>
                    <option value="Interception">Interception</option>
                    <option value="Juke / Ankle Breaker">Juke / Ankle Breaker</option>
                    <option value="Dunk">Dunk / Poster</option>
                    <option value="Clutch Stop">Clutch 4th Down Stop</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Featured Athlete</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-[#0F141A] border border-[#2D3748] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                    placeholder="e.g. Marcus Sterling (#1)"
                  />
                </div>

                <button
                  onClick={handleSaveClip}
                  className="w-full py-2.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-mono font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer"
                >
                  Save to Reel Queue
                </button>
              </div>

              {/* Saved Clips List */}
              <div className="p-4 rounded-2xl bg-[#0F141A] border border-[#2D3748] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white">Active Reel ({savedClips.length} clips)</span>
                  <span className="text-slate-400">{savedClips.reduce((acc, c) => acc + (c.endTime - c.startTime), 0).toFixed(0)}s total</span>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {savedClips.map((clip) => (
                    <div key={clip.id} className="p-2.5 rounded-xl bg-[#161C22] border border-[#2D3748] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white truncate max-w-[170px]">{clip.title}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {clip.startTime}s - {clip.endTime}s • {clip.player}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold">
                        {clip.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#161C22] border-t border-[#2D3748]">
          <div className="text-xs font-mono text-slate-400">
            Export directly to Hudl, MaxPreps, Instagram Reels &amp; Twitter / X.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportReel}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#0284C7] hover:from-[#38BDF8] hover:to-[#0369A1] text-slate-950 font-mono font-black text-xs transition-all shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Compiling 4K Reel...' : 'Export Recruiting Reel'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
