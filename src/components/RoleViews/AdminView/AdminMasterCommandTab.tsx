import React, { useState, useEffect, Suspense } from 'react';
import { 
  LightningBoltTabNavigator, 
  AdminModuleTab 
} from '../../Admin/LightningBoltTabNavigator';
import { lazyWithRetry } from '../../../lib/lazyWithRetry';
import { Loader2 } from 'lucide-react';

// Code-split sub-pages with automatic retry to eliminate monolithic chunk compilation timeouts
const AdminOverviewPage = lazyWithRetry(() => 
  import('../../Admin/AdminOverviewPage').then(m => ({ default: m.AdminOverviewPage }))
);
const AdminUsersPage = lazyWithRetry(() => 
  import('../../Admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage }))
);
const AdminMediaModularView = lazyWithRetry(() => 
  import('../../Admin/AdminMediaModularView').then(m => ({ default: m.AdminMediaModularView }))
);
const AdminEventsPage = lazyWithRetry(() => 
  import('../../Admin/AdminEventsPage').then(m => ({ default: m.AdminEventsPage }))
);
const AdminFinancialsPage = lazyWithRetry(() => 
  import('../../Admin/AdminFinancialsPage').then(m => ({ default: m.AdminFinancialsPage }))
);
const AdminSettingsPage = lazyWithRetry(() => 
  import('../../Admin/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage }))
);

const AdminTabLoadingSkeleton: React.FC = () => (
  <div className="min-h-[400px] flex flex-col items-center justify-center p-12 rounded-2xl bg-[#0F141A]/80 border border-[#2D3748] backdrop-blur-md">
    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
    <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
      Streaming Admin Command Module...
    </p>
  </div>
);

export default function AdminMasterCommandTab() {
  const [activeTab, setActiveTab] = useState<AdminModuleTab>('overview');

  // Clear retry session flag on successful module mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('retry-lazy-refreshed');
    }
  }, []);

  const [liveStats, setLiveStats] = useState<{
    usersCount?: number;
    mediaCount?: number;
    eventsCount?: number;
    mrrAmount?: string;
  }>({
    usersCount: undefined,
    mediaCount: undefined,
    eventsCount: undefined,
    mrrAmount: undefined,
  });

  const handleOverviewNavigate = (target: string) => {
    switch (target) {
      case 'users':
        setActiveTab('users');
        break;
      case 'gallery':
      case 'videos':
      case 'content':
      case 'media':
        setActiveTab('media');
        break;
      case 'events':
        setActiveTab('events');
        break;
      case 'financials':
      case 'ads':
        setActiveTab('financials');
        break;
      case 'settings':
        setActiveTab('settings');
        break;
      default:
        setActiveTab('overview');
        break;
    }
  };

  return (
    <div className="space-y-6 select-none" id="admin-master-command-tab-root">
      {/* 1. THE LIGHTNING BOLT TAB NAVIGATOR (Futuristic Dynamic Floating Controls with Live Badges) */}
      <LightningBoltTabNavigator
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={liveStats}
      />

      {/* 2. MODULAR CONTROL SECTIONS WITH SUB-CHUNK SUSPENSE */}
      <div className="relative z-10 transition-all duration-300">
        <Suspense fallback={<AdminTabLoadingSkeleton />}>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <AdminOverviewPage 
                onNavigateTab={handleOverviewNavigate} 
                onStatsUpdate={setLiveStats}
              />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <AdminUsersPage />
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-6">
              <AdminMediaModularView />
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-6">
              <AdminEventsPage />
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <AdminFinancialsPage />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <AdminSettingsPage />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}

export { AdminMasterCommandTab };
