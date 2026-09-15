import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  Send, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  GraduationCap, 
  ShieldCheck, 
  Building, 
  Sparkles, 
  ChevronRight, 
  Inbox, 
  Eye, 
  AlertCircle, 
  MessageSquare,
  Award
} from 'lucide-react';
import { UserProfile } from '../../types';

interface RecruiterInquiry {
  id: string;
  coachName: string;
  programName: string;
  division: 'NCAA D1' | 'NCAA D2' | 'NCAA D3' | 'NAIA' | 'NJCAA';
  athleteName: string;
  inquiryType: 'Official Visit' | 'Unofficial Visit' | 'Camp Invite' | 'Evaluation Feedback' | 'Scholarship Inquiry';
  proposedDate?: string;
  subject: string;
  message: string;
  status: 'Pending Review' | 'Accepted' | 'Declined';
  sentAt: string;
  readAt?: string;
}

interface RecruiterInquiriesHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
}

const INITIAL_INQUIRIES: RecruiterInquiry[] = [
  {
    id: 'inq-101',
    coachName: 'Coach Marcus Vance',
    programName: 'Rutgers University (Big Ten)',
    division: 'NCAA D1',
    athleteName: 'Jordan Hayes',
    inquiryType: 'Official Visit',
    proposedDate: '2026-10-15',
    subject: 'Official Campus Visit & Fall Team Practice Invitation',
    message: 'Jordan, our staff has tracked your combine numbers and clutch play. We would love to host you and your family for an Official Campus Visit next month.',
    status: 'Pending Review',
    sentAt: '2 hours ago',
    readAt: '1 hour ago'
  },
  {
    id: 'inq-102',
    coachName: 'Coach Dave Holloway',
    programName: 'Villanova University (Big East)',
    division: 'NCAA D1',
    athleteName: 'Jordan Hayes',
    inquiryType: 'Camp Invite',
    proposedDate: '2026-09-28',
    subject: 'Elite Point Guard Prospect Showcase Invitation',
    message: 'We are inviting top 25 regional playmakers to our invitation-only fall camp on campus.',
    status: 'Accepted',
    sentAt: 'Yesterday',
    readAt: 'Yesterday'
  },
  {
    id: 'inq-103',
    coachName: 'Coach Greg Snyder',
    programName: 'Seton Hall University (Big East)',
    division: 'NCAA D1',
    athleteName: 'Jordan Hayes',
    inquiryType: 'Scholarship Inquiry',
    subject: 'Preliminary Evaluation & Transcript Review',
    message: 'Impressed with your 3.8 GPA and 22 PPG season average. Our recruiting coordinator would like to schedule an introductory call with your high school coach.',
    status: 'Pending Review',
    sentAt: '3 days ago'
  }
];

export const RecruiterInquiriesHubModal: React.FC<RecruiterInquiriesHubModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'history'>('inbox');
  const [inquiries, setInquiries] = useState<RecruiterInquiry[]>(INITIAL_INQUIRIES);
  const [selectedInquiry, setSelectedInquiry] = useState<RecruiterInquiry | null>(INITIAL_INQUIRIES[0]);

  // Compose State
  const [targetAthleteName, setTargetAthleteName] = useState<string>('Jordan Hayes');
  const [inquiryType, setInquiryType] = useState<RecruiterInquiry['inquiryType']>('Official Visit');
  const [programName, setProgramName] = useState<string>('Rutgers University');
  const [division, setDivision] = useState<RecruiterInquiry['division']>('NCAA D1');
  const [subject, setSubject] = useState<string>('Official Recruiting Evaluation & Campus Invite');
  const [message, setMessage] = useState<string>('');
  const [proposedDate, setProposedDate] = useState<string>('2026-10-20');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newInquiry: RecruiterInquiry = {
      id: `inq-${Date.now()}`,
      coachName: currentUser?.displayName || 'Coach Recruiter',
      programName,
      division,
      athleteName: targetAthleteName,
      inquiryType,
      proposedDate,
      subject,
      message: message.trim(),
      status: 'Pending Review',
      sentAt: 'Just now'
    };

    setInquiries([newInquiry, ...inquiries]);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setActiveTab('inbox');
      setSelectedInquiry(newInquiry);
    }, 1500);
  };

  const handleUpdateStatus = (id: string, status: 'Accepted' | 'Declined') => {
    setInquiries(inquiries.map(inq => inq.id === id ? { ...inq, status } : inq));
    if (selectedInquiry?.id === id) {
      setSelectedInquiry({ ...selectedInquiry, status });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-[#0F172A] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00B8D4] to-[#0284C7] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-[#00B8D4]/20">
                <GraduationCap className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Collegiate Recruiter Inquiries & Outreach Hub</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>NCAA Compliant</span>
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Verified campus visit invitations, official scholarship inquiries & direct coach dialogue
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub Navigation Bar */}
          <div className="px-5 py-2.5 bg-[#0A0F1D] border-b border-white/5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-[#00B8D4] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Inquiries Inbox ({inquiries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-[#FF6A00] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Official Inquiry</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'inbox' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 min-h-[450px]">
                {/* Left List */}
                <div className="border-r border-white/10 p-3 space-y-2 overflow-y-auto">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 py-1">
                    Recent Recruiting Communications
                  </div>
                  {inquiries.map((inq) => {
                    const isSelected = selectedInquiry?.id === inq.id;
                    return (
                      <button
                        key={inq.id}
                        type="button"
                        onClick={() => setSelectedInquiry(inq)}
                        className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/10 border-[#00B8D4] shadow-md'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                            {inq.division}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{inq.sentAt}</span>
                        </div>

                        <div className="font-bold text-xs text-white truncate">{inq.programName}</div>
                        <div className="text-[11px] text-slate-300 truncate">{inq.coachName}</div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {inq.inquiryType}
                          </span>
                          <span className={`text-[10px] font-mono font-bold ${
                            inq.status === 'Accepted' ? 'text-emerald-400' : inq.status === 'Declined' ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {inq.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Detail Pane */}
                <div className="md:col-span-2 p-5 sm:p-6 space-y-4 overflow-y-auto">
                  {selectedInquiry ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-[#00B8D4]/20 text-[#00B8D4] font-mono text-xs font-bold border border-[#00B8D4]/30">
                              {selectedInquiry.inquiryType}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-mono text-xs font-bold">
                              {selectedInquiry.division}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">
                            Delivered: {selectedInquiry.sentAt}
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-white">{selectedInquiry.subject}</h3>

                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <Building className="w-4 h-4 text-[#E5B868]" />
                          <span className="font-bold text-white">{selectedInquiry.programName}</span>
                          <span>•</span>
                          <span>{selectedInquiry.coachName}</span>
                        </div>

                        {selectedInquiry.proposedDate && (
                          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                            <Calendar className="w-4 h-4" />
                            <span>Proposed Visit / Event Date: <strong>{selectedInquiry.proposedDate}</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 rounded-2xl bg-[#090D16] border border-white/5 space-y-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                          Official Recruiter Communication:
                        </span>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {selectedInquiry.message}
                        </p>
                      </div>

                      {/* Response Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedInquiry.id, 'Accepted')}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accept & Confirm Visit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(selectedInquiry.id, 'Declined')}
                            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs transition-all cursor-pointer"
                          >
                            <span>Decline Invitation</span>
                          </button>
                        </div>

                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Logged in official recruit compliance ledger</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                      Select an inquiry to view details
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Compose Tab */
              <form onSubmit={handleSendInquiry} className="p-6 max-w-2xl mx-auto space-y-4">
                {isSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Recruiter inquiry dispatched successfully!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Prospect Athlete Name
                    </label>
                    <input
                      type="text"
                      required
                      value={targetAthleteName}
                      onChange={(e) => setTargetAthleteName(e.target.value)}
                      placeholder="e.g. Jordan Hayes"
                      className="w-full bg-[#060A12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={inquiryType}
                      onChange={(e: any) => setInquiryType(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                    >
                      <option value="Official Visit">Official Campus Visit</option>
                      <option value="Unofficial Visit">Unofficial Campus Visit</option>
                      <option value="Camp Invite">Prospect Showcase / Camp Invite</option>
                      <option value="Scholarship Inquiry">Scholarship Inquiry</option>
                      <option value="Evaluation Feedback">Evaluation Feedback</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Collegiate Program / School
                    </label>
                    <input
                      type="text"
                      required
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      placeholder="e.g. Rutgers University"
                      className="w-full bg-[#060A12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Proposed Visit / Event Date
                    </label>
                    <input
                      type="date"
                      value={proposedDate}
                      onChange={(e) => setProposedDate(e.target.value)}
                      className="w-full bg-[#060A12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Official Recruiting Evaluation"
                    className="w-full bg-[#060A12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Recruiter Message & Program Overview
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your recruiting evaluation, athletic department facilities, and invitation specifics..."
                    className="w-full bg-[#060A12] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#E5B868] hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF6A00]/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Verified Recruiter Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default RecruiterInquiriesHubModal;
