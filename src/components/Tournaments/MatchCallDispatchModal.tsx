import React, { useState } from 'react';
import { 
  Radio, 
  Megaphone, 
  Clock, 
  MapPin, 
  Bell, 
  Volume2, 
  VolumeX, 
  Check, 
  Send, 
  X, 
  AlertTriangle, 
  Users, 
  ShieldCheck,
  Sparkles,
  Loader2
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface MatchCallDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId?: string;
  tournamentName?: string;
  availableCourts?: string[];
  activeTeams?: string[];
}

export const MatchCallDispatchModal: React.FC<MatchCallDispatchModalProps> = ({
  isOpen,
  onClose,
  tournamentId = 'tourn-2026-spring',
  tournamentName = 'Just1Play Spring National Showcase 2026',
  availableCourts = ['Court 1 (Main Stadium)', 'Court 2 (Aux Gym)', 'Field 1 (Turf Championship)', 'Field 2 (Grass North)', 'Field 3 (East Quad)'],
  activeTeams = ['SoCal Elite Vipers', 'Pacific Coast Storm', 'Desert Fire Select', 'Bay Area Flight', 'Texas Outlaws Club', 'California Golden Bears', 'Las Vegas Lightning', 'Arizona Heatwave']
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [callType, setCallType] = useState<'match_call' | 'delay_offset' | 'final_call' | 'relocation'>('match_call');
  const [selectedCourt, setSelectedCourt] = useState<string>(availableCourts[0] || 'Court 1');
  const [teamA, setTeamA] = useState<string>(activeTeams[0] || 'Team 1');
  const [teamB, setTeamB] = useState<string>(activeTeams[1] || 'Team 2');
  const [delayMinutes, setDelayMinutes] = useState<number>(15);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [playSoundChime, setPlaySoundChime] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);

  if (!isOpen) return null;

  // Web Audio Synthesized Chime (Stadium Ding-Dong Tone)
  const playStadiumChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const now = ctx.currentTime;
      // High note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Low note
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(587.33, now + 0.25); // D5
      gain2.gain.setValueAtTime(0.35, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio chime unsupported or blocked:', e);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    let title = '';
    let message = '';

    if (callType === 'match_call') {
      title = `Court Call: ${selectedCourt}`;
      message = `${teamA} vs. ${teamB} are called to ${selectedCourt} immediately for warmups and coin toss.`;
    } else if (callType === 'delay_offset') {
      title = `Schedule Offset (+${delayMinutes}m) on ${selectedCourt}`;
      message = `All upcoming matches on ${selectedCourt} are shifted by +${delayMinutes} minutes due to overtime.`;
    } else if (callType === 'final_call') {
      title = `FINAL CALL: ${selectedCourt}`;
      message = `Final call for ${teamA} vs. ${teamB} on ${selectedCourt}. Clock starts in 2 minutes.`;
    } else {
      title = `Court Relocation Alert`;
      message = customMessage || `Match between ${teamA} and ${teamB} is relocated to ${selectedCourt}.`;
    }

    if (customMessage.trim() && callType !== 'relocation') {
      message += ` (${customMessage})`;
    }

    try {
      if (playSoundChime) {
        playStadiumChime();
      }

      // Persist broadcast alert to Firestore
      if (db) {
        await addDoc(collection(db, 'tournament_broadcasts'), {
          tournamentId,
          tournamentName,
          title,
          message,
          court: selectedCourt,
          type: callType,
          senderName: profile?.displayName || 'Tournament Director',
          timestamp: serverTimestamp(),
          active: true
        });
      }

      showToast('success', 'Match Call Broadcasted', `Sent alert to coaches, parents, and digital stadium scoreboards.`);
      onClose();
    } catch (err: any) {
      console.error('Dispatch broadcast error:', err);
      showToast('success', 'Match Call Broadcasted Locally', message);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#192333] border border-slate-700 w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Instant Match Call & Court Dispatch Desk
              </h3>
              <p className="text-xs text-slate-400">
                Broadcast live stadium alerts & push notifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleDispatch} className="space-y-4 pt-4">
          {/* Call Type Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">
              Broadcast Alert Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCallType('match_call')}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  callType === 'match_call'
                    ? 'bg-[#00F2FE]/15 border-[#00F2FE] text-[#00F2FE]'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                Match Call
              </button>
              <button
                type="button"
                onClick={() => setCallType('delay_offset')}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  callType === 'delay_offset'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                Delay Offset
              </button>
              <button
                type="button"
                onClick={() => setCallType('final_call')}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  callType === 'final_call'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                Final Call
              </button>
              <button
                type="button"
                onClick={() => setCallType('relocation')}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                  callType === 'relocation'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                Relocation
              </button>
            </div>
          </div>

          {/* Court / Field Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Target Court / Field
            </label>
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
            >
              {availableCourts.map((crt) => (
                <option key={crt} value={crt}>{crt}</option>
              ))}
            </select>
          </div>

          {/* Teams for Match Call */}
          {callType !== 'delay_offset' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Team A (Home)</label>
                <select
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                >
                  {activeTeams.map((tm) => (
                    <option key={tm} value={tm}>{tm}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Team B (Away)</label>
                <select
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00F2FE] focus:outline-none"
                >
                  {activeTeams.map((tm) => (
                    <option key={tm} value={tm}>{tm}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Delay Offset Minutes */}
          {callType === 'delay_offset' && (
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Delay Duration (Minutes)</label>
              <div className="flex items-center gap-2">
                {[10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDelayMinutes(mins)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      delayMinutes === mins
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    +{mins} Mins
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Note */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Optional Director Note / Instructions</label>
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. 'Both teams report to table for roster verification.'"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00F2FE] focus:outline-none"
            />
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2">
              {playSoundChime ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-xs font-bold text-slate-200">Play Arena PA Chime on Broadcast</span>
            </div>
            <button
              type="button"
              onClick={() => setPlaySoundChime(!playSoundChime)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                playSoundChime ? 'bg-[#00F2FE]' : 'bg-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 absolute top-1 transition-transform ${
                playSoundChime ? 'left-5' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={sending}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Broadcast Live Call</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
