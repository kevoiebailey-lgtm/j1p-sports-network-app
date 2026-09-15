import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Camera, 
  Layers, 
  Plus, 
  Video, 
  ShoppingCart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';
import { usePrintCart } from '../../context/PrintCartContext';

export interface BottomNavDockProps {
  className?: string;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalCount, openCart } = usePrintCart();
  const pathname = location.pathname;
  
  // Mounted guard to prevent UI hydration mismatch and duplicate mounting
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSuppressed, setIsSuppressed] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleHide = () => setIsSuppressed(true);
    const handleShow = () => setIsSuppressed(false);
    const handleToggle = () => setIsCollapsed((prev) => !prev);
    const handleMatrixDrawer = (e: any) => {
      if (typeof e.detail?.open === 'boolean') {
        setMatrixOpen(e.detail.open);
      }
    };

    window.addEventListener('app:hide-dock', handleHide);
    window.addEventListener('app:show-dock', handleShow);
    window.addEventListener('app:toggle-dock', handleToggle);
    window.addEventListener('app:matrix-drawer-state', handleMatrixDrawer);

    return () => {
      window.removeEventListener('app:hide-dock', handleHide);
      window.removeEventListener('app:show-dock', handleShow);
      window.removeEventListener('app:toggle-dock', handleToggle);
      window.removeEventListener('app:matrix-drawer-state', handleMatrixDrawer);
    };
  }, []);

  // Hydration guard: Never render before client mount to prevent FOUC / hydration mismatches
  if (!mounted || isSuppressed) return null;

  const isPlayLabRoute = pathname.startsWith('/playbook') || pathname.startsWith('/playlab') || pathname.startsWith('/tactics');

  const isWallActive = 
    pathname === '/wall' || 
    pathname === '/the-wall' || 
    pathname === '/feed' || 
    pathname === '/locker-room' || 
    pathname === '/social' || 
    pathname === '/social-wall';
  const isWatchActive = pathname.startsWith('/watch') || pathname.startsWith('/video') || pathname.startsWith('/highlight');
  const isGalleryActive = pathname.startsWith('/gallery') || pathname.startsWith('/media') || pathname.startsWith('/studio') || pathname.startsWith('/vault');
  const isMatrixActive = matrixOpen || pathname.startsWith('/athletes') || pathname.startsWith('/recruit-matrix') || pathname.startsWith('/matrix');

  return (
    <>
      {/* DESKTOP VIEWPORT (>= 768px) */}
      <div className="hidden md:block">
        <AnimatePresence>
        {!isCollapsed ? (
          <div 
            id="desktop-floating-dock-container"
            className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex justify-center px-4 transform-gpu will-change-transform"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
          >
            <motion.nav
              id="cyber-floating-nav-dock"
              role="navigation"
              aria-label="Universal 5-Tab Navigation Dock"
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 25,
                mass: 0.8
              }}
              className={`pointer-events-auto relative w-full max-w-xl h-16 bg-slate-950/85 backdrop-blur-2xl rounded-full border border-white/10 flex items-center justify-around shadow-2xl px-3 mb-3 select-none transform-gpu will-change-transform ${className}`}
            >
              {/* Universal 5 Navigation Tabs: [ THE WALL | WATCH | (+) POST | GALLERY | MATRIX ] */}
              <div className="flex items-center justify-around flex-1">
                
                {/* Tab 1: The Wall */}
                <button
                  id="nav-tab-wall-desktop"
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    navigate('/wall');
                  }}
                  className="relative flex flex-col items-center justify-center w-16 sm:w-20 h-12 select-none cursor-pointer group active:scale-[0.98] transition-transform duration-150"
                  aria-current={isWallActive ? 'page' : undefined}
                  aria-label="The Wall"
                >
                  {isWallActive && (
                    <motion.div
                      layoutId="activeNavPillDesktop"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      className="absolute inset-0 rounded-full border bg-gradient-to-tr from-[#00F0D0]/25 to-cyan-500/25 border-[#00F0D0]/40 shadow-[0_0_20px_rgba(0,240,208,0.4)]"
                    />
                  )}
                  <motion.div
                    animate={{
                      scale: isWallActive ? 1.15 : 1,
                      y: isWallActive ? -2 : 0,
                      filter: isWallActive ? "drop-shadow(0 0 10px #00F0D0)" : "drop-shadow(0 0 0px transparent)",
                    }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10"
                  >
                    <Flame
                      className={`w-5 h-5 transition-colors ${
                        isWallActive ? 'text-[#00F0D0]' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                  </motion.div>
                  <span
                    className={`text-[10px] font-mono tracking-wider uppercase mt-1 z-10 transition-colors ${
                      isWallActive ? 'text-white font-black' : 'text-slate-400 group-hover:text-slate-200 font-bold'
                    }`}
                  >
                    The Wall
                  </span>
                </button>

                {/* Tab 2: Watch / Video */}
                <button
                  id="nav-tab-watch-desktop"
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    navigate('/watch');
                  }}
                  className="relative flex flex-col items-center justify-center w-16 sm:w-20 h-12 select-none cursor-pointer group active:scale-[0.98] transition-transform duration-150"
                  aria-current={isWatchActive ? 'page' : undefined}
                  aria-label="Watch"
                >
                  {isWatchActive && (
                    <motion.div
                      layoutId="activeNavPillDesktop"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      className="absolute inset-0 rounded-full border bg-gradient-to-tr from-[#00F0D0]/25 to-cyan-500/25 border-[#00F0D0]/40 shadow-[0_0_20px_rgba(0,240,208,0.4)]"
                    />
                  )}
                  <motion.div
                    animate={{
                      scale: isWatchActive ? 1.15 : 1,
                      y: isWatchActive ? -2 : 0,
                      filter: isWatchActive ? "drop-shadow(0 0 10px #00F0D0)" : "drop-shadow(0 0 0px transparent)",
                    }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10"
                  >
                    <Video
                      className={`w-5 h-5 transition-colors ${
                        isWatchActive ? 'text-[#00F0D0]' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                  </motion.div>
                  <span
                    className={`text-[10px] font-mono tracking-wider uppercase mt-1 z-10 transition-colors ${
                      isWatchActive ? 'text-white font-black' : 'text-slate-400 group-hover:text-slate-200 font-bold'
                    }`}
                  >
                    Watch
                  </span>
                </button>

                {/* Tab 3: Center Quick Post (+) */}
                <button
                  id="nav-tab-quick-post-desktop"
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    window.dispatchEvent(new CustomEvent('app:open-quick-post'));
                  }}
                  className="relative flex items-center justify-center px-4 py-2 rounded-full bg-gradient-to-r from-[#00F0D0] to-[#00E5C8] text-slate-950 font-black font-mono text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(0,240,208,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer group"
                  aria-label="Create Post"
                >
                  <Plus className="w-4 h-4 stroke-[3] text-slate-950 mr-1 group-hover:rotate-90 transition-transform duration-200" />
                  <span>POST</span>
                </button>

                {/* Tab 4: Gallery */}
                <button
                  id="nav-tab-gallery-desktop"
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    navigate('/gallery');
                  }}
                  className="relative flex flex-col items-center justify-center w-16 sm:w-20 h-12 select-none cursor-pointer group active:scale-[0.98] transition-transform duration-150"
                  aria-current={isGalleryActive ? 'page' : undefined}
                  aria-label="Gallery"
                >
                  {isGalleryActive && (
                    <motion.div
                      layoutId="activeNavPillDesktop"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      className="absolute inset-0 rounded-full border bg-gradient-to-tr from-[#00F0D0]/25 to-cyan-500/25 border-[#00F0D0]/40 shadow-[0_0_20px_rgba(0,240,208,0.4)]"
                    />
                  )}
                  <motion.div
                    animate={{
                      scale: isGalleryActive ? 1.15 : 1,
                      y: isGalleryActive ? -2 : 0,
                      filter: isGalleryActive ? "drop-shadow(0 0 10px #00F0D0)" : "drop-shadow(0 0 0px transparent)",
                    }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10"
                  >
                    <Camera
                      className={`w-5 h-5 transition-colors ${
                        isGalleryActive ? 'text-[#00F0D0]' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                  </motion.div>
                  <span
                    className={`text-[10px] font-mono tracking-wider uppercase mt-1 z-10 transition-colors ${
                      isGalleryActive ? 'text-white font-black' : 'text-slate-400 group-hover:text-slate-200 font-bold'
                    }`}
                  >
                    Gallery
                  </span>
                </button>

                {/* Tab 5: Matrix Drawer */}
                <button
                  id="nav-tab-matrix-desktop"
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    window.dispatchEvent(new CustomEvent('app:open-matrix-drawer'));
                  }}
                  className="relative flex flex-col items-center justify-center w-16 sm:w-20 h-12 select-none cursor-pointer group active:scale-[0.98] transition-transform duration-150"
                  aria-current={isMatrixActive ? 'page' : undefined}
                  aria-label="Recruit Matrix"
                >
                  {isMatrixActive && (
                    <motion.div
                      layoutId="activeNavPillDesktop"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      className="absolute inset-0 rounded-full border bg-gradient-to-tr from-[#00F0D0]/25 to-cyan-500/25 border-[#00F0D0]/40 shadow-[0_0_20px_rgba(0,240,208,0.4)]"
                    />
                  )}
                  <motion.div
                    animate={{
                      scale: isMatrixActive ? 1.15 : 1,
                      y: isMatrixActive ? -2 : 0,
                      filter: isMatrixActive ? "drop-shadow(0 0 10px #00F0D0)" : "drop-shadow(0 0 0px transparent)",
                    }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10"
                  >
                    <Layers
                      className={`w-5 h-5 transition-colors ${
                        isMatrixActive ? 'text-[#00F0D0]' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                  </motion.div>
                  <span
                    className={`text-[10px] font-mono tracking-wider uppercase mt-1 z-10 transition-colors ${
                      isMatrixActive ? 'text-white font-black' : 'text-slate-400 group-hover:text-slate-200 font-bold'
                    }`}
                  >
                    Matrix
                  </span>
                </button>

                {/* Print Cart Pill (When items are in cart) */}
                {totalCount > 0 && (
                  <button
                    id="nav-tab-cart-desktop"
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      openCart();
                    }}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-black cursor-pointer hover:bg-emerald-500/30 transition-colors select-none"
                    aria-label={`Open Cart (${totalCount})`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{totalCount}</span>
                  </button>
                )}

                {/* Minimize HUD Button */}
                <button
                  id="btn-collapse-floating-dock"
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setIsCollapsed(true);
                  }}
                  className="w-7 h-7 ml-1 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Minimize Dock"
                  aria-label="Minimize Dock"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

              </div>
            </motion.nav>
          </div>
        ) : (
          <div 
            id="desktop-floating-dock-collapsed"
            className={`fixed z-50 flex items-center gap-2 pointer-events-none transition-all duration-200 ${
              isPlayLabRoute ? 'bottom-20 left-4 sm:left-6' : 'bottom-4 right-4'
            }`}
          >
            {totalCount > 0 && (
              <button
                id="btn-restore-cart-pill"
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  openCart();
                }}
                className="pointer-events-auto px-3.5 py-2 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-black flex items-center gap-1.5 shadow-xl cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>Cart ({totalCount})</span>
              </button>
            )}
            <button
              id="btn-restore-floating-dock"
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsCollapsed(false);
              }}
              className="pointer-events-auto px-3.5 py-2 rounded-full bg-slate-950/90 border border-[#00F0D0]/40 text-[#00F0D0] text-xs font-mono font-black flex items-center gap-1.5 shadow-xl cursor-pointer"
            >
              <ChevronUp className="w-4 h-4 text-[#00F0D0] animate-bounce" />
              <span>HUD DOCK</span>
            </button>
          </div>
        )}
        </AnimatePresence>
      </div>

      {/* MOBILE VIEWPORT (< 768px) */}
      <div className="block md:hidden">
        <AnimatePresence>
      <motion.nav
        id="j1p-mobile-bottom-dock"
        data-testid="bottom-nav-dock"
        role="navigation"
        aria-label="Mobile Bottom Navigation Dock"
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className={`fixed bottom-4 inset-x-4 max-w-sm mx-auto z-40 bg-[#08090C]/95 backdrop-blur-md border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-2 pb-[env(safe-area-inset-bottom,16px)] flex justify-between items-center shadow-2xl select-none transform-gpu will-change-transform ${className}`}
        style={{
          boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)'
        }}
      >
        {/* Trigger 1: The Wall (Primary Social Feed) */}
        <button
          id="dock-tab-wall"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(12);
            }
            triggerHaptic('light');
            navigate('/wall');
          }}
          className="relative flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1.5 rounded-xl transition-all duration-150 active:scale-[0.97] select-none cursor-pointer group"
          aria-label="The Wall"
          aria-current={isWallActive ? 'page' : undefined}
        >
          <Flame
            className={`w-5 h-5 transition-all duration-200 ${
              isWallActive 
                ? 'text-[#00F0D0] drop-shadow-[0_0_15px_rgba(0,240,208,0.7)] scale-110' 
                : 'text-zinc-400 group-hover:text-white'
            }`}
          />
          <span
            className={`text-[9.5px] font-bold tracking-wider uppercase mt-1 transition-colors ${
              isWallActive ? 'text-white font-extrabold drop-shadow-[0_0_8px_rgba(0,240,208,0.3)]' : 'text-zinc-400 group-hover:text-zinc-200'
            }`}
          >
            The Wall
          </span>
          {isWallActive && (
            <motion.div
              layoutId="mobileDockActivePill"
              className="absolute -bottom-1 w-5 h-0.5 bg-[#00F0D0] rounded-full shadow-[0_0_15px_rgba(0,240,208,0.9)]"
            />
          )}
        </button>

        {/* Trigger 2: Watch / Video */}
        <button
          id="dock-tab-tactics"
          data-testid="dock-tab-watch"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(12);
            }
            triggerHaptic('light');
            navigate('/watch');
          }}
          className="relative flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1.5 rounded-xl transition-all duration-150 active:scale-[0.97] select-none cursor-pointer group"
          aria-label="Watch"
          aria-current={isWatchActive ? 'page' : undefined}
        >
          <Video
            className={`w-5 h-5 transition-colors ${
              isWatchActive ? 'text-[#00F0D0] drop-shadow-[0_0_8px_rgba(0,240,208,0.6)]' : 'text-zinc-400 group-hover:text-white'
            }`}
          />
          <span
            className={`text-[9.5px] font-bold tracking-wider uppercase mt-1 transition-colors ${
              isWatchActive ? 'text-white font-extrabold' : 'text-zinc-400 group-hover:text-zinc-200'
            }`}
          >
            Watch
          </span>
          {isWatchActive && (
            <motion.div
              layoutId="mobileDockActivePill"
              className="absolute -bottom-1 w-5 h-0.5 bg-[#00F0D0] rounded-full shadow-[0_0_8px_rgba(0,240,208,0.9)]"
            />
          )}
        </button>

        {/* Trigger 3 (Elevated Center): Quick Post to The Wall */}
        <button
          id="dock-tab-quick-post"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(12);
            }
            triggerHaptic('medium');
            window.dispatchEvent(new CustomEvent('app:open-quick-post'));
          }}
          className="relative -top-3 flex flex-col items-center justify-center min-w-[52px] select-none cursor-pointer group active:scale-[0.93] transition-all duration-150"
          aria-label="Quick Post to The Wall"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#00F0D0] to-[#00E5C8] text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,240,208,0.55)] border-2 border-[#08090C] group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6 stroke-[3] text-black" />
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase mt-0.5 text-[#00F0D0] font-mono drop-shadow-[0_0_6px_rgba(0,240,208,0.4)]">
            POST
          </span>
        </button>

        {/* Trigger 4: Gallery */}
        <button
          id="dock-tab-gallery"
          data-testid="dock-tab-gallery"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(12);
            }
            triggerHaptic('light');
            navigate('/gallery');
          }}
          className="relative flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1.5 rounded-xl transition-all duration-150 active:scale-[0.97] select-none cursor-pointer group"
          aria-label="Gallery"
          aria-current={isGalleryActive ? 'page' : undefined}
        >
          <div
            className={`absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none ${
              isGalleryActive
                ? 'bg-[#00F0D0]/20 border border-[#00F0D0]/50 shadow-[0_0_20px_rgba(0,240,208,0.4)]'
                : 'bg-transparent border border-transparent group-hover:bg-white/5'
            }`}
          />

          <div className="relative z-10 flex items-center justify-center">
            <Camera
              className={`w-5 h-5 transition-transform duration-200 ${
                isGalleryActive ? 'text-[#00F0D0] drop-shadow-[0_0_10px_rgba(0,240,208,0.8)] scale-110' : 'text-slate-400 group-hover:text-slate-200'
              }`}
            />
          </div>

          <span
            className={`text-[9.5px] font-bold tracking-wider uppercase mt-1 z-10 transition-colors ${
              isGalleryActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          >
            Gallery
          </span>
          {isGalleryActive && (
            <motion.div
              layoutId="mobileDockActivePill"
              className="absolute -bottom-1 w-6 h-0.5 bg-[#00F0D0] rounded-full shadow-[0_0_12px_rgba(0,240,208,0.9)] z-20"
            />
          )}
        </button>

        {/* Trigger 5: Matrix */}
        <button
          id="dock-tab-matrix"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(12);
            }
            triggerHaptic('light');
            window.dispatchEvent(new CustomEvent('app:open-matrix-drawer'));
          }}
          className="relative flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1.5 rounded-xl transition-all duration-150 active:scale-[0.97] select-none cursor-pointer group"
          aria-label="Matrix Drawer"
          aria-current={isMatrixActive ? 'page' : undefined}
        >
          <Layers
            className={`w-5 h-5 transition-colors ${
              isMatrixActive ? 'text-[#00F0D0] drop-shadow-[0_0_8px_rgba(0,240,208,0.6)]' : 'text-zinc-400 group-hover:text-white'
            }`}
          />
          <span
            className={`text-[9.5px] font-bold tracking-wider uppercase mt-1 transition-colors ${
              isMatrixActive ? 'text-white font-extrabold' : 'text-zinc-400 group-hover:text-zinc-200'
            }`}
          >
            Matrix
          </span>
          {isMatrixActive && (
            <motion.div
              layoutId="mobileDockActivePill"
              className="absolute -bottom-1 w-5 h-0.5 bg-[#00F0D0] rounded-full shadow-[0_0_8px_rgba(0,240,208,0.9)]"
            />
          )}
        </button>

        {/* Trigger 6: Cart (When Items In Cart) */}
        {totalCount > 0 && (
          <button
            id="mobile-dock-tab-cart"
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(12);
              }
              triggerHaptic('medium');
              openCart();
            }}
            className="relative flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1.5 rounded-xl transition-all duration-150 active:scale-[0.97] select-none cursor-pointer group"
            aria-label={`Open Cart (${totalCount})`}
          >
            <div className="relative flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center font-mono">
                {totalCount}
              </span>
            </div>
            <span className="text-[9.5px] font-bold tracking-wider uppercase mt-1 text-emerald-300">
              Cart
            </span>
          </button>
        )}
        </motion.nav>
      </AnimatePresence>
    </div>
  </>
);
};

export default BottomNavDock;
