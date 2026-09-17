import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, User, Sparkles, Loader2 } from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db, sanitizeFirestorePayload } from '../../lib/firebase';
import { LockerComment } from './types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { notificationService } from '../../services/notificationService';

interface LockerCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postAuthorName: string;
  onRequireAuth: () => void;
}

export const LockerCommentsDrawer: React.FC<LockerCommentsDrawerProps> = ({
  isOpen,
  onClose,
  postId,
  postAuthorName,
  onRequireAuth
}) => {
  const { user, profile, role } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<LockerComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real-time Firestore sub-collection listener for comments
  useEffect(() => {
    if (!isOpen || !postId) return;

    setLoading(true);
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: LockerComment[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        postId,
        ...docSnap.data()
      })) as LockerComment[];

      setComments(items);
      setLoading(false);
    }, (error) => {
      console.warn('Comments fetch notice (using fallback):', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, postId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const authorName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Athlete';
      const authorAvatar = profile?.avatarUrl || user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
      const authorRole = profile?.role || role || 'athlete';

      await addDoc(commentsRef, sanitizeFirestorePayload({
        authorId: user.uid,
        authorName,
        authorAvatar,
        authorRole,
        text: trimmed,
        createdAt: serverTimestamp()
      }));

      // Update parent post commentsCount
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, sanitizeFirestorePayload({
        commentsCount: increment(1)
      })).catch(() => {});

      // Dispatch FCM Push & In-app notifications to any @mentioned members
      notificationService.extractMentionsAndNotify({
        text: trimmed,
        senderUid: user.uid,
        senderName: authorName,
        senderAvatar: authorAvatar,
        postId,
        isComment: true
      }).catch((err) => console.warn('Mention alert notice:', err));

      setCommentText('');
      showToast('success', 'Comment Posted', 'Your reply has been added to the discussion.');
    } catch (err) {
      console.error('Error posting comment:', err);
      showToast('error', 'Post Failed', 'Unable to send comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Drawer / Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-xl max-h-[85vh] h-[600px] flex flex-col bg-[#090D16] border border-[#24324F] rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 text-white overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#24324F] flex items-center justify-between bg-[#121926]/90 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00B8D4]/15 border border-[#00B8D4]/40 flex items-center justify-center text-[#00B8D4]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#F4F4F4] tracking-tight">
                    Locker Discussion
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Thread on {postAuthorName}'s post • {comments.length} replies
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                aria-label="Close comments"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00B8D4] mb-2" />
                  <span className="text-xs font-mono">Loading real-time discussion...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-16 bg-[#263238]/30 border border-[#24324F] rounded-2xl p-6">
                  <Sparkles className="w-8 h-8 text-[#00B8D4] mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-slate-200">No replies yet</p>
                  <p className="text-xs text-slate-400 mt-1">Be the first coach, athlete or fan to drop a take!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div 
                    key={comment.id}
                    className="flex items-start gap-3 bg-[#263238] border border-[#24324F] rounded-2xl p-3.5 shadow-sm"
                  >
                    <img
                      src={comment.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                      alt={comment.authorName}
                      className="w-8 h-8 rounded-xl object-cover border border-slate-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#F4F4F4] truncate">
                          {comment.authorName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-black/40 text-[9px] font-extrabold uppercase font-mono text-cyan-300 border border-white/10">
                          {comment.authorRole}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Composer Footer */}
            <form onSubmit={handleSubmitComment} className="p-3 sm:p-4 border-t border-[#24324F] bg-[#121926] flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user ? "Drop your take or hype..." : "Log in to post a reply..."}
                onClick={() => {
                  if (!user) onRequireAuth();
                }}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-black/60 border border-[#24324F] focus:border-[#00B8D4] focus:ring-1 focus:ring-[#00B8D4] text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="min-h-[48px] min-w-[48px] px-4 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-[#090D16] font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,184,212,0.3)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#090D16]" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Reply</span>
                  </>
                )}
              </button>
            </form>

          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
};
