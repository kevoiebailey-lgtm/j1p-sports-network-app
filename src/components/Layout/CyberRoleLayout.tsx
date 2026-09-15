import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Aperture, 
  Camera,
  Flame, 
  Trophy, 
  Crosshair, 
  Zap, 
  SlidersHorizontal, 
  Scan, 
  Search, 
  Star, 
  Radio, 
  Shield, 
  Activity, 
  DollarSign, 
  Tv, 
  Heart,
  Users,
  ShieldCheck, 
  Sparkles, 
  CheckCircle2,
  Calendar,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  EyeOff
} from 'lucide-react';
import { UserRole } from '../../types/platform';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { UniversalHeader } from '../Navigation/UniversalHeader';
import { BottomNavDock } from './BottomNavDock';
import { SwipeContentWrapper } from '../Navigation/SwipeContentWrapper';
import { PushNotificationBanner } from '../Notifications/PushNotificationBanner';
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { preloadModule } from '../../lib/lazyWithRetry';
import { GlobalModalManager } from '../Common/GlobalModalManager';
import { OnboardingModal } from '../Auth/OnboardingModal';

// Route preload map for instant navigation
const PRELOAD_MAP: Record<string, () => Promise<any>> = {
  '/dashboard/athlete': () => import('../RoleViews/AthleteView/AthleteHomeTab'),
  '/dashboard/coach': () => import('../RoleViews/CoachView/CoachDashboardHub'),
  '/gallery': () => import('../RoleViews/Universal/MediaGalleryView'),
  '/combine': () => import('../Combine/CombineLeaderboardView'),
  '/tournaments': () => import('../Tournaments/TournamentCenterView'),
  '/athletes': () => import('../RoleViews/ScoutView/ScoutDiscoverTab'),
  '/dashboard/scout/watchlist': () => import('../RoleViews/ScoutView/ScoutWatchlistTab'),
  '/dashboard/director': () => import('../RoleViews/DirectorView/DirectorCommandDeskTab'),
  '/dashboard/director/scores': () => import('../RoleViews/DirectorView/DirectorScoreDeskTab'),
  '/dashboard/director/operations': () => import('../RoleViews/DirectorView/DirectorOperationsTab'),
  '/dashboard/viewer': () => import('../RoleViews/ViewerView/ViewerLiveCenterTab'),
  '/locker-room': () => import('../RoleViews/Universal/LockerRoomView'),
  '/dashboard/admin': () => import('../RoleViews/AdminView/AdminMasterCommandTab'),
  '/dashboard/admin/financials': () => import('../RoleViews/AdminView/AdminOperationsLedgerTab'),
  '/cheer-matrix': () => import('../Cheer/CheerMatrixPage'),
  '/events': () => import('../RoleViews/Universal/EventsHubView'),
  '/sheets': () => import('../Sheets/GoogleSheetsHub')
};

const handlePreload = (path: string) => {
  const loader = PRELOAD_MAP[path];
  if (loader) {
    preloadModule(loader);
  }
};

interface NavTabItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  accentColor?: string;
}

export const ROLE_NAVIGATION: Record<UserRole, NavTabItem[]> = {
  athlete: [
    { id: 'home', label: 'Home', path: '/dashboard/athlete', icon: Home, accentColor: '#00B8D4' },
    { id: 'film', label: 'Vault', path: '/gallery', icon: Aperture, accentColor: '#00B8D4' },
    { id: 'profile', label: 'Combine', path: '/combine', icon: Zap, badge: 'LASER', accentColor: '#FF6A00' },
    { id: 'schedule', label: 'Tournaments', path: '/tournaments', icon: Trophy, accentColor: '#FFC857' }
  ],
  coach: [
    { id: 'hub', label: 'Coach Hub', path: '/dashboard/coach', icon: Home, accentColor: '#00E5FF' },
    { id: 'playbook', label: 'Playbook', path: '/playbook', icon: Zap, accentColor: '#00E5FF' },
    { id: 'roster', label: 'Roster', path: '/members', icon: Users, accentColor: '#00B8D4' },
    { id: 'wall', label: 'The Wall', path: '/wall', icon: Flame, accentColor: '#FF6A00' }
  ],
  scout: [
    { id: 'discover', label: 'Matrix', path: '/athletes', icon: Crosshair, accentColor: '#00B8D4' },
    { id: 'watchlist', label: 'Watchlist', path: '/dashboard/scout/watchlist', icon: Star, badge: '2', accentColor: '#FFC857' },
    { id: 'combine', label: 'Combine', path: '/combine', icon: Zap, badge: 'LIVE', accentColor: '#FF6A00' },
    { id: 'events', label: 'Tournaments', path: '/tournaments', icon: Trophy, accentColor: '#FFC857' }
  ],
  director: [
    { id: 'command', label: 'Command', path: '/dashboard/director', icon: SlidersHorizontal, badge: 'LIVE', accentColor: '#FF6A00' },
    { id: 'tournaments', label: 'Tournaments', path: '/tournaments', icon: Trophy, accentColor: '#FFC857' },
    { id: 'scores', label: 'Score Desk', path: '/dashboard/director/scores', icon: Zap, accentColor: '#00B8D4' },
    { id: 'operations', label: 'Ops & Ledger', path: '/dashboard/director/operations', icon: DollarSign, accentColor: '#00B8D4' }
  ],
  creator: [
    { id: 'studio', label: 'Creator Studio', path: '/dashboard/creator', icon: Aperture, badge: 'STUDIO', accentColor: '#00F5D4' },
    { id: 'vault', label: 'Media Vault', path: '/gallery', icon: Camera, accentColor: '#00B8D4' },
    { id: 'pricing', label: 'Sales & Pricing', path: '/dashboard/creator', icon: DollarSign, badge: 'PAYPAL', accentColor: '#FFC857' },
    { id: 'social', label: 'Social Feed', path: '/locker-room', icon: Flame, accentColor: '#FF6A00' }
  ],
  fan: [
    { id: 'scores', label: 'Scores', path: '/tournaments', icon: Trophy, badge: 'LIVE', accentColor: '#FF6A00' },
    { id: 'community', label: 'Community', path: '/wall', icon: Flame, badge: 'HOT', accentColor: '#FF6A00' },
    { id: 'wall', label: 'The Wall', path: '/wall', icon: Flame, accentColor: '#FF6A00' },
    { id: 'gallery', label: 'Gallery', path: '/gallery', icon: Camera, accentColor: '#00B8D4' }
  ],
  viewer: [
    { id: 'live', label: 'Live Arena', path: '/dashboard/viewer', icon: Tv, badge: 'LIVE', accentColor: '#FF6A00' },
    { id: 'tournaments', label: 'Tournaments', path: '/tournaments', icon: Trophy, accentColor: '#FFC857' },
    { id: 'locker', label: 'Locker Room', path: '/locker-room', icon: Flame, badge: 'HOT', accentColor: '#FF6A00' },
    { id: 'vault', label: '4K Vault', path: '/gallery', icon: Aperture, accentColor: '#00B8D4' }
  ],
  member: [
    { id: 'scores', label: 'Scores', path: '/tournaments', icon: Trophy, badge: 'LIVE', accentColor: '#FF6A00' },
    { id: 'community', label: 'Community', path: '/members', icon: Users, accentColor: '#6366F1' },
    { id: 'wall', label: 'The Wall', path: '/wall', icon: Flame, accentColor: '#FF6A00' },
    { id: 'gallery', label: 'Gallery', path: '/gallery', icon: Camera, accentColor: '#00B8D4' }
  ],
  admin: [
    { id: 'master', label: 'Master Command', path: '/dashboard/admin', icon: Activity, badge: 'CORE', accentColor: '#00B8D4' },
    { id: 'tournaments', label: 'Engine', path: '/tournaments', icon: Trophy, badge: '500R', accentColor: '#FFC857' },
    { id: 'matrix', label: 'Scout Matrix', path: '/athletes', icon: Crosshair, accentColor: '#00B8D4' },
    { id: 'ledger', label: 'Ledger', path: '/dashboard/admin/financials', icon: DollarSign, badge: 'PAYPAL', accentColor: '#FF6A00' }
  ]
};

export const ROLE_INFO: Record<UserRole, { label: string; tagColor: string; icon: string; description: string }> = {
  athlete: { label: 'Athlete View', tagColor: 'from-[#00F5D4] to-[#00B8D4]', icon: '⚡', description: 'Next game, film clips, player card' },
  coach: { label: 'Coach Desk', tagColor: 'from-[#00E5FF] to-[#00B8D4]', icon: '📋', description: 'Playbook, route tree lab, roster' },
  scout: { label: 'Coach / Scout', tagColor: 'from-[#FFB703] to-[#FB8500]', icon: '🎯', description: 'Recruit filters, watchlist, radar' },
  director: { label: 'Director Desk', tagColor: 'from-[#FF6A00] to-[#E63946]', icon: '📋', description: 'Court control, brackets, finance' },
  creator: { label: 'Content Creator', tagColor: 'from-[#00F5D4] to-[#3B82F6]', icon: '📸', description: 'Google Drive sync, 4K sales & revenue splits' },
  fan: { label: 'Fan / Supporter', tagColor: 'from-[#818CF8] to-[#6366F1]', icon: '🔥', description: 'Live scores, tournament brackets & social feed' },
  viewer: { label: 'Fan / Viewer', tagColor: 'from-[#818CF8] to-[#6366F1]', icon: '👁️', description: 'Live ticker, stream & schedules' },
  member: { label: 'Member View', tagColor: 'from-[#00B8D4] to-[#6366F1]', icon: '🌟', description: 'Network member, community wall, events & media' },
  admin: { label: 'Super Admin', tagColor: 'from-[#EC4899] to-[#8B5CF6]', icon: '👑', description: 'Global command, user hub, moderation & ledger' }
};

interface CyberRoleLayoutProps {
  children: React.ReactNode;
}

export const CyberRoleLayout: React.FC<CyberRoleLayoutProps> = ({ children }) => {
  const { role } = useAuthRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [liveAnnouncement, setLiveAnnouncement] = useState<{ text: string; delayMinutes: number; isUrgent?: boolean; targetScope?: string } | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!db) return;

    // Listen to tournaments collection
    const unsubTourn = onSnapshot(
      query(collection(db, 'tournaments'), limit(5)),
      (snap) => {
        if (!snap.empty) {
          for (const docSnap of snap.docs) {
            const data = docSnap.data();
            // Filter out archived announcements
            const activeAnn = Array.isArray(data.announcements)
              ? data.announcements.find((a: any) => a.status !== 'archived')
              : null;

            if (data.delayMinutes > 0 || activeAnn) {
              setLiveAnnouncement({
                text: activeAnn?.text || `Delay +${data.delayMinutes} mins on court schedule.`,
                delayMinutes: data.delayMinutes || 0,
                isUrgent: activeAnn?.isUrgent || activeAnn?.urgent || false,
                targetScope: activeAnn?.targetScope || 'all'
              });
              setShowAnnouncement(true);
              return;
            }
          }
        }
      },
      (err) => {
        console.warn('Featured events announcement snapshot notice:', err);
      }
    );

    // Also listen to latest broadcasts collection for real-time urgent facility/court banners
    const unsubBroadcasts = onSnapshot(
      query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(1)),
      (snap) => {
        if (!snap.empty) {
          const latestDoc = snap.docs[0].data();
          if (latestDoc.status === 'active' && (latestDoc.isUrgent || latestDoc.urgent)) {
            setLiveAnnouncement({
              text: latestDoc.text,
              delayMinutes: 1,
              isUrgent: true,
              targetScope: latestDoc.targetScope || 'all'
            });
            setShowAnnouncement(true);
            return;
          } else if (latestDoc.status === 'archived') {
            // If the latest alert was archived, clear the banner immediately
            setLiveAnnouncement(null);
          }
        }
      },
      (err) => {
        console.warn('Broadcasts banner snapshot notice:', err);
      }
    );

    return () => {
      unsubTourn();
      unsubBroadcasts();
    };
  }, []);

  const canonicalRole = normalizeRole(role);
  const navItems = ROLE_NAVIGATION[canonicalRole] || ROLE_NAVIGATION.athlete;
  const isStandaloneLayoutRoute = 
    location.pathname === '/faq' || 
    location.pathname === '/faqs' || 
    location.pathname === '/help' || 
    location.pathname === '/support' || 
    location.pathname === '/knowledge-base' ||
    location.pathname === '/gallery' || 
    location.pathname === '/media-gallery' || 
    location.pathname === '/media' || 
    location.pathname === '/studio' || 
    location.pathname.startsWith('/play/');

  return (
    <div className={`min-h-screen bg-[#08090C] text-[#F4F4F4] font-sans antialiased selection:bg-[#00F0D0] selection:text-[#08090C] flex flex-col relative ${isStandaloneLayoutRoute ? '' : 'pb-36 sm:pb-28'}`}>
      {/* Background Cyber Grid Accent */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-15 bg-[radial-gradient(#24324F_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Universal Top Header with Responsive Quick Links & Explore Matrix Drawer */}
      <div className={isStandaloneLayoutRoute ? "fixed top-0 inset-x-0 z-40" : "sticky top-0 z-40"}>
        <UniversalHeader />
      </div>

      {/* Live Delay & Court Alert Sticky Banner */}
      {!isStandaloneLayoutRoute && showAnnouncement && liveAnnouncement && (liveAnnouncement.delayMinutes > 0 || liveAnnouncement.isUrgent) && (
        <div className="bg-gradient-to-r from-amber-950/90 via-[#08090C] to-amber-950/90 border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200 z-30 shadow-lg animate-fadeIn">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-500/50 font-mono shrink-0">
                {liveAnnouncement.targetScope && liveAnnouncement.targetScope !== 'all'
                  ? `[${liveAnnouncement.targetScope}]`
                  : 'Live Broadcast'}
              </span>
              <span className="font-medium text-slate-200 truncate">
                {liveAnnouncement.text}
              </span>
            </div>
            <button 
              onClick={() => setShowAnnouncement(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white p-1 text-xs font-bold cursor-pointer transition-colors"
              aria-label="Dismiss Announcement"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area - Un-nested on dedicated PageContainer shells to prevent redundant top padding */}
      {isStandaloneLayoutRoute ? (
        <div className="flex-1 w-full min-w-0">
          <SwipeContentWrapper>
            {children}
          </SwipeContentWrapper>
        </div>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 md:pb-12 z-10 min-w-0 space-y-4">
          {/* Opt-in Web Push Notifications Banner for DMs & Live Score Updates */}
          <PushNotificationBanner />

          <SwipeContentWrapper>
            {children}
          </SwipeContentWrapper>
        </main>
      )}

      {/* UNIVERSAL ROOT NAVIGATION DOCK (Rendered ONLY ONCE to prevent duplicate navigation) */}
      {mounted && <BottomNavDock />}

      {/* GLOBAL STANDARDIZED MODAL & COMMAND ENGINE MANAGER */}
      <GlobalModalManager />

      {/* MANDATORY ONBOARDING & IMMUTABLE ROLE LOCK MODAL */}
      <OnboardingModal />

    </div>
  );
};

export default CyberRoleLayout;
