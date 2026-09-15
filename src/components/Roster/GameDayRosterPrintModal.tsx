import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  User, 
  FileSpreadsheet, 
  Plus,
  QrCode
} from 'lucide-react';
import { AthleteRosterItem } from './AthleteRosterEntryModal';

interface GameDayRosterPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName?: string;
  division?: string;
  coachName?: string;
}

const DEFAULT_ROSTER: AthleteRosterItem[] = [
  { id: '1', fullName: 'Marcus Sterling', jerseyNumber: '1', position: 'QB', graduationYear: '2027', parentEmail: 'm.sterling@example.com', parentPhone: '(555) 234-5678', emergencyContact: 'Sarah Sterling (Mother)' },
  { id: '2', fullName: 'Jayden Vance', jerseyNumber: '7', position: 'WR', graduationYear: '2027', parentEmail: 'jvance.fam@example.com', parentPhone: '(555) 345-6789', emergencyContact: 'David Vance (Father)' },
  { id: '3', fullName: 'Trey Hawkins', jerseyNumber: '11', position: 'CB/FS', graduationYear: '2028', parentEmail: 'hawkins.t@example.com', parentPhone: '(555) 456-7890', emergencyContact: 'Lisa Hawkins (Mother)' },
  { id: '4', fullName: 'Kobe Alvarez', jerseyNumber: '24', position: 'RB', graduationYear: '2027', parentEmail: 'kobe.alvarez@example.com', parentPhone: '(555) 567-8901', emergencyContact: 'Carlos Alvarez (Father)' },
  { id: '5', fullName: 'Deon Washington', jerseyNumber: '0', position: 'SLOT', graduationYear: '2028', parentEmail: 'deon.wash@example.com', parentPhone: '(555) 678-9012', emergencyContact: 'Tina Washington (Mother)' },
  { id: '6', fullName: 'Jaxson Reed', jerseyNumber: '5', position: 'LB/ATH', graduationYear: '2027', parentEmail: 'reed.j@example.com', parentPhone: '(555) 789-0123', emergencyContact: 'Robert Reed (Father)' },
  { id: '7', fullName: 'Aiden Brooks', jerseyNumber: '88', position: 'TE', graduationYear: '2028', parentEmail: 'brooks.a@example.com', parentPhone: '(555) 890-1234', emergencyContact: 'Elena Brooks (Mother)' },
];

export const GameDayRosterPrintModal: React.FC<GameDayRosterPrintModalProps> = ({
  isOpen,
  onClose,
  teamName = 'SoCal Elite Vipers',
  division = '14U Varsity National',
  coachName = 'Coach Derrick Vance'
}) => {
  const [roster, setRoster] = useState<AthleteRosterItem[]>(DEFAULT_ROSTER);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    const headers = ['Jersey', 'Full Name', 'Position', 'Grad Year', 'Parent Email', 'Parent Phone', 'Emergency Contact', 'Status'];
    const rows = roster.map(r => [
      r.jerseyNumber,
      `"${r.fullName}"`,
      r.position,
      r.graduationYear,
      r.parentEmail,
      r.parentPhone,
      `"${r.emergencyContact}"`,
      'VERIFIED ID PASS'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${teamName.replace(/\s+/g, '_')}_Verified_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Dark Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 28, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('JUST1PLAY OFFICIAL GAME-DAY ROSTER & CHECK-IN SHEET', 14, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 242, 254);
      doc.text(`TEAM: ${teamName.toUpperCase()}   |   DIVISION: ${division.toUpperCase()}   |   HEAD COACH: ${coachName.toUpperCase()}`, 14, 20);

      // Metadata info right
      doc.setFontSize(8);
      doc.setTextColor(200, 210, 225);
      doc.text(`Event Date: ${new Date().toLocaleDateString()} | Verification: NFHS/USA Verified ID Pass`, 200, 20);

      // Table Header
      let y = 38;
      doc.setFillColor(240, 244, 250);
      doc.rect(14, y, 269, 9, 'F');
      doc.setDrawColor(200, 215, 230);
      doc.rect(14, y, 269, 9, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('#', 18, y + 6);
      doc.text('ATHLETE FULL NAME', 32, y + 6);
      doc.text('POS', 92, y + 6);
      doc.text('GRAD', 110, y + 6);
      doc.text('GUARDIAN CONTACT', 130, y + 6);
      doc.text('EMERGENCY CONTACT', 185, y + 6);
      doc.text('CHECK-IN SIGNATURE', 235, y + 6);

      y += 9;

      // Table Rows
      roster.forEach((player, idx) => {
        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.rect(14, y, 269, 11, 'F');
        doc.setDrawColor(220, 230, 240);
        doc.rect(14, y, 269, 11, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(10, 40, 90);
        doc.text(player.jerseyNumber, 18, y + 7.5);

        doc.setTextColor(15, 23, 42);
        doc.text(player.fullName, 32, y + 7.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(70, 80, 95);
        doc.text(player.position, 92, y + 7.5);
        doc.text(player.graduationYear, 110, y + 7.5);
        doc.text(`${player.parentPhone}`, 130, y + 7.5);
        doc.text(player.emergencyContact, 185, y + 7.5);

        // Signature Line
        doc.setDrawColor(180, 190, 200);
        doc.line(235, y + 8, 275, y + 8);

        y += 11;
      });

      // Verification & Referee Sign-off Section
      y += 8;
      doc.setFillColor(245, 248, 255);
      doc.rect(14, y, 269, 24, 'F');
      doc.setDrawColor(190, 210, 240);
      doc.rect(14, y, 269, 24, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL FIELD / REFEREE SIGN-OFF CERTIFICATION', 18, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 90, 105);
      doc.text('I hereby verify all athletes listed above have presented valid Digital ID passes and are approved for game participation.', 18, y + 12);

      doc.text('Head Referee Signature: ___________________________', 18, y + 19);
      doc.text('Field Marshal Signature: ___________________________', 150, y + 19);

      doc.save(`${teamName.replace(/\s+/g, '_')}_CheckIn_Sheet.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#12171E] border border-[#2D3748] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3748] bg-[#161C22]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00F2FE]/15 border border-[#00F2FE]/30 text-[#00F2FE]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wide">
                GAME-DAY ROSTER CHECK-IN & PRINT DESK
              </h2>
              <p className="text-xs text-slate-400">
                {teamName} • {division} • {coachName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#00F2FE] uppercase tracking-wider">
              Verified Athletes ({roster.length})
            </span>
            <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ID Passes Active
            </span>
          </div>

          <div className="border border-[#2D3748] rounded-2xl overflow-hidden bg-[#0F141A]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1A222D] text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Athlete</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Parent Contact</th>
                  <th className="p-3">Emergency Contact</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3748] text-slate-200">
                {roster.map((player) => (
                  <tr key={player.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#00F2FE]">{player.jerseyNumber}</td>
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <span>{player.fullName}</span>
                    </td>
                    <td className="p-3 font-mono">{player.position}</td>
                    <td className="p-3 font-mono">{player.graduationYear}</td>
                    <td className="p-3 font-mono text-slate-400">{player.parentPhone}</td>
                    <td className="p-3 text-slate-300 truncate max-w-[140px]">{player.emergencyContact}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#161C22] border-t border-[#2D3748]">
          <div className="text-xs font-mono text-slate-400">
            Export ready for NFHS, USA Flag, AAU & USSSA Game-Day check-ins.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E2630] hover:bg-[#2D3748] text-white border border-[#2D3748] font-mono text-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00F2FE]/15 hover:bg-[#00F2FE]/25 text-[#00F2FE] border border-[#00F2FE]/40 font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,242,254,0.2)] cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating...' : 'Print / Export PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#2D3748] hover:bg-[#4A5568] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
