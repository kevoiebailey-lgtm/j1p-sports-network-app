import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  ClipboardList, 
  Binoculars, 
  Video, 
  Heart, 
  ShieldCheck, 
  User, 
  MessageSquare, 
  CreditCard, 
  Radio, 
  Users, 
  HelpCircle, 
  LogOut, 
  Lock,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../../types/platform';

export interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userDoc?: any;
  displayName: string;
  avatarUrl: string;
  role: UserRole | string;
  roleLocked?: boolean;
  isAdmin?: boolean;
  switchRole: (role: UserRole) => void;
  onSignOut: () => void;
}

interface RolePerspectiveOption {
  id: UserRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const ADMIN_PERSPECTIVE_ROLES: RolePerspectiveOption[] = [
  { id: 'athlete', label: 'Athlete', icon: Activity, tag: 'ATH' },
  { id: 'coach', label: 'Coach', icon: ClipboardList, tag: 'COACH' },
  { id: 'scout', label: 'Scout', icon: Binoculars, tag: 'SCOUT' },
  { id: 'creator', label: 'Creator', icon: Video, tag: 'MEDIA' },
  { id: 'fan', label: 'Fan', icon: Heart, tag: 'FAN' },
  { id: 'admin', label: 'Super Admin', icon: ShieldCheck, tag: 'ADMIN' },
];

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  user,
  userDoc,
  displayName,
  avatarUrl,
  role,
  roleLocked,
  isAdmin,
  switchRole,
  onSignOut,
}) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-2xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] bg-[#08090C]/95 backdrop-blur-2xl p-4 shadow-2xl z-50 max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar flex flex-col"
        role="dialog"
        aria-label="User Profile and Role Switcher Menu"
      >
        {/* Scrollable Main Body */}
        <div className="flex-1 min-h-0 space-y-3">
          {/* User Profile Header Card */}
          <div className="p-3 rounded-xl bg-[#12151C]/90 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex items-center gap-3">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-white truncate">{displayName}</p>
              <p className="text-[11px] font-mono text-zinc-400 truncate">{user?.email || 'Logged in'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00F0D0]/10 text-[#00F0D0] text-[9px] font-mono font-black uppercase border border-[#00F0D0]/30 shadow-[0_0_8px_rgba(0,240,208,0.2)]">
                  <Sparkles className="w-2.5 h-2.5 text-[#00F0D0]" />
                  {role === 'admin' ? 'Super Admin' : role} Mode
                </span>
                {roleLocked && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FFB800]/10 text-[#FFB800] text-[9px] font-mono font-bold border border-[#FFB800]/30">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Admin Perspective Switcher (Strictly for Platform Admins) */}
          {isAdmin && (
            <div className="pt-1">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Admin Perspective Switch
                </span>
                <span className="text-[9px] font-mono text-[#00F0D0] font-bold uppercase">
                  6 Roles
                </span>
              </div>

              {/* Compact 2-Column Grid */}
              <div className="grid grid-cols-2 gap-1.5 py-2">
                {ADMIN_PERSPECTIVE_ROLES.map((r) => {
                  const RoleIcon = r.icon;
                  const isCurrent = role === r.id;
                  const isSuperAdmin = r.id === 'admin';

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                          navigator.vibrate(12);
                        }
                        switchRole(r.id);
                        onClose();
                      }}
                      className={`min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.97] select-none cursor-pointer ${
                        isCurrent
                          ? isSuperAdmin
                            ? 'bg-[#00F0D0]/15 border border-[#00F0D0]/50 text-[#00F0D0] shadow-[0_0_16px_rgba(0,240,208,0.25)]'
                            : 'bg-[#00F0D0]/15 border border-[#00F0D0]/50 text-[#00F0D0] shadow-[0_0_12px_rgba(0,240,208,0.2)]'
                          : 'bg-[#12151C]/60 hover:bg-[#12151C] border border-white/[0.06] hover:border-white/20 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <RoleIcon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-[#00F0D0]' : 'text-zinc-400'}`} />
                        <span className="truncate">{r.label}</span>
                      </div>
                      {isCurrent ? (
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#00F0D0] shadow-[0_0_6px_rgba(0,240,208,0.9)] animate-pulse" />
                      ) : (
                        <span className="text-[9px] font-mono text-zinc-500 shrink-0">{r.tag}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Action Links */}
          <div className="border-t border-white/[0.08] pt-2 space-y-1">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(12);
                }
                onClose();
                navigate('/profile');
              }}
              className="w-full min-h-[42px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:bg-[#12151C] hover:text-[#00F0D0] border border-transparent hover:border-white/[0.08] cursor-pointer transition-all duration-150 active:scale-[0.97] select-none"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#00F0D0] shrink-0" />
                <span>My Sports Profile & QR</span>
              </div>
              <span className="text-[10px] font-mono text-[#00F0D0] font-bold">VIEW</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(12);
                }
                onClose();
                navigate('/messages');
              }}
              className="w-full min-h-[42px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:bg-[#12151C] hover:text-[#00F0D0] border border-transparent hover:border-white/[0.08] cursor-pointer transition-all duration-150 active:scale-[0.97] select-none"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00F0D0] shrink-0" />
                <span>Direct Messages & Inquiries</span>
              </div>
              <span className="text-[10px] font-mono text-[#00F0D0] font-bold">CHAT</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(12);
                }
                onClose();
                navigate('/profile?tab=payment_accounts');
              }}
              className="w-full min-h-[42px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:bg-[#12151C] hover:text-emerald-400 border border-transparent hover:border-white/[0.08] cursor-pointer transition-all duration-150 active:scale-[0.97] select-none"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Saved Payments & Fast Pay</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">WALLET</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(12);
                }
                onClose();
                navigate('/signal-hub');
              }}
              className="w-full min-h-[42px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:bg-[#12151C] hover:text-[#00F0D0] border border-transparent hover:border-white/[0.08] cursor-pointer transition-all duration-150 active:scale-[0.97] select-none"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#00F0D0] shrink-0" />
                <span>Signal Hub (Wrist HUD)</span>
              </div>
              <span className="text-[10px] font-mono text-[#00F0D0] font-bold">LIVE HUD</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(12);
                }
                onClose();
                navigate('/members');
              }}
              className="w-full min-h-[42px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:bg-[#12151C] hover:text-[#00F0D0] border border-transparent hover:border-white/[0.08] cursor-pointer transition-all duration-150 active:scale-[0.97] select-none"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00F0D0] shrink-0" />
                <span>Member Directory</span>
              </div>
              <span className="text-[10px] font-mono text-[#00F0D0] font-bold">ROSTER</span>
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(12);
                }
                onClose();
                navigate('/faq');
              }}
              className="w-full min-h-[42px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:bg-[#12151C] hover:text-[#00F0D0] border border-transparent hover:border-white/[0.08] cursor-pointer transition-all duration-150 active:scale-[0.97] select-none"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#00F0D0] shrink-0" />
                <span>Help Center & FAQs</span>
              </div>
              <span className="text-[10px] font-mono text-[#00F0D0] font-bold">24/7</span>
            </button>
          </div>
        </div>

        {/* Pinned Bottom / Safe Sign Out Bar (Never gets pushed off screen) */}
        <div className="pt-3 mt-3 border-t border-white/[0.08] shrink-0">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(12);
              }
              onSignOut();
            }}
            className="w-full min-h-[42px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#FF334B] hover:text-white bg-[#FF334B]/10 hover:bg-[#FF334B]/20 border border-[#FF334B]/30 hover:border-[#FF334B]/50 cursor-pointer transition-all duration-150 active:scale-[0.97] select-none"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileDropdown;
