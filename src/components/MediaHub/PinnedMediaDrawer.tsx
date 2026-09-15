import React from 'react';
import { 
  X, 
  Bookmark, 
  Trash2, 
  ExternalLink, 
  Camera, 
  Film, 
  Tv, 
  Sparkles, 
  UserCheck,
  Download,
  Share2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaVaultItem } from '../../types/mediaVault';

interface PinnedMediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedItems: MediaVaultItem[];
  onOpenItem: (item: MediaVaultItem) => void;
  onUnpinItem: (item: MediaVaultItem) => void;
  onNavigateTab?: (tab: string) => void;
}

export const PinnedMediaDrawer: React.FC<PinnedMediaDrawerProps> = ({
  isOpen,
  onClose,
  pinnedItems,
  onOpenItem,
  onUnpinItem,
  onNavigateTab
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-md bg-[#161C22] border-l border-[#2D3748] h-full overflow-y-auto p-5 space-y-6 shadow-2xl flex flex-col justify-between"
        >
          {/* Drawer Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D3748]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-[#F59E0B] border border-amber-500/40">
                  <Bookmark className="w-5 h-5 fill-[#F59E0B]" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase text-white font-sans tracking-tight">
                    PINNED TO SCOUT PROFILE
                  </h2>
                  <p className="text-[11px] font-mono text-slate-400">
                    {pinnedItems.length} {pinnedItems.length === 1 ? 'Media Item' : 'Media Items'} Linked
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[#1E2630] hover:bg-slate-800 text-slate-400 hover:text-white border border-[#2D3748] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#1E2630] border border-[#2D3748] text-xs text-slate-300 font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>These verified game photos & video clips are pinned to your Athlete Recruiting Profile.</span>
            </div>

            {/* Pinned List */}
            {pinnedItems.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#1E2630] border border-[#2D3748] text-slate-500 flex items-center justify-center mx-auto">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white">No Pinned Media Yet</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click the bookmark pin icon on any game photo or video reel to feature it on your scout profile.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pinnedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#1E2630] border border-[#2D3748] hover:border-[#F59E0B]/50 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div 
                      onClick={() => {
                        onClose();
                        onOpenItem(item);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-[#2D3748]">
                        <img
                          src={item.thumbnailUrl || item.mediaUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 p-0.5 rounded bg-black/80 text-white text-[8px]">
                          {item.type === 'photo' ? <Camera className="w-2.5 h-2.5 text-[#F59E0B]" /> : <Film className="w-2.5 h-2.5 text-[#00F2FE]" />}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-xs font-bold text-white truncate group-hover:text-[#F59E0B] transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {item.sport} • {item.eventName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onUnpinItem(item)}
                        className="p-2 rounded-lg bg-[#161C22] hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-[#2D3748] transition-colors cursor-pointer"
                        title="Unpin from profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-[#2D3748] space-y-2">
            {onNavigateTab && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab('profile');
                }}
                className="w-full py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4 stroke-[2.5]" />
                <span>View Full Athlete Profile</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#1E2630] hover:bg-[#283340] text-slate-300 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
