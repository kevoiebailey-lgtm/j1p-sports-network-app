import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Heart, 
  MessageSquare, 
  UserPlus, 
  Sparkles, 
  CheckCheck, 
  Trash2, 
  Send, 
  ExternalLink, 
  Flame, 
  Check, 
  Calendar,
  AtSign,
  Radio
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  safeUpdateDoc, 
  safeDeleteDoc, 
  safeAddDoc, 
  isFirestoreQuotaExceeded,
  createBatchWriter
} from '../../lib/firestoreQuotaGuard';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { AppNotification } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDM?: (targetUid: string, targetName: string) => void;
  onNavigateToFeed?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenDM,
  onNavigateToFeed
}) => {
  const { user, profile } = useAuth();
  const currentUid = user?.uid || profile?.uid;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'dm' | 'scores' | 'social'>('all');
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    setPushStatus(notificationService.getPermissionStatus());
  }, [isOpen]);

  const handleEnablePush = async () => {
    const granted = await notificationService.requestNotificationPermission(currentUid);
    setPushStatus(granted ? 'granted' : 'denied');
  };

  // Firestore Real-time Listener for user notifications
  useEffect(() => {
    if (!currentUid || !db) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', currentUid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const fetchedNotifs: AppNotification[] = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          })) as AppNotification[];
          setNotifications(fetchedNotifs);
        } else {
          setNotifications([]);
        }
        setLoading(false);
      }, (err) => {
        console.warn('Firestore notification query note:', err);
        setNotifications([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Notification setup note:', err);
      setNotifications([]);
      setLoading(false);
    }
  }, [currentUid]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    try {
      if (!id.startsWith('notif-') && !isFirestoreQuotaExceeded()) {
        await safeUpdateDoc(doc(db, 'notifications', id), { read: true });
      }
    } catch (err) {
      console.warn('Error marking notification read:', err);
    }
  };

  // Mark all as read with atomic batch writer
  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      if (!isFirestoreQuotaExceeded() && db) {
        const unread = notifications.filter(n => !n.read && !n.id.startsWith('notif-'));
        if (unread.length > 0) {
          const batchWriter = createBatchWriter();
          unread.forEach(item => {
            batchWriter.update(doc(db, 'notifications', item.id), { read: true });
          });
          await batchWriter.commit();
        }
      }
    } catch (err) {
      console.warn('Error marking all read:', err);
    }
  };

  // Clear single notification
  const handleClearNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));

    try {
      if (!id.startsWith('notif-') && !isFirestoreQuotaExceeded()) {
        await safeDeleteDoc(doc(db, 'notifications', id));
      }
    } catch (err) {
      console.warn('Error deleting notification:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'mentions') return n.type === 'mention';
    if (filter === 'dm') return n.type === 'dm';
    if (filter === 'scores') return n.type === 'score_update';
    if (filter === 'social') return n.type === 'like' || n.type === 'comment' || n.type === 'follow' || n.type === 'mention';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const mentionsCount = notifications.filter(n => n.type === 'mention').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fadeIn" 
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#212A31] border-l border-white/15 shadow-2xl flex flex-col transform transition-all animate-slideLeft">
          
          {/* Header */}
          <div className="p-5 border-b border-white/10 bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868]">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E5B868] text-black font-black text-[9px] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-black text-white text-base tracking-wide uppercase">Notification Hub</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono">FCM Push & Social Alerts</span>
                  {pushStatus === 'granted' ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <Radio className="w-2.5 h-2.5 animate-pulse" />
                      <span>FCM Push Active</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleEnablePush}
                      className="inline-flex items-center gap-1 text-[9px] font-black text-[#E5B868] bg-[#E5B868]/15 hover:bg-[#E5B868]/25 px-2 py-0.5 rounded-full border border-[#E5B868]/40 uppercase tracking-wider cursor-pointer"
                    >
                      <Bell className="w-2.5 h-2.5" />
                      <span>Enable Push</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions & Filters Bar */}
          <div className="p-3 bg-black/20 border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'unread', label: `Unread (${unreadCount})` },
                  { id: 'mentions', label: `Mentions ${mentionsCount > 0 ? `(${mentionsCount})` : ''}` },
                  { id: 'dm', label: 'DMs' },
                  { id: 'scores', label: 'Scores' },
                  { id: 'social', label: 'Social' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                      filter === f.id
                        ? 'bg-[#E5B868] text-black shadow-[0_0_10px_rgba(229,184,104,0.3)]'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-[#E5B868] hover:underline flex items-center gap-1 ml-2 whitespace-nowrap cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark Read</span>
                </button>
              )}
            </div>

            {/* Real-time Alerts Diagnostic Bar */}
            <div className="pt-1 border-t border-white/5">
              <p className="text-[9px] text-slate-400 font-mono font-bold mb-1 uppercase tracking-wider">Test Live Alerts & FCM Push:</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    notificationService.sendDirectMessageAlert({
                      recipientUid: currentUid,
                      senderUid: 'scout-vance',
                      senderName: 'Coach Marcus Vance',
                      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
                      message: 'Hey Jordan! Are you available for a phone evaluation this Thursday?'
                    });
                  }}
                  className="py-1 px-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase tracking-tight flex items-center justify-center gap-1 transition-all cursor-pointer truncate"
                >
                  <Send className="w-2.5 h-2.5 shrink-0" />
                  <span>+ Test DM</span>
                </button>

                <button
                  onClick={() => {
                    notificationService.sendMentionAlert({
                      recipientUid: currentUid,
                      senderUid: 'coach-jordan',
                      senderName: 'Coach Jordan Rivera',
                      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
                      postId: 'post-showcase-101',
                      postContentSnippet: 'Check out the game-winning touchdown replay! Elite arm mechanics.'
                    });
                  }}
                  className="py-1 px-1.5 rounded-lg bg-[#E5B868]/15 hover:bg-[#E5B868]/25 border border-[#E5B868]/40 text-[#E5B868] text-[9px] font-bold uppercase tracking-tight flex items-center justify-center gap-1 transition-all cursor-pointer truncate"
                >
                  <AtSign className="w-2.5 h-2.5 shrink-0" />
                  <span>+ Test Mention</span>
                </button>

                <button
                  onClick={() => {
                    notificationService.sendLikeAlert({
                      recipientUid: currentUid,
                      senderUid: 'scout-maya',
                      senderName: 'Maya Lin (Scout)',
                      senderAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
                      postId: 'post-hudl-1',
                      postTitle: '40-Yard Dash Combine Highlight'
                    });
                  }}
                  className="py-1 px-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[9px] font-bold uppercase tracking-tight flex items-center justify-center gap-1 transition-all cursor-pointer truncate"
                >
                  <Heart className="w-2.5 h-2.5 shrink-0" />
                  <span>+ Test Like</span>
                </button>
              </div>

              {/* Real-time score test push trigger */}
              <div className="mt-1.5">
                <button
                  onClick={() => {
                    notificationService.sendScoreAlert({
                      recipientUid: currentUid,
                      gameId: 'g-demo-101',
                      homeTeam: 'Miami Central Express',
                      homeScore: 28,
                      awayTeam: 'Orlando Speed Knights',
                      awayScore: 24,
                      period: 'Q4 02:15',
                      highlight: 'Touchdown Interception Return!',
                      status: 'LIVE'
                    });
                  }}
                  className="w-full py-1 px-2 rounded-lg bg-[#00B8D4]/15 hover:bg-[#00B8D4]/25 border border-[#00B8D4]/40 text-[#00B8D4] text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Radio className="w-3 h-3 text-[#00B8D4]" />
                  <span>+ Dispatch Live Score Push Alert</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => {
                const isUnread = !notif.read;

                let IconComponent = Bell;
                let iconBg = 'bg-[#E5B868]/20 text-slate-300 border-cyan-500/30';

                if (notif.type === 'like') {
                  IconComponent = Heart;
                  iconBg = 'bg-red-500/20 text-red-400 border-red-500/30';
                } else if (notif.type === 'mention') {
                  IconComponent = AtSign;
                  iconBg = 'bg-amber-400/25 text-[#E5B868] border-[#E5B868]/60';
                } else if (notif.type === 'comment') {
                  IconComponent = MessageSquare;
                  iconBg = 'bg-[#E5B868]/20 text-[#E5B868] border-[#E5B868]/30';
                } else if (notif.type === 'dm') {
                  IconComponent = Send;
                  iconBg = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                } else if (notif.type === 'follow') {
                  IconComponent = UserPlus;
                  iconBg = 'bg-[#E5B868]/20 text-slate-300 border-cyan-500/30';
                } else if (notif.type === 'score_update') {
                  IconComponent = Radio;
                  iconBg = 'bg-[#00B8D4]/20 text-[#00B8D4] border-[#00B8D4]/40';
                }

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      handleMarkAsRead(notif.id);
                      if (notif.type === 'dm' && onOpenDM) {
                        onOpenDM(notif.senderUid, notif.senderName);
                        onClose();
                      } else if (onNavigateToFeed) {
                        onNavigateToFeed();
                        onClose();
                      }
                    }}
                    className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isUnread
                        ? 'bg-[#E5B868]/10 border-[#E5B868]/40 text-white shadow-[0_0_15px_rgba(229,184,104,0.1)]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Avatar or Icon */}
                      <div className="relative">
                        <img
                          src={notif.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={notif.senderName}
                          className="w-10 h-10 rounded-xl object-cover border border-white/20"
                        />
                        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border ${iconBg}`}>
                          <IconComponent className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-black uppercase text-[#E5B868] tracking-wider">
                            {notif.type === 'dm' ? 'Direct Message' : notif.type === 'mention' ? '⚡ Mentioned You' : notif.type === 'like' ? 'Post Liked' : notif.type === 'score_update' ? '⚡ Live Score Update' : 'Social Alert'}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono whitespace-nowrap">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-white truncate mt-0.5">{notif.title || notif.senderName}</h4>

                        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                          {notif.message}
                        </p>

                        {/* Action hints */}
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          {notif.type === 'dm' ? (
                            <span className="text-[#E5B868] font-bold flex items-center gap-1 hover:underline">
                              <span>Reply via Direct Message</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          ) : notif.type === 'mention' ? (
                            <span className="text-[#E5B868] font-bold flex items-center gap-1 hover:underline">
                              <span>Open Mentioned Highlight</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          ) : notif.type === 'score_update' ? (
                            <span className="text-[#00B8D4] font-bold flex items-center gap-1 hover:underline">
                              <span>View Live Match Game</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono flex items-center gap-1">
                              <span>View on Social Feed</span>
                            </span>
                          )}

                          <button
                            onClick={(e) => handleClearNotif(notif.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                            title="Dismiss notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2 italic">
                <Bell className="w-10 h-10 text-slate-600 opacity-50" />
                <p className="text-xs">No notifications in this filter.</p>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="p-4 bg-black/40 border-t border-white/10 text-center text-[10px] text-slate-500 font-mono">
            Firebase Cloud Messaging & Firestore Push Engine Active
          </div>

        </div>
      </div>
    </div>
  );
};
