import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PayPalSafeProvider } from './app/providers';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppProvider } from './context/AppContext';
import { CyberRoleLayout } from './components/Layout/CyberRoleLayout';
import { MetadataUtility } from './components/SEO/MetadataUtility';
import { ObsidianSkeletonFallback } from './components/Common/SkeletonLoader';
import { TabErrorBoundary } from './components/Common/TabErrorBoundary';
import { useAuthRole, normalizeRole } from './hooks/useAuthRole';
import { lazyWithRetry, preloadModule } from './lib/lazyWithRetry';

// Code Splitting with Auto-Retry & Stale Chunk Recovery: Athlete View Tabs (4 Tabs)
const AthleteHomeTab = lazyWithRetry(() => import('./components/RoleViews/AthleteView/AthleteHomeTab').then(m => ({ default: m.AthleteHomeTab })));
const AthleteFilmTab = lazyWithRetry(() => import('./components/RoleViews/AthleteView/AthleteFilmTab').then(m => ({ default: m.AthleteFilmTab })));
const AthletePlayerCardTab = lazyWithRetry(() => import('./components/RoleViews/AthleteView/AthletePlayerCardTab').then(m => ({ default: m.AthletePlayerCardTab })));
const AthleteScheduleTab = lazyWithRetry(() => import('./components/RoleViews/AthleteView/AthleteScheduleTab').then(m => ({ default: m.AthleteScheduleTab })));

// Code Splitting with Auto-Retry: Coach View Hub
const CoachDashboardHub = lazyWithRetry(() => import('./components/RoleViews/CoachView/CoachDashboardHub').then(m => ({ default: m.CoachDashboardHub })));

// Code Splitting with Auto-Retry: Scout View Tabs (4 Tabs)
const ScoutDiscoverTab = lazyWithRetry(() => import('./components/RoleViews/ScoutView/ScoutDiscoverTab').then(m => ({ default: m.ScoutDiscoverTab })));
const ScoutWatchlistTab = lazyWithRetry(() => import('./components/RoleViews/ScoutView/ScoutWatchlistTab').then(m => ({ default: m.ScoutWatchlistTab })));
const ScoutCourtRadarTab = lazyWithRetry(() => import('./components/RoleViews/ScoutView/ScoutCourtRadarTab').then(m => ({ default: m.ScoutCourtRadarTab })));
const ScoutAccountTab = lazyWithRetry(() => import('./components/RoleViews/ScoutView/ScoutAccountTab').then(m => ({ default: m.ScoutAccountTab })));

// Code Splitting with Auto-Retry: Director View Tabs (4 Tabs)
const DirectorCommandDeskTab = lazyWithRetry(() => import('./components/RoleViews/DirectorView/DirectorCommandDeskTab').then(m => ({ default: m.DirectorCommandDeskTab })));
const DirectorBracketsTab = lazyWithRetry(() => import('./components/RoleViews/DirectorView/DirectorBracketsTab').then(m => ({ default: m.DirectorBracketsTab })));
const DirectorScoreDeskTab = lazyWithRetry(() => import('./components/RoleViews/DirectorView/DirectorScoreDeskTab').then(m => ({ default: m.DirectorScoreDeskTab })));
const DirectorOperationsTab = lazyWithRetry(() => import('./components/RoleViews/DirectorView/DirectorOperationsTab').then(m => ({ default: m.DirectorOperationsTab })));

// Code Splitting with Auto-Retry: Viewer View Tabs (4 Tabs)
const ViewerLiveCenterTab = lazyWithRetry(() => import('./components/RoleViews/ViewerView/ViewerLiveCenterTab').then(m => ({ default: m.ViewerLiveCenterTab })));
const ViewerScheduleTab = lazyWithRetry(() => import('./components/RoleViews/ViewerView/ViewerScheduleTab').then(m => ({ default: m.ViewerScheduleTab })));
const ViewerMediaTab = lazyWithRetry(() => import('./components/RoleViews/ViewerView/ViewerMediaTab').then(m => ({ default: m.ViewerMediaTab })));
const ViewerFavoritesTab = lazyWithRetry(() => import('./components/RoleViews/ViewerView/ViewerFavoritesTab').then(m => ({ default: m.ViewerFavoritesTab })));

// Code Splitting with Auto-Retry: Admin View Tabs
import AdminMasterCommandTab from './components/RoleViews/AdminView/AdminMasterCommandTab';
const AdminUserHubTab = lazyWithRetry(() => import('./components/RoleViews/AdminView/AdminUserHubTab').then(m => ({ default: m.AdminUserHubTab })));
const AdminModerationTab = lazyWithRetry(() => import('./components/RoleViews/AdminView/AdminModerationTab').then(m => ({ default: m.AdminModerationTab })));
const AdminOperationsLedgerTab = lazyWithRetry(() => import('./components/RoleViews/AdminView/AdminOperationsLedgerTab').then(m => ({ default: m.AdminOperationsLedgerTab })));
const AdminOperationsDashboard = lazyWithRetry(() => import('./components/Admin/AdminOperationsDashboard').then(m => ({ default: m.default })));
import { AdminRoute } from './components/Admin/AdminRoute';

// Code Splitting with Auto-Retry: Universal Views
const LockerRoomView = lazyWithRetry(() => import('./components/RoleViews/Universal/LockerRoomView').then(m => ({ default: m.LockerRoomView })));
const MediaGalleryView = lazyWithRetry(() => import('./components/RoleViews/Universal/MediaGalleryView').then(m => ({ default: m.MediaGalleryView })));
const TournamentCenterView = lazyWithRetry(() => import('./components/Tournaments/TournamentCenterView').then(m => ({ default: m.TournamentCenterView })));
const EventsHubView = lazyWithRetry(() => import('./components/RoleViews/Universal/EventsHubView').then(m => ({ default: m.EventsHubView })));
const CombineLeaderboardView = lazyWithRetry(() => import('./components/Combine/CombineLeaderboardView').then(m => ({ default: m.CombineLeaderboardView })));
const BlogHubPage = lazyWithRetry(() => import('./components/Blog/BlogHubPage').then(m => ({ default: m.BlogHubPage })));
const BlogDetailPage = lazyWithRetry(() => import('./components/Blog/BlogDetailPage').then(m => ({ default: m.BlogDetailPage })));
const FaqHelpCenterView = lazyWithRetry(() => import('./components/RoleViews/Universal/FaqHelpCenterView').then(m => ({ default: m.FaqHelpCenterView })));
const MemberDirectoryView = lazyWithRetry(() => import('./components/Community/MemberDirectoryView').then(m => ({ default: m.MemberDirectoryView })));
const SportsProfilePage = lazyWithRetry(() => import('./components/Profile/SportsProfilePage').then(m => ({ default: m.SportsProfilePage })));
const SinglePlayPage = lazyWithRetry(() => import('./components/Play/SinglePlayPage').then(m => ({ default: m.SinglePlayPage })));
const PlaybookLabPage = lazyWithRetry(() => import('./components/Playbook/PlaybookLabPage').then(m => ({ default: m.PlaybookLabPage })));
const SignalHubReceiverPage = lazyWithRetry(() => import('./components/Playbook/SignalHub/SignalHubReceiverPage').then(m => ({ default: m.SignalHubReceiverPage })));
const WristHUDClientPage = lazyWithRetry(() => import('./components/playbook/WristHUDPage').then(m => ({ default: m.default || m.WristHUDPage })));
const CheerMatrixPage = lazyWithRetry(() => import('./components/Cheer/CheerMatrixPage').then(m => ({ default: m.CheerMatrixPage })));
const MatrixHubView = lazyWithRetry(() => import('./components/RoleViews/Universal/MatrixHubView').then(m => ({ default: m.MatrixHubView })));
const WatchFeed = lazyWithRetry(() => import('./components/Video/WatchFeed').then(m => ({ default: m.WatchFeed })));
const UniversalActivityStream = lazyWithRetry(() => import('./components/Activity/UniversalActivityStream').then(m => ({ default: m.UniversalActivityStream })));
const CreatorStudioDashboardView = lazyWithRetry(() => import('./components/Dashboard/CreatorStudioDashboardView').then(m => ({ default: m.CreatorStudioDashboardView })));
const DirectMessagingView = lazyWithRetry(() => import('./components/Messages/DirectMessagingView').then(m => ({ default: m.DirectMessagingView })));
const LiveBroadcastHubPage = lazyWithRetry(() => import('./components/live/LiveBroadcastHub').then(m => ({ default: m.default })));
const AdvertiserTrafficAnalyticsDashboard = lazyWithRetry(() => import('./components/Admin/Analytics/AdvertiserTrafficAnalyticsDashboard').then(m => ({ default: m.AdvertiserTrafficAnalyticsDashboard })));
const PayPalCheckoutPage = lazyWithRetry(() => import('./components/Checkout/PayPalCheckoutPage').then(m => ({ default: m.PayPalCheckoutPage })));
const StripeCheckoutPage = PayPalCheckoutPage;
const CreatorBookingDesk = lazyWithRetry(() => import('./components/booking/CreatorBookingDesk').then(m => ({ default: m.default || m.CreatorBookingDesk })));
const CreatorManageBookings = lazyWithRetry(() => import('./components/booking/CreatorManageBookings').then(m => ({ default: m.default || m.CreatorManageBookings })));
const GoogleSheetsHub = lazyWithRetry(() => import('./components/Sheets/GoogleSheetsHub').then(m => ({ default: m.GoogleSheetsHub })));
const CreatorEarningsDashboard = lazyWithRetry(() => import('./components/creator/CreatorEarningsDashboard').then(m => ({ default: m.CreatorEarningsDashboard })));
const CreatorPortalDashboard = lazyWithRetry(() => import('./components/creator/CreatorPortalDashboard').then(m => ({ default: m.CreatorPortalDashboard })));
const CreatorUploadPage = lazyWithRetry(() => import('./components/creator/CreatorUploadPage').then(m => ({ default: m.CreatorUploadPage })));
const EventOperationsManager = lazyWithRetry(() => import('./components/coordinator/EventOperationsManager').then(m => ({ default: m.EventOperationsManager })));
const AthleteJoinPage = lazyWithRetry(() => import('./pages/AthleteJoinPage').then(m => ({ default: m.AthleteJoinPage })));
const GraphicStudioPage = lazyWithRetry(() => import('./pages/GraphicStudioPage').then(m => ({ default: m.GraphicStudioPage })));
import { SiteTrafficTracker } from './components/Analytics/SiteTrafficTracker';
import { MandatoryAuthGate } from './components/Auth/MandatoryAuthGate';
import { PWARefreshHandler } from './components/providers/PWARefreshHandler';
import { ScrollToTop } from './components/Navigation/ScrollToTop';
import { PrintCartProvider } from './context/PrintCartContext';
import { PrintCartDrawer } from './components/MediaHub/PrintCartDrawer';
import { MultiItemPrintCheckoutModal } from './components/MediaHub/MultiItemPrintCheckoutModal';


// Dynamic Index / Smart Redirector
function RoleDefaultRedirector() {
  const { role, user } = useAuthRole();
  if (!user) {
    // Unauthenticated guest visitors default to the Athlete Home / Public Feed
    return <Navigate to="/dashboard/athlete" replace />;
  }
  const canonicalRole = normalizeRole(role);

  switch (canonicalRole) {
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    case 'creator':
      return <Navigate to="/dashboard/creator" replace />;
    case 'coach':
      return <Navigate to="/dashboard/coach" replace />;
    case 'scout':
      return <Navigate to="/dashboard/scout" replace />;
    case 'director':
      return <Navigate to="/dashboard/director" replace />;
    case 'member':
    case 'fan':
    case 'viewer':
      return <Navigate to="/dashboard/viewer" replace />;
    case 'athlete':
    default:
      return <Navigate to="/dashboard/athlete" replace />;
  }
}

function MainAppShell() {
  const location = useLocation();
  const { role, user, loading } = useAuthRole();

  // Clear retry-lazy-refreshed session flag on clean route navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        sessionStorage.removeItem('retry-lazy-refreshed');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Eagerly preload common role views in the background so tab switching is instantaneous
  useEffect(() => {
    const canonical = normalizeRole(role);
    if (canonical === 'athlete') {
      preloadModule(() => import('./components/RoleViews/AthleteView/AthleteHomeTab'));
      preloadModule(() => import('./components/RoleViews/AthleteView/AthleteFilmTab'));
      preloadModule(() => import('./components/RoleViews/AthleteView/AthletePlayerCardTab'));
      preloadModule(() => import('./components/RoleViews/AthleteView/AthleteScheduleTab'));
      preloadModule(() => import('./components/Tournaments/TournamentCenterView'));
      preloadModule(() => import('./components/Combine/CombineLeaderboardView'));
      preloadModule(() => import('./components/RoleViews/Universal/MediaGalleryView'));
      preloadModule(() => import('./components/Cheer/CheerMatrixPage'));
    } else if (canonical === 'coach') {
      preloadModule(() => import('./components/RoleViews/CoachView/CoachDashboardHub'));
      preloadModule(() => import('./components/Playbook/PlaybookLabPage'));
      preloadModule(() => import('./components/Tournaments/TournamentCenterView'));
      preloadModule(() => import('./components/Community/MemberDirectoryView'));
    } else if (canonical === 'scout') {
      preloadModule(() => import('./components/RoleViews/ScoutView/ScoutDiscoverTab'));
      preloadModule(() => import('./components/RoleViews/ScoutView/ScoutWatchlistTab'));
      preloadModule(() => import('./components/RoleViews/ScoutView/ScoutCourtRadarTab'));
      preloadModule(() => import('./components/RoleViews/ScoutView/ScoutAccountTab'));
      preloadModule(() => import('./components/Combine/CombineLeaderboardView'));
      preloadModule(() => import('./components/Tournaments/TournamentCenterView'));
    } else if (canonical === 'director') {
      preloadModule(() => import('./components/RoleViews/DirectorView/DirectorCommandDeskTab'));
      preloadModule(() => import('./components/RoleViews/DirectorView/DirectorBracketsTab'));
      preloadModule(() => import('./components/RoleViews/DirectorView/DirectorScoreDeskTab'));
      preloadModule(() => import('./components/RoleViews/DirectorView/DirectorOperationsTab'));
      preloadModule(() => import('./components/Tournaments/TournamentCenterView'));
    } else if (canonical === 'viewer') {
      preloadModule(() => import('./components/RoleViews/ViewerView/ViewerLiveCenterTab'));
      preloadModule(() => import('./components/RoleViews/ViewerView/ViewerScheduleTab'));
      preloadModule(() => import('./components/RoleViews/ViewerView/ViewerMediaTab'));
      preloadModule(() => import('./components/RoleViews/ViewerView/ViewerFavoritesTab'));
      preloadModule(() => import('./components/RoleViews/Universal/LockerRoomView'));
      preloadModule(() => import('./components/Tournaments/TournamentCenterView'));
    } else if (canonical === 'admin') {
      preloadModule(() => import('./components/RoleViews/AdminView/AdminUserHubTab'));
      preloadModule(() => import('./components/RoleViews/AdminView/AdminModerationTab'));
      preloadModule(() => import('./components/RoleViews/AdminView/AdminOperationsLedgerTab'));
      preloadModule(() => import('./components/Tournaments/TournamentCenterView'));
    }
  }, [role, user]);

  if (loading) {
    return <ObsidianSkeletonFallback />;
  }

  return (
    <>
      <MetadataUtility />
      <SiteTrafficTracker />
      <PrintCartDrawer />
      <MultiItemPrintCheckoutModal />
      <CyberRoleLayout>
        <TabErrorBoundary locationKey={location.pathname}>
          <Suspense fallback={<ObsidianSkeletonFallback />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="w-full"
              >
                <Routes location={location}>
                {/* 1. ATHLETE VIEW (4 TABS) */}
                <Route path="/dashboard/athlete" element={<AthleteHomeTab />} />
                <Route path="/dashboard/athlete/film" element={<AthleteFilmTab />} />
                <Route path="/dashboard/athlete/profile" element={<AthletePlayerCardTab />} />
                <Route path="/dashboard/athlete/schedule" element={<AthleteScheduleTab />} />
                <Route path="/app/dashboard/athlete/*" element={<Navigate to="/dashboard/athlete" replace />} />

                {/* 2. COACH DASHBOARD HUB & TACTICAL LAB */}
                <Route path="/dashboard/coach" element={<CoachDashboardHub />} />
                <Route path="/dashboard/coach/*" element={<CoachDashboardHub />} />
                <Route path="/coach" element={<CoachDashboardHub />} />
                <Route path="/app/dashboard/coach/*" element={<Navigate to="/dashboard/coach" replace />} />

                {/* 3. SCOUT VIEW (4 TABS) */}
                <Route path="/dashboard/scout" element={<ScoutDiscoverTab />} />
                <Route path="/dashboard/scout/watchlist" element={<ScoutWatchlistTab />} />
                <Route path="/dashboard/scout/courts" element={<ScoutCourtRadarTab />} />
                <Route path="/dashboard/scout/profile" element={<ScoutAccountTab />} />
                <Route path="/app/dashboard/scout/*" element={<Navigate to="/dashboard/scout" replace />} />

                {/* 4. TOURNAMENT DIRECTOR VIEW (4 TABS) */}
                <Route path="/dashboard/director" element={<DirectorCommandDeskTab />} />
                <Route path="/dashboard/director/brackets" element={<DirectorBracketsTab />} />
                <Route path="/dashboard/director/scores" element={<DirectorScoreDeskTab />} />
                <Route path="/dashboard/director/operations" element={<DirectorOperationsTab />} />
                <Route path="/app/dashboard/director/*" element={<Navigate to="/dashboard/director" replace />} />

                {/* 4. FAN / VIEWER VIEW (4 TABS) */}
                <Route path="/dashboard/viewer" element={<ViewerLiveCenterTab />} />
                <Route path="/dashboard/viewer/schedule" element={<ViewerScheduleTab />} />
                <Route path="/dashboard/viewer/media" element={<ViewerMediaTab />} />
                <Route path="/dashboard/viewer/following" element={<ViewerFavoritesTab />} />
                <Route path="/app/dashboard/viewer/*" element={<Navigate to="/dashboard/viewer" replace />} />

                {/* 5. SUPER ADMIN VIEW (4 TABS - Protected by AdminRoute) */}
                <Route path="/admin/dashboard" element={<AdminRoute><AdminOperationsDashboard /></AdminRoute>} />
                <Route path="/app/admin/dashboard" element={<AdminRoute><AdminOperationsDashboard /></AdminRoute>} />
                <Route path="/dashboard/admin" element={<AdminRoute><AdminMasterCommandTab /></AdminRoute>} />
                <Route path="/dashboard/admin/users" element={<AdminRoute><AdminUserHubTab /></AdminRoute>} />
                <Route path="/dashboard/admin/moderation" element={<AdminRoute><AdminModerationTab /></AdminRoute>} />
                <Route path="/dashboard/admin/financials" element={<AdminRoute><AdminOperationsLedgerTab /></AdminRoute>} />
                <Route path="/dashboard/admin/traffic" element={<AdminRoute><AdvertiserTrafficAnalyticsDashboard /></AdminRoute>} />
                <Route path="/dashboard/admin/analytics" element={<AdminRoute><AdvertiserTrafficAnalyticsDashboard /></AdminRoute>} />
                <Route path="/admin/traffic" element={<AdminRoute><AdvertiserTrafficAnalyticsDashboard /></AdminRoute>} />
                <Route path="/admin/analytics" element={<AdminRoute><AdvertiserTrafficAnalyticsDashboard /></AdminRoute>} />
                <Route path="/traffic" element={<AdminRoute><AdvertiserTrafficAnalyticsDashboard /></AdminRoute>} />
                <Route path="/analytics" element={<AdminRoute><AdvertiserTrafficAnalyticsDashboard /></AdminRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminMasterCommandTab /></AdminRoute>} />
                <Route path="/admin/*" element={<AdminRoute><AdminMasterCommandTab /></AdminRoute>} />
                <Route path="/app/dashboard/admin/*" element={<AdminRoute><AdminMasterCommandTab /></AdminRoute>} />

                {/* 6. CONTENT CREATOR & PHOTOGRAPHER STUDIO VIEW */}
                <Route path="/creator/portal" element={<CreatorPortalDashboard />} />
                <Route path="/creator-portal" element={<CreatorPortalDashboard />} />
                <Route path="/creator/upload" element={<CreatorUploadPage />} />
                <Route path="/creator/upload/:albumId" element={<CreatorUploadPage />} />
                <Route path="/creator-upload" element={<CreatorUploadPage />} />
                <Route path="/creator/batch-upload" element={<CreatorUploadPage />} />
                <Route path="/creator/ingest" element={<CreatorUploadPage />} />
                <Route path="/dashboard/creator" element={<CreatorStudioDashboardView />} />
                <Route path="/dashboard/creator/*" element={<CreatorStudioDashboardView />} />
                <Route path="/creator" element={<CreatorStudioDashboardView />} />
                <Route path="/creator-studio" element={<CreatorStudioDashboardView />} />
                <Route path="/creator/payouts" element={<CreatorStudioDashboardView />} />
                <Route path="/creator-studio/payouts" element={<CreatorStudioDashboardView />} />
                <Route path="/creator/payout-settings" element={<CreatorStudioDashboardView />} />
                <Route path="/creator/bookings" element={<CreatorStudioDashboardView />} />
                <Route path="/creator/earnings" element={<CreatorEarningsDashboard />} />
                <Route path="/creator-earnings" element={<CreatorEarningsDashboard />} />
                <Route path="/dashboard/creator/earnings" element={<CreatorEarningsDashboard />} />
                <Route path="/book-creator" element={<CreatorBookingDesk />} />
                <Route path="/book-creator/:creatorId" element={<CreatorBookingDesk />} />
                <Route path="/my-bookings" element={<CreatorManageBookings />} />
                <Route path="/coordinator" element={<EventOperationsManager />} />
                <Route path="/coordinator/operations" element={<EventOperationsManager />} />
                <Route path="/event-operations" element={<EventOperationsManager />} />
                <Route path="/dashboard/coordinator" element={<EventOperationsManager />} />
                <Route path="/dashboard/coordinator/*" element={<EventOperationsManager />} />
                <Route path="/app/dashboard/creator/*" element={<Navigate to="/dashboard/creator" replace />} />

                {/* 7. UNIVERSAL VIEWS (LOCKER ROOM / WALL, MEDIA GALLERY, TOURNAMENTS, COMBINE & BLOG) */}
                <Route path="/locker-room" element={<LockerRoomView />} />
                <Route path="/the-wall" element={<LockerRoomView />} />
                <Route path="/wall" element={<LockerRoomView />} />
                <Route path="/feed" element={<LockerRoomView />} />
                <Route path="/social" element={<LockerRoomView />} />
                <Route path="/social-wall" element={<LockerRoomView />} />
                
                {/* 7.1 FUTURISTIC ATHLETE GRAPHIC & PLAY CARD STUDIO */}
                <Route path="/playcard" element={<GraphicStudioPage />} />
                <Route path="/play-card" element={<GraphicStudioPage />} />
                <Route path="/graphic-studio" element={<GraphicStudioPage />} />
                <Route path="/graphics" element={<GraphicStudioPage />} />
                
                <Route path="/gallery" element={<MediaGalleryView />} />
                <Route path="/media-gallery" element={<MediaGalleryView />} />
                <Route path="/media" element={<MediaGalleryView />} />
                <Route path="/studio" element={<MediaGalleryView />} />

                <Route path="/matrix" element={<MatrixHubView />} />
                <Route path="/matrix/*" element={<MatrixHubView />} />
                <Route path="/tactical-matrix" element={<MatrixHubView />} />
                <Route path="/film-matrix" element={<MatrixHubView />} />

                <Route path="/events" element={<EventsHubView />} />
                <Route path="/events/:eventId" element={<EventsHubView />} />
                <Route path="/event/:eventId" element={<EventsHubView />} />
                <Route path="/showcase" element={<EventsHubView />} />
                <Route path="/showcases" element={<EventsHubView />} />
                <Route path="/camps" element={<EventsHubView />} />
                <Route path="/combines" element={<EventsHubView />} />

                <Route path="/tournaments" element={<TournamentCenterView />} />
                <Route path="/tournaments/:tournamentId" element={<TournamentCenterView />} />
                <Route path="/tournament-center" element={<TournamentCenterView />} />
                <Route path="/tournament/:tournamentId" element={<TournamentCenterView />} />
                <Route path="/tournament" element={<TournamentCenterView />} />

                <Route path="/combine" element={<CombineLeaderboardView />} />
                <Route path="/combine-leaderboard" element={<CombineLeaderboardView />} />

                <Route path="/blog" element={<BlogHubPage />} />
                <Route path="/blog/:id" element={<BlogDetailPage />} />

                <Route path="/directory" element={<MemberDirectoryView />} />
                <Route path="/members" element={<MemberDirectoryView />} />
                <Route path="/community/members" element={<MemberDirectoryView />} />

                <Route path="/faq" element={<FaqHelpCenterView />} />
                <Route path="/faqs" element={<FaqHelpCenterView />} />
                <Route path="/help" element={<FaqHelpCenterView />} />
                <Route path="/support" element={<FaqHelpCenterView />} />
                <Route path="/knowledge-base" element={<FaqHelpCenterView />} />

                {/* 7. DYNAMIC SPORTS PROFILE ROUTE (/profile/:id) & PLAY ROUTE (/play/:id) */}
                <Route path="/profile" element={<SportsProfilePage />} />
                <Route path="/profile/edit" element={<SportsProfilePage />} />
                <Route path="/profile/:id" element={<SportsProfilePage />} />
                <Route path="/profile/[id]" element={<SportsProfilePage />} />
                <Route path="/athlete/:id" element={<SportsProfilePage />} />
                <Route path="/athletes/:id" element={<SportsProfilePage />} />
                <Route path="/members/:id" element={<SportsProfilePage />} />
                <Route path="/play/:id" element={<SinglePlayPage />} />
                <Route path="/play/[id]" element={<SinglePlayPage />} />
                <Route path="/plays/:id" element={<SinglePlayPage />} />
                <Route path="/highlight/:id" element={<SinglePlayPage />} />

                {/* 7.4 COMMUNITY VIDEO WATCH VAULT & HIGHLIGHT FEED */}
                <Route path="/watch" element={<WatchFeed />} />
                <Route path="/watch-feed" element={<WatchFeed />} />
                <Route path="/video" element={<WatchFeed />} />
                <Route path="/videos" element={<WatchFeed />} />
                <Route path="/highlights" element={<WatchFeed />} />
                <Route path="/film-vault" element={<WatchFeed />} />

                {/* 7.41 UNIVERSAL CROSS-MODULE ACTIVITY STREAM */}
                <Route path="/activity" element={<UniversalActivityStream />} />
                <Route path="/activity-stream" element={<UniversalActivityStream />} />
                <Route path="/stream" element={<UniversalActivityStream />} />
                <Route path="/activity-feed" element={<UniversalActivityStream />} />

                {/* 7.5 INTERACTIVE PLAYBOOK LAB & ROUTE TREE ANIMATOR */}
                <Route path="/playbook" element={<PlaybookLabPage />} />
                <Route path="/playlab" element={<PlaybookLabPage />} />
                <Route path="/playbook-lab" element={<PlaybookLabPage />} />
                <Route path="/playbook/:id" element={<PlaybookLabPage />} />
                <Route path="/tactics" element={<PlaybookLabPage />} />
                <Route path="/route-tree" element={<PlaybookLabPage />} />

                {/* 7.51 J1P SIGNAL HUB & REAL-TIME WRIST HUD */}
                <Route path="/wristband" element={<WristHUDClientPage />} />
                <Route path="/wristband/:teamId" element={<WristHUDClientPage />} />
                <Route path="/wrist" element={<WristHUDClientPage />} />
                <Route path="/wrist/:teamId" element={<WristHUDClientPage />} />
                <Route path="/signal-hub" element={<SignalHubReceiverPage />} />
                <Route path="/signal-hub/receiver" element={<SignalHubReceiverPage />} />
                <Route path="/wrist-hud" element={<WristHUDClientPage />} />
                <Route path="/hud" element={<WristHUDClientPage />} />

                {/* 7.6 CHEERMATRIX: CHEERLEADING & STUNT SKILL VERIFICATION RADAR */}
                <Route path="/cheer-matrix" element={<CheerMatrixPage />} />
                <Route path="/cheer-matrix/:userId" element={<CheerMatrixPage />} />
                <Route path="/cheermatrix" element={<CheerMatrixPage />} />
                <Route path="/cheermatrix/:userId" element={<CheerMatrixPage />} />
                <Route path="/cheer" element={<CheerMatrixPage />} />
                <Route path="/cheer/:userId" element={<CheerMatrixPage />} />
                <Route path="/cheer/scouting" element={<CheerMatrixPage />} />

                {/* 7.7 SECURE ATHLETE & RECRUITER DIRECT MESSAGING HUB */}
                <Route path="/messages" element={<DirectMessagingView />} />
                <Route path="/messages/:chatId" element={<DirectMessagingView />} />
                <Route path="/direct-messages" element={<DirectMessagingView />} />
                <Route path="/chat" element={<DirectMessagingView />} />
                <Route path="/inbox" element={<DirectMessagingView />} />
                <Route path="/dms" element={<DirectMessagingView />} />

                {/* 7.8 DEDICATED ZERO-COST LIVE BROADCAST & SIDELINE STREAMING HUB */}
                <Route path="/live-hub" element={<LiveBroadcastHubPage />} />
                <Route path="/live-broadcast" element={<LiveBroadcastHubPage />} />
                <Route path="/broadcast" element={<LiveBroadcastHubPage />} />
                <Route path="/sideline" element={<LiveBroadcastHubPage />} />
                <Route path="/sideline-stream" element={<LiveBroadcastHubPage />} />

                {/* 7.9 GOOGLE SHEETS ATHLETIC OPERATIONS HUB */}
                <Route path="/sheets" element={<GoogleSheetsHub />} />
                <Route path="/google-sheets" element={<GoogleSheetsHub />} />
                <Route path="/spreadsheets" element={<GoogleSheetsHub />} />
                <Route path="/dashboard/sheets" element={<GoogleSheetsHub />} />

                {/* 8. PAYPAL PAYMENT & CHECKOUT ROUTES */}
                <Route path="/checkout/paypal" element={<PayPalCheckoutPage />} />
                <Route path="/checkout/stripe" element={<PayPalCheckoutPage />} />
                <Route path="/checkout" element={<PayPalCheckoutPage />} />
                <Route path="/checkout/:id" element={<PayPalCheckoutPage />} />
                <Route path="/billing" element={<Navigate to="/profile" replace />} />

                {/* 8.1 MOBILE ATHLETE JOIN & DIGITAL TOUCH-WAIVER ROUTE */}
                <Route path="/join/:teamId" element={<AthleteJoinPage />} />
                <Route path="/join" element={<Navigate to="/join/demo-team" replace />} />
                <Route path="/waiver/:teamId" element={<AthleteJoinPage />} />
                <Route path="/waiver" element={<Navigate to="/join/demo-team" replace />} />

                {/* Direct Aliases & Smart Redirection */}
                <Route path="/roster" element={<MemberDirectoryView />} />
                <Route path="/watchlist" element={<ScoutWatchlistTab />} />
                <Route path="/vault" element={<Navigate to="/profile?tab=locker" replace />} />
                <Route path="/locker" element={<Navigate to="/profile?tab=locker" replace />} />
                <Route path="/my-locker" element={<Navigate to="/profile?tab=locker" replace />} />
                <Route path="/purchases" element={<Navigate to="/profile?tab=locker" replace />} />
                <Route path="/media-locker" element={<Navigate to="/profile?tab=locker" replace />} />
                <Route path="/community" element={<LockerRoomView />} />
                <Route path="/scores" element={<TournamentCenterView />} />
                <Route path="/scouting" element={<Navigate to="/dashboard/scout" replace />} />
                <Route path="/scout" element={<Navigate to="/dashboard/scout" replace />} />
                <Route path="/leaderboard" element={<Navigate to="/combine" replace />} />
                <Route path="/athlete" element={<Navigate to="/dashboard/athlete" replace />} />
                <Route path="/athletes" element={<ScoutDiscoverTab />} />
                <Route path="/director" element={<Navigate to="/dashboard/director" replace />} />
                <Route path="/live" element={<Navigate to="/dashboard/viewer" replace />} />
                <Route path="/media" element={<Navigate to="/gallery" replace />} />
                <Route path="/film" element={<Navigate to="/dashboard/athlete/film" replace />} />

                {/* Default root routes redirect to the active role dashboard */}
                <Route path="/" element={<RoleDefaultRedirector />} />
                <Route path="/hub" element={<RoleDefaultRedirector />} />
                <Route path="*" element={<RoleDefaultRedirector />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </TabErrorBoundary>
    </CyberRoleLayout>
  </>
);
}

export default function App() {
  return (
    <PayPalSafeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppProvider>
              <PrintCartProvider>
                <PWARefreshHandler />
                <MainAppShell />
              </PrintCartProvider>
            </AppProvider>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </PayPalSafeProvider>
  );
}
