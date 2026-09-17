import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Sliders,
  FileText,
  User,
  Zap,
  Wand2,
  Tag,
  ArrowRight
} from 'lucide-react';
import { UserRole } from '../../types';
import {
  validateRoleConsistency,
  ValidationResult,
  PostContentType
} from '../../services/roleConsistencyValidator';
import { ROLE_VISUAL_CONFIG } from '../Common/RoleAvatar';

interface RoleConsistencyAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_SCENARIOS = [
  {
    title: 'Mismatch: Athlete posting NCAA Scout Evaluation',
    role: 'athlete' as UserRole,
    caption: 'Scout Evaluation Report: Player shows grade 90/100 overall. Excellent 6ft6 wingspan rating and collegiate D1 recruiting profile.',
    option: 'status'
  },
  {
    title: 'Mismatch: Coach posting Official Tournament Sanction',
    role: 'coach' as UserRole,
    caption: 'Official Sanctioned Host Notice: Tournament bracket and Court 1 schedule for Saturday morning games.',
    option: 'status'
  },
  {
    title: 'Warning: Coach publishing Scout Rating Report',
    role: 'coach' as UserRole,
    caption: 'Scouting Note & Prospect Rating: 2026 Guard eval shows top-tier court vision and defensive motor.',
    option: 'status'
  },
  {
    title: 'Aligned: Scout publishing NCAA Evaluation',
    role: 'scout' as UserRole,
    caption: 'NCAA Scout Evaluation Report: Verified athletic rubric and breakdown for 2027 prospects.',
    option: 'status'
  },
  {
    title: 'Aligned: Athlete posting Game Film Highlight',
    role: 'athlete' as UserRole,
    caption: 'Check out my full game film highlights from last night! 30 points and 8 assists. Hudl link below.',
    option: 'video'
  }
];

export const RoleConsistencyAuditModal: React.FC<RoleConsistencyAuditModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('athlete');
  const [testCaption, setTestCaption] = useState(SAMPLE_SCENARIOS[0].caption);
  const [testOption, setTestOption] = useState<'video' | 'photos' | 'status'>('status');

  if (!isOpen) return null;

  const validationResult: ValidationResult = validateRoleConsistency({
    role: selectedRole,
    caption: testCaption,
    postOption: testOption,
    hasVideo: testOption === 'video',
    hasPhoto: testOption === 'photos'
  });

  const applyScenario = (scenario: typeof SAMPLE_SCENARIOS[0]) => {
    setSelectedRole(scenario.role);
    setTestCaption(scenario.caption);
    setTestOption(scenario.option as any);
  };

  const isMismatch = validationResult.severity === 'mismatch_flag';
  const roleConfig = ROLE_VISUAL_CONFIG[selectedRole] || ROLE_VISUAL_CONFIG.athlete;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#212A31] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden font-sans text-slate-100 max-h-[90vh] flex flex-col"
        >
          {/* Top Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#E5B868]/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-white/10 pb-4">
            <div className="p-3 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/30 text-[#E5B868]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E5B868]/10 text-[#E5B868] border border-[#E5B868]/30">
                  AUTOMATED AUDIT ENGINE
                </span>
              </div>
              <h2 className="text-xl font-black italic uppercase text-white tracking-tight mt-0.5">
                Role-Consistency Validator Simulator
              </h2>
            </div>
          </div>

          {/* Body Scroll Area */}
          <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
            
            {/* Scenario Preset Buttons */}
            <div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase block mb-2">
                Quick Test Scenarios:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SCENARIOS.map((scenario, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyScenario(scenario)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 transition-all cursor-pointer hover:border-[#E5B868]/40"
                  >
                    {scenario.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Configuration Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-white/10">
              <div>
                <label className="text-xs font-mono text-slate-400 mb-1.5 block font-bold">
                  Simulate User Role:
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-[#212A31] border border-white/20 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#E5B868]"
                >
                  <option value="athlete">Athlete</option>
                  <option value="coach">Head Coach</option>
                  <option value="scout">NCAA Recruiter / Scout</option>
                  <option value="organization">Sanctioned Host Organization</option>
                  <option value="creator">Media Creator</option>
                  <option value="viewer">Fan / Spectator</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 mb-1.5 block font-bold">
                  Simulate Media Type:
                </label>
                <select
                  value={testOption}
                  onChange={(e) => setTestOption(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#212A31] border border-white/20 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#E5B868]"
                >
                  <option value="status">Text Note / Scout Report</option>
                  <option value="video">Game Film / Video Link</option>
                  <option value="photos">Photo Package / Game Snapshots</option>
                </select>
              </div>
            </div>

            {/* Test Caption Area */}
            <div>
              <label className="text-xs font-mono text-slate-400 mb-1.5 block font-bold">
                Test Post Caption / Data Payload:
              </label>
              <textarea
                rows={3}
                value={testCaption}
                onChange={(e) => setTestCaption(e.target.value)}
                className="w-full p-3.5 bg-[#212A31] border border-white/20 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#E5B868] resize-none"
                placeholder="Type test caption containing scout keywords, official sanctions, or highlights..."
              />
            </div>

            {/* LIVE VALIDATOR ANALYSIS RESULT DISPLAY */}
            <div className={`p-5 rounded-2xl border transition-all ${
              validationResult.isAligned
                ? 'bg-emerald-950/40 border-red-600/40 text-emerald-200'
                : isMismatch
                ? 'bg-red-950/50 border-red-500/50 text-red-200'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  {validationResult.isAligned ? (
                    <CheckCircle2 className="w-5 h-5 text-red-500" />
                  ) : isMismatch ? (
                    <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  )}
                  <span className="font-mono font-bold text-xs uppercase">
                    {validationResult.title}
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  validationResult.isAligned
                    ? 'bg-red-600/20 text-red-400 border-red-600/40'
                    : isMismatch
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {validationResult.severity.toUpperCase()}
                </span>
              </div>

              <p className="text-xs font-sans leading-relaxed mb-3">
                {validationResult.explanation}
              </p>

              <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-[11px] font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Detected Data Type:</span>
                  <span className="font-bold text-white">{validationResult.contentTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Role:</span>
                  <span className="font-bold uppercase text-[#E5B868]">{selectedRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Required Credentials:</span>
                  <span className="font-bold uppercase text-amber-300">{validationResult.recommendedRole}</span>
                </div>
                {validationResult.disclaimerTag && (
                  <div className="flex justify-between pt-1 border-t border-white/10">
                    <span className="text-slate-400">Generated Disclaimer:</span>
                    <span className="font-bold text-red-400">[{validationResult.disclaimerTag}]</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer font-mono"
            >
              Close Auditor
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
