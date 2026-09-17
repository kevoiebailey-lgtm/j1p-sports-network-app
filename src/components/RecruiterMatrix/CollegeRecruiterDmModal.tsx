import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ShieldCheck, Mail, GraduationCap, Calendar, CheckCircle2, AlertCircle, Sparkles, Building } from 'lucide-react';
import { UserProfile } from '../../types';

interface CollegeRecruiterDmModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: UserProfile | null;
  coachName?: string;
  programName?: string;
}

export const CollegeRecruiterDmModal: React.FC<CollegeRecruiterDmModalProps> = ({
  isOpen,
  onClose,
  athlete,
  coachName = "Coach Marcus Vance",
  programName = "Rutgers University (NCAA D1 - Big Ten)"
}) => {
  const [subject, setSubject] = useState<string>('Official Evaluation & Camp Invitation');
  const [message, setMessage] = useState<string>(
    athlete 
      ? `Coach Vance here with ${programName}. Our staff was extremely impressed with your recent game tape and combine measurables. We would love to discuss your upcoming high school season and invite you to our elite prospect showcase on campus.`
      : ''
  );
  const [visitDate, setVisitDate] = useState<string>('2026-09-19');
  const [offerType, setOfferType] = useState<'Inquiry' | 'Unofficial Visit' | 'Official Visit' | 'Scholarship Offer'>('Unofficial Visit');
  const [ncaaComplianceChecked, setNcaaComplianceChecked] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen || !athlete) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/recruiter/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruiterName: coachName,
          programName: programName,
          athleteId: athlete.uid,
          athleteName: athlete.displayName,
          subject: `[${(offerType || 'INQUIRY').toUpperCase()}] ${subject}`,
          message: `${message}\n\n[Proposed Campus Visit Date: ${visitDate}]`
        })
      });
      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#18222A] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-[#212A31] via-[#1b2630] to-[#212A31] border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00F2FE] to-[#0284C7] flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(0,242,254,0.4)]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    College Recruiter Direct DM
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> NCAA Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Direct communication channel with prospect & family
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          {isSuccess ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-black uppercase tracking-wider text-white">
                Direct Message Dispatched
              </h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Your message has been delivered to <strong>{athlete.displayName}</strong> and their registered guardian / coach. A copy has been logged to your NCAA recruitment trail.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-6 space-y-5">
              {/* Recruiter & Prospect Context Pill */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={athlete.avatarUrl || athlete.photoURL || (athlete as any).avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'}
                    alt={athlete.displayName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#00F2FE]"
                  />
                  <div>
                    <h4 className="text-sm font-black text-white">{athlete.displayName}</h4>
                    <p className="text-xs text-[#00F2FE] font-mono">
                      Class of {athlete.gradYear || '2026'} • {athlete.sport || 'Basketball'} • {athlete.highSchool || 'Tri-State Elite'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400 block">Sender:</span>
                  <span className="text-xs font-bold text-amber-400">{coachName}</span>
                  <span className="text-[10px] block text-slate-400">{programName}</span>
                </div>
              </div>

              {/* Inquiry Type & Visit Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                    Evaluation Category
                  </label>
                  <select
                    value={offerType}
                    onChange={(e) => setOfferType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[#00F2FE]"
                  >
                    <option value="Inquiry">General Recruiting Inquiry</option>
                    <option value="Unofficial Visit">Unofficial Campus Visit</option>
                    <option value="Official Visit">Official Paid Campus Visit</option>
                    <option value="Scholarship Offer">Official Scholarship Offer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" /> Proposed Visit Date
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-[#00F2FE]"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Official Recruiting Evaluation & Visit"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[#00F2FE]"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                  Message Content
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Provide details about your program, evaluation notes, and next steps..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE] resize-none"
                  required
                />
              </div>

              {/* NCAA Compliance Checkbox */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="ncaa-check"
                  checked={ncaaComplianceChecked}
                  onChange={(e) => setNcaaComplianceChecked(e.target.checked)}
                  className="mt-1 rounded accent-[#00F2FE] cursor-pointer"
                  required
                />
                <label htmlFor="ncaa-check" className="text-[11px] text-slate-300 leading-snug cursor-pointer">
                  <strong className="text-amber-400 uppercase font-mono">NCAA Compliance Statement:</strong> I certify that this contact complies with current NCAA Division I / II recruiting contact calendar windows for the prospect's graduation class.
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !ncaaComplianceChecked}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#0284C7] text-slate-950 font-black text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>DISPATCHING...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>SEND OFFICIAL INQUIRY</span>
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
