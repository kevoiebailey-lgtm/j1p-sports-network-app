import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ExternalLink, 
  Sparkles, 
  Flame, 
  Award,
  ChevronRight,
  School,
  GraduationCap
} from 'lucide-react';
import { CheerSkillItem } from './types';

interface CheerProgramMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: CheerSkillItem[];
  athleteName: string;
}

interface CollegeProgramRule {
  id: string;
  name: string;
  division: 'NCAA D1 Coed' | 'NCAA D1 All-Girl' | 'NCAA D2 / NAIA' | 'Collegiate STUNT';
  sampleSchools: string[];
  scholarshipTier: 'Full / High Partial' | 'Partial Scholarship' | 'Roster Spot / Walk-On' | 'Varsity Letter';
  requiredSkills: {
    name: string;
    keywords: string[];
    surfaceRequired?: 'dead_floor' | 'any';
    description: string;
  }[];
  notes: string;
}

const COLLEGE_STANDARDS: CollegeProgramRule[] = [
  {
    id: 'd1_coed_elite',
    name: 'NCAA Division 1 Coed (Top 10 National)',
    division: 'NCAA D1 Coed',
    sampleSchools: ['Kentucky', 'UCF', 'Hawaii', 'Tennessee', 'Texas Tech', 'Oklahoma State'],
    scholarshipTier: 'Full / High Partial',
    requiredSkills: [
      { name: 'Standing Full (Dead Floor)', keywords: ['standing full', 'standing back full'], surfaceRequired: 'dead_floor', description: 'Clean stick on non-spring hardwood/mat' },
      { name: 'Round-off BHS Double Full', keywords: ['double full', 'ro bhs double'], description: 'High elevation and controlled landing' },
      { name: 'Toss Hands to Extension / Rewind', keywords: ['toss hands', 'rewind', 'toss extension'], description: 'Solid locked-out single base or coed flyer' },
      { name: 'Standing 2 BHS to Full', keywords: ['2 bhs to full', 'two bhs full', 'bhs full'], description: 'Fluid momentum with no chest drop' }
    ],
    notes: 'Requires dead floor verification for standing tumbling. Minimum 2.8+ collegiate GPA.'
  },
  {
    id: 'd1_allgirl_premier',
    name: 'NCAA Division 1 All-Girl Premier',
    division: 'NCAA D1 All-Girl',
    sampleSchools: ['Louisville', 'Indiana', 'NC State', 'Alabama', 'Ole Miss', 'South Florida'],
    scholarshipTier: 'Partial Scholarship',
    requiredSkills: [
      { name: 'Standing BHS to Full / Standing Full', keywords: ['standing full', 'standing tuck', 'bhs full', 'standing bhs full'], description: 'Quick snap and high set' },
      { name: 'Round-off BHS Full', keywords: ['ro bhs full', 'round-off bhs full', 'layout full'], description: 'Consistent execution on dead floor or spring' },
      { name: 'Inverted 1.5 Up / Switch-Up Lib', keywords: ['switch up', 'switch-up', '1.5 up', 'rewind', 'inversion'], description: 'Flyer body control or solid base stabilization' },
      { name: 'Double Down Dismount', keywords: ['double down', 'full down'], description: 'Tight cradle catch with high amplitude' }
    ],
    notes: 'Emphasis on multi-base sync, flexibility lines (Heel stretch/Scorpion), and standing tuck passes.'
  },
  {
    id: 'd2_naia_elite',
    name: 'NCAA Division 2 & NAIA Premier',
    division: 'NCAA D2 / NAIA',
    sampleSchools: ['Davenport', 'West Georgia', 'Oklahoma Baptist', 'Lindenwood', 'Midland'],
    scholarshipTier: 'Partial Scholarship',
    requiredSkills: [
      { name: 'Standing Back Tuck', keywords: ['standing tuck', 'standing back tuck', 'standing full'], description: 'Chest-high set and tight rotation' },
      { name: 'Round-off BHS Layout / Full', keywords: ['layout', 'full', 'round-off bhs layout'], description: 'Clean body alignment and hollow body position' },
      { name: 'Switch-Up Lib / Straight Up Extension', keywords: ['switch up', 'lib', 'extension'], description: 'Controlled heel stretch or arabesque line' },
      { name: 'Full Down Dismount', keywords: ['full down', 'double down', 'cradle'], description: 'Clean twist initiation at peak' }
    ],
    notes: 'Significant scholarship availability for solid Level 5/6 all-around tumblers and flyers.'
  },
  {
    id: 'collegiate_stunt',
    name: 'USA Collegiate STUNT (NCAA Emerging Sport)',
    division: 'Collegiate STUNT',
    sampleSchools: ['California Baptist', 'Kentucky', 'Vanguard', 'Maryville', 'Dallas Baptist', 'Arizona State'],
    scholarshipTier: 'Full / High Partial',
    requiredSkills: [
      { name: 'Quarter 1: Partner Stunt Execution (Levels 5–8)', keywords: ['switch up', '1.5 up', 'hand in hand', 'inversion'], description: 'Precision counts and synchronous lockouts' },
      { name: 'Quarter 2: Pyramids & Tosses', keywords: ['basket toss', 'pyramid', 'kick full'], description: 'Clean kick arch and basket extension' },
      { name: 'Quarter 3: Jumps & Synchronous Tumbling', keywords: ['toe touch', 'standing tuck', 'running full', 'jumps'], description: 'Identical timing and toe point' },
      { name: 'Quarter 4: 18-Count Team Routine Flow', keywords: ['routine', 'combination', 'specialty'], description: 'High endurance and flawless transition pacing' }
    ],
    notes: 'STUNT is an official NCAA sport with dedicated varsity athletic scholarships for high school cheer athletes.'
  }
];

export const CheerProgramMatcherModal: React.FC<CheerProgramMatcherModalProps> = ({
  isOpen,
  onClose,
  skills,
  athleteName
}) => {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('d1_coed_elite');

  if (!isOpen) return null;

  const currentProgram = COLLEGE_STANDARDS.find(p => p.id === selectedProgramId) || COLLEGE_STANDARDS[0];

  // Evaluate matching skills for a program
  const evaluateProgramMatch = (program: CollegeProgramRule) => {
    let metCount = 0;
    const requirementsStatus = program.requiredSkills.map(req => {
      // Find if any verified skill matches keywords
      const matchedSkill = skills.find(s => {
        const lowerName = s.name.toLowerCase();
        const matchesKeyword = req.keywords.some(kw => lowerName.includes(kw));
        const isVerified = s.verified || (s.videoUrl && s.videoUrl.trim().length > 0);
        
        if (req.surfaceRequired === 'dead_floor') {
          return matchesKeyword && isVerified && (s.surface === 'dead_floor' || s.verified);
        }
        return matchesKeyword && isVerified;
      });

      if (matchedSkill) metCount += 1;

      return {
        ...req,
        isMet: !!matchedSkill,
        matchedSkill
      };
    });

    const matchPercentage = Math.round((metCount / program.requiredSkills.length) * 100);

    return {
      matchPercentage,
      metCount,
      totalCount: program.requiredSkills.length,
      requirementsStatus
    };
  };

  const activeEvaluation = evaluateProgramMatch(currentProgram);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/30">
                  Collegiate Benchmark Engine
                </span>
                <span className="text-[10px] font-mono text-neutral-400">Roster & Scholarship Rubric</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                College Program & Division Matcher
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

        {/* Division Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COLLEGE_STANDARDS.map((prog) => {
            const evalResult = evaluateProgramMatch(prog);
            const isSelected = selectedProgramId === prog.id;

            return (
              <button
                key={prog.id}
                type="button"
                onClick={() => setSelectedProgramId(prog.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-neutral-800 border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'bg-neutral-950/70 border-neutral-800 hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                    {prog.division}
                  </span>
                  <span className={`text-xs font-mono font-black ${
                    evalResult.matchPercentage >= 75 ? 'text-emerald-400' : evalResult.matchPercentage >= 50 ? 'text-sky-400' : 'text-amber-400'
                  }`}>
                    {evalResult.matchPercentage}%
                  </span>
                </div>

                <div className="font-bold text-xs text-white line-clamp-1">
                  {prog.name.split('(')[0]}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      evalResult.matchPercentage >= 75 ? 'bg-emerald-500' : evalResult.matchPercentage >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${evalResult.matchPercentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed Program Overview & Requirement Checklist */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-white">{currentProgram.name}</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                  {currentProgram.scholarshipTier}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Representative Programs: <span className="text-neutral-200">{currentProgram.sampleSchools.join(', ')}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-neutral-900 px-4 py-2.5 rounded-2xl border border-neutral-800">
              <div>
                <div className="text-[10px] font-mono uppercase text-neutral-400">Readiness Match</div>
                <div className={`text-xl font-black font-mono ${
                  activeEvaluation.matchPercentage >= 75 ? 'text-emerald-400' : activeEvaluation.matchPercentage >= 50 ? 'text-sky-400' : 'text-amber-400'
                }`}>
                  {activeEvaluation.matchPercentage}% Target Met
                </div>
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                {activeEvaluation.metCount}/{activeEvaluation.totalCount} Skills
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
              Required Collegiate Skills Checklist
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeEvaluation.requirementsStatus.map((req, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    req.isMet
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {req.isMet ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="font-bold text-xs text-white">{req.name}</span>
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      req.isMet ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {req.isMet ? 'Verified' : 'Missing Target'}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400 mt-1 pl-6 leading-tight">
                    {req.description}
                  </p>

                  {req.matchedSkill && (
                    <div className="mt-2 pl-6 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-emerald-400">Matched: {req.matchedSkill.name}</span>
                      <span className="text-neutral-400">
                        {req.matchedSkill.surface === 'dead_floor' ? 'Dead Floor ✓' : 'Spring Floor'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Program Notes Footer */}
          <div className="p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/20 text-xs text-sky-200/90 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sky-300 font-mono uppercase text-[10px] tracking-wider block">Recruiter Note:</span>
              <span>{currentProgram.notes}</span>
            </div>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-neutral-400 font-mono">
            Evaluated against NCAA & USA STUNT collegiate rubric standards.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
