import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Zap, 
  Trophy, 
  Share2, 
  QrCode, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  TrendingUp,
  User,
  X,
  Camera,
  BarChart2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { INITIAL_ATHLETE_DOCS, INITIAL_TOURNAMENT_DOC } from '../../../lib/platformData';
import { QRCodeSVG } from 'qrcode.react';
import { LiveScoresTicker } from '../../LiveScoresTicker';
import { NotificationPermissionBanner } from '../../Common/NotificationPermissionBanner';
import { parseVideoUrl } from '../../../lib/videoParser';
import { useAuth } from '../../../context/AuthContext';
import { AthleteHighlightWidget } from '../../Dashboard/AthleteHighlightWidget';
import { GamedayHUD } from '../../Dashboard/GamedayHUD';

// Code Splitting & Lazy Modal Loading
const AvatarUploadModal = React.lazy(() => import('../../Profile/AvatarUploadModal').then(m => ({ default: m.AvatarUploadModal })));
const StatLoggerModal = React.lazy(() => import('../../Athletes/StatLoggerModal').then(m => ({ default: m.StatLoggerModal })));
const DigitalPassModal = React.lazy(() => import('../../Athletes/DigitalPassModal').then(m => ({ default: m.DigitalPassModal })));

export const AthleteHomeTab: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [athlete, setAthlete] = useState(INITIAL_ATHLETE_DOCS[0]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showStatLoggerModal, setShowStatLoggerModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Instant Push Alerts Banner */}
      <NotificationPermissionBanner />

      {/* Athlete Welcome Bar & Quick Pass Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div 
            onClick={() => setShowAvatarModal(true)}
            className="relative group cursor-pointer"
            title="Click to update profile avatar"
          >
            <img 
              src={profile?.photoURL || profile?.avatarUrl || athlete.avatarUrl} 
              alt={athlete.displayName} 
              className="w-13 h-13 rounded-xl object-cover border-2 border-[#00F5D4]/40 shadow-[0_0_15px_rgba(0,245,212,0.2)] group-hover:brightness-110 transition-all"
            />
            <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#00F5D4] transition-opacity">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {profile?.displayName || athlete.displayName}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-[#00F5D4] text-[10px] font-black uppercase">
                {athlete.jerseyNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {athlete.position} • {athlete.teamName} ({athlete.school})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            id="home-log-game-stats-btn"
            onClick={() => setShowStatLoggerModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_0_15px_rgba(0,184,212,0.4)] transition-all cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 text-slate-950" />
            <span>📊 Log Game Stats</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-md cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#00F5D4]" />
            <span>Digital ID Pass</span>
          </button>

          <button
            onClick={() => setIsCheckedIn(!isCheckedIn)}
            className={`flex items-center justify-center gap-1.5 min-h-[48px] px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg cursor-pointer ${
              isCheckedIn 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' 
                : 'bg-gradient-to-r from-[#00F5D4] to-[#00B8D4] text-slate-950 hover:brightness-110'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCheckedIn ? 'Checked In' : '1-Tap Check In'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Live Sports Scores Ticker */}
      <LiveScoresTicker initialLeague="ALL" />

      {/* 1-TAP IMMEDIATE CONTENT ACCESS: GAMEDAY TELEMETRY HUD */}
      <GamedayHUD 
        athleteId={profile?.uid || athlete.id}
        teamId={(athlete as any).teamId || (profile as any)?.teamId}
        teamName={athlete.teamName}
        userProfile={profile || athlete}
        onViewSchedule={() => navigate('/dashboard/athlete/schedule')}
      />

      {/* QUICK STAT SNAPSHOT & VERIFIED COMBINE METRICS BADGE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase mb-1">
            <span>40-Yd Dash</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#00F5D4]" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{athlete.metrics.dash40}s</div>
          <span className="text-[10px] text-emerald-400 font-bold">✓ Laser Verified</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase mb-1">
            <span>Vertical Jump</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{athlete.metrics.vertLeap}"</div>
          <span className="text-[10px] text-slate-400 font-medium">96th Percentile</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase mb-1">
            <span>Academic GPA</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{athlete.metrics.gpa}</div>
          <span className="text-[10px] text-indigo-300 font-medium">NCAA Eligible</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase mb-1">
            <span>Season Rating</span>
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="text-2xl font-black text-[#00F5D4] font-mono">{athlete.seasonStats.rating}</div>
          <span className="text-[10px] text-slate-400 font-medium">{athlete.seasonStats.pointsOrYards} Total Yds</span>
        </div>
      </div>

      {/* DYNAMIC ATHLETE HIGHLIGHT REEL WIDGET */}
      <AthleteHighlightWidget
        athleteId={profile?.uid || athlete.id}
        athlete={profile || athlete}
        onUploadFilmClick={() => navigate('/dashboard/athlete/film')}
      />

      {/* DIGITAL QR ID PASS MODAL (Lazy Loaded) */}
      <Suspense fallback={null}>
        <DigitalPassModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          athlete={{
            id: athlete.id,
            displayName: athlete.displayName,
            teamName: athlete.teamName,
            jerseyNumber: athlete.jerseyNumber,
            sport: athlete.sport
          }}
        />

        {/* Profile Avatar Upload Modal (Lazy Loaded) */}
        <AvatarUploadModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={profile?.photoURL || profile?.avatarUrl || athlete.avatarUrl}
        />

        {/* Universal Multi-Sport Stat Logger Modal (Lazy Loaded) */}
        <StatLoggerModal
          isOpen={showStatLoggerModal}
          onClose={() => setShowStatLoggerModal(false)}
          defaultSport={profile?.sport || 'basketball'}
          athleteId={profile?.uid}
        />
      </Suspense>

    </div>
  );
};

export default AthleteHomeTab;
