import React, { useState, useRef, useEffect } from 'react';
import { Lock, Users, Globe, ChevronDown, Check } from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

interface PlayPrivacyDropdownProps {
  isPublic: boolean;
  sharedTeams?: string[];
  onChangePrivacy: (updates: { isPublic: boolean; sharedTeams?: string[] }) => void;
  onOpenTeamModal: () => void;
  size?: 'sm' | 'md';
}

export const PlayPrivacyDropdown: React.FC<PlayPrivacyDropdownProps> = ({
  isPublic,
  sharedTeams = [],
  onChangePrivacy,
  onOpenTeamModal,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectPrivate = () => {
    triggerHaptic('light');
    onChangePrivacy({ isPublic: false });
    setIsOpen(false);
  };

  const handleSelectTeam = () => {
    triggerHaptic('light');
    setIsOpen(false);
    onOpenTeamModal();
  };

  const handleSelectPublic = () => {
    triggerHaptic('light');
    onChangePrivacy({ isPublic: true });
    setIsOpen(false);
  };

  const currentMode = isPublic 
    ? 'community' 
    : (sharedTeams && sharedTeams.length > 0 ? 'team' : 'private');

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(!isOpen);
        }}
        className={`rounded-xl font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          isPublic
            ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 hover:bg-purple-500/25'
            : sharedTeams && sharedTeams.length > 0
            ? 'bg-cyan-500/15 text-[#00F0D0] border-[#00F0D0]/40 hover:bg-cyan-500/25'
            : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
        }`}
        title="Privacy & Sharing Controls"
      >
        {isPublic ? (
          <>
            <Globe className={size === 'sm' ? 'w-3 h-3 text-purple-400' : 'w-3.5 h-3.5 text-purple-400'} />
            <span className="whitespace-nowrap">🌐 Community</span>
          </>
        ) : sharedTeams && sharedTeams.length > 0 ? (
          <>
            <Users className={size === 'sm' ? 'w-3 h-3 text-[#00F0D0]' : 'w-3.5 h-3.5 text-[#00F0D0]'} />
            <span className="whitespace-nowrap">👥 Team ({sharedTeams.length})</span>
          </>
        ) : (
          <>
            <Lock className={size === 'sm' ? 'w-3 h-3 text-amber-400' : 'w-3.5 h-3.5 text-amber-400'} />
            <span className="whitespace-nowrap">🔒 Private</span>
          </>
        )}
        <ChevronDown className={size === 'sm' ? 'w-3 h-3 text-slate-400' : 'w-3.5 h-3.5 text-slate-400'} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-56 rounded-2xl bg-[#0B0F19] border border-slate-800 shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          {/* Option 1: Private */}
          <button
            type="button"
            onClick={handleSelectPrivate}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
              currentMode === 'private'
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <p>🔒 Private (Only Me)</p>
                <p className="text-[10px] text-slate-500 font-normal">Restricted to your account</p>
              </div>
            </div>
            {currentMode === 'private' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          </button>

          {/* Option 2: Team */}
          <button
            type="button"
            onClick={handleSelectTeam}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
              currentMode === 'team'
                ? 'bg-[#00F0D0]/15 text-[#00F0D0]'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#00F0D0] shrink-0" />
              <div>
                <p>👥 Share to Team Roster</p>
                <p className="text-[10px] text-slate-500 font-normal">Wristband HUD live access</p>
              </div>
            </div>
            {currentMode === 'team' && <Check className="w-3.5 h-3.5 text-[#00F0D0] shrink-0" />}
          </button>

          {/* Option 3: Community */}
          <button
            type="button"
            onClick={handleSelectPublic}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
              currentMode === 'community'
                ? 'bg-purple-500/20 text-purple-300'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <div>
                <p>🌐 Publish to Community</p>
                <p className="text-[10px] text-slate-500 font-normal">Public community playbook</p>
              </div>
            </div>
            {currentMode === 'community' && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayPrivacyDropdown;
