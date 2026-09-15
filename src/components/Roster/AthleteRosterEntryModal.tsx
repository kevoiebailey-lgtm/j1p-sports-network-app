import React, { useState } from 'react';
import { User, ShieldCheck, Mail, Phone, Calendar, Hash, Sparkles, X, Plus } from 'lucide-react';
import { useFormSubmit } from '../../hooks/useFormSubmit';
import { FormSubmitButton } from '../Common/FormSubmitButton';
import { SubmissionToast } from '../Common/SubmissionToast';

export interface AthleteRosterItem {
  id?: string;
  fullName: string;
  jerseyNumber: string;
  position: string;
  graduationYear: string;
  parentEmail: string;
  parentPhone: string;
  emergencyContact: string;
}

export interface AthleteRosterEntryModalProps {
  teamName?: string;
  onClose: () => void;
  onAthleteAdded?: (athlete: AthleteRosterItem) => void;
}

export const AthleteRosterEntryModal: React.FC<AthleteRosterEntryModalProps> = ({
  teamName = 'Varsity Elite',
  onClose,
  onAthleteAdded
}) => {
  const [fullName, setFullName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('PG');
  const [graduationYear, setGraduationYear] = useState('2027');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const resetForm = () => {
    setFullName('');
    setJerseyNumber('');
    setPosition('PG');
    setGraduationYear('2027');
    setParentEmail('');
    setParentPhone('');
    setEmergencyContact('');
  };

  const {
    isSubmitting,
    submitSuccess,
    toast,
    submitForm,
    dismissToast
  } = useFormSubmit<AthleteRosterItem, AthleteRosterItem>({
    onSubmit: async (athleteData) => {
      if (!fullName.trim()) {
        throw new Error('Athlete full name is required.');
      }
      if (!jerseyNumber.trim()) {
        throw new Error('Jersey number is required.');
      }
      if (!parentEmail.trim()) {
        throw new Error('Guardian contact email is required.');
      }

      // Simulate 1s server write delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newAthlete: AthleteRosterItem = {
        ...athleteData,
        id: `ath-${Date.now()}`
      };

      return newAthlete;
    },
    loadingMessage: 'Saving Athlete Data...',
    successMessage: '✅ Athlete Successfully Added to Roster!',
    errorMessage: '❌ Submission Failed. Please verify input fields and try again.',
    resetForm,
    onRedirect: (_url, newAthlete) => {
      if (onAthleteAdded && newAthlete) {
        onAthleteAdded(newAthlete);
      }
      onClose();
    },
    redirectDelayMs: 1500
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm({
      fullName: fullName.trim(),
      jerseyNumber: jerseyNumber.trim(),
      position,
      graduationYear,
      parentEmail: parentEmail.trim(),
      parentPhone: parentPhone.trim(),
      emergencyContact: emergencyContact.trim()
    });
  };

  return (
    <div className="bg-[#212A31] border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full mx-auto shadow-2xl relative overflow-hidden font-sans">
      
      {/* Top Glassmorphic Toast Notification */}
      <SubmissionToast toast={toast} onClose={dismissToast} />

      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-5 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/30 text-red-500 text-[10px] font-mono font-bold uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ATHLETE ROSTER ENTRY</span>
          </div>
          <h3 className="text-xl font-black text-white uppercase font-sans">
            Add Athlete to {teamName}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Official roster profile registration for eligibility verification & scout access.
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Inputs */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Full Name & Jersey Number */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
              Athlete Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Marcus Johnson"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
              Jersey # *
            </label>
            <input
              type="text"
              required
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder="#23"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-white text-center font-bold focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Position & Grad Year */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
              Primary Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="PG">Point Guard (PG)</option>
              <option value="SG">Shooting Guard (SG)</option>
              <option value="SF">Small Forward (SF)</option>
              <option value="PF">Power Forward (PF)</option>
              <option value="C">Center (C)</option>
              <option value="ATH">Athlete (ATH)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
              Graduation Class
            </label>
            <select
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="2025">Class of 2025</option>
              <option value="2026">Class of 2026</option>
              <option value="2027">Class of 2027</option>
              <option value="2028">Class of 2028</option>
              <option value="2029">Class of 2029</option>
            </select>
          </div>
        </div>

        {/* Guardian Contact Info */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-wider block">
            GUARDIAN & EMERGENCY CONTACT
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                Guardian Email *
              </label>
              <input
                type="email"
                required
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="guardian@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                Phone Number
              </label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#212A31] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>

          <FormSubmitButton
            isSubmitting={isSubmitting}
            submitSuccess={submitSuccess}
            label="Save Athlete Roster"
            loadingLabel="Saving Athlete Data..."
            successLabel="Athlete Added!"
            icon={<Plus className="w-4 h-4" />}
            variant="emerald"
          />
        </div>

      </form>
    </div>
  );
};
