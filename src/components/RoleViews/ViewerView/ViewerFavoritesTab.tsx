import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Bell, 
  Star, 
  Shield, 
  Trophy, 
  Wifi, 
  WifiOff, 
  Check, 
  Sparkles,
  Zap,
  RefreshCw,
  Eye
} from 'lucide-react';
import { INITIAL_ATHLETE_DOCS } from '../../../lib/platformData';
import { 
  getViewerFavoritesOffline, 
  saveViewerFavoritesOffline, 
  warmStadiumOfflineCache 
} from '../../../lib/offlineFavoritesService';

export const ViewerFavoritesTab: React.FC = () => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = getViewerFavoritesOffline();
    return saved.ids.length > 0 ? saved.ids : ['ath-001'];
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [filterMode, setFilterMode] = useState<'all' | 'savedOnly'>('all');
  const [cacheSyncToast, setCacheSyncToast] = useState<boolean>(false);

  // Monitor network status for stadium disconnects
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Warm offline cache upon component mount
    warmStadiumOfflineCache();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleFavorite = async (id: string) => {
    let updated: string[];
    if (favorites.includes(id)) {
      updated = favorites.filter(f => f !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    await saveViewerFavoritesOffline(updated);
    
    setCacheSyncToast(true);
    setTimeout(() => setCacheSyncToast(false), 2000);
  };

  const displayedAthletes = filterMode === 'savedOnly'
    ? INITIAL_ATHLETE_DOCS.filter(ath => favorites.includes(ath.id))
    : INITIAL_ATHLETE_DOCS;

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Stadium Offline Mode Banner */}
      {isOffline && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Stadium Offline Mode Active
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[10px] font-mono font-bold">
                  OFFLINE CACHE
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-mono mt-0.5">
                No internet detected. All {favorites.length} saved favorites and profiles are preserved offline via Service Worker.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-amber-400 shrink-0 hidden sm:inline-block">
            {favorites.length} Athletes Cached
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#818CF8] fill-current" />
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              My Followed Teams & Athletes
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Stadium Ready</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Instant Kickoff, Halftime & Final Score Notifications • Offline Caching Enabled
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Filter toggle */}
          <button
            onClick={() => setFilterMode(filterMode === 'all' ? 'savedOnly' : 'all')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
              filterMode === 'savedOnly'
                ? 'bg-[#818CF8] text-slate-950 font-black shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{filterMode === 'savedOnly' ? `Saved Only (${favorites.length})` : 'Show All'}</span>
          </button>

          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              notificationsEnabled 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>{notificationsEnabled ? 'Score Alerts: ON' : 'Score Alerts: OFF'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Cache Sync Notification */}
      <AnimatePresence>
        {cacheSyncToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-slate-900 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Favorites list updated & cached in Service Worker for stadium offline use.</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">SW Cache Synced</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Athletes List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayedAthletes.map((ath) => {
          const isFav = favorites.includes(ath.id);
          return (
            <div
              key={ath.id}
              className={`p-4 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                isFav 
                  ? 'bg-slate-900 border-[#818CF8]/60 shadow-[0_0_20px_rgba(129,140,248,0.15)]' 
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={ath.avatarUrl}
                    alt={ath.displayName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-800"
                    onError={(e) => {
                      // Fallback icon/initials if avatar offline
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">{ath.displayName}</h3>
                  <p className="text-xs text-[#818CF8] font-semibold truncate">{ath.teamName} • #{ath.jerseyNumber}</p>
                  <p className="text-[10px] font-mono text-slate-400">Class of {ath.gradYear} • {ath.sport}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleFavorite(ath.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isFav 
                      ? 'bg-[#818CF8] text-slate-950 border-[#818CF8] shadow-md' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={isFav ? 'Remove from Saved Favorites' : 'Add to Saved Favorites'}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayedAthletes.length === 0 && (
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
          <Heart className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-mono text-slate-400">
            No saved athletes yet in your offline favorites list. Click the heart icon to save prospects.
          </p>
        </div>
      )}

    </div>
  );
};

export default ViewerFavoritesTab;
