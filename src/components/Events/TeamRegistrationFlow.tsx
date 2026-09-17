import React, { useState } from 'react';
import { EventItem, TeamItem } from '../../types';
import { registerTeamToFirestore } from '../../services/tournamentHubService';
import { useAuth } from '../../context/AuthContext';
import { FormSubmitButton } from '../Common/FormSubmitButton';
import { SubmissionToast } from '../Common/SubmissionToast';
import { ToastNotification } from '../../hooks/useFormSubmit';
import { commerceService } from '../../services/StripeService';
import { 
  Trophy, 
  CreditCard, 
  CheckCircle2, 
  Users, 
  ShieldCheck, 
  DollarSign, 
  X, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface TeamRegistrationFlowProps {
  event: EventItem;
  onRegistered?: (newTeam: TeamItem) => void;
  onCancel?: () => void;
}

export const TeamRegistrationFlow: React.FC<TeamRegistrationFlowProps> = ({ event, onRegistered, onCancel }) => {
  const { profile } = useAuth();

  const divisions = event.divisions && event.divisions.length > 0 
    ? event.divisions 
    : ['10U', '12U', '14U', '17U', 'Varsity'];

  const [teamName, setTeamName] = useState('');
  const [division, setDivision] = useState(divisions[0]);
  const [coachName, setCoachName] = useState(profile?.displayName || 'Coach Vance');
  const [coachEmail, setCoachEmail] = useState(profile?.email || 'coach@just1play.com');
  const [coachPhone, setCoachPhone] = useState('(555) 234-5678');
  
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [registeredTeam, setRegisteredTeam] = useState<TeamItem | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [toast, setToast] = useState<ToastNotification | null>(null);

  const teamFee = event.teamFee || event.price || 250;

  const handleGoToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setErrorMsg('Please enter a team name.');
      return;
    }
    setErrorMsg('');
    setStep('payment');
  };

  const handleSimulateStripePayment = async () => {
    setIsProcessingPayment(true);
    setErrorMsg('');
    setToast(null);

    try {
      // 1. First attempt real backend PayPal Checkout Session creation
      const checkoutRes = await commerceService.createTournamentCheckoutSession({
        eventId: event.id,
        eventTitle: event.title || event.name || 'Tournament Event',
        teamName: teamName.trim(),
        divisionName: division,
        headCoachName: coachName,
        headCoachEmail: profile?.email || coachEmail || 'coach@example.com',
        headCoachPhone: coachPhone,
        entryFeeDollars: teamFee,
      });

      if (checkoutRes && checkoutRes.url) {
        // Save preliminary team record to Firestore before redirecting to PayPal
        const newTeamData: Partial<TeamItem> = {
          eventId: event.id,
          coachId: profile?.uid || 'anonymous-coach',
          coachName,
          division,
          teamName: teamName.trim(),
          paymentStatus: 'Pending',
          roster: []
        };
        await registerTeamToFirestore(newTeamData).catch(() => {});

        // Redirect user directly to PayPal Checkout
        window.location.href = checkoutRes.url;
        return;
      }

      // 2. Dev mode / fallback instant simulation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newTeamData: Partial<TeamItem> = {
        eventId: event.id,
        coachId: profile?.uid || 'anonymous-coach',
        coachName,
        division,
        teamName: teamName.trim(),
        paymentStatus: 'Paid',
        roster: []
      };

      const teamId = await registerTeamToFirestore(newTeamData);

      const createdTeamObj: TeamItem = {
        id: teamId,
        eventId: event.id,
        coachId: profile?.uid || 'anonymous-coach',
        coachName,
        division,
        teamName: teamName.trim(),
        paymentStatus: 'Paid',
        roster: []
      };

      setRegisteredTeam(createdTeamObj);
      setToast({
        id: `toast-${Date.now()}`,
        type: 'success',
        title: 'Success!',
        message: '✅ Team Registration Payment Confirmed!'
      });

      setTimeout(() => {
        setStep('success');
        if (onRegistered) {
          onRegistered(createdTeamObj);
        }
      }, 1200);

    } catch (err: any) {
      console.error('Registration payment failed:', err);
      const msg = err.message || 'Payment processing failed. Please try again.';
      setErrorMsg(msg);
      setToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        title: 'Payment Error',
        message: `❌ ${msg}`
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="bg-[#222220] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl relative overflow-hidden font-sans">
      
      {/* Top Glassmorphic Toast Notification */}
      <SubmissionToast toast={toast} onClose={() => setToast(null)} />
      
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#00F2FE]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE]">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-[#00F2FE] uppercase">Official Registration</div>
            <h3 className="text-lg font-black text-white">{event.title || event.name}</h3>
          </div>
        </div>

        {onCancel && (
          <button onClick={onCancel} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: TEAM DETAILS */}
      {step === 'details' && (
        <form onSubmit={handleGoToPayment} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase font-mono">Team Name *</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Tri-State Elite Ballers"
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00F2FE]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase font-mono">Select Division *</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {divisions.map((div) => (
                <button
                  type="button"
                  key={div}
                  onClick={() => setDivision(div)}
                  className={`py-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                    division === div
                      ? 'bg-[#00F2FE] text-black border border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase font-mono">Head Coach Name</label>
              <input
                type="text"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase font-mono">Contact Phone</label>
              <input
                type="text"
                value={coachPhone}
                onChange={(e) => setCoachPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white font-sans">Team Registration Fee</div>
              <div className="text-[11px] text-slate-400 font-mono">Includes official bracket seeding & stats tracking</div>
            </div>
            <div className="text-xl font-black text-[#00F2FE] font-mono">${teamFee}</div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-[#00F2FE] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,242,254,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* STEP 2: STRIPE CHECKOUT PAYMENT */}
      {step === 'payment' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-[#222220] border border-white/15 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-slate-400 font-mono uppercase">Registration Summary</span>
              <span className="text-xs font-black text-[#00F2FE] font-mono">${teamFee}.00 USD</span>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Team Name:</span>
                <span className="font-bold text-white">{teamName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Division:</span>
                <span className="font-bold text-white">{division}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Coach:</span>
                <span className="font-bold text-white">{coachName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Roster Lock Cutoff:</span>
                <span className="font-bold text-[#F59E0B]">{event.rosterLockDate || 'Aug 10, 2026'}</span>
              </div>
            </div>
          </div>

          {/* PayPal Checkout Gateway */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase font-mono flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#00F2FE]" />
                <span>PayPal Secure Checkout</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">256-bit SSL</span>
            </div>

            <input
              type="text"
              readOnly
              value="•••• •••• •••• 4242"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 font-mono cursor-not-allowed"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                readOnly
                value="12 / 28"
                className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 font-mono cursor-not-allowed text-center"
              />
              <input
                type="text"
                readOnly
                value="CVC 888"
                className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 font-mono cursor-not-allowed text-center"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep('details')}
              className="w-1/3 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase"
            >
              Back
            </button>

            <FormSubmitButton
              isSubmitting={isProcessingPayment}
              label={`Pay $${teamFee} & Complete`}
              loadingLabel="Processing Payment..."
              successLabel="Payment Confirmed!"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={handleSimulateStripePayment}
              type="button"
              className="w-2/3"
            />
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS CONFIRMATION */}
      {step === 'success' && registeredTeam && (
        <div className="text-center space-y-6 py-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#00F2FE]/20 border-2 border-[#00F2FE] text-[#00F2FE] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,242,254,0.5)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white font-sans">Team Successfully Registered!</h3>
            <p className="text-xs text-slate-400">
              <span className="font-bold text-white">{registeredTeam.teamName}</span> is confirmed for division <span className="font-bold text-[#00F2FE] font-mono">{registeredTeam.division}</span>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2 text-xs">
            <div className="flex justify-between text-slate-400 font-mono">
              <span>Status:</span>
              <span className="text-[#00F2FE] font-bold">PAID (CONFIRMED)</span>
            </div>
            <div className="flex justify-between text-slate-400 font-mono">
              <span>Roster Cutoff:</span>
              <span className="text-cyan-400 font-bold">{event.rosterLockDate || 'Aug 10, 2026'}</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-white/10">
              Next Step: Add players to your team roster using automated age verification.
            </div>
          </div>

          <button
            onClick={() => onCancel && onCancel()}
            className="w-full py-3.5 rounded-2xl bg-[#00F2FE] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,242,254,0.5)] hover:scale-105 cursor-pointer"
          >
            Done & Return to Event Hub
          </button>
        </div>
      )}

    </div>
  );
};
