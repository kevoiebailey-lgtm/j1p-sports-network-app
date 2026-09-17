import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Sparkles, 
  GraduationCap, 
  School,
  FileText
} from 'lucide-react';
import { CheerSkillItem } from './types';

interface CheerCoachOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteName: string;
  athleteId: string;
  gradYear?: string | number;
  position?: string;
  gpa?: string;
  schoolGym?: string;
  skills: CheerSkillItem[];
  readinessScore: number;
}

export const CheerCoachOutreachModal: React.FC<CheerCoachOutreachModalProps> = ({
  isOpen,
  onClose,
  athleteName,
  athleteId,
  gradYear = '2026',
  position = 'Flyer / Tumbler',
  gpa = '3.85',
  schoolGym = 'East Orange Jaguar Cheer / All-Star Elite',
  skills,
  readinessScore
}) => {
  const [coachName, setCoachName] = useState('Coach');
  const [collegeName, setCollegeName] = useState('University Cheerleading');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const profileUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/cheer-matrix/${athleteId}`
    : `https://app.just1play.com/cheer-matrix/${athleteId}`;

  const verifiedSkills = skills.filter(s => s.verified || (s.videoUrl && s.videoUrl.trim().length > 0));
  const topSkillsList = verifiedSkills.slice(0, 5).map(s => {
    const surf = s.surface === 'dead_floor' ? ' [Dead Floor]' : '';
    return `• ${s.name} (${s.level})${surf}`;
  }).join('\n');

  const emailSubject = `Recruiting Profile: ${athleteName} - Class of ${gradYear} (${position}) - ${readinessScore}% CheerMatrix Verified`;

  const emailBody = `Dear ${coachName || 'Coach'} and ${collegeName || 'Collegiate'} Staff,

My name is ${athleteName} and I am currently a Class of ${gradYear} ${position} competing with ${schoolGym}. I am writing to express my strong interest in your cheerleading program and academic opportunities.

Key Academic & Athletic Metrics:
• High School GPA: ${gpa}
• Primary Position: ${position}
• Graduation Year: ${gradYear}
• Just1Play CheerMatrix Readiness Rating: ${readinessScore}%

Top Verified Skills & Video Footage:
${topSkillsList || '• Standing Full (NCAA D1) [Dead Floor]\n• Round-off BHS Double Full\n• Switch-Up Lib to Stretch\n• Double Down Dismount'}

You can review my full verified skill videos, floor surface audits, and competition clips on my official Just1Play CheerMatrix profile:
${profileUrl}

Thank you for your time and consideration. I would love the opportunity to attend an upcoming college clinic or discuss how I can contribute to your championship culture.

Sincerely,

${athleteName}
Class of ${gradYear} Student-Athlete
${profileUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenMailto = () => {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Direct Outreach Generator
                </span>
                <span className="text-[10px] font-mono text-neutral-400">1-Click Coach Introduction</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                College Coach Email & Questionnaire Letter
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs for Customization */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
              Coach / Program Director Name
            </label>
            <input
              type="text"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="e.g. Coach Vance or Coach Jordan"
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs font-mono focus:border-amber-500 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-neutral-300">
              Target College / University Name
            </label>
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. University of Kentucky Cheer"
              className="w-full px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs font-mono focus:border-amber-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Email Preview Container */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-neutral-400">
            <span>Subject Line: <span className="text-white font-normal">{emailSubject}</span></span>
          </div>

          <div className="relative">
            <textarea
              readOnly
              rows={11}
              value={emailBody}
              className="w-full p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono text-xs leading-relaxed focus:outline-none select-all"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Letter to Clipboard'}</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleOpenMailto}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Open in Email App</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
