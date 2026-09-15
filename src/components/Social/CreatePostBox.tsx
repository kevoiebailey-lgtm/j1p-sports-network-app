import React from 'react';
import { Image as ImageIcon, Link2, Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CreatePostBoxProps {
  onCreatePost?: (caption: string, imageUrl?: string, videoUrl?: string) => Promise<void>;
  onOpenModal?: () => void;
}

export const CreatePostBox: React.FC<CreatePostBoxProps> = ({ onOpenModal }) => {
  const { user, profile } = useAuth();
  const avatarUrl = user?.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

  return (
    <div 
      onClick={onOpenModal}
      className="p-2.5 sm:p-3.5 rounded-2xl bg-white dark:bg-[#212A31]/90 backdrop-blur-xl border border-gray-200 dark:border-slate-800/80 hover:border-[#E5B868]/50 transition-all shadow-md hover:shadow-[0_0_20px_rgba(214,28,36,0.15)] cursor-pointer group mb-6"
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Athlete Avatar */}
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[#E5B868]/60 group-hover:border-[#E5B868] transition-colors"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#E5B868] border-2 border-slate-950 shadow-[0_0_6px_#E5B868]" />
        </div>

        {/* Compact Input Pill Field */}
        <div className="flex-1 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-gray-50 dark:bg-[#212A31] border border-gray-200 dark:border-slate-800/90 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans truncate group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
          Share game film or highlights...
        </div>

        {/* Quick Icons & Primary Post Button */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenModal?.(); }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#E5B868] transition-colors cursor-pointer"
            title="Attach Photo"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenModal?.(); }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#E5B868] transition-colors cursor-pointer"
            title="Attach Link or Video"
          >
            <Link2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenModal?.(); }}
            className="hidden sm:flex p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
            title="Tag Athlete or Sport"
          >
            <Tag className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenModal?.(); }}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#E5B868] hover:bg-[#B8141B] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(214,28,36,0.4)] transition-all cursor-pointer font-mono"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
};
