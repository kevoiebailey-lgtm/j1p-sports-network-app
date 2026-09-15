import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  AlertTriangle, 
  Radio, 
  CloudRain, 
  Clock, 
  Users, 
  Check, 
  Bell, 
  Smartphone, 
  Sparkles,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GameDayDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentName?: string;
}

export const GameDayDispatchModal: React.FC<GameDayDispatchModalProps> = ({
  isOpen,
  onClose,
  tournamentName
}) => {
  const [title, setTitle] = useState<string>('Championship Court Relocation');
  const [message, setMessage] = useState<string>(
    'Varsity 17U Championship moved to Court 1 (Main Stadium) for live stream broadcast. Warmups at 03:15 PM.'
  );
  const [level, setLevel] = useState<'urgent' | 'weather' | 'schedule' | 'info'>('urgent');
  const [targetAudience, setTargetAudience] = useState<string>('All Coaches & Attendees');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);

  const [dispatches, setDispatches] = useState<any[]>([
    {
      id: 'disp-1',
      title: 'Court 1 Live Stream Tip-Off',
      message: 'Court 1 championship game stream is now LIVE on Just1Play ESPN Hub.',
      level: 'schedule',
      sentAt: '12 mins ago',
      targetAudience: 'All Users',
      deliveredCount: 428
    },
    {
      id: 'disp-2',
      title: 'Warmup Time Extension',
      message: 'Court 3 will have a 5-minute warmup extension before 2nd round tip-off.',
      level: 'info',
      sentAt: '45 mins ago',
      targetAudience: 'Court 3 Teams',
      deliveredCount: 86
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/director/get-dispatches')
        .then(res => res.json())
        .then(data => {
          if (data.dispatches && data.dispatches.length > 0) {
            setDispatches(data.dispatches);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBroadcastAlert = async () => {
    if (!title || !message) return;
    setIsSending(true);
    setSentSuccess(null);

    try {
      const res = await fetch('/api/director/dispatch-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          level,
          targetAudience
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSentSuccess(data.message || `Dispatched alert to 420+ subscribers.`);
        if (data.dispatch) {
          setDispatches(prev => [data.dispatch, ...prev]);
        }
      }
    } catch (err) {
      console.warn('Dispatch broadcast error:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-[#12171E] border border-[#2D3748] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748] bg-[#161C22]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
                <span>DIRECTOR GAME-DAY DISPATCH DESK</span>
                <span className="text-[10px] bg-[#EF4444] text-white px-2 py-0.5 rounded font-black">
                  BROADCAST
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8] font-sans">
                Broadcast instant emergency alerts, schedule delays, and court shifts via push notification & SMS.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dispatch Composition Form */}
          <div className="bg-[#18212C] border border-[#2D3748] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#00F2FE] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Compose Urgent Broadcast</span>
            </h3>

            {/* Severity Level Buttons */}
            <div>
              <label className="block text-[11px] text-[#94A3B8] uppercase mb-1.5">Alert Level & Priority</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'urgent', label: '🚨 URGENT / SHIFT', color: 'border-[#EF4444] text-[#EF4444] bg-[#EF4444]/15' },
                  { key: 'schedule', label: '⏱️ SCHEDULE CHANGE', color: 'border-[#00F2FE] text-[#00F2FE] bg-[#00F2FE]/15' },
                  { key: 'weather', label: '⛈️ WEATHER DELAY', color: 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/15' },
                  { key: 'info', label: '📢 GENERAL INFO', color: 'border-[#10B981] text-[#10B981] bg-[#10B981]/15' }
                ].map((lvl) => (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() => setLevel(lvl.key as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      level === lvl.key
                        ? `${lvl.color} shadow-md`
                        : 'border-[#2D3748] text-[#94A3B8] bg-[#12171E] hover:text-white'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-[11px] text-[#94A3B8] uppercase mb-1.5">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full bg-[#12171E] border border-[#2D3748] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              >
                <option value="All Coaches & Attendees">All Coaches, Referees & Attendees (Entire Tournament)</option>
                <option value="Registered Head Coaches Only">Registered Head Coaches & Team Managers Only</option>
                <option value="College Scouts & Media">College Scouts & Media Press Pass Holders</option>
                <option value="Court 1 & 2 Teams">Active Stadium Court Teams (Courts 1 & 2)</option>
              </select>
            </div>

            {/* Title & Message Input */}
            <div>
              <label className="block text-[11px] text-[#94A3B8] uppercase mb-1.5">Broadcast Headline</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Championship Court 1 Shift..."
                className="w-full bg-[#12171E] border border-[#2D3748] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#94A3B8] uppercase mb-1.5">Dispatch Message Body (SMS / Push)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Type full instructions, court numbers, and revised tip-off times..."
                className="w-full bg-[#12171E] border border-[#2D3748] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            {sentSuccess && (
              <div className="p-3 bg-[#10B981]/20 border border-[#10B981]/40 rounded-xl text-xs text-[#10B981] flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{sentSuccess}</span>
              </div>
            )}

            {/* Broadcast Button */}
            <button
              onClick={handleBroadcastAlert}
              disabled={isSending || !title || !message}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#F87171] hover:to-[#B91C1C] text-white font-black text-xs transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isSending ? 'animate-bounce' : ''}`} />
              <span>{isSending ? 'Transmitting to 400+ Devices...' : 'Broadcast Instant Alert'}</span>
            </button>
          </div>

          {/* Previous Dispatches Feed */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Broadcast Activity Feed</span>
            </h3>

            {dispatches.map((disp) => (
              <div
                key={disp.id}
                className="bg-[#0F141A] border border-[#2D3748] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1E2630] border border-[#2D3748] text-[#00F2FE]">
                      {disp.targetAudience}
                    </span>
                    <span className="font-bold text-white">{disp.title}</span>
                  </div>
                  <p className="text-[#CBD5E1] font-sans mt-1 text-[11px]">{disp.message}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#10B981] font-bold block">
                    ✓ {disp.deliveredCount} DELIVERED
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block">{disp.sentAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#161C22] border-t border-[#2D3748] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            Close Dispatch Desk
          </button>
        </div>
      </motion.div>
    </div>
  );
};
