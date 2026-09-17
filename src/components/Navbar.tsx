import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Search, 
  Calendar, 
  Camera, 
  User, 
  Users,
  Home,
  ShieldCheck, 
  Sparkles, 
  LogOut, 
  LogIn, 
  ChevronDown,
  ChevronUp,
  Activity,
  Flame,
  CheckCircle2,
  Radio,
  Tv,
  Shield,
  Zap,
  Bell,
  Menu,
  X,
  Globe,
  Film,
  BookOpen,
  Building2,
  Grid,
  Layers,
  ArrowUpRight,
  Plus,
  PlusCircle,
  Link2,
  Send,
  Video,
  QrCode,
  Heart,
  DollarSign,
  HardDrive,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { MainTab, UserRole } from '../types';
import { AuthModal } from './Auth/AuthModal';
import { DirectMessageBadge } from './Navigation/DirectMessageBadge';
import { NotificationDrawer } from './Notifications/NotificationDrawer';
import { VerifiedBadge } from './Common/VerifiedBadge';
import { BrandLogo } from './Common/BrandLogo';
import { DonationModal } from './Common/DonationModal';

interface NavbarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  onOpenDM?: (targetUid: string, targetName: string) => void;
  onOpenStorefrontPage?: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onOpenDM,
  onOpenStorefrontPage
}) => {
  const { user, profile, role, switchRole, signOut, setDemoProfile } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(2);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showStorefrontMenu, setShowStorefrontMenu] = useState<boolean>(false);
  const [showMobileMoreSheet, setShowMobileMoreSheet] = useState<boolean>(false);
  const [showQuickPostModal, setShowQuickPostModal] = useState<boolean>(false);
  const [mobileBarCollapsed, setMobileBarCollapsed] = useState<boolean>(false);
  const [quickFilmUrl, setQuickFilmUrl] = useState<string>('');
  const [quickCaption, setQuickCaption] = useState<string>('');
  const [quickSuccess, setQuickSuccess] = useState<boolean>(false);

  const currentUid = user?.uid || profile?.uid || 'demo-user';

  // Check if active tab is one of the secondary tabs in the "More" popover
  const isSecondaryActive = ['organizations', 'media', 'blog', 'gallery', 'profile', 'admin'].includes(activeTab);

  // Real-time unread notification badge counter
  React.useEffect(() => {
    if (!currentUid) return;

    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', currentUid),
        where('read', '==', false)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadNotifCount(snapshot.size > 0 ? snapshot.size : 2);
      }, (err) => {
        console.warn('Navbar notification count listener error:', err);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Navbar notification listener setup error:', err);
    }
  }, [currentUid]);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/90 dark:bg-[#000000]/90 border-b border-gray-200 dark:border-white/10 transition-all shadow-md dark:shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo Link */}
        <Link to="/" onClick={() => setActiveTab('home')} className="flex-shrink-0">
          <BrandLogo 
            size="md" 
            showTagline={false} 
            showBadge={false}
          />
        </Link>

        {/* Desktop Top Organized Navigation Bar (Visible md:flex) */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-none max-w-[50vw] lg:max-w-[60vw] xl:max-w-none bg-gray-100 dark:bg-white/5 p-1.5 rounded-full border border-gray-200 dark:border-white/10 backdrop-blur-md shadow-inner shrink-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'home'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <Home className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'home' ? 'text-black' : 'text-[#E5B868]'}`} />
            <span>HOME</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'live'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-red-500 dark:text-red-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <Tv className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'live' ? 'text-black' : 'text-red-500 animate-pulse'}`} />
            <span className="flex items-center gap-1">
              LIVE
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'events'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'events' ? 'text-black' : 'text-slate-300 dark:text-slate-300'}`} />
            <span>EVENTS</span>
          </button>

          <button
            onClick={() => setActiveTab('athletes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'athletes'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <Users className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'athletes' ? 'text-black' : 'text-red-600 dark:text-red-500'}`} />
            <span>ATHLETES</span>
          </button>

          <button
            onClick={() => setActiveTab('organizations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'organizations'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'organizations' ? 'text-black' : 'text-amber-500 dark:text-amber-400'}`} />
            <span>ORGS</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'media'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <Film className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'media' ? 'text-black' : 'text-rose-500 dark:text-rose-400'}`} />
            <span>MEDIA</span>
          </button>

          <button
            onClick={() => setActiveTab('blog')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'blog'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'blog' ? 'text-black' : 'text-purple-500 dark:text-purple-400'}`} />
            <span>BLOG</span>
          </button>

          <button
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'social'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'social' ? 'text-black' : 'text-orange-500 dark:text-orange-400'}`} />
            <span>SOCIAL</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'gallery'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <Camera className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'gallery' ? 'text-black' : 'text-indigo-500 dark:text-indigo-400'}`} />
            <span>GALLERY</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'drive'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
            title="Google Drive Cloud Vault"
          >
            <HardDrive className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'drive' ? 'text-black' : 'text-[#E5B868]'}`} />
            <span>DRIVE</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
            title="Google Calendar Schedule Sync"
          >
            <Calendar className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'calendar' ? 'text-black' : 'text-[#E5B868]'}`} />
            <span>CALENDAR</span>
          </button>

          <button
            onClick={() => setActiveTab('forms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'forms'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
            title="Google Forms & Surveys Hub"
          >
            <FileText className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'forms' ? 'text-black' : 'text-[#E5B868]'}`} />
            <span>FORMS</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'bg-[#E5B868] text-black shadow-[0_0_20px_rgba(214,28,36,0.6)] font-extrabold scale-105'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200/70 dark:hover:bg-white/10'
            }`}
          >
            <User className={`w-3.5 h-3.5 stroke-[2] ${activeTab === 'profile' ? 'text-black' : 'text-[#E5B868] dark:text-blue-400'}`} />
            <span>PROFILE</span>
          </button>

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer border shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_20px_rgba(214,28,36,0.6)]'
                  : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 hover:bg-red-500/30'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>ADMIN</span>
            </button>
          )}
        </nav>

        {/* User Role Switcher & Auth Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Quick Donate / PayPal Test Button */}
          <button
            onClick={() => setShowDonationModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5B868]/10 hover:bg-[#E5B868]/20 border border-[#E5B868]/40 hover:border-[#E5B868] transition-all text-xs font-black text-[#E5B868] cursor-pointer shadow-[0_0_12px_rgba(214,28,36,0.25)] hover:scale-105"
            title="Donate or test PayPal payment"
          >
            <Heart className="w-3.5 h-3.5 fill-[#E5B868]" />
            <span className="uppercase tracking-wider font-extrabold">DONATE</span>
          </button>
          
          {/* Public Storefront Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStorefrontMenu(!showStorefrontMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/15 hover:border-[#E5B868]/60 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#E5B868]" />
              <span className="hidden xl:inline uppercase tracking-wider">Pages</span>
              <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            </button>

            {showStorefrontMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-[#000000] border border-gray-200 dark:border-white/20 shadow-xl dark:shadow-2xl backdrop-blur-2xl p-2 z-50 text-xs font-bold">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#E5B868] border-b border-gray-100 dark:border-white/10 mb-1 flex items-center justify-between">
                  <span>Storefront Hub</span>
                  <Globe className="w-3 h-3 text-[#E5B868]" />
                </div>
                <button
                  onClick={() => { onOpenStorefrontPage?.('landing'); setShowStorefrontMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors uppercase flex items-center justify-between"
                >
                  <span>Landing Page</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </button>
                <button
                  onClick={() => { onOpenStorefrontPage?.('about'); setShowStorefrontMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors uppercase flex items-center justify-between"
                >
                  <span>About Just1Play</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </button>
                <button
                  onClick={() => { onOpenStorefrontPage?.('pricing'); setShowStorefrontMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors uppercase flex items-center justify-between"
                >
                  <span>Pricing & Media</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </button>
                <button
                  onClick={() => { onOpenStorefrontPage?.('advertise'); setShowStorefrontMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[#E5B868] font-extrabold hover:bg-[#E5B868]/10 transition-colors uppercase flex items-center justify-between border border-[#E5B868]/30 my-0.5"
                >
                  <span>📢 Advertise With Us</span>
                  <ArrowUpRight className="w-3 h-3 text-[#E5B868]" />
                </button>
                <button
                  onClick={() => { onOpenStorefrontPage?.('contact'); setShowStorefrontMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors uppercase flex items-center justify-between"
                >
                  <span>Contact Team</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </button>
                <button
                  onClick={() => { onOpenStorefrontPage?.('faq'); setShowStorefrontMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors uppercase flex items-center justify-between"
                >
                  <span>FAQ & Rules</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </button>
                <Link
                  to="/cheer-matrix"
                  onClick={() => setShowStorefrontMenu(false)}
                  className="w-full text-left px-3 py-2 rounded-xl text-emerald-500 font-extrabold hover:bg-emerald-500/10 transition-colors uppercase flex items-center justify-between border border-emerald-500/30 my-0.5"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>CheerMatrix™ Radar</span>
                  </span>
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                </Link>
              </div>
            )}
          </div>

          {/* Active Role Selector Dropdown (Admin Only) */}
          {(role === 'admin' || profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'kevoiebailey@gmail.com') && (
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/15 hover:border-[#E5B868]/60 transition-all text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#E5B868] shadow-[0_0_10px_#E5B868] animate-pulse" />
                <span className="uppercase tracking-wider font-bold">
                  <span className="hidden sm:inline">ADMIN: </span>
                  <span className="text-[#E5B868] font-black">{role.replace('_', ' ')}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#000000] border border-gray-200 dark:border-white/20 shadow-xl dark:shadow-2xl backdrop-blur-2xl p-2.5 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#E5B868] border-b border-gray-100 dark:border-white/10 mb-1.5 flex items-center justify-between">
                    <span>Admin View Switcher</span>
                  </div>

                  <button
                    onClick={() => { 
                      switchRole('athlete'); 
                      setShowRoleDropdown(false); 
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
                      role === 'athlete' ? 'bg-[#E5B868]/20 text-slate-900 dark:text-[#E5B868] border border-[#E5B868]/40' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#E5B868]" />
                      <span>1. Athlete</span>
                    </div>
                    {role === 'athlete' && <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />}
                  </button>

                  <button
                    onClick={() => { switchRole('scout'); setShowRoleDropdown(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors mt-1 ${
                      role === 'scout' ? 'bg-[#E5B868]/20 text-cyan-600 dark:text-slate-300 border border-[#E5B868]/40' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-300 dark:text-slate-300" />
                      <span>2. Scout (Recruiter)</span>
                    </div>
                    {role === 'scout' && <CheckCircle2 className="w-4 h-4 text-slate-300 dark:text-slate-300" />}
                  </button>

                  <button
                    onClick={() => { switchRole('coach'); setShowRoleDropdown(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors mt-1 ${
                      role === 'coach' ? 'bg-[#E5B868]/20 text-slate-900 dark:text-[#E5B868] border border-[#E5B868]/40' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#E5B868]" />
                      <span>3. Coach</span>
                    </div>
                    {role === 'coach' && <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />}
                  </button>

                  <button
                    onClick={() => { switchRole('organization'); setShowRoleDropdown(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors mt-1 ${
                      role === 'organization' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>4. Organization (Admin)</span>
                    </div>
                    {role === 'organization' && <CheckCircle2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
                  </button>

                  <button
                    onClick={() => { switchRole('creator'); setShowRoleDropdown(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors mt-1 ${
                      role === 'creator' || role === 'content_creator' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                      <span>5. Content Creator</span>
                    </div>
                    {(role === 'creator' || role === 'content_creator') && <CheckCircle2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>

                  <button
                    onClick={() => { switchRole('viewer'); setShowRoleDropdown(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors mt-1 ${
                      role === 'viewer' ? 'bg-[#E5B868]/20 text-cyan-600 dark:text-slate-300 border border-[#E5B868]/40' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-slate-300 dark:text-slate-300" />
                      <span>6. Parent / Fan / Spectator</span>
                    </div>
                    {role === 'viewer' && <CheckCircle2 className="w-4 h-4 text-slate-300 dark:text-slate-300" />}
                  </button>

                  <button
                    onClick={() => { switchRole('admin'); setShowRoleDropdown(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors mt-1 ${
                      role === 'admin' ? 'bg-[#E5B868]/20 text-slate-900 dark:text-[#E5B868] border border-[#E5B868]/50 font-black' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#E5B868]" />
                      <span>7. Admin (System Owner)</span>
                    </div>
                    {role === 'admin' && <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Direct Message Visual Indicator Badge */}
          <DirectMessageBadge onOpenDMModal={onOpenDM ? () => onOpenDM('', '') : undefined} />

          {/* Real-time Notification Hub Trigger */}
          <button
            onClick={() => setShowNotificationDrawer(true)}
            className="relative p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-[#E5B868] border border-white/15 transition-all shadow-lg group cursor-pointer"
            title="Notification Hub Alerts"
          >
            <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E5B868] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#E5B868] text-black font-black text-[9px] items-center justify-center">
                  {unreadNotifCount}
                </span>
              </span>
            )}
          </button>

          {/* Direct Firebase Auth Modal or Logged In User Profile */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <img
                  src={user?.photoURL || profile?.avatarUrl || profile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover border border-[#E5B868]"
                />
                <span className="text-xs font-bold text-slate-200 max-w-[100px] truncate hidden sm:inline flex items-center gap-1">
                  <span>{user?.displayName || profile?.displayName}</span>
                  {(profile?.isVerified ?? true) && <VerifiedBadge size="sm" />}
                </span>
              </div>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-full border border-white/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(214,28,36,0.5)] transition-all transform hover:scale-[1.02] cursor-pointer"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span className="uppercase">Sign In / Register</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Toggle Button (Visible lg:hidden) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-white/10 text-slate-200 hover:text-[#E5B868] border border-white/15 focus:outline-none transition-colors cursor-pointer"
            aria-label="Toggle Mobile Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#E5B868]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Quick Navigation Tab Bar (Visible on mobile below main row) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none px-4 py-2 bg-black/90 border-t border-white/10 shrink-0">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <Home className="w-3 h-3 text-current" />
          <span>HOME</span>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'live'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <Tv className="w-3 h-3 text-red-500" />
          <span>LIVE</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'events'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <Calendar className="w-3 h-3 text-slate-300" />
          <span>EVENTS</span>
        </button>

        <button
          onClick={() => setActiveTab('athletes')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'athletes'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <Users className="w-3 h-3 text-red-500" />
          <span>ATHLETES</span>
        </button>

        <button
          onClick={() => setActiveTab('organizations')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'organizations'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <Building2 className="w-3 h-3 text-amber-400" />
          <span>ORGS</span>
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'media'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <Film className="w-3 h-3 text-rose-400" />
          <span>MEDIA</span>
        </button>

        <button
          onClick={() => setActiveTab('blog')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'blog'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <BookOpen className="w-3 h-3 text-purple-400" />
          <span>BLOG</span>
        </button>

        <button
          onClick={() => setActiveTab('social')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'social'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <Flame className="w-3 h-3 text-orange-400" />
          <span>SOCIAL</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'gallery'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <Camera className="w-3 h-3 text-indigo-400" />
          <span>GALLERY</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.5)]'
              : 'bg-white/5 text-slate-300 border border-white/10'
          }`}
        >
          <User className="w-3 h-3 text-blue-400" />
          <span>PROFILE</span>
        </button>
      </div>

      {/* Mobile Animated Top Hamburger Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden bg-[#000000] border-b border-[#E5B868]/40 shadow-[0_20px_40px_rgba(0,0,0,0.95)] backdrop-blur-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5B868] animate-pulse"></div>
                  <span className="text-xs font-black uppercase tracking-widest text-[#E5B868] font-mono">
                    JUST1PLAY DIRECTORY
                  </span>
                </div>
                <button
                  onClick={() => { setShowDonationModal(true); setMobileMenuOpen(false); }}
                  className="px-2.5 py-1 rounded-full bg-[#E5B868] text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(214,28,36,0.5)] cursor-pointer"
                >
                  <Heart className="w-3 h-3 fill-black" />
                  <span>Donate</span>
                </button>
              </div>

              {/* Categorized Mobile Navigation Grid */}
              <div className="space-y-4">
                {/* Group 1: Core Hubs */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
                    Core Network Hubs
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'home'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <Home className={`w-4 h-4 ${activeTab === 'home' ? 'text-black' : 'text-[#E5B868]'}`} />
                      <span>HOME</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('events'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'events'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <Calendar className={`w-4 h-4 ${activeTab === 'events' ? 'text-black' : 'text-slate-300'}`} />
                      <span>EVENTS</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('athletes'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'athletes'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <Users className={`w-4 h-4 ${activeTab === 'athletes' ? 'text-black' : 'text-red-500'}`} />
                      <span>ATHLETES</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('organizations'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'organizations'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <Building2 className={`w-4 h-4 ${activeTab === 'organizations' ? 'text-black' : 'text-amber-400'}`} />
                      <span>ORGS & TEAMS</span>
                    </button>
                  </div>
                </div>

                {/* Group 2: Content & Media */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
                    Content & Media Vault
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setActiveTab('social'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'social'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <Flame className={`w-4 h-4 ${activeTab === 'social' ? 'text-black' : 'text-orange-400'}`} />
                      <span>SOCIAL</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('media'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'media'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <Film className={`w-4 h-4 ${activeTab === 'media' ? 'text-black' : 'text-rose-400'}`} />
                      <span>MEDIA</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('blog'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'blog'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <BookOpen className={`w-4 h-4 ${activeTab === 'blog' ? 'text-black' : 'text-purple-400'}`} />
                      <span>BLOG</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('gallery'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'gallery'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <Camera className={`w-4 h-4 ${activeTab === 'gallery' ? 'text-black' : 'text-indigo-400'}`} />
                      <span>GALLERY</span>
                    </button>
                  </div>
                </div>

                {/* Group 3: Account & Admin */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
                    Profile & Portal
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'profile'
                          ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                          : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                      }`}
                    >
                      <User className={`w-4 h-4 ${activeTab === 'profile' ? 'text-black' : 'text-blue-400'}`} />
                      <span>MY PROFILE</span>
                    </button>

                    {role === 'admin' && (
                      <button
                        onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeTab === 'admin'
                            ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        <span>ADMIN</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Storefront Pages Links */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Storefront Navigation Pages
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-[11px] text-slate-300 font-bold">
                  <button onClick={() => { onOpenStorefrontPage?.('landing'); setMobileMenuOpen(false); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-center uppercase cursor-pointer">Landing</button>
                  <button onClick={() => { onOpenStorefrontPage?.('about'); setMobileMenuOpen(false); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-center uppercase cursor-pointer">About</button>
                  <button onClick={() => { onOpenStorefrontPage?.('pricing'); setMobileMenuOpen(false); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-center uppercase cursor-pointer">Pricing</button>
                  <button onClick={() => { onOpenStorefrontPage?.('contact'); setMobileMenuOpen(false); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-center uppercase cursor-pointer">Contact</button>
                  <button onClick={() => { onOpenStorefrontPage?.('faq'); setMobileMenuOpen(false); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-center uppercase cursor-pointer">FAQ</button>
                  <button onClick={() => { onOpenStorefrontPage?.('terms'); setMobileMenuOpen(false); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-center uppercase cursor-pointer">Terms</button>
                  <Link to="/cheer-matrix" onClick={() => setMobileMenuOpen(false)} className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-center uppercase font-black cursor-pointer">CheerMatrix</Link>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standalone Authentication Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Quick Donation & Stripe Payment Test Modal */}
      <DonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} />

      {/* Real-time Notification Drawer */}
      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
        onOpenDM={onOpenDM}
        onNavigateToFeed={() => setActiveTab('social')}
      />

      {/* --- 5-TARGET FLOATING MOBILE NAVIGATION BAR ("THE SMART DOCK") --- */}
      {mobileBarCollapsed ? (
        <div 
          className="lg:hidden fixed bottom-0 right-4 z-50 pointer-events-none pb-3"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
        >
          <button
            onClick={() => setMobileBarCollapsed(false)}
            className="pointer-events-auto px-3.5 py-2 rounded-full bg-[#212A31]/95 border-2 border-[#E5B868] text-[#E5B868] text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_25px_rgba(214,28,36,0.5)] backdrop-blur-2xl cursor-pointer hover:scale-105 transition-all mb-2"
            title="Expand Mobile Navigation Menu"
          >
            <ChevronUp className="w-4 h-4 text-[#E5B868] animate-bounce" />
            <span>SMART DOCK</span>
          </button>
        </div>
      ) : (
        <div 
          className="lg:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center px-3"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
        >
          <div className="pointer-events-auto w-[95%] max-w-[420px] mb-2 bg-[#212A31]/95 backdrop-blur-2xl border border-[#E5B868]/30 rounded-full px-3 py-2 flex items-center justify-between shadow-[0_10px_35px_rgba(0,0,0,0.95)] transition-all">
          
          {/* 1. HOME */}
          <button
            onClick={() => { setActiveTab('home'); setShowMobileMoreSheet(false); }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-black tracking-wider transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'text-[#E5B868] scale-110'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'text-[#E5B868] stroke-[2.5]' : 'text-[#94A3B8] stroke-[1.75]'}`} />
            <span>HOME</span>
            {activeTab === 'home' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B868] shadow-[0_0_8px_#E5B868]" />
            )}
          </button>

          {/* 2. EXPLORE */}
          <button
            onClick={() => { setActiveTab('athletes'); setShowMobileMoreSheet(false); }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-black tracking-wider transition-all cursor-pointer ${
              activeTab === 'athletes'
                ? 'text-[#E5B868] scale-110'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Search className={`w-5 h-5 ${activeTab === 'athletes' ? 'text-[#E5B868] stroke-[2.5]' : 'text-[#94A3B8] stroke-[1.75]'}`} />
            <span>EXPLORE</span>
            {activeTab === 'athletes' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B868] shadow-[0_0_8px_#E5B868]" />
            )}
          </button>

          {/* 3. POST (Central Hub Pulsing Action Button) */}
          <div className="relative -top-5 flex items-center justify-center">
            <button
              onClick={() => setShowQuickPostModal(true)}
              className="w-13 h-13 rounded-full bg-[#E5B868] hover:bg-[#B8141B] text-black font-black flex items-center justify-center shadow-[0_0_25px_#E5B868] border-2 border-black transform active:scale-95 transition-all cursor-pointer group animate-pulse"
              title="Central Hub Actions"
              aria-label="Central Hub Quick Action Menu"
            >
              <Plus className="w-7 h-7 stroke-[3] group-hover:rotate-90 transition-transform duration-300 text-black" />
            </button>
          </div>

          {/* 4. NOTIFICATIONS */}
          <button
            onClick={() => { setShowNotificationDrawer(true); setShowMobileMoreSheet(false); }}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-black tracking-wider transition-all cursor-pointer ${
              showNotificationDrawer
                ? 'text-[#E5B868] scale-110'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Bell className={`w-5 h-5 ${showNotificationDrawer ? 'text-[#E5B868] stroke-[2.5]' : 'text-[#94A3B8] stroke-[1.75]'}`} />
            <span>NOTIFS</span>
            {showNotificationDrawer && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B868] shadow-[0_0_8px_#E5B868]" />
            )}
          </button>

          {/* 5. PROFILE */}
          <button
            onClick={() => { setActiveTab('profile'); setShowMobileMoreSheet(false); }}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-black tracking-wider transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'text-[#E5B868] scale-110'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-[#E5B868] stroke-[2.5]' : 'text-[#94A3B8] stroke-[1.75]'}`} />
            <span>PROFILE</span>
            {activeTab === 'profile' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B868] shadow-[0_0_8px_#E5B868]" />
            )}
          </button>

          {/* Minimize Chevron */}
          <button
            onClick={() => setMobileBarCollapsed(true)}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-all cursor-pointer ml-1 shrink-0"
            title="Minimize Smart Dock"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          </div>
        </div>
      )}

      {/* CENTRAL HUB QUICK ACTION DRAWER (TRIGGERED BY CENTER PULSING BUTTON) */}
      <AnimatePresence>
        {showQuickPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg rounded-3xl bg-[#212A31] border-2 border-[#E5B868]/50 p-6 space-y-5 shadow-[0_0_50px_rgba(214,28,36,0.3)] text-left relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 shadow-[0_0_15px_rgba(214,28,36,0.4)]">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black italic uppercase text-white tracking-tight">
                      Just1Play Central Action Hub
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Fast shortcut grid for instant network actions
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowQuickPostModal(false)}
                  className="p-2 rounded-full bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Radial Quick Action Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                
                {/* Action 1: Submit Stats */}
                <button
                  onClick={() => {
                    setShowQuickPostModal(false);
                    setActiveTab('profile');
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#E5B868]/15 border border-white/10 hover:border-[#E5B868]/50 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-2"
                >
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 w-fit group-hover:bg-[#E5B868] group-hover:text-black transition-colors">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-white tracking-wider group-hover:text-[#E5B868]">Submit Stats</div>
                    <div className="text-[10px] text-slate-400 font-mono">Log game metrics</div>
                  </div>
                </button>

                {/* Action 2: Quick Pass */}
                <button
                  onClick={() => {
                    setShowQuickPostModal(false);
                    setActiveTab('profile');
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#E5B868]/15 border border-white/10 hover:border-[#E5B868]/50 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-2"
                >
                  <div className="p-2.5 rounded-xl bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/30 w-fit group-hover:bg-[#E5B868] group-hover:text-black transition-colors">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-white tracking-wider group-hover:text-[#E5B868]">Quick Pass</div>
                    <div className="text-[10px] text-slate-400 font-mono">Digital QR Check-in</div>
                  </div>
                </button>

                {/* Action 3: Book Media */}
                <button
                  onClick={() => {
                    setShowQuickPostModal(false);
                    if (onOpenStorefrontPage) onOpenStorefrontPage('pricing');
                    else setActiveTab('media');
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#E5B868]/15 border border-white/10 hover:border-[#E5B868]/50 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-2"
                >
                  <div className="p-2.5 rounded-xl bg-[#E5B868]/20 text-slate-300 border border-cyan-500/30 w-fit group-hover:bg-[#E5B868] group-hover:text-black transition-colors">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-white tracking-wider group-hover:text-[#E5B868]">Book Media</div>
                    <div className="text-[10px] text-slate-400 font-mono">4K Videographer</div>
                  </div>
                </button>

                {/* Action 4: Social Alerts & Notifs */}
                <button
                  onClick={() => {
                    setShowQuickPostModal(false);
                    setShowNotificationDrawer(true);
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#E5B868]/15 border border-white/10 hover:border-[#E5B868]/50 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-2"
                >
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 w-fit group-hover:bg-[#E5B868] group-hover:text-black transition-colors">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-white tracking-wider group-hover:text-[#E5B868]">Social Alerts</div>
                    <div className="text-[10px] text-slate-400 font-mono">Recruiter Views</div>
                  </div>
                </button>

                {/* Action 5: Explore Tournaments */}
                <button
                  onClick={() => {
                    setShowQuickPostModal(false);
                    setActiveTab('events');
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#E5B868]/15 border border-white/10 hover:border-[#E5B868]/50 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-2 col-span-2 sm:col-span-1"
                >
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 w-fit group-hover:bg-[#E5B868] group-hover:text-black transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-white tracking-wider group-hover:text-[#E5B868]">Event Brackets</div>
                    <div className="text-[10px] text-slate-400 font-mono font-bold text-[#E5B868]">Live Schedules</div>
                  </div>
                </button>

              </div>

              {/* Quick Film Link Uploader Box */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#E5B868] font-mono">
                  <Video className="w-4 h-4" />
                  <span>Post Film Reel (YouTube, Hudl, IG, Vimeo)</span>
                </div>

                {quickSuccess ? (
                  <div className="p-3 rounded-xl bg-[#E5B868]/15 border border-[#E5B868]/40 text-[#E5B868] text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono uppercase">
                      <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />
                      Film Link Embedded Successfully!
                    </span>
                    <button
                      onClick={() => {
                        setShowQuickPostModal(false);
                        setQuickSuccess(false);
                        setActiveTab('social');
                      }}
                      className="px-3 py-1 rounded-lg bg-[#E5B868] text-black font-black uppercase text-[10px]"
                    >
                      View
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="Paste link: https://www.youtube.com/watch?v=... or Hudl"
                      value={quickFilmUrl}
                      onChange={(e) => setQuickFilmUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#E5B868]"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Caption / Game Description..."
                        value={quickCaption}
                        onChange={(e) => setQuickCaption(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-[#E5B868]"
                      />
                      <button
                        onClick={() => {
                          if (!quickFilmUrl) return;
                          setQuickSuccess(true);
                          setQuickFilmUrl('');
                          setQuickCaption('');
                        }}
                        disabled={!quickFilmUrl}
                        className={`px-4 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0 ${
                          quickFilmUrl
                            ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                            : 'bg-white/10 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Post Film</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MORE TABS BOTTOM SHEET OVERLAY FOR MOBILE */}
      <AnimatePresence>
        {showMobileMoreSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMoreSheet(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            />

            {/* Bottom Sheet Menu */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed bottom-16 left-0 right-0 z-50 bg-[#212A31] border-t-2 border-[#E5B868]/50 rounded-t-3xl p-6 space-y-5 shadow-[0_-15px_50px_rgba(0,0,0,0.95)] max-h-[75vh] overflow-y-auto"
            >
              {/* Sheet Handle */}
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-2"></div>

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-[#E5B868]" />
                    <span className="text-xs font-black uppercase text-[#E5B868] font-mono tracking-widest">
                      NETWORK HUBS & SECTIONS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">Quick access to all Just1Play network hubs</p>
                </div>

                <button
                  onClick={() => setShowMobileMoreSheet(false)}
                  className="p-1.5 rounded-full bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Pills for Secondary Tabs */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { setActiveTab('organizations'); setShowMobileMoreSheet(false); }}
                  className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'organizations'
                      ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                      : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                  }`}
                >
                  <Building2 className={`w-4 h-4 ${activeTab === 'organizations' ? 'text-black' : 'text-amber-400'}`} />
                  <div className="text-left">
                    <span>Orgs & Teams</span>
                    <span className="block text-[9px] font-normal text-slate-400 uppercase font-mono">School & AAU</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('media'); setShowMobileMoreSheet(false); }}
                  className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'media'
                      ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                      : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                  }`}
                >
                  <Film className={`w-4 h-4 ${activeTab === 'media' ? 'text-black' : 'text-rose-400'}`} />
                  <div className="text-left">
                    <span>Media Vault</span>
                    <span className="block text-[9px] font-normal text-slate-400 uppercase font-mono">Video & Booking</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('blog'); setShowMobileMoreSheet(false); }}
                  className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'blog'
                      ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                      : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                  }`}
                >
                  <BookOpen className={`w-4 h-4 ${activeTab === 'blog' ? 'text-black' : 'text-purple-400'}`} />
                  <div className="text-left">
                    <span>News & Blog</span>
                    <span className="block text-[9px] font-normal text-slate-400 uppercase font-mono">Articles & Press</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('gallery'); setShowMobileMoreSheet(false); }}
                  className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'gallery'
                      ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                      : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                  }`}
                >
                  <Camera className={`w-4 h-4 ${activeTab === 'gallery' ? 'text-black' : 'text-indigo-400'}`} />
                  <div className="text-left">
                    <span>Event Gallery</span>
                    <span className="block text-[9px] font-normal text-slate-400 uppercase font-mono">HD Photography</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab('profile'); setShowMobileMoreSheet(false); }}
                  className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                      : 'bg-white/5 text-slate-200 border-white/10 hover:border-[#E5B868]/50'
                  }`}
                >
                  <User className={`w-4 h-4 ${activeTab === 'profile' ? 'text-black' : 'text-blue-400'}`} />
                  <div className="text-left">
                    <span>Athlete Profile</span>
                    <span className="block text-[9px] font-normal text-slate-400 uppercase font-mono">Pass & Stats</span>
                  </div>
                </button>

                {role === 'admin' && (
                  <button
                    onClick={() => { setActiveTab('admin'); setShowMobileMoreSheet(false); }}
                    className={`p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-[#E5B868] text-black border-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.5)]'
                        : 'bg-red-500/20 text-red-400 border-red-500/40'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <div className="text-left">
                      <span>Admin Portal</span>
                      <span className="block text-[9px] font-normal text-red-300 uppercase font-mono">System Owner</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Public Storefront Navigation Buttons */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#E5B868] font-mono block">
                  Public Storefront Pages
                </span>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-300">
                  <button onClick={() => { onOpenStorefrontPage?.('landing'); setShowMobileMoreSheet(false); }} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-center uppercase cursor-pointer">Landing</button>
                  <button onClick={() => { onOpenStorefrontPage?.('about'); setShowMobileMoreSheet(false); }} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-center uppercase cursor-pointer">About</button>
                  <button onClick={() => { onOpenStorefrontPage?.('pricing'); setShowMobileMoreSheet(false); }} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-center uppercase cursor-pointer">Pricing</button>
                  <button onClick={() => { onOpenStorefrontPage?.('contact'); setShowMobileMoreSheet(false); }} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-center uppercase cursor-pointer">Contact</button>
                  <button onClick={() => { onOpenStorefrontPage?.('faq'); setShowMobileMoreSheet(false); }} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-center uppercase cursor-pointer">FAQ</button>
                  <button onClick={() => { onOpenStorefrontPage?.('terms'); setShowMobileMoreSheet(false); }} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-center uppercase cursor-pointer">Terms</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

