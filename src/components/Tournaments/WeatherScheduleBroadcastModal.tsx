import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Bell, 
  CloudRain, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  ShieldCheck, 
  X,
  Radio,
  Sparkles
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

interface TournamentAlert {
  id?: string;
  title: string;
  body: string;
  type: 'weather' | 'schedule_delay' | 'field_change' | 'general';
  fieldAffected?: string;
  division?: string;
  timestamp?: any;
  sentBy: string;
}

interface WeatherScheduleBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentTitle?: string;
}

export const WeatherScheduleBroadcastModal: React.FC<WeatherScheduleBroadcastModalProps> = ({
  isOpen,
  onClose,
  tournamentTitle = 'Just1Play National Championship Showcase'
}) => {
  const [alertType, setAlertType] = useState<'weather' | 'schedule_delay' | 'field_change' | 'general'>('weather');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [fieldAffected, setFieldAffected] = useState('All Fields');
  const [division, setDivision] = useState('All Divisions');
  const [isSending, setIsSending] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<TournamentAlert[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quick Preset Templates
  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'lightning_delay':
        setAlertType('weather');
        setTitle('⚡ Lightning Delay: 30-Minute Stoppage');
        setBody('All games suspended immediately due to lightning proximity within 8 miles. Clear all fields and proceed to indoor shelter. Resumption time will be announced.');
        setFieldAffected('All Fields (1-8)');
        break;
      case 'field_moved':
        setAlertType('field_change');
        setTitle('🏟️ Field Assignment Relocation');
        setBody('Field 3 has been moved to Field 6 Turf B due to drainage conditions. Upcoming matches check in 15 mins prior.');
        setFieldAffected('Field 3 -> Field 6');
        break;
      case 'bracket_delayed':
        setAlertType('schedule_delay');
        setTitle('⏱️ Bracket Schedule Adjusted (+45 Mins)');
        setBody('All semifinal and championship match starts are pushed back 45 minutes. Revised official bracket times are live now.');
        setDivision('Varsity & JV Championship');
        break;
      case 'hydration_break':
        setAlertType('weather');
        setTitle('☀️ Heat Advisory Hydration Protocol');
        setBody('Mandatory 2-minute water stoppages enforced at the midpoint of each half for athlete safety.');
        setFieldAffected('All Fields');
        break;
      default:
        break;
    }
  };

  // Live Snapshot of Recent Dispatched Alerts
  useEffect(() => {
    if (!isOpen) return;

    const alertsCol = collection(db, 'tournamentAlerts');
    const q = query(alertsCol, orderBy('timestamp', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TournamentAlert[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as TournamentAlert);
      });
      setRecentAlerts(items);
    }, (err) => {
      console.warn('Tournament alert snapshot fallback:', err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setIsSending(true);

    try {
      // 1. Write to Firestore `tournamentAlerts` collection
      await addDoc(collection(db, 'tournamentAlerts'), {
        title: title.trim(),
        body: body.trim(),
        type: alertType,
        fieldAffected,
        division,
        sentBy: 'Tournament Director Control Desk',
        tournamentTitle,
        timestamp: serverTimestamp()
      });

      // 2. Trigger native browser Notification if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico'
        });
      }

      setSuccessToast(`Dispatched alert: "${title}" to athletes, coaches, and recruiters.`);
      setTitle('');
      setBody('');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to send tournament broadcast:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#090D16] border border-[#00F2FE]/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,242,254,0.25)] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#121A26] border-b border-[#24324F]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <CloudRain className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-mono uppercase tracking-wider">
                Emergency Weather &amp; Schedule Broadcast Console
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Instant SMS / Push Notifications to Coaches, Athletes &amp; Spectators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {successToast && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-xs text-emerald-300 font-mono font-bold flex items-center gap-2 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00F2FE]" />
              <span>Quick Dispatch Presets</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('lightning_delay')}
                className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left text-xs font-mono cursor-pointer transition-all"
              >
                <div className="font-bold text-amber-300">⚡ Lightning Delay</div>
                <div className="text-[10px] text-slate-400">30-min halt</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('field_moved')}
                className="p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-left text-xs font-mono cursor-pointer transition-all"
              >
                <div className="font-bold text-cyan-300">🏟️ Field Move</div>
                <div className="text-[10px] text-slate-400">Relocate field</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('bracket_delayed')}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-left text-xs font-mono cursor-pointer transition-all"
              >
                <div className="font-bold text-rose-300">⏱️ Time Shift</div>
                <div className="text-[10px] text-slate-400">+45 mins shift</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('hydration_break')}
                className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left text-xs font-mono cursor-pointer transition-all"
              >
                <div className="font-bold text-emerald-300">☀️ Heat Protocol</div>
                <div className="text-[10px] text-slate-400">Mandatory water</div>
              </button>
            </div>
          </div>

          {/* Broadcast Form */}
          <form onSubmit={handleBroadcast} className="space-y-4 p-5 rounded-2xl bg-[#121A26] border border-[#24324F]">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Alert Category</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as any)}
                  className="w-full bg-[#090D16] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00F2FE]"
                >
                  <option value="weather">⛈️ Severe Weather / Delay</option>
                  <option value="field_change">🏟️ Field / Venue Relocation</option>
                  <option value="schedule_delay">⏱️ Bracket Schedule Time Delay</option>
                  <option value="general">📢 General Tournament Bulletin</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Affected Fields</label>
                <input
                  type="text"
                  value={fieldAffected}
                  onChange={(e) => setFieldAffected(e.target.value)}
                  placeholder="e.g. All Fields, Field 2 & 4"
                  className="w-full bg-[#090D16] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00F2FE]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Target Division</label>
                <input
                  type="text"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  placeholder="e.g. All Divisions, 14U Girls"
                  className="w-full bg-[#090D16] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00F2FE]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Notification Headline</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ⚡ Weather Stoppage: Play Suspended for 30 Minutes"
                className="w-full bg-[#090D16] border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-[#00F2FE]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Detailed Message / Instructions</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Specify shelter instructions, updated resumption ETAs, or modified game times..."
                className="w-full bg-[#090D16] border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-[#00F2FE]"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Broadcasting to ~450 Verified Registered Phones &amp; In-App Feeds</span>
              </div>

              <button
                type="submit"
                disabled={isSending || !title.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#00F2FE] hover:bg-cyan-400 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'SENDING BROADCAST...' : 'FIRE PUSH NOTIFICATION'}</span>
              </button>
            </div>

          </form>

          {/* Recent Broadcast History */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Dispatched Broadcast Log
            </h4>
            
            {recentAlerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#121A26] border border-slate-800 text-center text-xs font-mono text-slate-500">
                No emergency bulletins dispatched yet today. System standby.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {recentAlerts.map((alert, idx) => (
                  <div key={alert.id || idx} className="p-3 rounded-xl bg-[#121A26] border border-slate-800 flex items-start justify-between gap-3 text-xs font-mono">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{alert.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">
                          {alert.fieldAffected || 'All Fields'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{alert.body}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">Live</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
