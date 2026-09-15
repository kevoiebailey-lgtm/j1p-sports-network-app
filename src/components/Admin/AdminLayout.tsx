import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../Common/BrandLogo';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { AdminOverviewPage } from './AdminOverviewPage';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminContentPage } from './AdminContentPage';
import { AdminEventsPage } from './AdminEventsPage';
import { AdminFinancialsPage } from './AdminFinancialsPage';
import { AdminSettingsPage } from './AdminSettingsPage';
import { AdminAdManagerPage } from './AdminAdManagerPage';
import { AdminGalleryManagerPage } from './AdminGalleryManagerPage';
import { AdminVideoManagerPage } from './AdminVideoManagerPage';
import { AdminCheckinScannerPage } from './AdminCheckinScannerPage';
import { AdvertiserTrafficAnalyticsDashboard } from './Analytics/AdvertiserTrafficAnalyticsDashboard';
import { PayPalStatusBadge } from './PayPalStatusBadge';
import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  Trophy, 
  DollarSign, 
  Settings, 
  Search, 
  Bell, 
  Menu, 
  X, 
  ChevronRight, 
  LogOut, 
  UserCheck, 
  ArrowLeft, 
  Lock,
  ChevronDown,
  Film,
  FileText,
  Zap,
  Camera,
  FolderPlus,
  QrCode,
  Video,
  HelpCircle,
  Activity,
  Radio,
  Eye
} from 'lucide-react';

export type AdminTab = 'overview' | 'traffic' | 'users' | 'gallery' | 'videos' | 'events' | 'checkins' | 'content' | 'financials' | 'ads' | 'settings';

export const AdminLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  const { profile, role, switchRole, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'traffic' as AdminTab, label: 'Site Traffic & Radar', icon: Activity, badge: 'Live Radar' },
    { id: 'users' as AdminTab, label: 'Members & Rosters', icon: Users, badge: 'Rosters' },
    { id: 'gallery' as AdminTab, label: 'Gallery & Albums', icon: Camera, badge: '4K Vault' },
    { id: 'videos' as AdminTab, label: 'Video Reels & Film', icon: Video, badge: 'Film' },
    { id: 'events' as AdminTab, label: 'Event Tournaments', icon: Trophy, badge: 'Brackets' },
    { id: 'checkins' as AdminTab, label: 'Check-in & Scans', icon: QrCode, badge: 'Scanner' },
    { id: 'content' as AdminTab, label: 'Content Moderation', icon: Film, badge: 'Feed' },
    { id: 'financials' as AdminTab, label: 'Financials & Revenue', icon: DollarSign, badge: 'PayPal' },
    { id: 'ads' as AdminTab, label: 'Ad Space & Monetization', icon: Zap, badge: 'Ads' },
    { id: 'settings' as AdminTab, label: 'Platform Settings', icon: Settings, badge: null },
  ];

  const handleTabSelect = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#080C14] text-slate-100 font-sans relative overflow-hidden select-none">
      
      {/* Subtle Dynamic Ambient Glow Aura (Shifts color subtly based on activeTab) */}
      <div className={`fixed top-0 left-1/4 w-[700px] h-[700px] rounded-full blur-[180px] pointer-events-none transition-all duration-700 z-0 ${
        activeTab === 'financials' 
          ? 'bg-emerald-500/10' 
          : activeTab === 'events' 
            ? 'bg-amber-500/10' 
            : activeTab === 'videos' || activeTab === 'gallery'
              ? 'bg-purple-500/10'
              : 'bg-[#00F2FE]/10'
      }`} />

      {/* 1. DESKTOP OBSIDIAN GLASS SIDEBAR */}
      <aside className={`hidden md:flex flex-col justify-between border-r border-[#00F2FE]/15 bg-[#090E17]/90 backdrop-blur-2xl transition-all duration-300 z-40 shrink-0 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <BrandLogo size="sm" showTagline={false} />
              <span className="px-2 py-0.5 rounded-full bg-[#00F2FE]/15 text-[#00F2FE] border border-[#00F2FE]/30 text-[9px] font-mono font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(0,242,254,0.2)]">
                ADMIN
              </span>
            </div>
          ) : (
            <div className="mx-auto cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-9 h-9 rounded-xl bg-[#00F2FE] text-slate-950 font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(0,242,254,0.5)]">
                J1P
              </div>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer hidden md:block border border-slate-700/60"
            title="Toggle Sidebar Width"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="p-3 space-y-1.5 flex-1 overflow-y-auto scrollbar-none">
          <div className={`px-3 py-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest ${sidebarCollapsed ? 'text-center' : ''}`}>
            {sidebarCollapsed ? '•••' : 'COMMAND CONSOLE'}
          </div>

          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left flex items-center justify-between min-w-0">
                    <span className="truncate font-sans">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                        isActive
                          ? 'bg-[#080C14]/20 border-slate-950/30 text-slate-950 font-extrabold'
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          
          {/* Quick Perspective Role View Switcher */}
          {!sidebarCollapsed && (
            <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                <Eye className="w-3 h-3 text-[#00F2FE]" />
                <span>Perspective Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  onClick={() => switchRole('athlete')}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-center cursor-pointer"
                >
                  🏃 Athlete
                </button>
                <button
                  onClick={() => switchRole('coach')}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-center cursor-pointer"
                >
                  📋 Coach
                </button>
              </div>
            </div>
          )}

          {/* Return to Public Platform */}
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white font-bold text-xs uppercase transition-all cursor-pointer ${
              sidebarCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Return to Public App"
          >
            <ArrowLeft className="w-4 h-4 text-[#00F2FE]" />
            {!sidebarCollapsed && <span>Public Platform</span>}
          </button>

          {/* User Profile Mini Bar */}
          {!sidebarCollapsed && (
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
              <img
                src={profile?.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                alt="Admin Avatar"
                className="w-8 h-8 rounded-full object-cover border border-[#00F2FE]"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <span>{profile?.displayName || 'Admin Console'}</span>
                  <VerifiedBadge size="sm" showTooltip={false} />
                </div>
                <div className="text-[10px] text-[#00F2FE] font-mono font-bold uppercase">
                  Super Admin
                </div>
              </div>
            </div>
          )}

        </div>

      </aside>

      {/* 2. MOBILE TOP BAR & DRAWER */}
      <div className="md:hidden border-b border-slate-800/80 bg-[#090E17]/95 backdrop-blur-xl p-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <BrandLogo size="sm" showTagline={false} />
          <span className="px-2 py-0.5 rounded-full bg-[#00F2FE]/15 text-[#00F2FE] border border-[#00F2FE]/30 text-[9px] font-mono font-bold uppercase">
            ADMIN
          </span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-white cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[65px] bottom-0 z-40 bg-[#080C14]/95 backdrop-blur-2xl p-6 overflow-y-auto space-y-3 animate-fadeIn">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">
            ADMIN COMMAND CONSOLE NAVIGATION
          </div>

          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabSelect(item.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.4)]'
                    : 'bg-[#0F1520]/80 text-slate-300 border border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComp className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#080C14]/20 text-slate-950 font-extrabold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/faq');
            }}
            className="w-full p-4 rounded-2xl bg-slate-800/60 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 border border-slate-700/60 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-[#00F2FE]" />
            <span>Help Center &amp; FAQs</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-2 p-4 rounded-2xl bg-slate-800/60 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 border border-slate-700/60 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#00F2FE]" />
            <span>Return to Public App Hub</span>
          </button>
        </div>
      )}

      {/* 3. MAIN CONTENT CONTAINER (INDEPENDENT SCROLL + PB-32) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header Bar with Obsidian Glass & Real-Time Sync Indicator */}
        <header className="shrink-0 h-16 border-b border-[#00F2FE]/15 bg-[#090E17]/85 backdrop-blur-2xl px-6 flex items-center justify-between gap-4 z-30">
          
          {/* Global Admin Search Bar with Cmd + K */}
          <div className="relative max-w-xs sm:max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Command search (users, tournaments, ads)..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-12 py-2 rounded-full bg-[#080C14]/80 border border-slate-800/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] transition-all font-sans"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700/50 hidden sm:inline-block">
              ⌘K
            </kbd>
          </div>

          {/* Right Controls: Live Cloud Sync, Stripe Badge, Notifications & Profile */}
          <div className="flex items-center gap-3">
            
            {/* Live Firestore & Cloud Sync Heartbeat Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold uppercase shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>Cloud Sync: Active • 14ms</span>
            </div>

            {/* PayPal Connection Health Badge */}
            <PayPalStatusBadge />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all relative cursor-pointer"
                title="System Alert Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#00F2FE] border-2 border-slate-950 animate-pulse" />
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 p-4 rounded-3xl bg-[#090E17] border border-[#00F2FE]/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] z-50 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black uppercase text-white font-sans">Admin Alerts</span>
                    <span className="text-[10px] font-mono text-[#00F2FE]">Live Telemetry</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#080C14] border border-slate-800 space-y-1">
                      <div className="font-bold text-white font-sans">New NCAA Verification Request</div>
                      <div className="text-[11px] text-slate-400">Devin Carter submitted high school credentials.</div>
                      <div className="text-[9px] text-slate-500 font-mono">5 mins ago</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#080C14] border border-slate-800 space-y-1">
                      <div className="font-bold text-white font-sans">Ad Creative Approved</div>
                      <div className="text-[11px] text-slate-400">Gatorade AD-HERO placement live now.</div>
                      <div className="text-[9px] text-slate-500 font-mono">18 mins ago</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-white font-sans hidden sm:inline">
                  {profile?.displayName || 'Admin Console'}
                </span>
                <img
                  src={profile?.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}
                  alt="Admin Avatar"
                  className="w-7 h-7 rounded-full object-cover border border-[#00F2FE]"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Popover */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-3 w-60 p-4 rounded-3xl bg-[#090E17] border border-slate-800 shadow-2xl z-50 space-y-3 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-2">
                    <div className="text-xs font-bold text-white">{profile?.displayName || 'System Admin'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{profile?.email || 'admin@just1play.ai.studio'}</div>
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00F2FE]/10 text-[#00F2FE] text-[9px] font-mono font-bold uppercase border border-[#00F2FE]/30">
                      Role: System Admin
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => switchRole('athlete')}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 font-sans font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>Switch to Athlete View</span>
                      <UserCheck className="w-3.5 h-3.5 text-[#00F2FE]" />
                    </button>

                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 font-sans font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span>Sign Out</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* Scrollable View Area with Mandatory PB-32 Bottom Padding */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32 scrollbar-none z-10">
          {activeTab === 'overview' && <AdminOverviewPage onNavigateTab={(t) => setActiveTab(t as AdminTab)} />}
          {activeTab === 'traffic' && <AdvertiserTrafficAnalyticsDashboard onNavigateTab={(t) => setActiveTab(t as AdminTab)} />}
          {activeTab === 'users' && <AdminUsersPage />}
          {activeTab === 'gallery' && <AdminGalleryManagerPage />}
          {activeTab === 'videos' && <AdminVideoManagerPage />}
          {activeTab === 'events' && <AdminEventsPage />}
          {activeTab === 'checkins' && <AdminCheckinScannerPage />}
          {activeTab === 'content' && <AdminContentPage />}
          {activeTab === 'financials' && <AdminFinancialsPage />}
          {activeTab === 'ads' && <AdminAdManagerPage />}
          {activeTab === 'settings' && <AdminSettingsPage />}
        </main>

      </div>

    </div>
  );
};
