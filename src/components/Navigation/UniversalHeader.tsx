import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  LogIn, 
  LogOut, 
  ChevronDown, 
  Search, 
  RefreshCw, 
  Lock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole, normalizeRole } from '../../hooks/useAuthRole';
import { usePrimaryNavigation } from '../../hooks/usePrimaryNavigation';
import { AuthModal } from '../Auth/AuthModal';
import { AppMatrixDrawer } from './AppMatrixDrawer';
import { DirectMessageBadge } from './DirectMessageBadge';
import { UserRole, UserDoc } from '../../types/platform';
import { BrandLogo } from '../Common/BrandLogo';
import { useLogo } from '../../context/LogoContext';
import { useApp } from '../../context/AppContext';
import { LogoSwitcherModal } from './LogoSwitcherModal';
import { SyncStatusWidget } from './SyncStatusWidget';
import { ProfileDropdown } from './ProfileDropdown';

export const UniversalHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, role, isLoading, isRoleLoading, isAdmin, switchRole, signOut: authSignOut } = useAuth();
  const { userDoc, roleLocked } = useAuthRole();
  const { primaryTabs, isTabActive, preloadTab } = usePrimaryNavigation();
  const { openLogoSwitcher } = useLogo();
  const { openSearch } = useApp();
  
  const [isMatrixDrawerOpen, setIsMatrixDrawerOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for global custom events to open Auth Modal or Matrix Drawer
  useEffect(() => {
    const handleOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: 'login' | 'signup' }>;
      setAuthModalMode(customEvent.detail?.mode || 'login');
      setShowAuthModal(true);
    };

    const handleOpenMatrix = () => {
      setIsMatrixDrawerOpen(true);
    };

    window.addEventListener('app:open-auth-modal', handleOpenAuth);
    window.addEventListener('app:open-matrix-drawer', handleOpenMatrix);

    return () => {
      window.removeEventListener('app:open-auth-modal', handleOpenAuth);
      window.removeEventListener('app:open-matrix-drawer', handleOpenMatrix);
    };
  }, []);

  const displayName = profile?.displayName || userDoc?.displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Athletic Member');
  const avatarUrl = profile?.photoURL || (profile as any)?.avatarUrl || userDoc?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  const handleSignOut = async () => {
    try {
      await authSignOut();
      setShowProfileMenu(false);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const handleTabClick = (tab: typeof primaryTabs[0]) => {
    if (tab.isAuthTrigger || tab.path === '#join') {
      setAuthModalMode('signup');
      setShowAuthModal(true);
      return;
    }
    navigate(tab.path);
  };

  return (
    <>
      <header id="universal-header" className="pt-[env(safe-area-inset-top)] sticky top-0 z-40 bg-[#090D16]/90 backdrop-blur-md border-b border-[#24324F] px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 h-12 sm:h-14">
          
          {/* Left: Brand Logo & Quick Style Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 select-none min-h-[36px] sm:min-h-[44px] shrink-0 min-w-0">
            <div 
              onClick={() => navigate('/')}
              className="flex items-center shrink-0 min-w-0 cursor-pointer group"
            >
              <BrandLogo size="sm" showBadge={true} allowSwitch={true} />
            </div>

            {/* Quick Logo Style Switcher Button (Desktop only to conserve mobile width) */}
            <button
              type="button"
              onClick={openLogoSwitcher}
              className="hidden sm:inline-flex p-1.5 rounded-lg bg-slate-800/80 hover:bg-[#FF6A00]/20 text-slate-400 hover:text-[#FF6A00] border border-slate-700/60 transition-all cursor-pointer shrink-0"
              title="Switch logo style"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Primary Navigation Tabs (Non-essential links hidden < xl to preserve top bar cleanliness) */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {primaryTabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = isTabActive(tab);
              const isNonEssential = tab.id === 'wall' || tab.id === 'gallery';
              const isMasterCommand = tab.id === 'admin_command';

              return (
                <button
                  key={tab.id}
                  id={`header-nav-tab-${tab.id}`}
                  onClick={() => handleTabClick(tab)}
                  onMouseEnter={() => preloadTab(idx)}
                  onTouchStart={() => preloadTab(idx)}
                  className={`min-h-[40px] ${isNonEssential ? 'hidden xl:flex' : 'flex'} items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isActive
                      ? (tab.activeBorder || 'border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]')
                      : 'bg-[#263238]/60 border-[#24324F] text-slate-300 hover:text-white hover:border-slate-500 hover:bg-[#263238]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={tab.iconClass || 'w-4 h-4'} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {tab.badge && (
                    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-mono font-black tracking-wider uppercase rounded ${
                      isMasterCommand && isActive
                        ? 'bg-[#EC4899] text-white border border-pink-300 shadow-[0_0_14px_rgba(236,72,153,0.95)] ring-1 ring-white/50 font-black'
                        : isMasterCommand
                          ? 'bg-[#EC4899]/30 text-pink-300 border border-pink-500/50 shadow-[0_0_8px_rgba(236,72,153,0.3)]'
                          : 'hidden xl:inline-block bg-black/40 border border-white/10 text-slate-300'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Search, Direct Messages, Explore Matrix Button & User Profile / Login */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Global Matrix Search Button */}
            <button
              onClick={openSearch}
              className="flex items-center justify-center h-9 w-9 sm:h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-lg bg-slate-850 sm:bg-[#263238]/60 hover:bg-[#263238] border border-slate-700/60 sm:border-[#24324F] hover:border-cyan-400/60 text-xs font-bold text-slate-200 sm:text-slate-300 hover:text-white shrink-0 sm:gap-2 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] active:scale-95"
              aria-label="Open Global Search"
              title="Global Matrix Search (Cmd+K)"
            >
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="hidden lg:inline text-slate-400 text-[11px] font-mono whitespace-nowrap">Search</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-slate-400 font-mono border border-white/10">⌘K</kbd>
            </button>

            {/* Local IndexedDB <-> Firestore Synchronization State Indicator */}
            <SyncStatusWidget />

            {/* Real-time Direct Messages Notification Badge */}
            <DirectMessageBadge onOpenDMModal={() => {
              if (!user) {
                setAuthModalMode('login');
                setShowAuthModal(true);
              }
            }} />

            {/* "☰ Explore / Matrix" Drawer Button (Responsive Square on Mobile) */}
            <button
              id="header-explore-matrix-btn"
              onClick={() => setIsMatrixDrawerOpen(true)}
              className="flex items-center justify-center h-9 w-9 sm:h-9 sm:w-auto sm:px-3.5 sm:py-1.5 rounded-lg bg-slate-850 sm:bg-gradient-to-r sm:from-cyan-950/90 sm:via-[#1E293B] sm:to-[#263238] hover:from-cyan-900 hover:to-[#263238] border border-slate-700/60 sm:border-cyan-400/70 hover:border-cyan-300 text-xs font-black text-slate-200 sm:text-cyan-300 hover:text-white shrink-0 sm:gap-1.5 transition-all cursor-pointer shadow-sm sm:shadow-[0_0_12px_rgba(0,184,212,0.25)] hover:shadow-[0_0_18px_rgba(0,184,212,0.45)] active:scale-95"
              aria-label="Open Explore Matrix Drawer"
              title="Explore Matrix"
            >
              <Menu className="w-4 h-4 text-slate-200 sm:text-cyan-400 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Explore Matrix</span>
            </button>

            {/* User Profile Avatar / Login CTA / Steady Loading Placeholder */}
            {!mounted ? (
              <div 
                id="universal-header-auth-skeleton"
                className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.08] select-none shrink-0"
              />
            ) : isLoading && user && !user.isAnonymous ? (
              <div 
                id="universal-header-auth-loading"
                className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.08] animate-pulse select-none shrink-0"
                title="Verifying credentials..."
              >
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-[#00F0D0] rounded-full animate-spin" />
              </div>
            ) : (!user || user.isAnonymous) ? (
              <button
                id="universal-header-login-btn"
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center justify-center h-9 w-9 sm:h-9 sm:w-auto sm:px-3.5 sm:py-1.5 rounded-lg bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs shadow-[0_0_12px_rgba(0,184,212,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 sm:gap-1.5"
                title="Log In"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Log In</span>
              </button>
            ) : (
              <div className="relative shrink-0">
                <button
                  id="universal-header-profile-btn"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center justify-center h-9 w-9 sm:h-9 sm:w-auto p-1 sm:p-1.5 rounded-lg bg-slate-850 sm:bg-[#263238]/80 border border-slate-700/60 sm:border-[#24324F] hover:border-[#00B8D4] cursor-pointer transition-all shrink-0 sm:gap-1.5"
                  aria-label="User Menu"
                >
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-7 h-7 rounded-md object-cover border border-slate-600 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <ChevronDown className={`hidden sm:inline-block w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown */}
                <ProfileDropdown
                  isOpen={showProfileMenu}
                  onClose={() => setShowProfileMenu(false)}
                  user={user}
                  userDoc={userDoc || (profile as unknown as UserDoc)}
                  displayName={displayName}
                  avatarUrl={avatarUrl}
                  role={normalizeRole(role)}
                  roleLocked={roleLocked}
                  isAdmin={isAdmin}
                  switchRole={(targetRole) => switchRole(targetRole as any)}
                  onSignOut={handleSignOut}
                />
              </div>
            )}

          </div>

        </div>
      </header>

      {/* App Matrix Drawer */}
      <AppMatrixDrawer
        isOpen={isMatrixDrawerOpen}
        onClose={() => setIsMatrixDrawerOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />

      {/* Brand Logo Switcher Modal */}
      <LogoSwitcherModal />
    </>
  );
};

export default UniversalHeader;
