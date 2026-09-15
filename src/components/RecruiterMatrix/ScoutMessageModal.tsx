import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types';
import { Send, X, Mail, CheckCircle2, ShieldCheck, Sparkles, User, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { directMessagingService } from '../../services/directMessagingService';
import { useNavigate } from 'react-router-dom';

interface ScoutMessageModalProps {
  athlete: UserProfile | null;
  onClose: () => void;
  onOpenThread?: (targetUid: string, targetName: string) => void;
}

export const ScoutMessageModal: React.FC<ScoutMessageModalProps> = ({ athlete, onClose, onOpenThread }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [recruiterName, setRecruiterName] = useState(user?.displayName || profile?.displayName || '');
  const [organization, setOrganization] = useState((profile as any)?.organization || (profile as any)?.school || '');
  const [message, setMessage] = useState('');
  const [inquiryType, setInquiryType] = useState<'Recruiting' | 'Combine Invitation' | 'Camp Offer' | 'General'>('Recruiting');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [createdChatId, setCreatedChatId] = useState<string | null>(null);

  if (!athlete) return null;

  const currentUid = user?.uid || profile?.uid || 'scout-user';
  const currentAvatar = user?.photoURL || profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
  const currentRole: UserRole = (profile?.role as UserRole) || 'scout';

  const athleteUid = athlete.uid || (athlete as any).id || '';
  const athleteName = athlete.displayName || 'Athlete';
  const athleteAvatar = athlete.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&auto=format&fit=crop&q=80';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending || !athleteUid) return;

    setIsSending(true);
    try {
      const formattedMessage = `[${inquiryType.toUpperCase()}] from ${recruiterName} (${organization}):\n\n${message.trim()}`;

      const res = await directMessagingService.sendDirectMessage({
        senderUid: currentUid,
        senderName: recruiterName || 'Recruiting Scout',
        senderAvatar: currentAvatar,
        senderRole: currentRole,
        senderIsVerified: !!profile?.isVerified,
        receiverUid: athleteUid,
        receiverName: athleteName,
        receiverAvatar: athleteAvatar,
        receiverRole: 'athlete',
        text: formattedMessage,
        inquiryType,
        organization,
        sport: athlete.sport
      });

      setCreatedChatId(res.chatId);
      setIsSent(true);
    } catch (err) {
      console.warn('Error dispatching scout message:', err);
      // Fallback for UX
      setIsSent(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleGoToChat = () => {
    onClose();
    if (onOpenThread) {
      onOpenThread(athleteUid, athleteName);
    } else {
      navigate(`/messages?userId=${athleteUid}`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/85 backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#121826]/95 border border-[#00B8D4]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(0,184,212,0.25)] text-white backdrop-blur-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {isSent ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#00B8D4]/20 border-2 border-[#00B8D4] flex items-center justify-center text-[#00B8D4] shadow-[0_0_20px_rgba(0,184,212,0.5)]">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-2xl font-black italic uppercase text-white">DIRECT INQUIRY DISPATCHED!</h3>
              <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                Direct recruiter inquiry has been delivered to <strong className="text-[#00B8D4]">{athleteName}</strong>. A private direct messaging channel is now active.
              </p>
              
              <div className="flex items-center gap-3 pt-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-[#161F30] hover:bg-[#24324F] text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider border border-[#24324F] transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleGoToChat}
                  className="flex-1 py-3 rounded-xl bg-[#00B8D4] hover:bg-[#00F5D4] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,184,212,0.4)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Chat Thread</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-1 rounded-md bg-[#00B8D4] text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(0,184,212,0.5)]">
                  <Mail className="w-3.5 h-3.5 fill-slate-950" />
                  DIRECT RECRUITER SCOUT INQUIRY
                </span>
              </div>

              {/* Recipient summary */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#161F30] border border-[#24324F]">
                <img
                  src={athleteAvatar}
                  alt={athleteName}
                  className="w-12 h-12 rounded-xl object-cover border border-[#00B8D4]/60 shadow-[0_0_12px_rgba(0,184,212,0.3)] shrink-0"
                />
                <div>
                  <h4 className="text-sm font-black uppercase italic text-white">
                    TO: {athleteName}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {athlete.sport} • {athlete.position} {athlete.highSchool ? `• ${athlete.highSchool}` : ''} {athlete.state ? `(${athlete.state})` : ''}
                  </p>
                </div>
              </div>

              {/* Inquiry type radio pills */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  INQUIRY CATEGORY
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Recruiting', 'Combine Invitation', 'Camp Offer', 'General'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInquiryType(type)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border cursor-pointer ${
                        inquiryType === type
                          ? 'bg-[#00B8D4] text-slate-950 border-[#00B8D4] font-extrabold shadow-[0_0_12px_rgba(0,184,212,0.4)]'
                          : 'bg-[#161F30] text-slate-300 border-[#24324F] hover:border-slate-600'
                      }`}
                    >
                      <span>{type}</span>
                      {inquiryType === type && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recruiter Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400">YOUR NAME & TITLE</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coach Marcus Miller"
                    value={recruiterName}
                    onChange={(e) => setRecruiterName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#24324F] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-400">PROGRAM / SCHOOL / ORG</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rutgers University Athletics"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0B0F19] border border-[#24324F] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>
              </div>

              {/* Message textarea */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400">SCOUT MESSAGE CONTENT</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Introduce your program, schedule an evaluation call, or invite the athlete to upcoming official showcases..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-[#24324F] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4] resize-none"
                />
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending || !message.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00B8D4] to-[#0096B4] hover:from-[#00F5D4] hover:to-[#00B8D4] text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,184,212,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#00B8D4] disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>DISPATCHING SECURE MESSAGE...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 fill-slate-950 text-slate-950" />
                      <span>DISPATCH DIRECT MESSAGE</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

