import React, { useState } from 'react';
import { Film, Play, ExternalLink, Sparkles, Trophy, Calendar, Eye, Share2 } from 'lucide-react';
import { UserProfile } from '../../types';

export interface AthleteShowcaseReelsProps {
  athleteId: string;
  athlete?: UserProfile;
  athleteName?: string;
  jerseyNumber?: string;
  teamName?: string;
}

interface ShowcaseReel {
  id: string;
  title: string;
  category: 'highlight' | 'game_film' | 'combine';
  thumbnailUrl: string;
  videoUrl: string;
  platform: 'hudl' | 'youtube' | 'direct';
  duration: string;
  views: number;
  date: string;
}

export const AthleteShowcaseReels: React.FC<AthleteShowcaseReelsProps> = ({
  athleteId,
  athlete,
  athleteName = 'Athlete',
  jerseyNumber,
  teamName,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'highlight' | 'game_film' | 'combine'>('all');
  const [selectedVideo, setSelectedVideo] = useState<ShowcaseReel | null>(null);

  // Extract from athlete.mediaUrls or fallback sample verified reels
  const reels: ShowcaseReel[] = [
    {
      id: 'reel-1',
      title: `${athleteName} - Midseason Varsity Highlights`,
      category: 'highlight',
      thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      videoUrl: athlete?.featuredHighlightUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      platform: 'hudl',
      duration: '2:45',
      views: 1420,
      date: '2025 Regular Season',
    },
    {
      id: 'reel-2',
      title: `State Semifinals 4th Quarter Comeback Drive`,
      category: 'game_film',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=800&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      platform: 'youtube',
      duration: '4:12',
      views: 980,
      date: 'Dec 2024',
    },
    {
      id: 'reel-3',
      title: `Top Gun Showcase - 40yd Dash & Shuttle Drill`,
      category: 'combine',
      thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=800&q=80',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      platform: 'direct',
      duration: '1:30',
      views: 740,
      date: 'Spring 2025',
    }
  ];

  const filteredReels = activeCategory === 'all' ? reels : reels.filter(r => r.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Film className="w-3.5 h-3.5" />
            <span>Verified Film Vault</span>
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <span>Showcase & Highlight Reels</span>
            {jerseyNumber && (
              <span className="text-cyan-400 font-mono">#{jerseyNumber}</span>
            )}
          </h3>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'highlight', 'game_film', 'combine'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-cyan-500 text-neutral-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All Film' : cat === 'highlight' ? 'Highlights' : cat === 'game_film' ? 'Game Film' : 'Combines'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredReels.map(reel => (
          <div
            key={reel.id}
            className="group relative rounded-2xl bg-[#111A26] border border-white/10 hover:border-cyan-500/40 transition overflow-hidden shadow-lg flex flex-col"
          >
            <div className="relative aspect-video bg-black/60 overflow-hidden cursor-pointer" onClick={() => setSelectedVideo(reel)}>
              <img
                src={reel.thumbnailUrl}
                alt={reel.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-cyan-500/90 text-neutral-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 ml-0.5 fill-current" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono text-white">
                {reel.duration}
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase text-cyan-400">
                {reel.platform}
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <h4 className="font-bold text-white text-sm line-clamp-2 group-hover:text-cyan-400 transition-colors">
                {reel.title}
              </h4>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-white/5">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  {reel.views.toLocaleString()} views
                </span>
                <span>{reel.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#111A26] border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">{selectedVideo.title}</h4>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-white text-sm font-mono cursor-pointer"
              >
                Close ✕
              </button>
            </div>
            <div className="relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center">
              <img
                src={selectedVideo.thumbnailUrl}
                alt={selectedVideo.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute flex flex-col items-center gap-3">
                <a
                  href={selectedVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-cyan-500 text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-cyan-400 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Video in New Tab</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
