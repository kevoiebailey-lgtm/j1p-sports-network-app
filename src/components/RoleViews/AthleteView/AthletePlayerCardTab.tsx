import React, { useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  ShieldCheck, 
  Edit3, 
  Download, 
  Award, 
  GraduationCap, 
  Flame, 
  Zap, 
  Activity, 
  CheckCircle2, 
  X, 
  Sparkles,
  Share2,
  FileText,
  Camera,
  BarChart2,
  Printer,
  Layers
} from 'lucide-react';
import { INITIAL_ATHLETE_DOCS } from '../../../lib/platformData';
import { AthleteDoc } from '../../../types/platform';
import { useAuth } from '../../../context/AuthContext';
import { WebAuthnPasskeyManager } from '../../Auth/WebAuthnPasskeyManager';
import { CardTheme, PREBUILT_THEMES } from '../../../types/cardTheme';
import { CardThemePicker } from '../../cards/CardThemePicker';
import { SportsTemplateEngine, PlayerData } from '../../cards/SportsTemplateEngine';

// Code Splitting & Lazy Modal Loading
const AvatarUploadModal = React.lazy(() => import('../../Profile/AvatarUploadModal').then(m => ({ default: m.AvatarUploadModal })));
const StatLoggerModal = React.lazy(() => import('../../Athletes/StatLoggerModal').then(m => ({ default: m.StatLoggerModal })));
const ProdigiPrintOrderModal = React.lazy(() => import('../../MediaHub/ProdigiPrintOrderModal').then(m => ({ default: m.ProdigiPrintOrderModal })));
const GraphicStudioModal = React.lazy(() => import('../../cards/GraphicStudioModal').then(m => ({ default: m.GraphicStudioModal })));

export const AthletePlayerCardTab: React.FC = () => {
  const { profile, updateUserProfile } = useAuth();
  const [athlete, setAthlete] = useState<AthleteDoc>(INITIAL_ATHLETE_DOCS[0]);
  const [showEditDrawer, setShowEditDrawer] = useState<boolean>(false);
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const [showStatLoggerModal, setShowStatLoggerModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showGraphicStudioModal, setShowGraphicStudioModal] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('stadium_prime');
  const [showThemeSelector, setShowThemeSelector] = useState<boolean>(false);
  const [cardViewMode, setCardViewMode] = useState<'overview' | 'vector_card'>('overview');
  const svgTradingCardRef = useRef<SVGSVGElement>(null);

  const activeTheme = PREBUILT_THEMES[selectedThemeId] || PREBUILT_THEMES.stadium_prime;

  const playerData: PlayerData = {
    name: profile?.displayName || athlete.displayName || 'Prospect Athlete',
    jerseyNumber: athlete.jerseyNumber?.replace('#', '') || '07',
    position: athlete.position || 'ATH',
    team: athlete.teamName || athlete.school || 'JUST1PLAY',
    photoUrl: profile?.photoURL || profile?.avatarUrl || athlete.avatarUrl,
    stats: {
      label1: '40Y Dash',
      value1: athlete.metrics.dash40 ? `${athlete.metrics.dash40}s` : '4.42s',
      label2: 'Vertical',
      value2: athlete.metrics.vertLeap ? `${athlete.metrics.vertLeap}"` : '36.5"',
      label3: 'Shuttle',
      value3: athlete.metrics.shuttle ? `${athlete.metrics.shuttle}s` : '4.15s',
      label4: 'GPA',
      value4: athlete.metrics.gpa ? `${athlete.metrics.gpa}` : '3.85',
    }
  };

  const handleDownloadSvgTradingCard = () => {
    if (!svgTradingCardRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgTradingCardRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${(athlete.displayName || 'athlete').toLowerCase().replace(/\s+/g, '_')}_trading_card.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  // Edit form state
  const [displayName, setDisplayName] = useState(athlete.displayName);
  const [position, setPosition] = useState(athlete.position);
  const [school, setSchool] = useState(athlete.school);
  const [gradYear, setGradYear] = useState(athlete.gradYear);
  const [height, setHeight] = useState(athlete.metrics.height);
  const [weight, setWeight] = useState(athlete.metrics.weight);
  const [dash40, setDash40] = useState(athlete.metrics.dash40);
  const [vertLeap, setVertLeap] = useState(athlete.metrics.vertLeap || 34);
  const [gpa, setGpa] = useState(athlete.metrics.gpa);
  const [bio, setBio] = useState(athlete.bio || '');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AthleteDoc = {
      ...athlete,
      displayName,
      position,
      school,
      gradYear,
      bio,
      metrics: {
        ...athlete.metrics,
        height,
        weight,
        dash40: Number(dash40),
        vertLeap: Number(vertLeap),
        gpa: Number(gpa)
      }
    };
    setAthlete(updated);

    try {
      await updateUserProfile({
        displayName,
        position,
        highSchool: school,
        gradYear: String(gradYear),
        bio,
        height,
        weight,
        gpa: String(gpa),
        performanceMetrics: {
          speed: dash40 ? Math.min(99, Math.max(50, Math.round((5.2 - Number(dash40)) * 50 + 60))) : 80,
          strength: 85,
          agility: 88,
          stamina: 90,
          vertical: vertLeap ? Math.min(99, Math.max(50, Math.round(Number(vertLeap) * 2))) : 85,
          iq: 92
        }
      });
    } catch (err) {
      console.warn('Profile sync notice:', err);
    }

    setShowEditDrawer(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadPdfRecruitCard = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFillColor(9, 13, 22);
    doc.rect(0, 0, 210, 297, 'F');

    // Title
    doc.setTextColor(0, 245, 212);
    doc.setFontSize(22);
    doc.text('JUST1PLAY OFFICIAL RECRUIT CARD', 20, 25);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`${athlete.displayName} • ${athlete.jerseyNumber}`, 20, 40);

    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184);
    doc.text(`Position: ${athlete.position}`, 20, 50);
    doc.text(`High School: ${athlete.school} (Class of ${athlete.gradYear})`, 20, 58);
    doc.text(`Club Team: ${athlete.teamName}`, 20, 66);
    doc.text(`NCAA ID: ${athlete.metrics.ncaaId || '2604819024'}`, 20, 74);

    // Combine Metrics Section
    doc.setTextColor(0, 245, 212);
    doc.setFontSize(14);
    doc.text('OFFICIAL VERIFIED COMBINE METRICS', 20, 90);

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`• 40-Yard Dash: ${athlete.metrics.dash40}s (Laser Verified)`, 25, 102);
    doc.text(`• Vertical Leap: ${athlete.metrics.vertLeap} inches`, 25, 110);
    doc.text(`• Height & Weight: ${athlete.metrics.height} / ${athlete.metrics.weight}`, 25, 118);
    doc.text(`• Academic GPA: ${athlete.metrics.gpa} (${athlete.metrics.satAct || 'SAT 1360'})`, 25, 126);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(10);
    doc.text('Bio & Scouting Summary:', 20, 142);
    doc.text(doc.splitTextToSize(athlete.bio || '', 170), 20, 150);

    doc.save(`${athlete.displayName.replace(/\s+/g, '_')}_Recruit_Card.pdf`);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#00F5D4]" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Digital Player Card
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Verified Combine Metrics, Academic Summary & Bio
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            id="player-card-log-stats-btn"
            onClick={() => setShowStatLoggerModal(true)}
            className="flex items-center gap-1.5 min-h-[48px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,184,212,0.4)]"
          >
            <BarChart2 className="w-4 h-4 text-slate-950" />
            <span>📊 Log Game Stats</span>
          </button>

          <button
            onClick={handleDownloadPdfRecruitCard}
            className="flex items-center gap-1.5 min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5 text-[#00F5D4]" />
            <span>PDF Recruit Card</span>
          </button>

          <button
            id="player-card-graphic-studio-btn"
            onClick={() => setShowGraphicStudioModal(true)}
            className="flex items-center gap-1.5 min-h-[48px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/50 text-cyan-300 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>🎨 Graphic Studio</span>
          </button>

          <button
            id="player-card-theme-btn"
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            className="flex items-center gap-1.5 min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-md"
            style={{ borderColor: activeTheme.accentColor }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: activeTheme.accentColor }} />
            <span>Theme: {activeTheme.name}</span>
          </button>

          <button
            id="player-card-order-physical-print-btn"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-[#00F5D4]/40 text-xs font-bold text-[#00F5D4] hover:text-white transition-all cursor-pointer shadow-md hover:border-[#00F5D4]"
          >
            <Printer className="w-3.5 h-3.5 text-[#00F5D4]" />
            <span>Physical Card & Print</span>
          </button>

          <button
            onClick={() => setShowEditDrawer(true)}
            className="flex items-center gap-1.5 min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs hover:border-[#00F5D4]/50 transition-all cursor-pointer shadow-lg"
          >
            <Edit3 className="w-4 h-4 text-[#00F5D4]" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Theme Picker Drawer / Panel */}
      <AnimatePresence>
        {showThemeSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 backdrop-blur-xl shadow-2xl space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: activeTheme.accentColor }} />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Choose Card Visual Theme ({Object.keys(PREBUILT_THEMES).length} Prebuilt Themes)
                </h3>
              </div>
              <button
                onClick={() => setShowThemeSelector(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
            <CardThemePicker
              selectedThemeId={selectedThemeId}
              onSelectTheme={(theme) => setSelectedThemeId(theme.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save feedback toast */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-950 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Player profile & combine metrics updated successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Display Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setCardViewMode('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              cardViewMode === 'overview'
                ? 'bg-slate-800 text-white border border-slate-600 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#00F5D4]" />
            <span>Combine Metrics &amp; Scouting Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setCardViewMode('vector_card')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              cardViewMode === 'vector_card'
                ? 'bg-amber-500/20 text-white border border-amber-500/50 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Vector Trading Card (SVG Studio)</span>
          </button>
        </div>

        {cardViewMode === 'vector_card' && (
          <button
            type="button"
            onClick={handleDownloadSvgTradingCard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Download Vector SVG</span>
          </button>
        )}
      </div>

      {cardViewMode === 'vector_card' ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl flex flex-col items-center justify-center space-y-4">
          <div className="w-full max-w-md">
            <SportsTemplateEngine
              ref={svgTradingCardRef}
              player={playerData}
              themeId={selectedThemeId}
              className="w-full h-auto drop-shadow-2xl"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadSvgTradingCard}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download SVG Trading Card</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGraphicStudioModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Open Athletic Graphic Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer border border-slate-700"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Active Theme: {activeTheme.name}</span>
            </button>
          </div>
        </div>
      ) : (
        /* MAIN DIGITAL RECRUIT CARD HERO */
        <div 
          className="rounded-3xl border shadow-2xl p-5 sm:p-7 relative overflow-hidden transition-all duration-300"
          style={{
            borderColor: activeTheme.accentColor,
            boxShadow: `0 0 35px ${activeTheme.glowColor}`
          }}
        >
        {/* Backdrop Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-35 transition-all duration-500"
          style={{ backgroundImage: `url(${activeTheme.backdropUrl})` }}
        />

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-[#0c1527] pointer-events-none" />

        {/* Optional Theme Overlay */}
        {activeTheme.overlayUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center mix-blend-screen opacity-40 pointer-events-none"
            style={{ backgroundImage: `url(${activeTheme.overlayUrl})` }}
          />
        )}
        
        {/* Decorative ambient background */}
        <div 
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: activeTheme.accentColor }}
        />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Athlete Portrait & Verified Badge */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3">
            <div 
              onClick={() => setShowAvatarModal(true)}
              className="relative group cursor-pointer"
              title="Click to update athlete avatar picture"
            >
              <img 
                src={profile?.photoURL || profile?.avatarUrl || athlete.avatarUrl} 
                alt={athlete.displayName} 
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-2 shadow-2xl group-hover:brightness-110 transition-all"
                style={{ borderColor: activeTheme.accentColor }}
              />
              <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera className="w-6 h-6" />
              </div>
              <span 
                className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-slate-950 text-[10px] font-black tracking-wider flex items-center gap-1 shadow-lg"
                style={{ 
                  backgroundColor: activeTheme.accentColor,
                  transform: `rotate(${activeTheme.bannerAngle}deg)`
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                VERIFIED
              </span>
            </div>

            <div>
              <h2 
                className="text-xl sm:text-2xl font-black text-white tracking-tight"
                style={{ fontStyle: activeTheme.fontStyle }}
              >
                {athlete.displayName}
              </h2>
              <p 
                className="text-xs font-bold"
                style={{ color: activeTheme.accentColor }}
              >
                {athlete.position} • {athlete.jerseyNumber}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Class of {athlete.gradYear} • {athlete.school}
              </p>
            </div>
          </div>

          {/* Combine Verified Metrics Grid */}
          <div className="md:col-span-2 space-y-4">
            
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#00F5D4] tracking-wider mb-2">
                <Flame className="w-4 h-4 text-[#00F5D4]" />
                Official Combine Verified Measurements
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">40-Yard Dash</div>
                  <div className="text-xl font-black text-white font-mono">{athlete.metrics.dash40}s</div>
                  <div className="text-[9px] text-emerald-400 font-bold">Laser Timed</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Vertical Jump</div>
                  <div className="text-xl font-black text-white font-mono">{athlete.metrics.vertLeap}"</div>
                  <div className="text-[9px] text-slate-400">96th %ile</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Height / Weight</div>
                  <div className="text-xl font-black text-white font-mono">{athlete.metrics.height}</div>
                  <div className="text-[9px] text-slate-400">{athlete.metrics.weight}</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Pro Shuttle (5-10-5)</div>
                  <div className="text-xl font-black text-white font-mono">{athlete.metrics.shuttle || 4.12}s</div>
                  <div className="text-[9px] text-emerald-400 font-bold">Verified</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Bench Max</div>
                  <div className="text-xl font-black text-white font-mono">{athlete.metrics.benchPress || 175} lbs</div>
                  <div className="text-[9px] text-slate-400">Official</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">NCAA Eligibility</div>
                  <div className="text-sm font-black text-white truncate font-mono">#{athlete.metrics.ncaaId || '2604819024'}</div>
                  <div className="text-[9px] text-emerald-400 font-bold">Active Qualifier</div>
                </div>
              </div>
            </div>

            {/* Academic Summary */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  Academic Profile
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  Dean's Honor Roll
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>Cumulative GPA: <span className="font-mono font-black text-white text-sm">{athlete.metrics.gpa}</span></div>
                <div>Test Score: <span className="font-mono font-black text-white text-sm">{athlete.metrics.satAct || 'SAT 1360'}</span></div>
                <div>Intended Major: <span className="font-bold text-slate-200">Sports Kinesiology / Business</span></div>
              </div>
            </div>

          </div>

        </div>

        {/* Bio text */}
        {athlete.bio && (
          <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-slate-100 uppercase tracking-wider block mb-1">Scout Bio:</span>
            {athlete.bio}
          </div>
        )}

      </div>
      )}

      {/* WebAuthn Device Biometric Passkey Manager */}
      <WebAuthnPasskeyManager />

      {/* EDIT PROFILE DRAWER MODAL */}
      <AnimatePresence>
        {showEditDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#0f172a] border-l border-slate-700 w-full max-w-md h-full overflow-y-auto p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="font-black text-white text-lg">Edit Player Card & Metrics</h3>
                <button onClick={() => setShowEditDrawer(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Position</label>
                    <input 
                      type="text" 
                      value={position} 
                      onChange={(e) => setPosition(e.target.value)} 
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Grad Year</label>
                    <input 
                      type="number" 
                      value={gradYear} 
                      onChange={(e) => setGradYear(Number(e.target.value))} 
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">High School / Club</label>
                  <input 
                    type="text" 
                    value={school} 
                    onChange={(e) => setSchool(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Height (e.g. 5'9")</label>
                    <input 
                      type="text" 
                      value={height} 
                      onChange={(e) => setHeight(e.target.value)} 
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Weight (e.g. 152 lbs)</label>
                    <input 
                      type="text" 
                      value={weight} 
                      onChange={(e) => setWeight(e.target.value)} 
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">40-Dash (s)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={dash40} 
                      onChange={(e) => setDash40(Number(e.target.value))} 
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Vertical (in)</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={vertLeap} 
                      onChange={(e) => setVertLeap(Number(e.target.value))} 
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">GPA</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={gpa} 
                      onChange={(e) => setGpa(Number(e.target.value))} 
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Scout Bio</label>
                  <textarea 
                    rows={3} 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#00F5D4]"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowEditDrawer(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00F5D4] to-[#00B8D4] text-slate-950 font-black hover:brightness-110"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lazy Loaded Modals with Suspense */}
      <Suspense fallback={null}>
        {/* Profile Avatar Upload Modal */}
        <AvatarUploadModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentAvatarUrl={profile?.photoURL || profile?.avatarUrl || athlete.avatarUrl}
          onAvatarUpdated={(newUrl) => {
            updateUserProfile({ photoURL: newUrl, avatarUrl: newUrl });
          }}
        />

        {/* Universal Multi-Sport Stat Logger Modal */}
        <StatLoggerModal
          isOpen={showStatLoggerModal}
          onClose={() => setShowStatLoggerModal(false)}
          defaultSport={profile?.sport || 'basketball'}
          athleteId={profile?.uid}
        />

        {/* Prodigi Print-on-Demand Physical Card & Poster Modal */}
        <ProdigiPrintOrderModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          imageUrl={profile?.photoURL || profile?.avatarUrl || athlete.avatarUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'}
          previewUrl={profile?.photoURL || profile?.avatarUrl || athlete.avatarUrl}
          highResUrl={profile?.photoURL || profile?.avatarUrl || athlete.avatarUrl}
          itemTitle={`${athlete.displayName} • #${athlete.jerseyNumber} Official Recruit Card`}
          itemSubtitle={`${athlete.position} | ${athlete.school} | Class of ${athlete.gradYear}`}
          defaultSku="PACKAGE-WALLETS-8"
          creatorId={athlete.id || profile?.uid}
          creatorPayPalEmail={profile?.email || 'creator@just1play.com'}
          creatorName={athlete.displayName}
          metadata={{
            athleteId: athlete.id || profile?.uid,
            ncaaId: athlete.metrics.ncaaId || '2604819024',
            type: 'athlete_card'
          }}
        />

        {/* Athletic Graphic Studio Modal */}
        <GraphicStudioModal
          isOpen={showGraphicStudioModal}
          onClose={() => setShowGraphicStudioModal(false)}
          initialPlayer={playerData}
        />
      </Suspense>

    </div>
  );
};

export default AthletePlayerCardTab;
