import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  User, 
  ShieldCheck, 
  Mail, 
  Download, 
  Share2, 
  QrCode, 
  Check, 
  Zap, 
  Sparkles,
  Trophy,
  Activity,
  Award,
  Video,
  Play,
  Calendar,
  ExternalLink,
  Eye
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { UserProfile, VideoHighlight } from '../../types';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { generateAthletePdf } from '../../lib/pdfGenerator';
import { AthleteGameLogsView } from './AthleteGameLogsView';
import { AthleteMediaSection } from './AthleteMediaSection';
import { AthleteShowcaseReels } from '../Profile/AthleteShowcaseReels';
import { AthletePerformanceRadar } from './AthletePerformanceRadar';
import { AthleteQrPassCard } from './AthleteQrPassCard';
import { ShotChartHeatmap } from './ShotChartHeatmap';
import { ScoutDossierModal } from '../RecruiterMatrix/ScoutDossierModal';
import { AthleteTrafficAnalyticsModal } from './AthleteTrafficAnalyticsModal';
import { CollegeRecruiterDmModal } from '../RecruiterMatrix/CollegeRecruiterDmModal';
import { PrintableRecruitCardModal } from './PrintableRecruitCardModal';
import { VerticalReelStudioModal } from '../MediaHub/VerticalReelStudioModal';
import { SubscriptionTierModal } from '../Pricing/SubscriptionTierModal';
import { ProfileBentoAdCard } from './ProfileBentoAdCard';
import { MetadataUtility } from '../SEO/MetadataUtility';
import { cachedGetDoc } from '../../services/firestoreCacheService';

export const AthleteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [athlete, setAthlete] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScoutDossierModal, setShowScoutDossierModal] = useState(false);
  const [showTrafficAnalyticsModal, setShowTrafficAnalyticsModal] = useState(false);
  const [showCoachDmModal, setShowCoachDmModal] = useState(false);
  const [showPrintableCardModal, setShowPrintableCardModal] = useState(false);
  const [showVerticalReelModal, setShowVerticalReelModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [activeTimestamp, setActiveTimestamp] = useState<string | null>(null);

  useEffect(() => {
    const fetchAthlete = async () => {
      setLoading(true);
      if (!id) {
        setAthlete(null);
        setLoading(false);
        return;
      }

      try {
        if (db) {
          const docRef = doc(db, 'users', id);
          const docSnap = await cachedGetDoc(docRef, { strategy: 'stale-while-revalidate' });

          if (docSnap.exists()) {
            setAthlete({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Firestore fetch error for athlete detail:', err);
      }

      setAthlete(null);
      setLoading(false);
    };

    fetchAthlete();
  }, [id]);

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/scout');
    }
  };

  const handleShareProfile = async () => {
    const targetUid = athlete?.uid || id || 'ath-1';
    const shareUrl = `${window.location.origin}/athlete/${targetUid}`;
    const shareData = {
      title: athlete ? `${athlete.displayName} - Just1Play Scout Matrix` : 'Just1Play Athlete Profile',
      text: athlete ? `View ${athlete.displayName}'s official recruiting stats, film, and verified metrics!` : 'View athlete scout profile on Just1Play!',
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
        return;
      } catch (err) {
        // Fall back to clipboard if user cancels or share API fails
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error('Failed to copy share link:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 pb-40">
        <div className="w-10 h-10 border-2 border-[#E5B868] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(214,28,36,0.5)]" />
        <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          Loading Athlete Scout Profile...
        </p>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-8 text-center bg-[#212A31]/90 rounded-3xl border border-slate-800 my-8 space-y-4 max-w-2xl mx-auto pb-40">
        <User className="w-12 h-12 text-[#E5B868] mx-auto" />
        <h2 className="text-xl font-black text-white uppercase italic">Athlete Profile Not Found</h2>
        <button
          onClick={handleGoBack}
          className="px-5 py-2.5 bg-[#E5B868] text-black font-black text-xs uppercase rounded-xl shadow-[0_0_20px_rgba(214,28,36,0.4)] cursor-pointer"
        >
          Return to Scout Matrix
        </button>
      </div>
    );
  }

  // Pre-formatted highlight timestamps for 4K Highlight Reel Vault
  const sampleTimestamps = [
    { time: '00:15', label: '40yd Pass TD vs Bergen Catholic' },
    { time: '01:10', label: 'Interception Return for TD' },
    { time: '02:45', label: '50yd Bomb TD Pass' },
    { time: '03:20', label: 'Clutch 4th Down Scramble' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-40 px-3 sm:px-4">
      <MetadataUtility 
        title={`${athlete.displayName} (${athlete.position || 'Athlete'} - Class of ${athlete.gradYear || '2026'}) | Just1Play Scout Matrix`}
        description={athlete.bio || `${athlete.displayName} is a ${athlete.position || ''} playing ${athlete.sport || 'football'} from ${athlete.state || 'NJ'}. View verified combine stats, game film, and GPA.`}
        image={athlete.avatarUrl || athlete.photoURL}
        type="profile"
      />
      
      {/* 1. TOP NAVIGATION & ACTION BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <button
          onClick={handleGoBack}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#212A31]/90 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider border border-slate-700/80 hover:border-[#E5B868]/50 transition-all shadow-lg cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-[#E5B868] group-hover:-translate-x-1 transition-transform" />
          <span>⬅️ BACK TO SCOUT MATRIX</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCoachDmModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-mono font-black uppercase tracking-wider border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer"
          >
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>COLLEGE COACH DM</span>
          </button>

          <button
            onClick={() => setShowVerticalReelModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-mono font-black uppercase tracking-wider border border-pink-500/50 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.25)] cursor-pointer"
          >
            <Video className="w-4 h-4 text-pink-400" />
            <span>AI 9:16 REEL STUDIO</span>
          </button>

          <button
            onClick={() => setShowPrintableCardModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-mono font-black uppercase tracking-wider border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all flex items-center justify-center gap-2 shadow-md hover:border-amber-400 cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>300DPI RECRUIT CARD</span>
          </button>

          <button
            onClick={() => setShowTrafficAnalyticsModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-mono font-black uppercase tracking-wider border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>SCOUT TRAFFIC</span>
          </button>

          <button
            onClick={() => setShowScoutDossierModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-mono font-black uppercase tracking-wider border border-[#00F2FE]/50 bg-gradient-to-r from-[#00F2FE]/20 to-[#0284C7]/20 hover:from-[#00F2FE]/30 hover:to-[#0284C7]/30 text-[#00F2FE] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#00F2FE]" />
            <span>SCOUT DOSSIER</span>
          </button>

          <button
            onClick={() => setShowPricingModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-mono font-black uppercase tracking-wider border border-[#E5B868]/60 bg-[#E5B868] hover:bg-[#d4a250] text-slate-950 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(229,184,104,0.4)] cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-slate-950" />
            <span>NIL PRO UPGRADE</span>
          </button>

          <button
            onClick={handleShareProfile}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border border-slate-700 bg-[#212A31]/90 hover:bg-slate-800 text-white transition-all flex items-center justify-center gap-2 shadow-md hover:border-[#E5B868] cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-[#E5B868]" /> : <Share2 className="w-4 h-4 text-[#E5B868]" />}
            <span>{copiedLink ? 'COPIED!' : 'SHARE'}</span>
          </button>

          <button
            onClick={() => generateAthletePdf(athlete)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border border-slate-700 bg-[#212A31] hover:bg-slate-800 text-white transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.15)] hover:border-[#E5B868] cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#E5B868]" />
            <span>PDF SHEET</span>
          </button>
        </div>
      </div>

      {/* 2. HERO ATHLETE BANNER (GLASSMORPHIC BENTO HEADER) */}
      <div className="relative rounded-3xl bg-[#212A31]/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            
            {/* Avatar with Emerald Pulse Ring */}
            <div className="relative shrink-0">
              <img
                src={athlete.avatarUrl || 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&auto=format&fit=crop&q=80'}
                alt={athlete.displayName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#E5B868] shadow-[0_0_25px_rgba(214,28,36,0.4)]"
              />
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-[#E5B868] text-black font-black text-[10px] rounded uppercase shadow-[0_0_10px_rgba(214,28,36,0.6)]">
                {(athlete as any).jerseyNumber || '#7'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-[#E5B868] text-black rounded shadow-[0_0_10px_rgba(214,28,36,0.4)]">
                  {athlete.position || 'QB / ATH'}
                </span>
                
                {/* Official NCAA / Camp Verified Badge with Emerald Pulse Animation */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#E5B868]/15 border border-[#E5B868]/50 rounded-full text-[10px] font-mono font-bold text-[#E5B868]">
                  <span className="w-2 h-2 rounded-full bg-[#E5B868] animate-ping inline-block" />
                  <span>NCAA / CAMP VERIFIED</span>
                </div>

                <span className="text-xs text-slate-300 font-mono font-bold">
                  CLASS OF {athlete.gradYear || '2027'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black italic uppercase text-white font-sans flex items-center gap-2">
                <span>{athlete.displayName}</span>
                <VerifiedBadge size="md" showLabel />
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-medium flex items-center gap-2 flex-wrap">
                <span className="text-[#E5B868] font-bold">{(athlete as any).teamName || athlete.highSchool || 'North Jersey Lightning'}</span>
                <span>•</span>
                <span>{athlete.highSchool || 'St. Peter\'s Prep'} ({athlete.state || 'NJ'})</span>
                <span>•</span>
                <span className="text-[#E5B868] font-mono font-bold">{athlete.gpa || '3.9'} GPA</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <a
              href={`mailto:${athlete.email}?subject=Recruiting Inquiry - Just1Play Scout Matrix`}
              className="w-full md:w-auto px-6 py-3 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(214,28,36,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4 stroke-[2.5]" />
              <span>CONTACT SCOUT DIRECT</span>
            </a>
          </div>
        </div>

        {/* Quick Vitals Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-[#212A31]/60 p-3.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase">Height / Weight</p>
            <p className="text-sm font-mono font-black text-white mt-0.5">{athlete.height || "6'2\""} / {athlete.weight || "195 lbs"}</p>
          </div>
          <div className="bg-[#212A31]/60 p-3.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase">Academic GPA</p>
            <p className="text-sm font-mono font-black text-[#E5B868] mt-0.5">{athlete.gpa || "3.9"} GPA</p>
          </div>
          <div className="bg-[#212A31]/60 p-3.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase">Primary Position</p>
            <p className="text-sm font-mono font-black text-white mt-0.5">{athlete.position || "QB / ATH"}</p>
          </div>
          <div className="bg-[#212A31]/60 p-3.5 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase">State / Region</p>
            <p className="text-sm font-mono font-black text-white mt-0.5">{athlete.state || "NJ"} (Tri-State)</p>
          </div>
        </div>
      </div>

      {/* 3. BENTO GRID: DIGITAL QR PASS & RADAR PERFORMANCE CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Digital QR ID Pass Card */}
        <div className="lg:col-span-1">
          <AthleteQrPassCard profile={athlete} />
        </div>

        {/* 5-Point Radar Performance Chart */}
        <div className="lg:col-span-2">
          <AthletePerformanceRadar athlete={athlete} canEdit={false} />
        </div>
      </div>

      {/* 4. INTEGRATED AD SLOT: [SLOT ID: AD-PROFILE-BENTO] */}
      <div className="my-6">
        <ProfileBentoAdCard />
      </div>

      {/* 5. ATHLETE SHOWCASE MEDIA SYNC & VERIFIED GAME FILM */}
      <div className="rounded-3xl bg-[#212A31]/90 border border-slate-800 p-6 shadow-xl backdrop-blur-xl">
        <AthleteShowcaseReels
          athleteId={athlete.uid || id || 'ath-1'}
          athlete={athlete}
          athleteName={athlete.displayName}
          jerseyNumber={athlete.jerseyNumber}
          teamName={athlete.teamName}
        />
      </div>

      {/* 6. 4K HIGHLIGHT REEL VAULT */}
      <div className="rounded-3xl bg-[#212A31]/90 border border-slate-800 p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E5B868]/10 border border-[#E5B868]/30">
              <Video className="w-5 h-5 text-[#E5B868]" />
            </div>
            <div>
              <h3 className="text-base font-black italic uppercase text-white">4K HIGHLIGHT REEL VAULT</h3>
              <p className="text-xs text-slate-400 font-medium">Verified stream footage & timestamped plays</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-[10px] font-mono font-bold rounded-full border border-red-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
            4K ULTRA HD
          </span>
        </div>

        {/* Embedded Video Section */}
        <AthleteMediaSection
          mediaUrls={athlete.mediaUrls || []}
          onAddVideo={(newVid) => {
            if (athlete) {
              setAthlete({
                ...athlete,
                mediaUrls: [...(athlete.mediaUrls || []), newVid]
              });
            }
          }}
          onDeleteVideo={(vidId) => {
            if (athlete) {
              setAthlete({
                ...athlete,
                mediaUrls: (athlete.mediaUrls || []).filter(v => v.id !== vidId)
              });
            }
          }}
          isOwner={false}
        />

        {/* Interactive Timestamp Highlights */}
        <div className="pt-2 border-t border-slate-800/80">
          <p className="text-[10px] font-mono font-bold uppercase text-slate-400 mb-2">
            KEY TIMESTAMPS & RECRUITER HIGHLIGHT CLIPS:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sampleTimestamps.map((ts, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTimestamp(ts.time)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all text-xs font-mono cursor-pointer ${
                  activeTimestamp === ts.time 
                    ? 'bg-[#E5B868]/15 border-[#E5B868] text-[#E5B868]' 
                    : 'bg-[#212A31]/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span className="font-bold">{ts.time}</span>
                  <span className="font-sans text-slate-300 text-[11px] truncate">{ts.label}</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase font-sans">JUMP</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6. SPATIAL SHOT CHART & HEATMAP */}
      <ShotChartHeatmap 
        sport={athlete.sport || 'Basketball'} 
        athleteName={athlete.displayName} 
      />

      {/* 7. SEASON GAME LOG & METRICS TABLE */}
      <div className="rounded-3xl bg-[#212A31]/90 border border-slate-800 p-6 shadow-xl backdrop-blur-xl">
        <AthleteGameLogsView
          athlete={athlete}
          canEdit={false}
          onUpdateGameLogs={(updated) => {
            if (athlete) {
              setAthlete({
                ...athlete,
                gameLogs: updated
              });
            }
          }}
        />
      </div>

      {/* 8. SCOUT EVALUATION DOSSIER MODAL */}
      <ScoutDossierModal
        isOpen={showScoutDossierModal}
        onClose={() => setShowScoutDossierModal(false)}
        athlete={athlete}
      />

      {/* 9. SCOUT TRAFFIC & COLLEGE INTEREST ANALYTICS MODAL */}
      <AthleteTrafficAnalyticsModal
        isOpen={showTrafficAnalyticsModal}
        onClose={() => setShowTrafficAnalyticsModal(false)}
        athleteId={athlete.uid}
        athleteName={athlete.displayName}
      />

      {/* 10. DIRECT COLLEGE RECRUITER DM MODAL */}
      <CollegeRecruiterDmModal
        isOpen={showCoachDmModal}
        onClose={() => setShowCoachDmModal(false)}
        athlete={athlete}
      />

      {/* 11. 300DPI PRINTABLE RECRUIT CARD & APPLE WALLET */}
      <PrintableRecruitCardModal
        isOpen={showPrintableCardModal}
        onClose={() => setShowPrintableCardModal(false)}
        athlete={athlete}
      />

      {/* 12. AI 9:16 VERTICAL SOCIAL REEL STUDIO */}
      <VerticalReelStudioModal
        isOpen={showVerticalReelModal}
        onClose={() => setShowVerticalReelModal(false)}
        athleteName={athlete.displayName}
        sport={athlete.sport || 'Basketball'}
        videoTitle={`${athlete.displayName} Top Highlights & 2026 Prospect Showcase`}
      />

      {/* 13. SAAS SUBSCRIPTION TIER & NIL PRO MODAL */}
      <SubscriptionTierModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        defaultTier="athlete"
      />
    </div>
  );
};
