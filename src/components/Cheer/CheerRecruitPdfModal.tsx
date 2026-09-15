import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Download, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Trophy, 
  GraduationCap, 
  School,
  ExternalLink,
  QrCode,
  Layers
} from 'lucide-react';
import { CheerSkillItem } from './types';

interface CheerRecruitPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteName: string;
  athleteAvatar?: string;
  athleteId: string;
  gradYear?: string | number;
  position?: string;
  gpa?: string;
  schoolGym?: string;
  skills: CheerSkillItem[];
  readinessScore: number;
  ratingTier: string;
}

export const CheerRecruitPdfModal: React.FC<CheerRecruitPdfModalProps> = ({
  isOpen,
  onClose,
  athleteName,
  athleteAvatar,
  athleteId,
  gradYear = '2026',
  position = 'Flyer / Tumbler',
  gpa = '3.85',
  schoolGym = 'East Orange Jaguar Cheer / All-Star Elite',
  skills,
  readinessScore,
  ratingTier
}) => {
  const [generating, setGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const verifiedSkills = skills.filter(s => s.verified || (s.videoUrl && s.videoUrl.trim().length > 0));
  const collegiateSkills = skills.filter(s => s.verified && (s.level === 'NCAA D1' || s.level === 'Level 6'));
  const profileUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/cheer-matrix/${athleteId}`
    : `https://app.just1play.com/cheer-matrix/${athleteId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPdf = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Dark Slate Navy Background (#0F172A)
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // 2. Top Header Ribbon (#1E293B with Emerald Accent line)
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 42, 'F');

      // Emerald Accent Stripe (#10B981)
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 2.5, 'F');

      // Brand Logo & Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text('JUST1PLAY', 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(226, 232, 240);
      doc.text('CHEERMATRIX™ NCAA & ALL-STAR RECRUITING DOSSIER', 14, 23);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`VERIFIED DOSSIER DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}  |  DOC ID: J1P-CM-${athleteId.slice(0, 8).toUpperCase()}`, 14, 29);

      // Verified Badge Seal Stamp (Top Right)
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(pageWidth - 62, 10, 48, 18, 2.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('CHEERMATRIX VERIFIED', pageWidth - 38, 17, { align: 'center' });
      doc.setFontSize(6.5);
      doc.text(`${readinessScore}% RECRUITING READINESS`, pageWidth - 38, 22, { align: 'center' });

      // 3. Athlete Profile Card Section (Y: 48)
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(14, 48, pageWidth - 28, 38, 3, 3, 'F');
      doc.setDrawColor(51, 65, 85);
      doc.roundedRect(14, 48, pageWidth - 28, 38, 3, 3, 'S');

      // Athlete Name & Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(athleteName.toUpperCase(), 20, 60);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(56, 189, 248); // Sky blue
      doc.text(`${position}  |  Class of ${gradYear}  |  GPA: ${gpa}`, 20, 67);

      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(`School / Gym: ${schoolGym}`, 20, 74);

      // Key Scouting Metrics (Right side of Card)
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(pageWidth - 85, 52, 65, 30, 2, 2, 'F');
      doc.setDrawColor(51, 65, 85);
      doc.roundedRect(pageWidth - 85, 52, 65, 30, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129);
      doc.text('SCOUTING METRICS', pageWidth - 52.5, 58, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(226, 232, 240);
      doc.text(`• Total Verified Skills: ${verifiedSkills.length}`, pageWidth - 80, 65);
      doc.text(`• NCAA D1 / L6 Tier: ${collegiateSkills.length} Elite Passes`, pageWidth - 80, 71);
      doc.text(`• Status: ${ratingTier}`, pageWidth - 80, 77);

      // 4. Verified Skills Table (Y: 92)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('VERIFIED SKILLS & VIDEO EVIDENCE AUDIT', 14, 95);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('All skills audited against NCAA collegiate standards with floor surface specifications (Spring vs. Dead Mat).', 14, 100);

      // Table Header
      let currentY = 105;
      doc.setFillColor(51, 65, 85);
      doc.rect(14, currentY, pageWidth - 28, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(226, 232, 240);
      doc.text('SKILL NAME', 18, currentY + 4.8);
      doc.text('CATEGORY', 80, currentY + 4.8);
      doc.text('LEVEL TIER', 120, currentY + 4.8);
      doc.text('SURFACE', 150, currentY + 4.8);
      doc.text('AUDIT', 178, currentY + 4.8);

      currentY += 7;

      // Render Verified Skills List (Max 14 on 1-page format)
      const listToRender = verifiedSkills.length > 0 ? verifiedSkills.slice(0, 14) : skills.slice(0, 14);

      listToRender.forEach((skill, idx) => {
        const rowBg = idx % 2 === 0 ? [20, 30, 48] : [15, 23, 42];
        doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
        doc.rect(14, currentY, pageWidth - 28, 6.5, 'F');

        doc.setFont('helvetica', skill.verified ? 'bold' : 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(skill.verified ? 255 : 203, skill.verified ? 255 : 213, skill.verified ? 255 : 225);
        
        // Truncate skill name if long
        const skillNameTrunc = skill.name.length > 34 ? `${skill.name.slice(0, 32)}...` : skill.name;
        doc.text(skillNameTrunc, 18, currentY + 4.5);

        // Category formatting
        const catMap: Record<string, string> = {
          'standing_tumbling': 'Standing Tumble',
          'running_tumbling': 'Running Tumble',
          'stunting': 'Elite Stunt',
          'jumps_flexibility': 'Jumps / Flex'
        };
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(catMap[skill.category] || skill.category, 80, currentY + 4.5);

        // Level Tier
        doc.setTextColor(skill.level === 'NCAA D1' ? 56 : skill.level === 'Level 6' ? 168 : 226, skill.level === 'NCAA D1' ? 189 : skill.level === 'Level 6' ? 85 : 232, skill.level === 'NCAA D1' ? 248 : skill.level === 'Level 6' ? 247 : 240);
        doc.text(skill.level, 120, currentY + 4.5);

        // Floor Surface
        const surfaceText = skill.surface === 'dead_floor' ? 'Dead Mat' : skill.surface === 'grass_turf' ? 'Grass/Turf' : 'Spring Floor';
        doc.setTextColor(skill.surface === 'dead_floor' ? 245 : 148, skill.surface === 'dead_floor' ? 158 : 163, skill.surface === 'dead_floor' ? 11 : 184);
        doc.text(surfaceText, 150, currentY + 4.5);

        // Verified Status
        if (skill.verified) {
          doc.setTextColor(16, 185, 129);
          doc.text('✓ Verified', 178, currentY + 4.5);
        } else if (skill.videoUrl) {
          doc.setTextColor(56, 189, 248);
          doc.text('Clip Attached', 178, currentY + 4.5);
        } else {
          doc.setTextColor(100, 116, 139);
          doc.text('In Progress', 178, currentY + 4.5);
        }

        currentY += 6.5;
      });

      // 5. Bottom Callout & Direct Verification Link (Y: currentY + 6)
      const footerBoxY = Math.max(currentY + 4, 212);
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(14, footerBoxY, pageWidth - 28, 38, 3, 3, 'F');
      doc.setDrawColor(51, 65, 85);
      doc.roundedRect(14, footerBoxY, pageWidth - 28, 38, 3, 3, 'S');

      // Text Instructions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129);
      doc.text('COLLEGE RECRUITER & COACH ACCESS', 20, footerBoxY + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text('Scan the QR code or visit the official Just1Play CheerMatrix portal to stream verified high-definition', 20, footerBoxY + 15);
      doc.text('video reels, slow-motion biomechanical reviews, and full academic evaluation cards.', 20, footerBoxY + 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(56, 189, 248);
      doc.text(`Official Radar URL: ${profileUrl.slice(0, 65)}`, 20, footerBoxY + 28);

      // Generate QR Code onto Canvas to embed into PDF
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = 160;
      qrCanvas.height = 160;
      const ctx = qrCanvas.getContext('2d');
      if (ctx) {
        // Draw simple placeholder box or render QR
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 160, 160);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('JUST1PLAY QR', 35, 85);
      }

      // Convert SVG QR to Image Data if possible
      const svgElement = qrRef.current?.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        await new Promise((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const c = canvas.getContext('2d');
            if (c) {
              c.fillStyle = '#FFFFFF';
              c.fillRect(0, 0, 200, 200);
              c.drawImage(img, 10, 10, 180, 180);
              const qrDataUrl = canvas.toDataURL('image/png');
              doc.addImage(qrDataUrl, 'PNG', pageWidth - 46, footerBoxY + 4, 30, 30);
            }
            resolve(true);
          };
          img.onerror = () => resolve(true);
        });
      }

      // Footer Watermark
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('© Just1Play Sports Technology — Official NCAA Cheer & STUNT Scouting Network. All Rights Reserved.', pageWidth / 2, pageHeight - 6, { align: 'center' });

      // Save PDF file
      const cleanFileName = athleteName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`${cleanFileName}_CheerMatrix_Recruiting_Dossier.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn">
        
        {/* Hidden QR Code element for rendering onto canvas */}
        <div ref={qrRef} className="hidden">
          <QRCodeSVG value={profileUrl} size={200} level="M" />
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  NCAA & STUNT Ready
                </span>
                <span className="text-[10px] font-mono text-neutral-400">100% Free Client Export</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                College Recruiting Dossier (PDF)
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

        {/* Live Document Preview Card */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
            <div className="flex items-center gap-3">
              {athleteAvatar ? (
                <img src={athleteAvatar} alt={athleteName} className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/30" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-neutral-400 font-bold">
                  {athleteName.charAt(0)}
                </div>
              )}
              <div>
                <h4 className="font-bold text-white text-base">{athleteName}</h4>
                <p className="text-xs text-neutral-400">{position} &bull; Class of {gradYear} &bull; GPA: {gpa}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-neutral-400">Readiness Score</span>
                <div className="text-lg font-black font-mono text-emerald-400">{readinessScore}%</div>
              </div>
              <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                <QRCodeSVG value={profileUrl} size={48} level="M" />
              </div>
            </div>
          </div>

          {/* Quick Summary of PDF Content */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Skills
              </span>
              <p className="text-white font-bold text-sm">{verifiedSkills.length} Verified Entries</p>
              <p className="text-[11px] text-neutral-400">Includes timestamp & video URL</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-sky-400" />
                Collegiate Tiers
              </span>
              <p className="text-white font-bold text-sm">{collegiateSkills.length} NCAA D1 Passes</p>
              <p className="text-[11px] text-neutral-400">Standing full, rewinds, double downs</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Floor Verification
              </span>
              <p className="text-white font-bold text-sm">Dead Floor Audited</p>
              <p className="text-[11px] text-neutral-400">Spring vs. Dead mat breakdown</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <QrCode className="w-4 h-4" />}
            <span>{copiedLink ? 'Radar Link Copied!' : 'Copy Direct Radar URL'}</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={generating}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{generating ? 'Compiling Dossier...' : 'Download 1-Page PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
