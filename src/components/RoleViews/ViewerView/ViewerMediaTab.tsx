import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Play, Flame, Eye, Share2, X, Maximize2, Sparkles } from 'lucide-react';
import { INITIAL_ATHLETE_DOCS } from '../../../lib/platformData';
import { parseVideoUrl } from '../../../lib/videoParser';
import { useToast } from '../../../context/ToastContext';

export const ViewerMediaTab: React.FC = () => {
  const { showToast } = useToast();
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [activeClip, setActiveClip] = useState<any | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const allClips = INITIAL_ATHLETE_DOCS.flatMap(a => 
    a.mediaUrls.map(m => ({ ...m, athleteName: a.displayName, athleteTeam: a.teamName }))
  );

  const tags = ['All', '#Highlights', '#GameFilm', '#TD', '#Pick6'];
  const filteredClips = selectedTag === 'All' 
    ? allClips 
    : allClips.filter(c => c.tag === selectedTag);

  const handleShare = (clip: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(clip.url || window.location.href);
      setCopied(clip.id);
      showToast('success', 'Link Copied', 'Highlight clip link copied!');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#818CF8]" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Community Media Feed & Top Plays
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Curated Highlight Reels, Match Reactions & Trending Game Moments
          </p>
        </div>

        {/* Filter Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                selectedTag === t
                  ? 'bg-[#818CF8] text-[#090D16] font-black shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredClips.map((clip) => (
          <div 
            key={clip.id} 
            onClick={() => setActiveClip(clip)}
            className="bg-slate-900/80 border border-slate-800 hover:border-[#818CF8]/50 rounded-2xl p-3.5 space-y-2.5 shadow-lg group cursor-pointer transition-all duration-200"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
              <img 
                src={clip.thumbnailUrl || 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&auto=format&fit=crop&q=80'} 
                alt={clip.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#818CF8] text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-115 transition-transform">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
              </div>
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-black text-[#818CF8] font-mono border border-[#818CF8]/30">
                {clip.tag}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-[#818CF8] transition-colors line-clamp-2">
                {clip.title}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {clip.athleteName} • {clip.athleteTeam}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-[#818CF8]" />
                {clip.views || 2400} views
              </span>
              <button
                onClick={(e) => handleShare(clip, e)}
                className="hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>{copied === clip.id ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Video Modal */}
      <AnimatePresence>
        {activeClip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f172a] border border-slate-700 rounded-3xl p-4 sm:p-6 max-w-3xl w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-[#818CF8] uppercase font-mono tracking-wider">
                    Community Video Theater
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-white">{activeClip.title}</h3>
                </div>
                <button 
                  onClick={() => setActiveClip(null)} 
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                {(() => {
                  const parsed = parseVideoUrl(activeClip.url);
                  if (parsed && parsed.provider === 'direct') {
                    return <video src={parsed.embedUrl} controls autoPlay className="w-full h-full object-contain" />;
                  } else if (parsed) {
                    return (
                      <iframe
                        src={`${parsed.embedUrl}${parsed.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                        title={activeClip.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    );
                  }
                  return (
                    <video 
                      src="https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-4043-large.mp4" 
                      controls 
                      autoPlay 
                      className="w-full h-full object-contain" 
                    />
                  );
                })()}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Athlete: <strong className="text-white">{activeClip.athleteName}</strong></span>
                <span>Team: <strong className="text-white">{activeClip.athleteTeam}</strong></span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ViewerMediaTab;
