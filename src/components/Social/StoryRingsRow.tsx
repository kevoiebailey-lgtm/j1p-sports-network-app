import React, { useState } from 'react';
import { Plus, Sparkles, X, Trophy, Play, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface StoryItem {
  id: string;
  name: string;
  teamOrRole: string;
  avatar: string;
  hasUnseenUpdate: boolean;
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  caption?: string;
}

const SAMPLE_STORIES: StoryItem[] = [
  {
    id: 's1',
    name: 'Maya Lin',
    teamOrRole: 'East Elite QB',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    hasUnseenUpdate: true,
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-4043-large.mp4',
    mediaType: 'video',
    caption: 'Game winner in the 4th quarter! 🏈🔥'
  },
  {
    id: 's2',
    name: 'Marcus Carter',
    teamOrRole: 'West Coast Flag',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    hasUnseenUpdate: true,
    mediaUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: 'Combine test results are IN! 4.41s 40-yd dash.'
  },
  {
    id: 's3',
    name: 'Coach Vance',
    teamOrRole: 'Tri-State Academy',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    hasUnseenUpdate: true,
    mediaUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: 'Team strategy meeting for Friday regional finals.'
  },
  {
    id: 's4',
    name: 'Jordan Lee',
    teamOrRole: 'Gators WR',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    hasUnseenUpdate: false,
    mediaUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: 'Scouting report locked in.'
  },
  {
    id: 's5',
    name: 'Sydney Vance',
    teamOrRole: 'Lady Spartans',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
    hasUnseenUpdate: false,
    mediaUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800&auto=format&fit=crop&q=80',
    mediaType: 'image',
    caption: '32 points recorded in tournament opener.'
  }
];

export interface StoryRingsRowProps {
  onAddStoryClick?: () => void;
}

export const StoryRingsRow: React.FC<StoryRingsRowProps> = ({ onAddStoryClick }) => {
  const [stories, setStories] = useState<StoryItem[]>(SAMPLE_STORIES);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);

  const handleStoryClick = (story: StoryItem) => {
    setActiveStory(story);
    setStories(prev => prev.map(s => s.id === story.id ? { ...s, hasUnseenUpdate: false } : s));
  };

  return (
    <div className="w-full">
      {/* Horizontal Scroll Row */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
        
        {/* 1. Add Story Button */}
        <button
          onClick={onAddStoryClick}
          className="flex-shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer snap-start"
        >
          <div className="relative w-16 h-16 rounded-full bg-[#212A31] border-2 border-dashed border-red-600/50 group-hover:border-red-500 flex items-center justify-center transition-all shadow-md group-hover:scale-105">
            <div className="w-7 h-7 rounded-full bg-red-600 text-slate-950 flex items-center justify-center font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-300 group-hover:text-red-500 transition-colors">
            Add Story
          </span>
        </button>

        {/* 2. Player / Team Story Rings */}
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => handleStoryClick(story)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer snap-start"
          >
            <div 
              className={`relative p-0.5 rounded-full transition-all duration-300 group-hover:scale-105 ${
                story.hasUnseenUpdate 
                  ? 'bg-gradient-to-tr from-red-500 via-teal-300 to-red-600 shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse' 
                  : 'bg-slate-800 border border-slate-700/60'
              }`}
            >
              <div className="p-0.5 bg-[#212A31] rounded-full">
                <img
                  src={story.avatar}
                  alt={story.name}
                  className="w-14 h-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {story.hasUnseenUpdate && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-slate-950 rounded-full flex items-center justify-center">
                  <Sparkles className="w-2 h-2 text-slate-950 fill-slate-950" />
                </div>
              )}
            </div>

            <div className="text-center max-w-[68px]">
              <p className="text-[10px] font-bold text-slate-200 truncate group-hover:text-red-500 transition-colors">
                {story.name.split(' ')[0]}
              </p>
              <p className="text-[8px] font-medium text-slate-400 truncate">
                {story.teamOrRole}
              </p>
            </div>
          </button>
        ))}

      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStory && (
          <div className="fixed inset-0 z-50 bg-[#212A31]/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm h-[80vh] max-h-[650px] bg-[#212A31] border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Progress bar */}
              <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
                <div className="h-1 flex-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>

              {/* Header */}
              <div className="absolute top-6 left-4 right-4 z-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img 
                    src={activeStory.avatar} 
                    alt={activeStory.name} 
                    className="w-9 h-9 rounded-full object-cover border-2 border-red-500" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1">
                      {activeStory.name}
                      <CheckCircle2 className="w-3 h-3 text-red-500 fill-red-500" />
                    </h4>
                    <p className="text-[10px] text-slate-300">{activeStory.teamOrRole}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveStory(null)}
                  className="w-8 h-8 rounded-full bg-[#212A31]/60 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Media Content */}
              <div className="flex-1 relative bg-[#212A31] flex items-center justify-center overflow-hidden">
                {activeStory.mediaType === 'video' && activeStory.mediaUrl ? (
                  <video
                    src={activeStory.mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={activeStory.mediaUrl || activeStory.avatar}
                    alt={activeStory.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-[#212A31]/40 via-transparent to-[#212A31]/80 pointer-events-none" />
              </div>

              {/* Caption Overlay */}
              {activeStory.caption && (
                <div className="p-4 bg-[#212A31]/90 border-t border-slate-800 backdrop-blur-md">
                  <p className="text-xs font-medium text-slate-200">
                    {activeStory.caption}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryRingsRow;
