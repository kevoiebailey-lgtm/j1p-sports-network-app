import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Share2, Film, Download, Check, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface BookmarkedReel {
  id: string;
  title: string;
  athleteName?: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  addedAt: string;
}

export const ScoutPlaylistDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo?: (url: string) => void;
}> = ({ isOpen, onClose, onSelectVideo }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkedReel[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Load saved bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('just1play_scout_bookmarks');
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to parse bookmarks:', e);
      }
    } else {
      // Sample initial saved reel
      const sample: BookmarkedReel[] = [
        {
          id: 'bk1',
          title: 'Top 10 State Championship Touchdown Reels',
          athleteName: 'Maya Williams',
          category: 'Girls Flag Football',
          videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          addedAt: '2 hours ago'
        },
        {
          id: 'bk2',
          title: '40-Yard Sprint & Agility Drill Session',
          athleteName: 'Jordan Vance',
          category: 'Basketball',
          videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          addedAt: '1 day ago'
        }
      ];
      setBookmarks(sample);
      localStorage.setItem('just1play_scout_bookmarks', JSON.stringify(sample));
    }
  }, [isOpen]);

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem('just1play_scout_bookmarks', JSON.stringify(updated));
  };

  const copyPlaylistLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md h-full bg-[#212A31] border-l border-white/10 text-white p-6 overflow-y-auto flex flex-col justify-between"
        >
          {/* Header */}
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                  <Bookmark className="w-5 h-5 fill-[#E5B868]" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-wider text-white">
                    My Scout Board
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">Bookmarked Game Reels & Highlights</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* List of Bookmarks */}
            {bookmarks.length > 0 ? (
              <div className="space-y-3">
                {bookmarks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-[#E5B868]/40 transition-all flex items-start gap-3 group"
                  >
                    <div className="p-2 rounded-xl bg-black/40 border border-white/10 text-[#E5B868] shrink-0 mt-0.5">
                      <Film className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-mono font-bold uppercase bg-[#E5B868]/10 text-[#E5B868] px-1.5 py-0.5 rounded border border-[#E5B868]/20">
                          {b.category}
                        </span>
                        {b.athleteName && (
                          <span className="text-[10px] text-slate-400 truncate">• {b.athleteName}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-white truncate group-hover:text-[#E5B868] transition-colors">
                        {b.title}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">Saved {b.addedAt}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectVideo && (
                        <button
                          onClick={() => onSelectVideo(b.videoUrl)}
                          className="p-1.5 rounded-lg bg-[#E5B868]/20 hover:bg-[#E5B868] text-[#E5B868] hover:text-black transition-all"
                          title="Watch Video Reel"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeBookmark(b.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                        title="Remove Bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <Sparkles className="w-8 h-8 text-[#E5B868] mx-auto animate-pulse" />
                <p className="text-xs font-bold text-white">Your Scout Board is empty</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Click the bookmark icon on any video reel or athlete highlight to save it to your board.
                </p>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-6 border-t border-white/10 space-y-2">
            <button
              onClick={copyPlaylistLink}
              className="w-full py-3 rounded-2xl bg-[#E5B868] text-black font-black uppercase text-xs tracking-wider hover:bg-[#B8141B] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(214,28,36,0.3)]"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Scout Board Link Copied!' : 'Export & Share Scout Playlist'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
