import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageSquare, Send, CornerDownRight, Sparkles } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

// ==========================================
// 1. TYPES & DATA STRUCTURES
// ==========================================
export interface CommentReply {
  id: string;
  author: {
    name: string;
    avatar: string;
    badge?: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
}

export interface CommentItem {
  id: string;
  author: {
    name: string;
    avatar: string;
    badge?: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
  replies: CommentReply[];
}

interface CommentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  totalCommentsCount: number;
}

// Mock initial comments data
const INITIAL_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    author: { name: 'Jordan Rivera', avatar: 'JR', badge: "WR • Class of '26" },
    content: 'That throw at 0:15 was insane! 🎯 Arm strength is crazy!',
    timestamp: '45m ago',
    likes: 24,
    isLiked: false,
    replies: [
      {
        id: 'r1',
        author: { name: 'Kevoie Bailey', avatar: 'KB', badge: 'QB' },
        content: 'Appreciate it man! We put in heavy work on that seam route all week.',
        timestamp: '30m ago',
        likes: 8,
        isLiked: true,
      },
    ],
  },
  {
    id: 'c2',
    author: { name: 'Coach Williams', avatar: 'CW', badge: 'NJ Lightning Coach' },
    content: 'Great footwork in the pocket. Keep grinding! 💪',
    timestamp: '2h ago',
    likes: 12,
    isLiked: true,
    replies: [],
  },
];

// ==========================================
// 2. MAIN COMMENT DRAWER COMPONENT
// ==========================================
export const CommentDrawer: React.FC<CommentDrawerProps> = ({
  isOpen,
  onClose,
  postId,
  totalCommentsCount,
}) => {
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyingToAuthor, setReplyingToAuthor] = useState<string>('');

  // Handle adding a top-level comment or reply
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (replyingToId) {
      // Add as a reply to a specific comment
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === replyingToId) {
            return {
              ...c,
              replies: [
                ...c.replies,
                {
                  id: `r_${Date.now()}`,
                  author: { name: 'Current User', avatar: 'CU', badge: 'Athlete' },
                  content: newCommentText,
                  timestamp: 'Just now',
                  likes: 0,
                },
              ],
            };
          }
          return c;
        })
      );
      setReplyingToId(null);
      setReplyingToAuthor('');
    } else {
      // Add as a new top-level comment
      const newComment: CommentItem = {
        id: `c_${Date.now()}`,
        author: { name: 'Current User', avatar: 'CU', badge: 'Athlete' },
        content: newCommentText,
        timestamp: 'Just now',
        likes: 0,
        replies: [],
      };
      setComments((prev) => [newComment, ...prev]);
    }

    // Trigger FCM & In-App notifications for mentioned members
    notificationService.extractMentionsAndNotify({
      text: newCommentText.trim(),
      senderUid: 'current-user',
      senderName: 'Locker Member',
      postId,
      isComment: true
    }).catch(() => {});

    setNewCommentText('');
  };

  // Toggle comment like state
  const toggleLikeComment = (commentId: string, isReply = false, parentId?: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (isReply && c.id === parentId) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId
                ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 }
                : r
            ),
          };
        }
        if (!isReply && c.id === commentId) {
          return {
            ...c,
            isLiked: !c.isLiked,
            likes: c.isLiked ? c.likes - 1 : c.likes + 1,
          };
        }
        return c;
      })
    );
  };

  // Back button popstate listener for graceful closing on mobile
  React.useEffect(() => {
    if (!isOpen) return;

    const handlePopState = () => {
      onClose();
    };

    window.history.pushState({ modalOpen: 'comments' }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#212A31]/80 backdrop-blur-md"
          />

          {/* Slide-Over / Bottom Sheet Drawer Container */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) {
                onClose();
              }
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-lg h-[85dvh] sm:h-full bg-[#212A31]/95 border-t-2 sm:border-t-0 sm:border-l border-slate-800/80 rounded-t-3xl sm:rounded-t-none shadow-2xl flex flex-col z-10 overflow-hidden touch-pan-y"
          >
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 cursor-grab active:cursor-grabbing sm:hidden" />

            {/* Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#212A31]/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-black tracking-wider uppercase text-white">
                  Discussion <span className="text-slate-400 font-medium text-xs">({comments.length + comments.reduce((acc, c) => acc + c.replies.length, 0)})</span>
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#212A31] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Parent Comment */}
                  <div className="flex gap-3 group">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-teal-600 flex items-center justify-center font-bold text-slate-950 text-xs shrink-0">
                      {comment.author.avatar}
                    </div>

                    <div className="flex-1">
                      <div className="bg-[#212A31]/80 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-md">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{comment.author.name}</span>
                            {comment.author.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600/10 text-red-500 border border-red-600/20">
                                {comment.author.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{comment.content}</p>
                      </div>

                      {/* Comment Action Links */}
                      <div className="flex items-center gap-4 mt-1.5 ml-2 text-[11px] text-slate-400 font-semibold">
                        <button
                          onClick={() => toggleLikeComment(comment.id)}
                          className={`flex items-center gap-1 transition-colors ${comment.isLiked ? 'text-rose-400' : 'hover:text-slate-200'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-rose-400' : ''}`} />
                          <span>{comment.likes}</span>
                        </button>

                        <button
                          onClick={() => {
                            setReplyingToId(comment.id);
                            setReplyingToAuthor(comment.author.name);
                          }}
                          className="hover:text-red-500 transition-colors"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reply Thread List */}
                  {comment.replies.length > 0 && (
                    <div className="pl-6 space-y-3 border-l-2 border-slate-800/60 ml-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-[10px] shrink-0">
                            {reply.author.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="bg-[#212A31]/50 border border-slate-800/50 rounded-2xl p-2.5">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-xs font-bold text-white">{reply.author.name}</span>
                                <span className="text-[9px] text-slate-500">{reply.timestamp}</span>
                              </div>
                              <p className="text-[11px] text-slate-300">{reply.content}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 ml-2 text-[10px] text-slate-400">
                              <button
                                onClick={() => toggleLikeComment(reply.id, true, comment.id)}
                                className={`flex items-center gap-1 ${reply.isLiked ? 'text-rose-400' : 'hover:text-slate-200'}`}
                              >
                                <Heart className={`w-3 h-3 ${reply.isLiked ? 'fill-rose-400' : ''}`} />
                                <span>{reply.likes}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Active Reply Banner Indicator */}
            {replyingToId && (
              <div className="px-4 py-2 bg-[#212A31]/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CornerDownRight className="w-3.5 h-3.5 text-red-500" />
                  Replying to <span className="text-red-500 font-semibold">@{replyingToAuthor}</span>
                </span>
                <button
                  onClick={() => {
                    setReplyingToId(null);
                    setReplyingToAuthor('');
                  }}
                  className="text-slate-500 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Sticky Bottom Input Bar */}
            <form onSubmit={handleSendComment} className="p-3 bg-[#212A31] border-t border-slate-800/80 flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={replyingToId ? `Reply to @${replyingToAuthor}...` : 'Add a comment...'}
                className="flex-1 h-10 px-4 rounded-full bg-[#212A31] border border-slate-800 focus:border-red-600/50 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-500 to-red-600 flex items-center justify-center text-slate-950 disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommentDrawer;
