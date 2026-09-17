import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Film, 
  Trophy, 
  DollarSign, 
  Settings,
  Zap,
  Volume2,
  VolumeX,
  Radio,
  Sparkles
} from 'lucide-react';

export type AdminModuleTab = 'overview' | 'users' | 'media' | 'events' | 'financials' | 'settings';

interface LightningBoltTabNavigatorProps {
  activeTab: AdminModuleTab;
  onTabChange: (tab: AdminModuleTab) => void;
  stats?: {
    usersCount?: number;
    mediaCount?: number;
    eventsCount?: number;
    mrrAmount?: string;
  };
}

interface TabDef {
  id: AdminModuleTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  badge?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export const ADMIN_MODULE_TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard, tag: 'CORE', badge: 'LIVE' },
  { id: 'users', label: 'User Management', shortLabel: 'Users', icon: Users, tag: 'ROSTERS', badge: '840' },
  { id: 'media', label: 'Media & Vault', shortLabel: 'Media', icon: Film, tag: '4K FILM', badge: '410+' },
  { id: 'events', label: 'Events & Brackets', shortLabel: 'Events', icon: Trophy, tag: 'LIVE', badge: '48' },
  { id: 'financials', label: 'Financials & Revenue', shortLabel: 'Financials', icon: DollarSign, tag: 'PAYPAL', badge: '$24.5K' },
  { id: 'settings', label: 'Platform Settings', shortLabel: 'Settings', icon: Settings, tag: 'CONFIG', badge: 'CONFIG' },
];

export const LightningBoltTabNavigator: React.FC<LightningBoltTabNavigatorProps> = ({
  activeTab,
  onTabChange,
  stats
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Animation & Audio states
  const [previousTab, setPreviousTab] = useState<AdminModuleTab>(activeTab);
  const [isStriking, setIsStriking] = useState<boolean>(false);
  const [lightningPath, setLightningPath] = useState<string>('');
  const [branchPaths, setBranchPaths] = useState<string[]>([]);
  const [flashIntensity, setFlashIntensity] = useState<number>(0);
  const [activeTabCenter, setActiveTabCenter] = useState<{ x: number; y: number }>({ x: 100, y: 30 });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.2);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Synthesize electric lightning strike zap
  const playLightningZap = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Noise buffer for electric crackle
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter for electric sizzle
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      // Low frequency hum
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(soundVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      osc.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      osc.start(now);
      osc.stop(now + 0.15);
      noise.stop(now + 0.15);
    } catch (e) {
      // Audio fallback silent
    }
  };

  // Generate dynamic jagged lightning path between points
  const generateJaggedPath = (
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number, 
    displaceMax: number = 24, 
    segments: number = 8
  ): string => {
    const points: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;

    for (let i = 1; i < segments; i++) {
      const baseX = x1 + dx * i;
      const baseY = y1 + dy * i;
      // Perpendicular displacement
      const perpX = -dy / Math.hypot(dx, dy);
      const perpY = dx / Math.hypot(dx, dy);
      const offset = (Math.random() - 0.5) * 2 * displaceMax;

      points.push({
        x: baseX + perpX * offset,
        y: baseY + perpY * offset
      });
    }
    points.push({ x: x2, y: y2 });

    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  };

  // Emit vibrant spark particles on lightning impact
  const emitSparks = (targetX: number, targetY: number) => {
    const newParticles: Particle[] = [];
    const colors = ['#00F2FE', '#39FF14', '#FFFFFF', '#38BDF8', '#7DD3FC'];

    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      newParticles.push({
        id: Date.now() + i,
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1
      });
    }

    setParticles(newParticles);
  };

  // Animate particle dissipation smoothly with requestAnimationFrame
  const hasParticles = particles.length > 0;
  useEffect(() => {
    if (!hasParticles) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (now - lastTime >= 24) {
        lastTime = now;
        setParticles(prev => {
          if (prev.length === 0) return prev;
          return prev
            .map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              alpha: p.alpha - 0.08
            }))
            .filter(p => p.alpha > 0);
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [hasParticles]);

  // Trigger lightning strike when switching tabs
  const handleTabClick = (newTab: AdminModuleTab) => {
    if (newTab === activeTab) return;

    const fromEl = tabRefs.current[activeTab];
    const toEl = tabRefs.current[newTab];
    const container = containerRef.current;

    if (fromEl && toEl && container) {
      const containerRect = container.getBoundingClientRect();
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const startX = fromRect.left - containerRect.left + fromRect.width / 2;
      const startY = fromRect.top - containerRect.top + fromRect.height + 8;

      const endX = toRect.left - containerRect.left + toRect.width / 2;
      const endY = toRect.top - containerRect.top + toRect.height / 2;

      // Bottom anchor from dashboard body
      const bottomOriginX = (startX + endX) / 2;
      const bottomOriginY = containerRect.height + 40;

      // Generate multi-segmented main bolt from body to destination tab
      const mainBolt = generateJaggedPath(bottomOriginX, bottomOriginY, endX, endY, 28, 9);
      
      // Secondary arc connecting source to destination
      const bridgeBolt = generateJaggedPath(startX, startY, endX, endY, 20, 7);

      // Generate 2 wild electric branch forks
      const midPointX = (bottomOriginX + endX) / 2;
      const midPointY = (bottomOriginY + endY) / 2;
      const branch1 = generateJaggedPath(midPointX, midPointY, midPointX + (Math.random() - 0.5) * 60, midPointY - 30, 15, 4);
      const branch2 = generateJaggedPath(endX, endY, endX + (Math.random() - 0.5) * 40, endY + 25, 12, 3);

      setLightningPath(`${mainBolt} ${bridgeBolt}`);
      setBranchPaths([branch1, branch2]);
      setActiveTabCenter({ x: endX, y: endY });

      // Emit impact spark particles
      emitSparks(endX, endY);
    }

    setPreviousTab(activeTab);
    onTabChange(newTab);
    setIsStriking(true);
    setFlashIntensity(1);
    playLightningZap();

    // Reset strike flash
    setTimeout(() => {
      setFlashIntensity(0);
    }, 180);

    setTimeout(() => {
      setIsStriking(false);
    }, 450);
  };

  // Update active tab center position on mount and resize
  useEffect(() => {
    const updatePosition = () => {
      const el = tabRefs.current[activeTab];
      const container = containerRef.current;
      if (el && container) {
        const cRect = container.getBoundingClientRect();
        const tRect = el.getBoundingClientRect();
        setActiveTabCenter({
          x: tRect.left - cRect.left + tRect.width / 2,
          y: tRect.top - cRect.top + tRect.height / 2
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [activeTab]);

  const getTabBadge = (tab: TabDef) => {
    if (tab.id === 'users' && stats?.usersCount !== undefined) {
      return `${stats.usersCount}`;
    }
    if (tab.id === 'media' && stats?.mediaCount !== undefined) {
      return `${stats.mediaCount}`;
    }
    if (tab.id === 'events' && stats?.eventsCount !== undefined) {
      return `${stats.eventsCount}`;
    }
    if (tab.id === 'financials') {
      return stats?.mrrAmount || tab.badge || '$24.5K';
    }
    return tab.badge || tab.tag;
  };

  return (
    <div className="relative w-full mb-8 select-none">
      
      {/* 1. Global CSS Keyframes for Weightless Floating & Electric Fields */}
      <style>{`
        @keyframes floatWeightless {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes electricHum {
          0%, 100% {
            opacity: 0.75;
            filter: drop-shadow(0 0 6px #00F2FE);
          }
          50% {
            opacity: 0.95;
            filter: drop-shadow(0 0 12px #00F2FE) drop-shadow(0 0 20px #38BDF8);
          }
        }

        @keyframes staticFlicker {
          0%, 100% { stroke-dashoffset: 0; }
          50% { stroke-dashoffset: 24; }
        }

        @keyframes neonGreenGlowPulse {
          0%, 100% {
            box-shadow: 0 0 10px #39FF14, 0 0 2px #39FF14, inset 0 0 8px rgba(57, 255, 20, 0.2);
          }
          50% {
            box-shadow: 0 0 16px #39FF14, 0 0 4px #39FF14, inset 0 0 12px rgba(57, 255, 20, 0.35);
          }
        }

        .floating-navigator-container {
          animation: floatWeightless 4.5s ease-in-out infinite;
        }

        .neon-green-active-shard {
          animation: neonGreenGlowPulse 2.5s ease-in-out infinite;
        }

        .electric-buzz-field {
          animation: electricHum 1.8s ease-in-out infinite;
        }

        .static-lightning-line {
          stroke-dasharray: 4 2;
          animation: staticFlicker 0.4s linear infinite;
        }
      `}</style>

      {/* 2. Floating Tabs Glass Container with Obsidian Carbon Styling */}
      <div 
        ref={containerRef}
        className="floating-navigator-container relative rounded-3xl backdrop-blur-2xl bg-[#080C14]/90 border border-[#00F2FE]/25 p-2 sm:p-3 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(0,242,254,0.15)] transition-all duration-300 z-20"
      >
        
        {/* Dynamic Electric Blue Strike SVG Layer */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-30"
          style={{ filter: 'drop-shadow(0 0 8px #00F2FE) drop-shadow(0 0 16px #38BDF8)' }}
        >
          {/* Active Lightning Bolt Strike when jumping tabs */}
          {isStriking && (
            <g className="animate-pulse">
              {/* Primary Arc */}
              <path
                d={lightningPath}
                fill="none"
                stroke="#00F2FE"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="miter"
              />
              {/* Core White Plasma Hotspot */}
              <path
                d={lightningPath}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Fork Branches */}
              {branchPaths.map((branch, idx) => (
                <path
                  key={idx}
                  d={branch}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}
            </g>
          )}

          {/* Spark Particles Layer */}
          {particles.map(p => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill={p.color}
              opacity={p.alpha}
            />
          ))}

          {/* 4. Static Connection: Subtle Buzzing Electric Field Connecting Active Tab to Content */}
          {!isStriking && (
            <g className="electric-buzz-field">
              {/* Vertical Conduit downwards to dashboard body */}
              <path
                d={`M ${activeTabCenter.x} ${activeTabCenter.y + 18} L ${activeTabCenter.x - 4} ${activeTabCenter.y + 30} L ${activeTabCenter.x + 4} ${activeTabCenter.y + 44} L ${activeTabCenter.x} ${activeTabCenter.y + 58}`}
                fill="none"
                stroke="#00F2FE"
                strokeWidth="1.5"
                className="static-lightning-line opacity-75"
              />
              {/* Horizontal grounding flare */}
              <line
                x1={activeTabCenter.x - 24}
                y1={activeTabCenter.y + 58}
                x2={activeTabCenter.x + 24}
                y2={activeTabCenter.y + 58}
                stroke="#00F2FE"
                strokeWidth="1"
                strokeDasharray="2 2"
                className="opacity-50"
              />
            </g>
          )}
        </svg>

        {/* Electric Blue Screen Flash Surge */}
        <div 
          className="absolute inset-0 rounded-3xl bg-[#00F2FE]/20 pointer-events-none transition-opacity duration-200 z-10"
          style={{ opacity: flashIntensity }}
        />

        {/* 6 Modular Glass Shard Tabs with Balanced Grid / Horizontal Scroll Track */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 lg:grid lg:grid-cols-6 lg:gap-2.5 lg:w-full relative z-20">
          {ADMIN_MODULE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el; }}
                onClick={() => handleTabClick(tab.id)}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97, y: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`group relative flex flex-col items-center justify-center shrink-0 min-w-[155px] sm:min-w-[175px] lg:min-w-0 lg:w-full pt-7 pb-3 px-3 sm:pt-7.5 sm:pb-3.5 sm:px-3 min-h-[82px] rounded-2xl font-mono text-xs transition-colors duration-200 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'neon-green-active-shard bg-[#0F1B12]/95 border border-[#39FF14] text-white'
                    : 'bg-[#0B1017]/80 border border-white/10 text-slate-400 opacity-75 hover:opacity-100 hover:text-slate-100 hover:bg-[#121A24] hover:border-cyan-500/40'
                }`}
              >
                {/* Faceted Specular Glass Glare Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-transparent pointer-events-none rounded-2xl" />

                {/* Shard Corner Accent Lines */}
                <div className={`absolute top-1.5 right-1.5 w-2 h-2 border-t border-r ${isActive ? 'border-[#39FF14]' : 'border-white/10 group-hover:border-cyan-400/40'}`} />
                <div className={`absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l ${isActive ? 'border-[#39FF14]' : 'border-white/10 group-hover:border-cyan-400/40'}`} />

                {/* Live Count / Status Badge */}
                <div className="absolute top-2 right-2.5">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-tight whitespace-nowrap ${
                    isActive 
                      ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/40 shadow-[0_0_8px_rgba(57,255,20,0.25)]' 
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 group-hover:text-cyan-300'
                  }`}>
                    {getTabBadge(tab)}
                  </span>
                </div>

                {/* Active Neon Sparkle Indicator */}
                {isActive && (
                  <div className="absolute top-2 left-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-ping" />
                    <span className="text-[8px] font-bold text-[#39FF14] tracking-widest uppercase">
                      {tab.tag}
                    </span>
                  </div>
                )}

                {/* Tab Icon */}
                <div className={`mb-1 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-[#39FF14]' : 'text-slate-400 group-hover:text-[#00F2FE]'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Tab Label */}
                <div className={`font-black text-center tracking-wide text-xs sm:text-[11px] lg:text-xs truncate w-full px-1 ${
                  isActive ? 'text-white' : 'text-slate-300'
                }`}>
                  {tab.label}
                </div>

                {/* Active Underline Beacon */}
                {isActive && (
                  <div className="w-8 h-0.5 bg-[#39FF14] rounded-full mt-1.5 shadow-[0_0_8px_#39FF14]" />
                )}
              </motion.button>
            );
          })}
        </div>

      </div>

      {/* 4. Plasma Connector Bar: Sound Volume & Sector Telemetry */}
      <div className="flex items-center justify-between flex-wrap gap-2 -mt-2 mb-2 px-2 relative z-10">
        
        {/* Active Sector Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#080C14]/90 border border-[#00F2FE]/30 text-[10px] font-mono text-[#00F2FE] shadow-[0_0_12px_rgba(0,242,254,0.2)]">
          <Zap className="w-3 h-3 text-[#39FF14] animate-pulse" />
          <span className="text-slate-300">ACTIVE CONTROL SECTOR:</span>
          <span className="font-black text-[#39FF14] uppercase tracking-wider">
            {ADMIN_MODULE_TABS.find(t => t.id === activeTab)?.label}
          </span>
        </div>

        {/* Audio Zap Toggle & Sound Tuning */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#080C14]/90 border border-slate-800 text-[10px] font-mono text-slate-400">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Disable Lightning Sound FX' : 'Enable Lightning Sound FX'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'FX ON' : 'MUTED'}</span>
          </button>

          {soundEnabled && (
            <input
              type="range"
              min="0.05"
              max="0.4"
              step="0.05"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
              className="w-12 h-1 accent-[#00F2FE] bg-slate-800 rounded-lg cursor-pointer"
              title="Electric Strike Volume"
            />
          )}
        </div>

      </div>

    </div>
  );
};
