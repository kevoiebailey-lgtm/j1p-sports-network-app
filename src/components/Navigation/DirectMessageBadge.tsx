import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Sparkles, User, ExternalLink, ChevronRight, Bell, BellRing, CheckCircle2 } from 'lucide-react';
import { useUnreadDirectMessages } from '../../hooks/useUnreadDirectMessages';
import { useAuth } from '../../context/AuthContext';
import { DirectMessagesModal } from '../Social/DirectMessagesModal';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { UserRole } from '../../types';

interface DirectMessageBadgeProps {
  className?: string;
  showText?: boolean;
  compact?: boolean;
  onOpenDMModal?: () => void;
}

export const DirectMessageBadge: React.FC<DirectMessageBadgeProps> = ({
  className = '',
  showText = false,
  compact = false,
  onOpenDMModal
}) => {
  const { user } = useAuth();
  const { unreadCount, unreadChats, hasUnread } = useUnreadDirectMessages();
  const { permission, requestPermission, loading: pushLoading } = usePushNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPreviewPopover, setShowPreviewPopover] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<{
    uid: string;
    name: string;
    avatar?: string;
    role?: UserRole;
  } | null>(null);

  const handleOpenInbox = (targetUser?: {
    uid: string;
    name: string;
    avatar?: string;
    role?: UserRole;
  } | null) => {
    setSelectedPartner(targetUser || null);
    setShowPreviewPopover(false);
    if (onOpenDMModal) {
      onOpenDMModal();
    } else {
      setIsModalOpen(true);
    }
  };

  // Format count for display (e.g. "9+" if > 9)
  const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

  // Pick the most recent unread chat for the quick peek popover
  const latestUnreadChat = unreadChats.length > 0 ? unreadChats[0] : null;
  const currentUid = user?.uid || '';
  const latestPartner = latestUnreadChat?.participants?.find(p => p.uid !== currentUid) || null;

  return (
    <>
      <div 
        className="relative inline-flex items-center shrink-0"
        onMouseEnter={() => {
          if (hasUnread) setShowPreviewPopover(true);
        }}
        onMouseLeave={() => setShowPreviewPopover(false)}
      >
        <button
          onClick={() => handleOpenInbox(null)}
          aria-label={hasUnread ? `Direct Messages (${unreadCount} unread)` : 'Direct Messages'}
          title={hasUnread ? `${unreadCount} unread direct message${unreadCount > 1 ? 's' : ''}` : 'Direct Messages'}
          className={`relative flex items-center justify-center h-9 w-9 sm:h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-lg sm:gap-2 font-bold text-xs transition-all cursor-pointer select-none group shrink-0 border ${
            hasUnread
              ? 'bg-[#263238] border-[#00B8D4]/70 text-white shadow-[0_0_18px_rgba(0,184,212,0.35)] hover:border-[#00B8D4]'
              : 'bg-slate-850 sm:bg-[#263238]/70 hover:bg-[#263238] border-slate-700/60 sm:border-[#24324F] hover:border-slate-500 text-slate-200 sm:text-slate-300 hover:text-white'
          } ${className}`}
        >
          {/* Message Icon with dynamic glow */}
          <div className="relative flex items-center justify-center">
            <MessageSquare 
              className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                hasUnread 
                  ? 'text-[#00B8D4] drop-shadow-[0_0_8px_rgba(0,184,212,0.8)]' 
                  : 'text-slate-400 group-hover:text-slate-200'
              }`} 
            />

            {/* Pulsing Beacon Ring when unread messages exist */}
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6A00] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6A00]" />
              </span>
            )}
          </div>

          {/* Optional Text Label */}
          {showText && (
            <span className="hidden sm:inline-block tracking-tight text-xs whitespace-nowrap">
              Messages
            </span>
          )}

          {/* Unread Count Pill Badge */}
          <AnimatePresence>
            {hasUnread && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-black text-slate-950 bg-gradient-to-r from-[#FF6A00] to-[#FFC857] rounded-full shadow-[0_0_8px_rgba(255,106,0,0.6)] ring-1 ring-white/30"
              >
                {displayCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Quick Unread Popover Preview (Desktop Hover) */}
        <AnimatePresence>
          {showPreviewPopover && hasUnread && latestUnreadChat && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-72 p-3 rounded-2xl bg-[#090D16] border border-[#00B8D4]/40 shadow-2xl z-50 backdrop-blur-xl pointer-events-auto"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#24324F]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00B8D4]" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-white">
                    Unread Direct Messages ({unreadCount})
                  </span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse" />
              </div>

              {latestPartner && (
                <div 
                  onClick={() => handleOpenInbox(latestPartner)}
                  className="p-2 rounded-xl bg-[#263238]/60 hover:bg-[#263238] border border-[#24324F] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <img 
                      src={latestPartner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} 
                      alt={latestPartner.name}
                      className="w-6 h-6 rounded-lg object-cover border border-cyan-500/40"
                    />
                    <span className="text-xs font-bold text-white group-hover:text-[#00B8D4] truncate">
                      {latestPartner.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-2 italic">
                    "{latestUnreadChat.lastMessage}"
                  </p>
                </div>
              )}

              <button
                onClick={() => handleOpenInbox(null)}
                className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-[#00B8D4] hover:bg-[#00F5D4] text-[#090D16] text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,184,212,0.3)] cursor-pointer"
              >
                <span>Open Messenger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Web Push Notification Quick Status */}
              <div className="mt-2 pt-2 border-t border-[#24324F] flex items-center justify-between text-[10px]">
                <span className="text-slate-400">DM Push Alerts:</span>
                {permission === 'granted' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requestPermission();
                    }}
                    disabled={pushLoading}
                    className="text-[#FF6A00] hover:text-[#FF8C00] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Bell className="w-3 h-3" /> {pushLoading ? 'Enabling...' : 'Enable'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Direct Messages Modal (Standalone instance if needed) */}
      <DirectMessagesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPartner(null);
        }}
        targetUser={selectedPartner}
      />
    </>
  );
};
