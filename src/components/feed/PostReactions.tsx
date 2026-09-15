'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Share2,
  Check,
  Flame,
  Zap,
  TrendingUp,
  Shield,
  Smile,
  ChevronDown,
  ChevronUp,
  User,
  Heart
} from 'lucide-react';
import { 
  doc, 
  updateDoc, 
  increment, 
  arrayUnion, 
  arrayRemove, 
  setDoc, 
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type ReactionType = 
  | 'headTap' 
  | 'saucy' 
  | 'clamps' 
  | 'dot' 
  | 'cold' 
  | 'stockUp' 
  | 'burner';

export interface AthleteReactionBadge {
  id: ReactionType;
  emoji: string;
  label: string;
  sublabel: string;
  count: number;
}

export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: string;
  isQuickSlang?: boolean;
}

export interface PostReactionsProps {
  postId?: string;
  initialReactionCounts?: Partial<Record<ReactionType, number>>;
  initialUserReactions?: ReactionType[];
  initialComments?: PostComment[];
  athleteName?: string;
  onReactionToggle?: (reactionId: ReactionType, active: boolean, nextCount: number) => void;
  onCommentSubmit?: (comment: PostComment) => void;
  className?: string;
}

// ==========================================
// PRESET SLANG & REACTION METADATA
// ==========================================

const DEFAULT_REACTION_CONFIG: {
  id: ReactionType;
  emoji: string;
  label: string;
  sublabel: string;
}[] = [
  { id: 'headTap', emoji: '🫳🧢', label: 'Head Tap', sublabel: 'Highlight snag / Mossed' },
  { id: 'saucy', emoji: '🫗', label: 'Saucy', sublabel: 'Jukes & silky routes' },
  { id: 'clamps', emoji: '🔒', label: 'Clamps', sublabel: 'Lockdown defense / INT' },
  { id: 'dot', emoji: '💨', label: 'Dot', sublabel: 'Pinpoint QB laser' },
  { id: 'cold', emoji: '🥶', label: 'Cold', sublabel: 'Clutch game-winner' },
  { id: 'stockUp', emoji: '📈', label: 'Stock Up', sublabel: 'Certified D1 tape' },
  { id: 'burner', emoji: '⚡', label: 'Burner', sublabel: 'Breakaway top-end speed' },
];

const QUICK_SLANG_PRESETS = [
  { text: "Put 'em on skates! ⛸️", tag: 'Shifty' },
  { text: 'Certified D1 tape 📈', tag: 'Recruit' },
  { text: 'Snag city 🫳🧢', tag: 'Hands' },
  { text: 'Route technician ⚡', tag: 'Speed' },
  { text: 'Uncoverable 🫗', tag: 'Sauce' },
  { text: 'Lockdown island 🔒', tag: 'Defense' },
];

const SAMPLE_COMMENTS: PostComment[] = [
  {
    id: 'cm-1',
    userId: 'u-1',
    userName: 'Coach Marcus Vance',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
    text: 'Certified D1 tape 📈 Speed off the break is elite.',
    timestamp: '10m ago',
    isQuickSlang: true
  },
  {
    id: 'cm-2',
    userId: 'u-2',
    userName: 'Apex Sports Scout',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
    text: 'Snag city 🫳🧢 That tracking over the safety was textbook.',
    timestamp: '25m ago',
    isQuickSlang: true
  }
];

export default function PostReactions({
  postId = 'post-demo-01',
  initialReactionCounts = {
    headTap: 42,
    saucy: 28,
    clamps: 19,
    dot: 31,
    cold: 55,
    stockUp: 67,
    burner: 34
  },
  initialUserReactions = ['stockUp', 'headTap'],
  initialComments = SAMPLE_COMMENTS,
  athleteName = 'Sarah Jenkins',
  onReactionToggle,
  onCommentSubmit,
  className = ''
}: PostReactionsProps) {
  // Reaction Counts & Active State
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionType, number>>(() => ({
    headTap: initialReactionCounts.headTap ?? 0,
    saucy: initialReactionCounts.saucy ?? 0,
    clamps: initialReactionCounts.clamps ?? 0,
    dot: initialReactionCounts.dot ?? 0,
    cold: initialReactionCounts.cold ?? 0,
    stockUp: initialReactionCounts.stockUp ?? 0,
    burner: initialReactionCounts.burner ?? 0,
  }));

  const [activeReactions, setActiveReactions] = useState<Set<ReactionType>>(
    () => new Set(initialUserReactions)
  );

  // Comments state
  const [comments, setComments] = useState<PostComment[]>(initialComments);
  const [commentText, setCommentText] = useState('');
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Input ref for quick insertion
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger Haptic feedback safely
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch (e) {
        // Safe failover for unsupported browser policies
      }
    }
  };

  // Handle Reaction Click
  const handleReactionClick = async (reactionId: ReactionType) => {
    triggerHaptic();

    const isCurrentlyActive = activeReactions.has(reactionId);
    const nextActive = new Set(activeReactions);

    let countDelta = 0;
    if (isCurrentlyActive) {
      nextActive.delete(reactionId);
      countDelta = -1;
    } else {
      nextActive.add(reactionId);
      countDelta = 1;
    }

    const nextCount = Math.max(0, (reactionCounts[reactionId] || 0) + countDelta);

    // Optimistic UI updates
    setActiveReactions(nextActive);
    setReactionCounts((prev) => ({
      ...prev,
      [reactionId]: nextCount
    }));

    if (onReactionToggle) {
      onReactionToggle(reactionId, !isCurrentlyActive, nextCount);
    }

    // Real-time Firestore write with atomic increment
    try {
      if (db && postId) {
        const postRef = doc(db, 'posts', postId);
        const currentUserId = auth.currentUser?.uid;

        await updateDoc(postRef, {
          [`reactions.${reactionId}`]: increment(countDelta),
          ...(currentUserId
            ? {
                [`userReactions.${reactionId}`]: isCurrentlyActive
                  ? arrayRemove(currentUserId)
                  : arrayUnion(currentUserId)
              }
            : {}),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      // Non-blocking fallback for offline/preview environments
      console.debug('Firestore reaction synced locally:', err);
    }
  };

  // Handle Quick Slang Pill Tap
  const handleQuickSlangTap = (slangText: string) => {
    triggerHaptic();
    setCommentText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return slangText;
      return `${trimmed} ${slangText}`;
    });

    if (!isCommentsOpen) {
      setIsCommentsOpen(true);
    }

    // Auto focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;

    const user = auth.currentUser;
    const newComment: PostComment = {
      id: `cm-${Date.now()}`,
      userId: user?.uid || 'guest-athlete',
      userName: user?.displayName || 'GameDay Athlete',
      userAvatar: user?.photoURL || undefined,
      text: trimmed,
      timestamp: 'Just now',
      isQuickSlang: QUICK_SLANG_PRESETS.some((p) => trimmed.includes(p.text))
    };

    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
    setIsCommentsOpen(true);

    if (onCommentSubmit) {
      onCommentSubmit(newComment);
    }

    // Firestore Integration point
    try {
      if (db && postId) {
        const commentsCol = collection(db, 'posts', postId, 'comments');
        await addDoc(commentsCol, {
          userId: newComment.userId,
          userName: newComment.userName,
          userAvatar: newComment.userAvatar || null,
          text: newComment.text,
          createdAt: serverTimestamp()
        });

        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          commentCount: increment(1),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.debug('Firestore comment added locally:', err);
    }
  };

  // Handle Link Share
  const handleShare = () => {
    triggerHaptic();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    }
  };

  // Total Engagement Count
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  return (
    <div
      className={`bg-zinc-950 border border-zinc-800/80 rounded-3xl p-4 sm:p-5 text-white font-sans shadow-2xl space-y-4 select-none ${className}`}
    >
      {/* 1. ATHLETE REACTION PILLS ROW (Scrollable with Spring States) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-teal-400 fill-teal-400/20" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Gameday Reaction Badges
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
            {totalReactions.toLocaleString()} Reps
          </span>
        </div>

        {/* Scrollable Pill Container with Hidden Scrollbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
          {DEFAULT_REACTION_CONFIG.map((badge) => {
            const isActive = activeReactions.has(badge.id);
            const count = reactionCounts[badge.id] || 0;

            return (
              <button
                key={badge.id}
                onClick={() => handleReactionClick(badge.id)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-mono font-bold transition-all duration-200 shrink-0 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-teal-500/15 border-teal-500/50 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.25)]'
                    : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                }`}
                title={`${badge.label}: ${badge.sublabel}`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">
                  {badge.emoji}
                </span>
                <span className="tracking-tight">{badge.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-teal-400/20 text-teal-200'
                      : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. QUICK SLANG DROP 1-TAP COMMENT PILLS */}
      <div className="pt-2 border-t border-zinc-800/80 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Quick Slang Drop
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Tap to insert</span>
        </div>

        {/* 1-Tap Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_SLANG_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickSlangTap(preset.text)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/90 hover:border-teal-500/40 text-zinc-300 hover:text-teal-300 text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <span>{preset.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. COMMENT INPUT BOX & ACTIONS */}
      <div className="pt-2 space-y-3">
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={`Hype up ${athleteName}...`}
              className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-sans text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-500 transition shadow-inner"
            />
            {commentText && (
              <button
                type="button"
                onClick={() => setCommentText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!commentText.trim()}
            className={`p-2.5 rounded-2xl font-bold transition-all shrink-0 cursor-pointer flex items-center justify-center ${
              commentText.trim()
                ? 'bg-teal-500 hover:bg-teal-400 text-black shadow-lg shadow-teal-500/20 active:scale-95'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
            }`}
            title="Post Comment"
          >
            <Send className="w-4 h-4" />
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition shrink-0 cursor-pointer"
            title="Share Highlight Link"
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </form>

        {/* 4. COMMENTS TOGGLE & ACCORDION LIST */}
        <div className="pt-1">
          <button
            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
            className="flex items-center justify-between w-full text-xs font-mono text-zinc-400 hover:text-zinc-200 transition py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              <span>
                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span>{isCommentsOpen ? 'Hide' : 'View Thread'}</span>
              {isCommentsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Collapsible Comment Thread */}
          {isCommentsOpen && (
            <div className="mt-3 space-y-2.5 pt-2 border-t border-zinc-800/60 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-4 text-xs font-mono text-zinc-500">
                  Be the first to drop slang on this play.
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 text-xs animate-in fade-in duration-200"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden text-zinc-300">
                      {comment.userAvatar ? (
                        <img
                          src={comment.userAvatar}
                          alt={comment.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] truncate">
                          {comment.userName}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {comment.timestamp}
                        </span>
                      </div>
                      <p className="text-zinc-200 text-xs mt-0.5 break-words">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { PostReactions };
