'use client';

import React, { useState, useEffect } from 'react';
import { 
  CloudLightning, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertOctagon, 
  Radio, 
  Users, 
  ShieldAlert,
  ArrowRight,
  Sun,
  Loader2
} from 'lucide-react';
import { db } from '@/src/firebase/config';
import { 
  doc, 
  updateDoc, 
  writeBatch, 
  collection, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

export interface WeatherDelayAlertsProps {
  eventId: string;
  eventName?: string;
  activeGamesCount?: number;
  upcomingGamesCount?: number;
  onAlertBroadcasted?: (alert: AlertPayload) => void;
}

export interface AlertPayload {
  type: 'lightning' | 'rain' | 'maintenance' | 'general' | 'clear';
  minutesDelay: number;
  message: string;
  notifyCoaches: boolean;
  notifySpectators: boolean;
  shiftSchedule: boolean;
}

export default function WeatherDelayAlerts({
  eventId,
  eventName = 'Just One Play Summer Invitational',
  activeGamesCount = 4,
  upcomingGamesCount = 18,
  onAlertBroadcasted,
}: WeatherDelayAlertsProps) {
  // Alert settings state
  const [delayMinutes, setDelayMinutes] = useState<number>(30);
  const [incidentType, setIncidentType] = useState<'lightning' | 'rain' | 'maintenance' | 'general'>('lightning');
  const [customMessage, setCustomMessage] = useState(
    'Lightning detected within 10 miles. All fields are under mandatory 30-minute hold. Seek shelter immediately.'
  );
  const [notifyCoaches, setNotifyCoaches] = useState(true);
  const [notifySpectators, setNotifySpectators] = useState(true);
  const [shiftSchedule, setShiftSchedule] = useState(true);

  // Active status state
  const [isLiveIncident, setIsLiveIncident] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Listen to remote Firestore incident status in real-time
  useEffect(() => {
    if (!eventId) return;
    const eventRef = doc(db, 'events', eventId);
    const unsubscribe = onSnapshot(eventRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.activeAlert && data.activeAlert.isActive) {
          setIsLiveIncident(true);
          setCustomMessage(data.activeAlert.message || customMessage);
          setDelayMinutes(data.activeAlert.delayMinutes || 30);
        } else {
          setIsLiveIncident(false);
        }
      }
    }, (err) => {
      console.warn('Incident listener error:', err.message);
    });

    return () => unsubscribe();
  }, [eventId]);

  // Elapsed timer when incident is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLiveIncident) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLiveIncident]);

  // Preset selector helper
  const handlePresetSelect = (
    type: 'lightning' | 'rain' | 'maintenance' | 'general', 
    mins: number, 
    msg: string
  ) => {
    setIncidentType(type);
    setDelayMinutes(mins);
    setCustomMessage(msg);
  };

  // Broadcast Incident and Auto-Shift Downstream Fixtures in Firestore
  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      const payload: AlertPayload = {
        type: incidentType,
        minutesDelay: delayMinutes,
        message: customMessage,
        notifyCoaches,
        notifySpectators,
        shiftSchedule,
      };

      const batch = writeBatch(db);

      // 1. Update Parent Event Document
      const eventRef = doc(db, 'events', eventId);
      batch.update(eventRef, {
        activeAlert: {
          isActive: true,
          message: customMessage,
          type: incidentType,
          delayMinutes,
          issuedAt: serverTimestamp(),
        },
        statusAlert: customMessage,
        statusAlertType: incidentType === 'lightning' ? 'emergency' : 'warning',
        updatedAt: serverTimestamp()
      });

      // 2. If shiftSchedule is enabled, shift all unstarted games
      if (shiftSchedule && delayMinutes > 0) {
        const gamesRef = collection(db, 'events', eventId, 'games');
        const q = query(gamesRef, where('status', '==', 'upcoming'));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((gameDoc) => {
          const gameData = gameDoc.data();
          const currentStart = gameData.startDateTime || gameData.startTime;
          if (currentStart) {
            const currentMs = new Date(currentStart).getTime();
            if (!isNaN(currentMs)) {
              const shiftedMs = currentMs + delayMinutes * 60 * 1000;
              const shiftedDate = new Date(shiftedMs);
              batch.update(gameDoc.ref, {
                startDateTime: shiftedDate.toISOString(),
                startTime: shiftedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                updatedAt: serverTimestamp()
              });
            }
          }
        });
      }

      await batch.commit();

      if (onAlertBroadcasted) onAlertBroadcasted(payload);
      setIsLiveIncident(true);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Broadcast failed:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Resolve Incident & Issue All-Clear
  const handleResolveAlert = async () => {
    setIsBroadcasting(true);
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        'activeAlert.isActive': false,
        'activeAlert.resolvedAt': serverTimestamp(),
        statusAlert: null,
        updatedAt: serverTimestamp()
      });

      if (onAlertBroadcasted) {
        onAlertBroadcasted({
          type: 'clear',
          minutesDelay: 0,
          message: 'All clear. Regular play has resumed.',
          notifyCoaches: true,
          notifySpectators: true,
          shiftSchedule: false
        });
      }

      setIsLiveIncident(false);
    } catch (err) {
      console.error('Failed to clear incident:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const formatElapsed = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-black text-white p-4 sm:p-6 rounded-3xl border border-zinc-800 max-w-3xl mx-auto font-sans shadow-2xl space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio size={18} className="text-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Gameday Emergency Desk
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight">Weather & Schedule Delay Hub</h2>
        </div>
        <span className="text-xs font-mono bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-400">
          {eventName}
        </span>
      </div>

      {/* Active Incident Warning Card */}
      {isLiveIncident ? (
        <div className="p-5 bg-rose-950/40 border border-rose-500/50 rounded-2xl relative overflow-hidden space-y-3 shadow-[0_0_30px_rgba(244,63,94,0.15)] animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-xs font-black uppercase tracking-wider mb-1">
                <ShieldAlert size={16} />
                <span>Active Emergency Broadcast in Effect</span>
                <span className="font-mono text-zinc-400 font-normal">({formatElapsed(elapsedSeconds)})</span>
              </div>
              <p className="text-sm font-bold text-white mb-1">{customMessage}</p>
              <span className="text-xs font-mono text-rose-300/80">
                Schedule shifted by +{delayMinutes} mins across all fields.
              </span>
            </div>
            <button
              onClick={handleResolveAlert}
              disabled={isBroadcasting}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-xl transition flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {isBroadcasting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sun size={16} />
              )}
              <span>Issue All-Clear & Resume</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Presets */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-3">
              Incident Quick Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handlePresetSelect(
                    'lightning',
                    30,
                    'Lightning safety protocol active. All play is halted for 30 minutes. Clear fields and seek shelter.'
                  )
                }
                className={`p-3.5 rounded-2xl border text-left transition active:scale-95 cursor-pointer ${
                  incidentType === 'lightning'
                    ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'bg-zinc-950 border-zinc-800/80 hover:bg-zinc-900'
                }`}
              >
                <CloudLightning size={20} className="text-amber-400 mb-2" />
                <div className="text-sm font-bold text-white">Lightning (30m)</div>
                <div className="text-xs text-zinc-400 mt-0.5 font-mono">Mandatory field evacuation</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePresetSelect(
                    'rain',
                    15,
                    'Rain delay and field conditioning in progress. All remaining matches shifted back 15 minutes.'
                  )
                }
                className={`p-3.5 rounded-2xl border text-left transition active:scale-95 cursor-pointer ${
                  incidentType === 'rain'
                    ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'bg-zinc-950 border-zinc-800/80 hover:bg-zinc-900'
                }`}
              >
                <Clock size={20} className="text-teal-400 mb-2" />
                <div className="text-sm font-bold text-white">Rain / Turf Hold (15m)</div>
                <div className="text-xs text-zinc-400 mt-0.5 font-mono">Surface drying & prep</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handlePresetSelect(
                    'general',
                    45,
                    'Games running over schedule. All subsequent match tip-offs shifted back 45 minutes.'
                  )
                }
                className={`p-3.5 rounded-2xl border text-left transition active:scale-95 cursor-pointer ${
                  incidentType === 'general'
                    ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'bg-zinc-950 border-zinc-800/80 hover:bg-zinc-900'
                }`}
              >
                <AlertOctagon size={20} className="text-rose-400 mb-2" />
                <div className="text-sm font-bold text-white">Schedule Offset (45m)</div>
                <div className="text-xs text-zinc-400 mt-0.5 font-mono">Recover overrun match delays</div>
              </button>
            </div>
          </div>

          {/* Broadcast Message Composer */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              Broadcast Alert Message (Banner, App Push & SMS)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-amber-400 leading-relaxed resize-none font-mono"
            />
          </div>

          {/* Action Impact Preview & Toggles */}
          <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2 font-mono">
                Automated Impact Engine
              </span>
              <div className="space-y-1.5 text-xs text-zinc-300 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span><strong>{activeGamesCount}</strong> active games flagged for stoppage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span><strong>{upcomingGamesCount}</strong> upcoming games auto-shifted by +{delayMinutes}m</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2.5 border-t sm:border-t-0 sm:border-l border-zinc-800 sm:pl-4 pt-3 sm:pt-0 font-mono text-xs">
              <label className="flex items-center gap-2.5 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiftSchedule}
                  onChange={(e) => setShiftSchedule(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-teal-500 focus:ring-0"
                />
                <span>Auto-shift scheduled kickoff times (+{delayMinutes}m)</span>
              </label>

              <label className="flex items-center gap-2.5 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyCoaches}
                  onChange={(e) => setNotifyCoaches(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-teal-500 focus:ring-0"
                />
                <span>Priority SMS & Push to Head Coaches</span>
              </label>

              <label className="flex items-center gap-2.5 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySpectators}
                  onChange={(e) => setNotifySpectators(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-teal-500 focus:ring-0"
                />
                <span>In-App Banner to All Spectators</span>
              </label>
            </div>
          </div>

          {/* Primary Action Button */}
          <div>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition cursor-pointer"
            >
              <Send size={18} />
              <span>Review & Broadcast Alert to Venue</span>
            </button>
          </div>
        </>
      )}

      {/* Confirmation Lock Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl space-y-4">
            <AlertOctagon size={44} className="text-amber-400 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-white uppercase">Broadcast Venue Delay Alert?</h3>
              <p className="text-zinc-400 text-xs mt-1 font-mono">
                This will publish an emergency banner on all attendee screens and shift {upcomingGamesCount} downstream games by +{delayMinutes} minutes.
              </p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-left text-xs font-mono text-zinc-300">
              "{customMessage}"
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs uppercase font-mono transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={isBroadcasting}
                className="py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs uppercase font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <span>Confirm & Send</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
