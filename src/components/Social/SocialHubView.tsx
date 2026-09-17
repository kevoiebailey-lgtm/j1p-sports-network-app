import React, { useState, useRef } from 'react';
import { 
  Flame, 
  Camera, 
  Radio, 
  RefreshCw, 
  ArrowDown, 
  CheckCircle2,
  Grid,
  Film,
  Search,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryRingsRow } from './StoryRingsRow';
import { TikTokReelView } from './TikTokReelView';
import { SocialFeedView } from './SocialFeedView';
import { CreatePublishModal } from './CreatePublishModal';
import { RoleConsistencyAuditModal } from './RoleConsistencyAuditModal';
import { MediaBookingSection } from '../MediaBooking/MediaBookingSection';
import { LiveGamesSection } from '../LiveGames/LiveGamesSection';
import { MemberDirectoryView } from '../Community/MemberDirectoryView';
import { Users } from 'lucide-react';

interface SocialHubViewProps {
  onOpenDM?: (targetUid: string, targetName: string) => void;
  defaultSubTab?: 'wall' | 'media' | 'live' | 'members';
}

export const SocialHubView: React.FC<SocialHubViewProps> = ({
  onOpenDM,
  defaultSubTab = 'wall'
}) => {
  const [subTab, setSubTab] = useState<'wall' | 'media' | 'live' | 'members'>(defaultSubTab);
  const [viewMode, setViewMode] = useState<'bento' | 'tiktok'>('bento');
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('All');
  const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Manual & deliberate refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [showToast, setShowToast] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Execute refresh sequence
  const executeRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);

    setTimeout(() => {
      setIsRefreshing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }, 600);
  };

  return (
    <div 
      ref={containerRef}
      className="space-y-4 min-h-screen relative pb-32"
    >
      {/* Toast Notification when Feed Refreshed */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#212A31] border border-[#E5B868]/60 shadow-[0_0_25px_rgba(229,184,104,0.5)] backdrop-blur-2xl flex items-center gap-2 text-xs font-mono font-bold text-white pointer-events-none"
          >
            <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />
            <span>COMMUNITY FEED SYNCED</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-navigation tabs: Feed / Media / Live + View Mode Toggle */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#212A31]/80 border-b border-slate-900 flex-wrap gap-2 rounded-2xl">
        <div className="flex items-center gap-1.5 bg-[#212A31]/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSubTab('wall')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'wall'
                ? 'bg-[#E5B868] text-slate-950 font-black shadow-[0_0_12px_rgba(229,184,104,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>

          <button
            onClick={() => setSubTab('media')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'media'
                ? 'bg-[#E5B868] text-slate-950 font-black shadow-[0_0_12px_rgba(229,184,104,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Media</span>
          </button>

          <button
            onClick={() => setSubTab('live')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'live'
                ? 'bg-[#E5B868] text-slate-950 font-black shadow-[0_0_12px_rgba(229,184,104,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live</span>
          </button>

          <button
            onClick={() => setSubTab('members')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'members'
                ? 'bg-[#00B8D4] text-slate-950 font-black shadow-[0_0_12px_rgba(0,184,212,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Dedicated Refresh / Sync Button */}
          <button
            onClick={executeRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-300 hover:text-[#E5B868] transition-all cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#E5B868]' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {subTab === 'wall' && (
            <div className="flex items-center p-1 bg-[#212A31]/90 rounded-full border border-slate-800">
              <button
                onClick={() => setViewMode('bento')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer font-mono ${
                  viewMode === 'bento'
                    ? 'bg-slate-800 text-[#E5B868]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>Grid</span>
              </button>

              <button
                onClick={() => setViewMode('tiktok')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer font-mono ${
                  viewMode === 'tiktok'
                    ? 'bg-slate-800 text-[#E5B868]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3 h-3" />
                <span>Reels</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. EXACTLY ONE HORIZONTAL STORY BAR RIGHT BELOW STICKY HEADER */}
      {subTab === 'wall' && (
        <div className="px-3 sm:px-4 py-2.5 rounded-2xl bg-[#212A31]/70 border border-slate-800/80 backdrop-blur-xl mx-2 sm:mx-4">
          <StoryRingsRow onAddStoryClick={() => setIsCreateModalOpen(true)} />
        </div>
      )}

      {/* Render selected sub-view */}
      <div className="px-2 sm:px-4 space-y-6">
        {subTab === 'wall' && (
          <>
            {viewMode === 'tiktok' ? (
              <TikTokReelView />
            ) : (
              <SocialFeedView 
                onOpenDM={onOpenDM} 
                refreshKey={refreshKey}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                selectedSportFilter={selectedSportFilter}
                onSportFilterChange={(sport) => setSelectedSportFilter(sport)}
              />
            )}
          </>
        )}

        {subTab === 'media' && <MediaBookingSection />}
        {subTab === 'live' && <LiveGamesSection />}
        {subTab === 'members' && <MemberDirectoryView />}
      </div>

      {/* Create Floating Modal Interaction */}
      <CreatePublishModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onPostCreated={() => {
          executeRefresh();
        }}
      />

      {/* Role-Consistency Validator Audit Simulator Modal */}
      <RoleConsistencyAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
};

export default SocialHubView;
