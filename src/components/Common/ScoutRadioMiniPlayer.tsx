import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  ListMusic, 
  Mic, 
  Flame, 
  Disc 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface RadioTrack {
  id: string;
  title: string;
  host: string;
  category: string;
  duration: string;
  audioUrl?: string; // Optional audio file URL or synthesized tone generator
}

const SCOUT_RADIO_EPISODES: RadioTrack[] = [
  {
    id: 'ep1',
    title: 'Flag Football Explosion: State Championship Scout Breakdown',
    host: 'Coach Marcus & Scout Taylor',
    category: 'Recruiting Breakdown',
    duration: '24:10'
  },
  {
    id: 'ep2',
    title: 'Top 50 Class of 2027 Prospect Deep Dive',
    host: 'National Recruiter Dave Miller',
    category: 'Prospect Analysis',
    duration: '38:45'
  },
  {
    id: 'ep3',
    title: 'Friday Night Lights Game Highlights & Post-Game Locker Room Interviews',
    host: 'Just1Play Media Crew',
    category: 'Game Reel',
    duration: '18:20'
  },
  {
    id: 'ep4',
    title: 'NCAA Transfer Portal Rules & NAIA Scholarship Guide for Athletes',
    host: 'Dr. Sarah Jenkins',
    category: 'Scholarships',
    duration: '31:15'
  }
];

export const ScoutRadioMiniPlayer: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(15);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const activeTrack = SCOUT_RADIO_EPISODES[currentTrackIndex];

  // Synthesize realistic ambient sports radio synth sound when active
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!isPlaying) {
      // Start playback & web audio ambient tone
      try {
        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      } catch (e) {
        console.warn('Audio Context initialization error:', e);
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
      <AnimatePresence>
        {isOpen ? (
          /* Expanded Player Modal */
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 sm:w-96 rounded-3xl bg-[#212A31]/95 dark:bg-[#212A31]/95 text-white border border-[#E5B868]/40 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-5 overflow-hidden"
          >
            {/* Header Controls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    Just1Play Scout Radio <Flame className="w-3.5 h-3.5 text-[#E5B868]" />
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400">Live Sports Podcast & Recruiting Stream</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    showPlaylist 
                      ? 'bg-[#E5B868] text-black border-[#E5B868]' 
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                  title="Toggle Playlist"
                >
                  <ListMusic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Playlist Drawer Toggle */}
            {showPlaylist ? (
              <div className="space-y-2 my-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                <h5 className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">Available Episodes</h5>
                {SCOUT_RADIO_EPISODES.map((ep, idx) => (
                  <div
                    key={ep.id}
                    onClick={() => {
                      setCurrentTrackIndex(idx);
                      setIsPlaying(true);
                      setShowPlaylist(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                      currentTrackIndex === idx
                        ? 'bg-[#E5B868]/15 border-[#E5B868] text-white'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <Mic className={`w-4 h-4 shrink-0 mt-0.5 ${currentTrackIndex === idx ? 'text-[#E5B868]' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{ep.title}</p>
                      <p className="text-[10px] text-slate-400">{ep.host} • {ep.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Active Track Information */
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#E5B868]/20 to-emerald-900/40 border border-[#E5B868]/30 flex items-center justify-center shrink-0">
                    <Disc className={`w-6 h-6 text-[#E5B868] ${isPlaying ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-mono font-bold text-[#E5B868] uppercase bg-[#E5B868]/10 px-1.5 py-0.5 rounded border border-[#E5B868]/20">
                      {activeTrack.category}
                    </span>
                    <h5 className="text-xs font-bold text-white truncate mt-1">{activeTrack.title}</h5>
                    <p className="text-[10px] text-slate-400 truncate">{activeTrack.host}</p>
                  </div>
                </div>

                {/* Animated Audio Waveform */}
                <div className="flex items-center justify-center gap-1 h-6 py-1">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isPlaying ? [4, Math.floor(Math.random() * 18) + 4, 4] : 4
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6 + (i % 5) * 0.1,
                        ease: 'easeInOut'
                      }}
                      className={`w-1 rounded-full ${isPlaying ? 'bg-[#E5B868]' : 'bg-slate-700'}`}
                    />
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#E5B868] h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>{Math.floor((progress / 100) * 15)}:00</span>
                    <span>{activeTrack.duration}</span>
                  </div>
                </div>

                {/* Main Player Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-red-500" />}
                  </button>

                  <button
                    onClick={togglePlay}
                    className="px-6 py-2.5 rounded-2xl bg-[#E5B868] text-black font-black uppercase text-xs tracking-wider hover:bg-[#B8141B] transition-all shadow-[0_0_20px_rgba(214,28,36,0.4)] flex items-center gap-2 cursor-pointer"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-black" /> Pause Radio
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-black" /> Listen Live
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTrackIndex((prev) => (prev + 1) % SCOUT_RADIO_EPISODES.length);
                      setIsPlaying(true);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                    title="Next Episode"
                  >
                    <Sparkles className="w-4 h-4 text-[#E5B868]" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Collapsed Pill Button */
          <motion.button
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#212A31]/90 dark:bg-[#212A31]/95 text-white border border-[#E5B868]/50 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl hover:border-[#E5B868] transition-all cursor-pointer"
          >
            <div className="p-1.5 rounded-full bg-[#E5B868] text-black">
              <Radio className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#E5B868] leading-none flex items-center gap-1">
                SCOUT RADIO {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-[#E5B868] animate-ping" />}
              </p>
              <p className="text-[11px] font-bold text-white truncate max-w-[130px] leading-tight mt-0.5">
                {activeTrack.title}
              </p>
            </div>
            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
