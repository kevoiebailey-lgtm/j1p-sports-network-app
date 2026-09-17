import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Award, 
  ShieldCheck, 
  Star, 
  DollarSign, 
  Download, 
  Printer, 
  TrendingUp, 
  Bookmark, 
  Check, 
  Zap, 
  Target, 
  Compass, 
  Activity,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';

interface ScoutDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: UserProfile | null;
}

export const ScoutDossierModal: React.FC<ScoutDossierModalProps> = ({
  isOpen,
  onClose,
  athlete
}) => {
  const [pipelineStatus, setPipelineStatus] = useState<'Watching' | 'High Priority' | 'Offer Extended'>('High Priority');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [scoutNotes, setScoutNotes] = useState<string>(
    'Elite open field burst, high football IQ in zone reads, pristine 3.85 GPA. Immediate impact player at collegiate level.'
  );

  const [dossierData, setDossierData] = useState<any>({
    scoutGrade: 92,
    starRating: 4,
    collegiateProjection: 'NCAA Division 1 (Power 4 / ACC & SEC Potential)',
    proComparison: 'Dynamic Dual-Threat Playmaker (Zay Flowers / Tyreek Hill Mold)',
    nilValuationTier: {
      projectedAnnualMin: 18500,
      projectedAnnualMax: 36000,
      tierLabel: 'High-Impact Regional NIL Star',
      marketFactors: 'Multi-sport State Tournament MVP, 98.4K Social Reach, High Academic Honor Roll'
    },
    radarGrades: {
      speed: 95,
      athleticism: 93,
      gameIq: 90,
      technique: 89,
      leadership: 96,
      durability: 91
    },
    keyStrengths: [
      'Sub-4.48 40-yard dash verified acceleration and fluid hip turn in coverage',
      'Clutch situational decision maker with zero turnovers in 4th quarter drives',
      'Vocal field general and respected team captain'
    ],
    areasForGrowth: [
      'Adding 5 lbs of lean functional mass to sustain high-volume collegiate contact',
      'Refining press-man footwork against oversized perimeter receivers'
    ],
    executiveScoutSummary: 'Marcus demonstrates rare positional versatility and championship-level poise under pressure. Combines verifiable top-1% athletic metrics with exemplary classroom discipline.'
  });

  if (!isOpen || !athlete) return null;

  const handleRunAiEvaluation = async () => {
    setIsGeneratingAi(true);
    try {
      const athleteMetrics = (athlete as any).metrics || (athlete.performanceMetrics as any) || {};
      const res = await fetch('/api/gemini/scout-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteName: athlete.displayName,
          sport: athlete.sport || 'Sports',
          primaryPosition: athlete.position || (athlete as any).primaryRole || 'Athlete',
          classYear: athlete.gradYear || '2027',
          gpa: athlete.gpa || '3.85',
          metrics: {
            fortyYardDash: athleteMetrics.fortyYardDash || '4.48s',
            verticalJump: athleteMetrics.verticalJump || '36.5 in',
            shuttle: athleteMetrics.shuttle || '4.15s'
          },
          notes: scoutNotes
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDossierData(data);
      }
    } catch (err) {
      console.warn('AI Scout Evaluation error:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Background Header Banner
      doc.setFillColor(18, 24, 38);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('JUST1PLAY SCOUTING DOSSIER', 14, 15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 242, 254);
      doc.text('OFFICIAL VERIFIED PROSPECT EVALUATION REPORT', 14, 22);

      doc.setFontSize(8);
      doc.setTextColor(180, 190, 205);
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Recruiter Pipeline: ${pipelineStatus}`, 14, 29);

      // Athlete Core Identity Card
      let y = 46;
      doc.setFillColor(245, 247, 250);
      doc.rect(14, y, 182, 34, 'F');
      doc.setDrawColor(200, 215, 230);
      doc.rect(14, y, 182, 34, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(athlete.displayName || 'Marcus Sterling', 18, y + 9);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 80, 95);
      doc.text(`Sport: ${athlete.sport || 'Flag Football'}  |  Position: ${athlete.position || 'QB/ATH'}  |  Class: ${athlete.gradYear || '2027'}`, 18, y + 16);
      doc.text(`Team / High School: ${(athlete as any).school || (athlete as any).teamName || 'SoCal Elite Vipers'}  |  GPA: ${athlete.gpa || '3.85'}`, 18, y + 22);
      doc.text(`Collegiate Projection: ${dossierData.collegiateProjection}`, 18, y + 28);

      // Scout Grade Badge
      doc.setFillColor(0, 100, 160);
      doc.rect(156, y + 4, 34, 26, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(`${dossierData.scoutGrade}`, 173, y + 16, { align: 'center' });
      doc.setFontSize(7);
      doc.text('SCOUT GRADE', 173, y + 23, { align: 'center' });

      // Verified Performance Radar / Combine Metrics
      y += 42;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('VERIFIED COMBINE & ATHLETIC ATTRIBUTES', 14, y);
      y += 5;

      const metrics = [
        { label: '40-Yard Dash', val: (athlete as any).metrics?.fortyYardDash || '4.48s' },
        { label: 'Vertical Jump', val: (athlete as any).metrics?.verticalJump || '36.5 in' },
        { label: 'Pro Shuttle', val: (athlete as any).metrics?.shuttle || '4.15s' },
        { label: 'Speed Grade', val: `${dossierData.radarGrades?.speed || 95}/100` },
        { label: 'Athleticism', val: `${dossierData.radarGrades?.athleticism || 93}/100` },
        { label: 'Game IQ', val: `${dossierData.radarGrades?.gameIq || 90}/100` },
      ];

      let mx = 14;
      metrics.forEach((m, idx) => {
        doc.setFillColor(240, 244, 250);
        doc.rect(mx, y, 28, 14, 'F');
        doc.setDrawColor(210, 220, 235);
        doc.rect(mx, y, 28, 14, 'S');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 110, 125);
        doc.text(m.label, mx + 14, y + 4.5, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(10, 40, 90);
        doc.text(m.val, mx + 14, y + 10.5, { align: 'center' });

        mx += 30.5;
      });

      // NIL Valuation Breakdown
      y += 22;
      doc.setFillColor(254, 252, 232);
      doc.rect(14, y, 182, 22, 'F');
      doc.setDrawColor(254, 240, 138);
      doc.rect(14, y, 182, 22, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(161, 98, 7);
      doc.text(`PROJECTED NIL VALUATION: $${dossierData.nilValuationTier?.projectedAnnualMin?.toLocaleString()} - $${dossierData.nilValuationTier?.projectedAnnualMax?.toLocaleString()} / YR`, 18, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 63, 18);
      doc.text(`Market Tier: ${dossierData.nilValuationTier?.tierLabel}`, 18, y + 13);
      doc.text(`Growth Factors: ${dossierData.nilValuationTier?.marketFactors}`, 18, y + 18);

      // Key Strengths & Growth Areas
      y += 30;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('SCOUTING STRENGTHS & GROWTH AREAS', 14, y);
      y += 5;

      // Strengths box
      doc.setFillColor(240, 253, 244);
      doc.rect(14, y, 88, 38, 'F');
      doc.setDrawColor(187, 247, 208);
      doc.rect(14, y, 88, 38, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(22, 101, 52);
      doc.text('Key Strengths', 18, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      let sy = y + 12;
      dossierData.keyStrengths?.forEach((st: string) => {
        const lines = doc.splitTextToSize(`• ${st}`, 80);
        doc.text(lines, 18, sy);
        sy += lines.length * 4.5;
      });

      // Growth areas box
      doc.setFillColor(254, 242, 242);
      doc.rect(108, y, 88, 38, 'F');
      doc.setDrawColor(254, 202, 202);
      doc.rect(108, y, 88, 38, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(153, 27, 27);
      doc.text('Development Focus', 112, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      let gy = y + 12;
      dossierData.areasForGrowth?.forEach((afg: string) => {
        const lines = doc.splitTextToSize(`• ${afg}`, 80);
        doc.text(lines, 112, gy);
        gy += lines.length * 4.5;
      });

      // Executive Scout Summary
      y += 46;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('EXECUTIVE SCOUT EVALUATION', 14, y);
      y += 5;

      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 32, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, y, 182, 32, 'S');

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const summaryLines = doc.splitTextToSize(`"${dossierData.executiveScoutSummary}"`, 174);
      doc.text(summaryLines, 18, y + 7);

      if (scoutNotes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Private Recruiter Notes:', 18, y + 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        const notesLines = doc.splitTextToSize(scoutNotes, 174);
        doc.text(notesLines, 18, y + 25);
      }

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Just1Play Collegiate Scouting Network • Verified Athlete ID Pass Data System', 14, 285);

      doc.save(`Scouting_Dossier_${(athlete.displayName || 'Athlete').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error generating scout dossier PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-[#12171E] border border-[#2D3748] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white"
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748] bg-[#161C22]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white font-mono tracking-wide flex items-center gap-2">
                <span>NCAA / NAIA SCOUT EVALUATION DOSSIER</span>
                <span className="text-[10px] text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded border border-[#10B981]/30">
                  OFFICIAL
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8] font-sans">
                Confidential collegiate recruiter breakdown & projected NIL valuation matrix for {athlete.displayName}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Athlete Bio & Grade Hero Strip */}
          <div className="bg-[#18212C] border border-[#2D3748] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <img
                src={athlete.photoURL || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80'}
                alt={athlete.displayName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.3)] shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">{athlete.displayName}</h3>
                  <ShieldCheck className="w-4 h-4 text-[#00F2FE]" />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-mono text-[#94A3B8]">
                  <span className="text-white font-bold">{athlete.sport || 'Flag Football'}</span>
                  <span>•</span>
                  <span>Class of {athlete.gradYear || '2027'}</span>
                  <span>•</span>
                  <span>Pos: {athlete.position || 'QB / WR'}</span>
                  <span>•</span>
                  <span className="text-[#10B981] font-bold">GPA {athlete.gpa || '3.85'}</span>
                </div>

                {/* Recruiter Pipeline Selector */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[11px] font-mono text-[#94A3B8]">Pipeline Status:</span>
                  {(['Watching', 'High Priority', 'Offer Extended'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setPipelineStatus(status)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        pipelineStatus === status
                          ? 'bg-[#00F2FE] text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                          : 'bg-[#12171E] text-[#94A3B8] border border-[#2D3748] hover:text-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scout Scorecard Box */}
            <div className="flex items-center gap-4 bg-[#0F141A] border border-[#2D3748] rounded-xl p-4 self-start md:self-auto shrink-0">
              <div className="text-center pr-4 border-r border-[#2D3748]">
                <span className="text-[10px] font-mono text-[#94A3B8] block uppercase">Scout Rating</span>
                <span className="text-3xl sm:text-4xl font-black text-[#00F2FE] font-mono">
                  {dossierData.scoutGrade}
                </span>
                <div className="flex items-center justify-center gap-0.5 mt-1 text-[#F59E0B]">
                  {[...Array(dossierData.starRating || 4)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B]" />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#94A3B8] block uppercase">Projected Tier</span>
                <span className="text-xs font-bold text-[#10B981] font-mono block max-w-[160px] leading-snug mt-1">
                  {dossierData.collegiateProjection}
                </span>
              </div>
            </div>
          </div>

          {/* NIL Market Valuation Section */}
          <div className="bg-gradient-to-r from-[#18212C] to-[#12171E] border border-[#10B981]/30 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D3748]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#10B981]/20 text-[#10B981]">
                  <DollarSign className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-black font-mono tracking-wider uppercase text-white">
                  NIL Market Valuation Estimate
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-[#10B981] bg-[#10B981]/15 px-2.5 py-1 rounded-full border border-[#10B981]/30">
                {dossierData.nilValuationTier?.tierLabel || 'High-Impact Regional NIL Star'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-[#0F141A] p-3 rounded-xl border border-[#2D3748]">
                <span className="text-[10px] font-mono text-[#94A3B8] block uppercase">Projected Annual Range</span>
                <span className="text-xl sm:text-2xl font-black text-[#10B981] font-mono mt-1 block">
                  ${dossierData.nilValuationTier?.projectedAnnualMin?.toLocaleString()} - ${dossierData.nilValuationTier?.projectedAnnualMax?.toLocaleString()}
                </span>
                <span className="text-[10px] text-[#94A3B8] font-mono block mt-1">Based on tournament ROI & digital audience</span>
              </div>

              <div className="bg-[#0F141A] p-3 rounded-xl border border-[#2D3748]">
                <span className="text-[10px] font-mono text-[#94A3B8] block uppercase">Pro Archetype Comparison</span>
                <span className="text-sm font-bold text-white font-mono mt-1 block leading-snug">
                  {dossierData.proComparison}
                </span>
              </div>

              <div className="bg-[#0F141A] p-3 rounded-xl border border-[#2D3748]">
                <span className="text-[10px] font-mono text-[#94A3B8] block uppercase">Key Market Drivers</span>
                <span className="text-xs text-[#CBD5E1] block mt-1 leading-relaxed">
                  {dossierData.nilValuationTier?.marketFactors}
                </span>
              </div>
            </div>
          </div>

          {/* Skill Radar Metrics & Scout Takeaways */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Radar Skill Bars */}
            <div className="bg-[#0F141A] border border-[#2D3748] rounded-2xl p-4 sm:p-5">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-4 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#00F2FE]" />
                <span>Verified Combine Attributes</span>
              </h4>

              <div className="space-y-3 font-mono text-xs">
                {Object.entries(dossierData.radarGrades || {}).map(([key, val]: [string, any]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[11px] mb-1 uppercase">
                      <span className="text-[#94A3B8]">{key}</span>
                      <span className="text-white font-bold">{val} / 100</span>
                    </div>
                    <div className="w-full bg-[#1E2630] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          val >= 90 ? 'bg-[#00F2FE]' : val >= 80 ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                        }`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Development Areas */}
            <div className="space-y-4">
              {/* Strengths */}
              <div className="bg-[#0F141A] border border-[#2D3748] rounded-2xl p-4">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#10B981] mb-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Key Scout Strengths</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-[#CBD5E1] list-disc list-inside">
                  {dossierData.keyStrengths?.map((str: string, i: number) => (
                    <li key={i} className="leading-relaxed">{str}</li>
                  ))}
                </ul>
              </div>

              {/* Areas for Growth */}
              <div className="bg-[#0F141A] border border-[#2D3748] rounded-2xl p-4">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F59E0B] mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Development Focus</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-[#CBD5E1] list-disc list-inside">
                  {dossierData.areasForGrowth?.map((afg: string, i: number) => (
                    <li key={i} className="leading-relaxed">{afg}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Executive Summary & Scout Notes Box */}
          <div className="bg-[#0F141A] border border-[#2D3748] rounded-2xl p-4 sm:p-5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#00F2FE]" />
              <span>Executive Scout Evaluation</span>
            </h4>
            <p className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed font-sans bg-[#161C22] p-3 rounded-xl border border-[#2D3748]">
              "{dossierData.executiveScoutSummary}"
            </p>

            {/* Recruiter Private Notes */}
            <div className="mt-4">
              <label className="block text-[11px] font-mono text-[#94A3B8] uppercase mb-1.5">
                Your Private Scouting Notes & Contact Log
              </label>
              <textarea
                value={scoutNotes}
                onChange={(e) => setScoutNotes(e.target.value)}
                rows={2}
                placeholder="Log in-person combine observations, coach conversations, or scholarship notes..."
                className="w-full bg-[#161C22] border border-[#2D3748] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F2FE]"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#161C22] border-t border-[#2D3748]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRunAiEvaluation}
              disabled={isGeneratingAi}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#0284C7] hover:from-[#38BDF8] hover:to-[#0369A1] text-black font-mono font-black text-xs transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)] cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAi ? 'Analyzing Metrics...' : 'Re-Run AI Scout Analysis'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#00F2FE]/15 hover:bg-[#00F2FE]/25 text-[#00F2FE] border border-[#00F2FE]/40 font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,242,254,0.2)] cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting PDF...' : 'Download Official PDF'}</span>
            </button>

            <button
              onClick={handlePrintDossier}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-white border border-[#2D3748] font-mono text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
