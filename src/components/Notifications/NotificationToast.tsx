import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Send, 
  Heart, 
  Calendar, 
  X, 
  Sparkles, 
  Check, 
  ExternalLink,
  Volume2,
  AtSign
} from 'lucide-react';
import { notificationService, ToastAlert } from '../../services/notificationService';

interface NotificationToastProps {
  onOpenDM?: (targetUid: string, targetName: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  onOpenDM,
  onNavigateToTab
}) => {
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    // Check browser notification permission status
    const status = notificationService.getPermissionStatus();
    setPermissionStatus(status);
    if (status === 'default') {
      setShowPermissionPrompt(true);
    }

    // Subscribe to toast alerts
    const unsubscribe = notificationService.subscribeToToast((newAlert) => {
      setToasts((prev) => [newAlert, ...prev.slice(0, 4)]); // Keep max 5 active toasts

      // Auto dismiss after 8 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newAlert.id));
      }, 8000);
    });

    return () => unsubscribe();
  }, []);

  const handleEnablePermissions = async () => {
    const granted = await notificationService.requestNotificationPermission();
    if (granted) {
      setPermissionStatus('granted');
      setShowPermissionPrompt(false);
    } else {
      setPermissionStatus('denied');
      setShowPermissionPrompt(false);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-[999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      
      {/* Optional Browser Notification Permission Request Banner */}
      {showPermissionPrompt && permissionStatus === 'default' && (
        <div className="pointer-events-auto bg-[#212A31]/95 border border-[#E5B868]/40 p-4 rounded-2xl shadow-[0_0_25px_rgba(214,28,36,0.2)] backdrop-blur-xl transition-all animate-slideDown">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-white text-xs tracking-wider uppercase flex items-center gap-1.5">
                <span>Real-Time Browser Alerts</span>
                <Sparkles className="w-3 h-3 text-[#E5B868]" />
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Get instant desktop & mobile browser notifications for new Direct Messages, Likes, and Event updates!
              </p>
              
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleEnablePermissions}
                  className="px-3 py-1.5 rounded-xl bg-[#E5B868] hover:bg-[#E5B868]/90 text-black font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-[0_0_15px_rgba(214,28,36,0.4)] cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enable Push Alerts</span>
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPermissionPrompt(false)}
              className="text-slate-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Toast Alerts List */}
      {toasts.map((toast) => {
        let IconComponent = Bell;
        let badgeStyle = 'bg-[#E5B868]/20 text-blue-400 border-blue-500/40';
        let borderColor = 'border-[#E5B868]/40';

        if (toast.type === 'dm') {
          IconComponent = Send;
          badgeStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
        } else if (toast.type === 'mention') {
          IconComponent = AtSign;
          badgeStyle = 'bg-amber-400/25 text-[#E5B868] border-[#E5B868]/60 shadow-[0_0_10px_rgba(229,184,104,0.4)]';
          borderColor = 'border-[#E5B868]';
        } else if (toast.type === 'like') {
          IconComponent = Heart;
          badgeStyle = 'bg-red-500/20 text-red-400 border-red-500/40';
        } else if (toast.type === 'event_update') {
          IconComponent = Calendar;
          badgeStyle = 'bg-red-600/20 text-[#E5B868] border-[#E5B868]/40';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative p-3.5 rounded-2xl bg-[#212A31]/95 border ${borderColor} shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all animate-slideLeft`}
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <img
                  src={toast.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={toast.senderName}
                  className="w-10 h-10 rounded-xl object-cover border border-white/20"
                />
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border ${badgeStyle}`}>
                  <IconComponent className="w-2.5 h-2.5" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase text-[#E5B868] tracking-wider">
                    {toast.type === 'dm' ? 'Direct Message' : toast.type === 'mention' ? '⚡ Mentioned You' : toast.type === 'like' ? 'Post Liked' : 'Scheduled Event Update'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Just now</span>
                </div>

                <h5 className="font-black text-xs text-white truncate mt-0.5">{toast.title}</h5>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                  {toast.message}
                </p>

                {/* Quick Interactive Actions */}
                <div className="mt-2.5 flex items-center gap-2">
                  {toast.type === 'dm' && onOpenDM && toast.linkId && (
                    <button
                      onClick={() => {
                        onOpenDM(toast.linkId!, toast.senderName);
                        removeToast(toast.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#E5B868] text-black font-black text-[10px] uppercase tracking-wider transition-all hover:bg-[#E5B868]/90 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Reply DM</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {toast.type === 'mention' && onNavigateToTab && (
                    <button
                      onClick={() => {
                        onNavigateToTab('social');
                        removeToast(toast.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#E5B868] text-black font-black text-[10px] uppercase tracking-wider transition-all hover:bg-[#E5B868]/90 flex items-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(229,184,104,0.3)]"
                    >
                      <span>View Mention</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {toast.type === 'event_update' && onNavigateToTab && (
                    <button
                      onClick={() => {
                        onNavigateToTab('events');
                        removeToast(toast.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#E5B868] text-black font-black text-[10px] uppercase tracking-wider transition-all hover:bg-[#E5B868]/90 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Event</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {toast.type === 'like' && onNavigateToTab && (
                    <button
                      onClick={() => {
                        onNavigateToTab('social');
                        removeToast(toast.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Post</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={() => removeToast(toast.id)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-500 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
