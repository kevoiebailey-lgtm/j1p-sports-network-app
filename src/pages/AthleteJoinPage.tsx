import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  User, 
  Users, 
  HeartHandshake, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  Calendar, 
  Trophy, 
  ChevronRight, 
  Sparkles, 
  ArrowLeft, 
  RefreshCw,
  Clock,
  Phone,
  Mail,
  Activity,
  FileCheck
} from 'lucide-react';
import { 
  getTeamHeaderMetadata, 
  submitAthleteJoinWaiver, 
  generateWaiverPdf, 
  TeamHeaderMetadata, 
  WaiverSubmissionData,
  WaiverSubmissionResult
} from '../services/waiverService';
import { TouchSignatureCanvas, TouchSignatureCanvasRef } from '../components/waiver/TouchSignatureCanvas';
import { WaiverTermsScrollBox } from '../components/waiver/WaiverTermsScrollBox';

const SPORT_POSITIONS: Record<string, string[]> = {
  Basketball: ['Point Guard (PG)', 'Shooting Guard (SG)', 'Small Forward (SF)', 'Power Forward (PF)', 'Center (C)', 'Combo Guard', 'Wing'],
  Football: ['Quarterback (QB)', 'Running Back (RB)', 'Wide Receiver (WR)', 'Tight End (TE)', 'Offensive Line (OL)', 'Defensive Line (DL)', 'Linebacker (LB)', 'Cornerback (CB)', 'Safety (S)', 'Kicker/Punter'],
  Soccer: ['Goalkeeper (GK)', 'Center Back (CB)', 'Fullback (LB/RB)', 'Defensive Midfielder (CDM)', 'Central Midfielder (CM)', 'Attacking Midfielder (CAM)', 'Winger (LW/RW)', 'Striker (ST)'],
  Volleyball: ['Setter (S)', 'Outside Hitter (OH)', 'Middle Blocker (MB)', 'Right Side / Opposite (RS)', 'Libero (L)', 'Defensive Specialist (DS)'],
  Baseball: ['Pitcher (P)', 'Catcher (C)', 'First Base (1B)', 'Second Base (2B)', 'Third Base (3B)', 'Shortstop (SS)', 'Outfield (OF)'],
  Cheerleading: ['Flyer', 'Main Base', 'Side Base', 'Back Spot', 'Tumbler', 'All-Around'],
  Default: ['Forward', 'Guard', 'Defender', 'Midfielder', 'Attacker', 'Utility', 'All-Around'],
};

export const AthleteJoinPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event') || searchParams.get('eventId') || undefined;
  const navigate = useNavigate();

  // Signature Ref
  const signatureRef = useRef<TouchSignatureCanvasRef>(null);

  // Team state
  const [team, setTeam] = useState<TeamHeaderMetadata | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamNotFound, setTeamNotFound] = useState(false);

  // Form states
  const [athlete, setAthlete] = useState({
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    dob: '',
    position: '',
    gender: 'Male',
    gradYear: '2027',
  });

  const [guardian, setGuardian] = useState({
    fullName: '',
    phone: '',
    email: '',
    relationship: 'Parent',
  });

  const [emergency, setEmergency] = useState({
    contactName: '',
    phone: '',
    relationship: 'Relative',
    medicalNotes: '',
  });

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [hasValidSignature, setHasValidSignature] = useState(false);

  // Submission & UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<WaiverSubmissionResult | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch Team Header
  useEffect(() => {
    let isMounted = true;
    async function loadTeam() {
      if (!teamId) {
        setTeamNotFound(true);
        setLoadingTeam(false);
        return;
      }

      setLoadingTeam(true);
      setTeamNotFound(false);
      try {
        const data = await getTeamHeaderMetadata(teamId);
        if (isMounted) {
          if (!data || !data.inviteEnabled) {
            setTeam(data);
            setTeamNotFound(true);
          } else {
            setTeam(data);
            // Default position based on sport
            const positions = SPORT_POSITIONS[data.sport] || SPORT_POSITIONS.Default;
            setAthlete(prev => ({
              ...prev,
              position: prev.position || positions[0],
            }));
          }
        }
      } catch (err) {
        console.error('[AthleteJoinPage] Failed loading team:', err);
        if (isMounted) setTeamNotFound(true);
      } finally {
        if (isMounted) setLoadingTeam(false);
      }
    }

    loadTeam();
    return () => { isMounted = false; };
  }, [teamId]);

  // Positions options for current sport
  const availablePositions = team?.sport 
    ? (SPORT_POSITIONS[team.sport] || SPORT_POSITIONS.Default)
    : SPORT_POSITIONS.Basketball;

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validate Athlete Details
    if (!athlete.firstName.trim() || !athlete.lastName.trim()) {
      setErrorMessage('Please enter the athlete’s first and last name.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }
    if (!athlete.dob) {
      setErrorMessage('Please provide the athlete’s date of birth.');
      return;
    }

    // 2. Validate Guardian Details
    if (!guardian.fullName.trim()) {
      setErrorMessage('Please provide the parent or legal guardian’s full name.');
      return;
    }
    if (!guardian.phone.trim() || !guardian.email.trim()) {
      setErrorMessage('Please provide valid contact phone and email for the guardian.');
      return;
    }

    // 3. Validate Emergency Contact
    if (!emergency.contactName.trim() || !emergency.phone.trim()) {
      setErrorMessage('Please provide an emergency contact name and phone number.');
      return;
    }

    // 4. Validate Terms Checkbox
    if (!agreedTerms) {
      setErrorMessage('You must review and agree to the compliance & liability terms.');
      return;
    }

    // 5. Validate Digital Signature
    const signatureDataUrl = signatureRef.current?.getSignatureDataUrl();
    if (!signatureDataUrl || !hasValidSignature) {
      setErrorMessage('Please provide a handwritten signature in the touch signature box.');
      return;
    }

    setIsSubmitting(true);

    const submissionPayload: WaiverSubmissionData = {
      teamId: teamId || 'team',
      eventId,
      athlete,
      guardian,
      emergency,
      signatureDataUrl,
      agreedTerms: true,
      teamMetadata: team || undefined,
    };

    try {
      const result = await submitAthleteJoinWaiver(submissionPayload);
      if (result.success) {
        setSubmissionResult(result);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(result.error || 'Registration could not be completed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF Action
  const handleDownloadPdf = async () => {
    if (!submissionResult) return;
    setIsGeneratingPdf(true);
    try {
      const signatureDataUrl = signatureRef.current?.getSignatureDataUrl() || '';
      await generateWaiverPdf(
        {
          teamId: teamId || '',
          eventId,
          athlete,
          guardian,
          emergency,
          signatureDataUrl,
          agreedTerms: true,
        },
        submissionResult.confirmationCode,
        team || undefined
      );
    } catch (err) {
      console.error('[AthleteJoinPage] PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy Confirmation Code
  const handleCopyCode = () => {
    if (!submissionResult) return;
    navigator.clipboard.writeText(submissionResult.confirmationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // ----------------------------------------------------
  // RENDER: Loading Skeleton
  // ----------------------------------------------------
  if (loadingTeam) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#140802] py-8 px-4 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white dark:bg-[#1E120B] rounded-2xl p-8 border border-slate-200 dark:border-amber-900/30 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse mx-auto" />
          <div className="space-y-2">
            <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mx-auto" />
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mx-auto" />
          </div>
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Connecting to Just1Play Team Roster Registry...
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Team Invite Expired or Unavailable Fallback
  // ----------------------------------------------------
  if (teamNotFound || (team && !team.inviteEnabled)) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#140802] py-12 px-4 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-[#1E120B] rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-rose-900/30 shadow-xl text-center space-y-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Team Invite Unavailable
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This athlete join link for <strong>{team?.teamName || teamId}</strong> has expired, was paused by the coaching staff, or is invalid.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2">
            <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#FF6A00]" />
              <span>What should you do?</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
              <li>Contact your head coach or team coordinator for an updated roster invite link.</li>
              <li>Ensure the team code in your URL matches the invite sent to your email or group chat.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              to="/directory"
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-[#FF6A00] hover:bg-[#E05D00] text-white transition-colors text-center"
            >
              Browse Public Teams & Directory
            </Link>
            <Link
              to="/help"
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
            >
              Contact Support
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Instant Confirmation Success Card
  // ----------------------------------------------------
  if (submissionResult) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#140802] py-8 px-4 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white dark:bg-[#1E120B] rounded-2xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl space-y-6"
        >
          {/* Header Pill */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Compliance Verified • Ready for Competition
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome to {team?.teamName}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                You're locked in for the season. Your digital waiver and athlete roster profile have been verified.
              </p>
            </div>
          </div>

          {/* Player Pass Badge */}
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 border border-slate-700/60 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6A00]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-[#FF6A00]">
                  Official Player Pass
                </span>
                <h3 className="text-lg font-bold">
                  {athlete.firstName} {athlete.lastName}
                </h3>
                <p className="text-xs text-slate-300">
                  {athlete.position} {athlete.jerseyNumber ? `• #${athlete.jerseyNumber}` : ''}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400">Team</span>
                <p className="text-xs font-semibold text-white max-w-[140px] truncate">
                  {team?.teamName}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#FF6A00]/20 text-[#FFC857] border border-[#FF6A00]/30">
                  {team?.division || 'Varsity'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Waiver Status: <strong>Compliant</strong></span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {submissionResult.confirmationCode}
              </span>
            </div>
          </div>

          {/* Confirmation Code Action */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                Waiver Confirmation ID
              </span>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {submissionResult.confirmationCode}
              </p>
            </div>

            <button
              type="button"
              id="copy-confirmation-btn"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              id="download-signed-pdf-btn"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-[#FF6A00] hover:bg-[#E05D00] text-white shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing Signed PDF Certificate...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Signed Waiver (PDF)</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/locker-room"
                className="py-2.5 px-3 rounded-xl font-medium text-xs bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-center transition-colors flex items-center justify-center gap-1"
              >
                <span>Enter Locker Room</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/gallery"
                className="py-2.5 px-3 rounded-xl font-medium text-xs bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-center transition-colors flex items-center justify-center gap-1"
              >
                <span>Browse Game Film</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            A confirmation receipt has also been logged with your coaching staff. You may close this window at any time.
          </p>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Full Mobile Athlete Join & Waiver Form
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#140802] text-slate-900 dark:text-white py-4 sm:py-8 px-3 sm:px-6">
      <div className="max-w-xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Navigation / Brand Header */}
        <div className="flex items-center justify-between px-1">
          <Link 
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#FF6A00] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Just1Play Athletics</span>
          </Link>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20">
            <ShieldCheck className="w-3 h-3" />
            Mobile Touch Waiver
          </span>
        </div>

        {/* Dynamic Team Hero Card */}
        <div className="rounded-2xl bg-white dark:bg-[#1E120B] p-5 sm:p-6 border border-slate-200 dark:border-amber-900/30 shadow-md">
          <div className="flex items-center gap-4">
            {team?.logoUrl ? (
              <img 
                src={team.logoUrl} 
                alt={team.teamName} 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#FF6A00] to-[#FFC857] text-white font-black text-xl flex items-center justify-center shadow-sm">
                {team?.teamName ? team.teamName.charAt(0) : 'J'}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF6A00]/10 text-[#FF6A00] uppercase tracking-wider">
                  {team?.sport || 'Basketball'}
                </span>
                {team?.division && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {team.division}
                  </span>
                )}
                {eventId && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Event Registered
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                {team?.teamName || 'Official Team Roster'}
              </h1>

              {team?.headCoachName && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Head Coach: <strong className="text-slate-700 dark:text-slate-300">{team.headCoachName}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Notification Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <p className="flex-1 font-medium">{errorMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ---------------------------------------------------- */}
          {/* Section 1: Athlete Details */}
          {/* ---------------------------------------------------- */}
          <div className="rounded-2xl bg-white dark:bg-[#1E120B] p-5 sm:p-6 border border-slate-200 dark:border-amber-900/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Athlete Details
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Player profile information for the official roster
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan"
                  value={athlete.firstName}
                  onChange={e => setAthlete({ ...athlete, firstName: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Miller"
                  value={athlete.lastName}
                  onChange={e => setAthlete({ ...athlete, lastName: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jersey Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 23"
                  value={athlete.jerseyNumber}
                  onChange={e => setAthlete({ ...athlete, jerseyNumber: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={athlete.dob}
                  onChange={e => setAthlete({ ...athlete, dob: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Position <span className="text-rose-500">*</span>
                </label>
                <select
                  value={athlete.position}
                  onChange={e => setAthlete({ ...athlete, position: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                >
                  {availablePositions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Graduation Year
                </label>
                <select
                  value={athlete.gradYear}
                  onChange={e => setAthlete({ ...athlete, gradYear: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                >
                  <option value="2025">2025 (Senior)</option>
                  <option value="2026">2026 (Junior)</option>
                  <option value="2027">2027 (Sophomore)</option>
                  <option value="2028">2028 (Freshman)</option>
                  <option value="2029">2029 (8th Grade)</option>
                  <option value="2030">2030 (7th Grade)</option>
                  <option value="2031">2031+</option>
                </select>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* Section 2: Guardian Contact */}
          {/* ---------------------------------------------------- */}
          <div className="rounded-2xl bg-white dark:bg-[#1E120B] p-5 sm:p-6 border border-slate-200 dark:border-amber-900/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Parent / Legal Guardian
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Required contact person responsible for waiver compliance
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Guardian Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Miller"
                  value={guardian.fullName}
                  onChange={e => setGuardian({ ...guardian, fullName: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cell Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="(555) 000-0000"
                    value={guardian.phone}
                    onChange={e => setGuardian({ ...guardian, phone: e.target.value })}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="sarah@example.com"
                    value={guardian.email}
                    onChange={e => setGuardian({ ...guardian, email: e.target.value })}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Relationship to Athlete
                </label>
                <select
                  value={guardian.relationship}
                  onChange={e => setGuardian({ ...guardian, relationship: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                >
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Self (18+)">Self (Adult Athlete 18+)</option>
                  <option value="Other Relative">Other Relative</option>
                </select>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* Section 3: Emergency Info & Medical Notes */}
          {/* ---------------------------------------------------- */}
          <div className="rounded-2xl bg-white dark:bg-[#1E120B] p-5 sm:p-6 border border-slate-200 dark:border-amber-900/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Emergency Contact & Medical Information
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sideline safety, allergies, and emergency responder notification
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Contact Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Miller"
                  value={emergency.contactName}
                  onChange={e => setEmergency({ ...emergency, contactName: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(555) 111-2222"
                  value={emergency.phone}
                  onChange={e => setEmergency({ ...emergency, phone: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Medical Notes, Allergies, or Conditions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Asthmatic (inhaler in gym bag), Peanut allergy, wears prescription contacts"
                  value={emergency.medicalNotes}
                  onChange={e => setEmergency({ ...emergency, medicalNotes: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* Section 4: Scrollable Legal Terms & Acknowledgement */}
          {/* ---------------------------------------------------- */}
          <div className="rounded-2xl bg-white dark:bg-[#1E120B] p-5 sm:p-6 border border-slate-200 dark:border-amber-900/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Compliance, Concussion & Media Release
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Read and review mandatory participation disclosures
                </p>
              </div>
            </div>

            {/* Scrollable Terms Component */}
            <WaiverTermsScrollBox 
              teamName={team?.teamName} 
              sport={team?.sport} 
            />

            {/* Agreement Checkbox */}
            <div className="pt-2">
              <label 
                htmlFor="agree-terms-checkbox"
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              >
                <input
                  id="agree-terms-checkbox"
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={e => setAgreedTerms(e.target.checked)}
                  className="w-5 h-5 rounded mt-0.5 text-[#FF6A00] focus:ring-[#FF6A00] accent-[#FF6A00] cursor-pointer"
                />
                <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed select-none">
                  I, as the parent, legal guardian, or adult athlete (age 18+), have thoroughly read, understand, and explicitly agree to the <strong>Youth Sports Liability Release</strong>, <strong>Concussion Safety Protocol</strong>, and <strong>Just1Play Media & Live Stream Release</strong>.
                </span>
              </label>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* Section 5: Touch Signature Canvas */}
          {/* ---------------------------------------------------- */}
          <div className="rounded-2xl bg-white dark:bg-[#1E120B] p-5 sm:p-6 border border-slate-200 dark:border-amber-900/30 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-7 h-7 rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center font-bold text-xs">
                5
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Digital Touch Signature
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Draw signature below using touch, finger, stylus, or cursor
                </p>
              </div>
            </div>

            <TouchSignatureCanvas
              ref={signatureRef}
              onSignatureChange={setHasValidSignature}
              height={190}
            />
          </div>

          {/* ---------------------------------------------------- */}
          {/* Submission CTA Button */}
          {/* ---------------------------------------------------- */}
          <div className="pt-2">
            <button
              type="submit"
              id="submit-waiver-btn"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base bg-gradient-to-r from-[#FF6A00] to-[#FF8533] hover:from-[#E05D00] hover:to-[#FF6A00] text-white shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Submitting Compliance Waiver...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-5 h-5" />
                  <span>Sign & Join {team?.teamName || 'Roster'}</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              Zero-friction registration • Instant confirmation code & download
            </p>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AthleteJoinPage;
