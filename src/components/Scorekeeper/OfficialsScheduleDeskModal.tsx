import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Clock, DollarSign, Key, CheckCircle, AlertTriangle, Users, Phone, MapPin, Sparkles } from 'lucide-react';

interface OfficialsScheduleDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficialsScheduleDeskModal: React.FC<OfficialsScheduleDeskModalProps> = ({
  isOpen,
  onClose
}) => {
  const [officials, setOfficials] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOfficialForPin, setSelectedOfficialForPin] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchOfficials();
  }, [isOpen]);

  const fetchOfficials = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/officials/schedule');
      if (res.ok) {
        const data = await res.json();
        setOfficials(data.officials || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficialForPin || !pinInput) return;

    try {
      const res = await fetch('/api/officials/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialId: selectedOfficialForPin.id,
          pin: pinInput
        })
      });
      if (res.ok) {
        setPinSuccess(true);
        setPinError(null);
        setTimeout(() => {
          setPinSuccess(false);
          setSelectedOfficialForPin(null);
          setPinInput('');
          fetchOfficials();
        }, 1500);
      } else {
        setPinError('Invalid referee verification PIN.');
      }
    } catch (err) {
      setPinError('Network error checking in official.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-[#141D26] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-[#212A31] via-[#1a2530] to-[#212A31] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E5B868] to-[#d68a28] flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(229,184,104,0.4)]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Referees & Game Officials Dispatch Desk
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Live Court Assignments
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Track court assignments, stipend pay rates, and PIN verification check-ins
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/60 border-b border-slate-800">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Officials</span>
              <span className="text-xl font-black text-white">{officials.length || 3} Certified</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Active Courts</span>
              <span className="text-xl font-black text-[#00F2FE]">3 Simultaneous</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Avg Game Stipend</span>
              <span className="text-xl font-black text-amber-400">$55.00 / match</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Dispute Protocol</span>
              <span className="text-xl font-black text-emerald-400">Zero Incident</span>
            </div>
          </div>

          {/* Officials Schedule List */}
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {officials.map((official) => {
                const isCheckedIn = official.status.includes('Checked In');

                return (
                  <div
                    key={official.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-mono font-black">
                        {official.badgeNumber?.slice(-3) || 'REF'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{official.officialName}</h4>
                          <span className="text-[11px] font-mono text-slate-400">({official.badgeNumber})</span>
                        </div>
                        <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                          <span className="text-[#00F2FE] font-bold">{official.assignedCourt}</span>
                          <span>•</span>
                          <span className="text-slate-400">{official.matchup}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-left md:text-right">
                        <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 md:justify-end">
                          <Clock className="w-3 h-3" /> {official.gameTime}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 block">
                          Pay Rate: {official.payRate}
                        </span>
                      </div>

                      {isCheckedIn ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Checked In
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedOfficialForPin(official)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#00F2FE] hover:bg-[#38bdf8] text-slate-950 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,242,254,0.3)]"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Enter PIN</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PIN Verification Modal Sub-view */}
          {selectedOfficialForPin && (
            <div className="p-6 bg-slate-900 border-t border-slate-800">
              <form onSubmit={handleVerifyPin} className="max-w-md mx-auto space-y-4 text-center">
                <h4 className="text-sm font-black uppercase text-white">
                  Enter Referee Check-In PIN for {selectedOfficialForPin.officialName}
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Official badge #{selectedOfficialForPin.badgeNumber} • Court check-in
                </p>

                <div className="flex items-center justify-center gap-3">
                  <input
                    type="password"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••"
                    className="w-32 text-center tracking-[0.5em] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-lg font-mono font-black text-[#00F2FE] focus:outline-none focus:border-[#00F2FE]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:bg-emerald-400 cursor-pointer"
                  >
                    Verify & Check In
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOfficialForPin(null)}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {pinError && <p className="text-xs text-rose-400 font-mono">{pinError}</p>}
                {pinSuccess && <p className="text-xs text-emerald-400 font-mono">Official Checked In Successfully!</p>}
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Direct Referee Hotline: (555) 918-PLAY</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
            >
              Close Desk
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
