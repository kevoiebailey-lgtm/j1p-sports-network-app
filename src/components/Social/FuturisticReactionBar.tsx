import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FuturisticReactionKey,
  FUTURISTIC_REACTIONS,
  ReactionIconRenderer
} from './FuturisticAthleticIcons';
import {
  toggleFuturisticReaction,
  subscribePostReactions,
  INITIAL_REACTION_COUNTS,
  INITIAL_USER_REACTIONS
} from '../../services/futuristicReactionService';
import { triggerHaptic } from '../../lib/haptics';

interface FloatingAuraParticle {
  id: string;
  reactionKey: FuturisticReactionKey;
  x: number;
  rotation: number;
}

interface FuturisticReactionBarProps {
  postId: string;
  currentUserId?: string;
  currentUserName?: string;
  initialCounts?: Partial<Record<FuturisticReactionKey, number>>;
  initialUserReaction?: FuturisticReactionKey | null;
  onReactionChange?: (reactionKey: FuturisticReactionKey, action: 'added' | 'removed' | 'switched') => void;
  className?: string;
}

export const FuturisticReactionBar: React.FC<FuturisticReactionBarProps> = ({
  postId,
  currentUserId = 'anon_athlete',
  currentUserName = 'Athlete',
  initialCounts,
  initialUserReaction = null,
  onReactionChange,
  className = ''
}) => {
  const [counts, setCounts] = useState<Record<FuturisticReactionKey, number>>({
    ...INITIAL_REACTION_COUNTS,
    ...initialCounts
  });

  const [activeReaction, setActiveReaction] = useState<FuturisticReactionKey | null>(initialUserReaction);
  const [hoveredReaction, setHoveredReaction] = useState<FuturisticReactionKey | null>(null);
  const [particles, setParticles] = useState<FloatingAuraParticle[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    if (!postId) return;

    const unsubscribe = subscribePostReactions(postId, currentUserId, (summary) => {
      setCounts(summary.counts);
      if (summary.currentUserReaction !== undefined) {
        setActiveReaction(summary.currentUserReaction);
      }
    });

    return () => unsubscribe();
  }, [postId, currentUserId]);

  const handleReactionClick = async (reactionKey: FuturisticReactionKey, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;

    triggerHaptic('medium');

    // Spawn kinetic energy particle burst
    const particleId = `${reactionKey}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newParticle: FloatingAuraParticle = {
      id: particleId,
      reactionKey,
      x: (Math.random() - 0.5) * 50,
      rotation: (Math.random() - 0.5) * 45
    };

    setParticles((prev) => [...prev.slice(-6), newParticle]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== particleId));
    }, 1200);

    // Optimistic UI update
    const previousReaction = activeReaction;
    const isRemoving = activeReaction === reactionKey;
    const nextReaction = isRemoving ? null : reactionKey;

    setActiveReaction(nextReaction);
    setCounts((prev) => {
      const updated = { ...prev };
      if (isRemoving) {
        updated[reactionKey] = Math.max(0, (updated[reactionKey] || 0) - 1);
      } else {
        if (previousReaction) {
          updated[previousReaction] = Math.max(0, (updated[previousReaction] || 0) - 1);
        }
        updated[reactionKey] = (updated[reactionKey] || 0) + 1;
      }
      return updated;
    });

    setIsProcessing(true);
    try {
      const result = await toggleFuturisticReaction(
        postId,
        reactionKey,
        currentUserId,
        currentUserName
      );
      if (onReactionChange) {
        onReactionChange(reactionKey, result.action);
      }
    } catch (err) {
      console.warn('[FuturisticReactionBar] Error toggling reaction:', err);
      // Revert optimistic update on error
      setActiveReaction(previousReaction);
    } finally {
      setIsProcessing(false);
    }
  };

  const reactionKeys = Object.keys(FUTURISTIC_REACTIONS) as FuturisticReactionKey[];

  return (
    <div className={`relative select-none ${className}`}>
      {/* Floating Kinetic Energy Particle Bursts */}
      <div className="absolute inset-x-0 -top-14 pointer-events-none z-50 flex justify-center overflow-visible">
        <AnimatePresence>
          {particles.map((p) => {
            const meta = FUTURISTIC_REACTIONS[p.reactionKey];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, y: 15, scale: 0.5, x: p.x, rotate: 0 }}
                animate={{
                  opacity: 0,
                  y: -75,
                  scale: 1.8,
                  x: p.x * 2,
                  rotate: p.rotation
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
                className="absolute flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-2xl border"
                style={{
                  background: `linear-gradient(135deg, ${meta.primaryColor}33, ${meta.secondaryColor}66)`,
                  borderColor: meta.borderActive,
                  color: '#FFFFFF',
                  boxShadow: `0 0 25px ${meta.glowColor}`
                }}
              >
                <ReactionIconRenderer reactionKey={p.reactionKey} size={18} />
                <span>{meta.label}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Futuristic Horizontal Glassmorphic Reaction Bar */}
      <div
        className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl overflow-x-auto no-scrollbar"
        style={{
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.06)'
        }}
      >
        {reactionKeys.map((key) => {
          const meta = FUTURISTIC_REACTIONS[key];
          const count = counts[key] || 0;
          const isActive = activeReaction === key;
          const isHovered = hoveredReaction === key;

          return (
            <motion.button
              key={key}
              type="button"
              id={`reaction-btn-${postId}-${key}`}
              onClick={(e) => handleReactionClick(key, e)}
              onMouseEnter={() => setHoveredReaction(key)}
              onMouseLeave={() => setHoveredReaction(null)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`group relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all duration-300 cursor-pointer shrink-0 border ${
                isActive
                  ? 'border-transparent shadow-lg text-white'
                  : 'border-white/5 bg-white/[0.03] text-slate-300 hover:text-white hover:border-white/20'
              }`}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${meta.primaryColor}40, ${meta.secondaryColor}25)`
                  : undefined,
                borderColor: isActive ? meta.borderActive : undefined,
                boxShadow: isActive ? `0 0 20px ${meta.glowColor}, inset 0 0 12px ${meta.glowColor}` : undefined
              }}
              title={`${meta.label} (${meta.tagline})`}
            >
              {/* Dynamic Glow Aura Layer */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none opacity-40 blur-sm animate-pulse"
                  style={{ backgroundColor: meta.primaryColor }}
                />
              )}

              {/* Icon Container with Micro-Rotation/Bounce */}
              <div className="relative z-10 flex items-center justify-center">
                <ReactionIconRenderer
                  reactionKey={key}
                  size={19}
                  glow={isActive || isHovered}
                  className={`transition-transform duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-115'
                  }`}
                />
              </div>

              {/* Reaction Label */}
              <span
                className={`relative z-10 text-[11px] sm:text-xs tracking-wider transition-colors duration-200 ${
                  isActive ? 'font-black text-white' : 'font-semibold text-slate-300 group-hover:text-white'
                }`}
              >
                {meta.shortLabel}
              </span>

              {/* Counter Badge */}
              <AnimatePresence mode="popLayout">
                {count > 0 && (
                  <motion.span
                    key={`count-${count}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    className={`relative z-10 px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono leading-none border transition-all ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-white/[0.06] text-slate-400 border-white/10 group-hover:text-slate-200'
                    }`}
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Futuristic Cyber Tooltip on Hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: -38, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-50 px-2.5 py-1 rounded-lg bg-[#0F172A]/95 border text-[10px] font-mono text-white whitespace-nowrap shadow-2xl backdrop-blur-md flex items-center gap-1.5"
                    style={{
                      borderColor: meta.borderActive,
                      boxShadow: `0 0 15px ${meta.glowColor}`
                    }}
                  >
                    <span className="font-black" style={{ color: meta.primaryColor }}>
                      {meta.label}:
                    </span>
                    <span className="text-slate-300 font-normal">{meta.tagline}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
