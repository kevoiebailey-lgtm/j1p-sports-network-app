import React, { useRef, useState } from 'react';
import { 
  Printer, 
  Download, 
  FileText, 
  X, 
  Trophy, 
  Calendar, 
  MapPin, 
  Clock, 
  Check, 
  Share2,
  Layers,
  Sparkles
} from 'lucide-react';

interface PrintableBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentTitle?: string;
  division?: string;
  sport?: string;
  venueName?: string;
  date?: string;
  poolData?: {
    poolName: string;
    teams: { seed: number; name: string; wins: number; losses: number; points: number; diff: number }[];
  }[];
  bracketMatches?: {
    round: string;
    matchNumber: number;
    team1: { name: string; score?: number; seed?: number };
    team2: { name: string; score?: number; seed?: number };
    time?: string;
    court?: string;
    winner?: string;
  }[];
}

export const PrintableBracketModal: React.FC<PrintableBracketModalProps> = ({
  isOpen,
  onClose,
  tournamentTitle = 'Just1Play Spring National Showcase 2026',
  division = '14U Varsity Premier',
  sport = 'Flag Football',
  venueName = 'Apex Athletic Complex (Field 1 - 4)',
  date = 'May 16 - 18, 2026',
  poolData = [
    {
      poolName: 'Pool A (Championship Flight)',
      teams: [
        { seed: 1, name: 'SoCal Elite Vipers', wins: 3, losses: 0, points: 9, diff: +14 },
        { seed: 2, name: 'Pacific Coast Storm', wins: 2, losses: 1, points: 6, diff: +5 },
        { seed: 3, name: 'Desert Fire Select', wins: 1, losses: 2, points: 3, diff: -5 },
        { seed: 4, name: 'Bay Area Flight', wins: 0, losses: 3, points: 0, diff: -14 },
      ]
    },
    {
      poolName: 'Pool B (National Flight)',
      teams: [
        { seed: 1, name: 'Texas Outlaws Club', wins: 2, losses: 0, points: 7, diff: +9 },
        { seed: 2, name: 'California Golden Bears', wins: 2, losses: 1, points: 6, diff: +3 },
        { seed: 3, name: 'Las Vegas Lightning', wins: 1, losses: 1, points: 4, diff: -1 },
        { seed: 4, name: 'Arizona Heatwave', wins: 0, losses: 3, points: 0, diff: -11 },
      ]
    }
  ],
  bracketMatches = [
    { round: 'Quarterfinals', matchNumber: 1, team1: { name: 'SoCal Elite Vipers', seed: 1, score: 24 }, team2: { name: 'Arizona Heatwave', seed: 8, score: 6 }, time: '09:00 AM', court: 'Field 1', winner: 'SoCal Elite Vipers' },
    { round: 'Quarterfinals', matchNumber: 2, team1: { name: 'California Golden Bears', seed: 4, score: 18 }, team2: { name: 'Desert Fire Select', seed: 5, score: 12 }, time: '09:00 AM', court: 'Field 2', winner: 'California Golden Bears' },
    { round: 'Quarterfinals', matchNumber: 3, team1: { name: 'Texas Outlaws Club', seed: 2, score: 21 }, team2: { name: 'Bay Area Flight', seed: 7, score: 7 }, time: '10:15 AM', court: 'Field 1', winner: 'Texas Outlaws Club' },
    { round: 'Quarterfinals', matchNumber: 4, team1: { name: 'Pacific Coast Storm', seed: 3, score: 19 }, team2: { name: 'Las Vegas Lightning', seed: 6, score: 14 }, time: '10:15 AM', court: 'Field 2', winner: 'Pacific Coast Storm' },
    
    { round: 'Semifinals', matchNumber: 5, team1: { name: 'SoCal Elite Vipers', seed: 1, score: 28 }, team2: { name: 'California Golden Bears', seed: 4, score: 14 }, time: '01:00 PM', court: 'Field 1 (Main Turf)', winner: 'SoCal Elite Vipers' },
    { round: 'Semifinals', matchNumber: 6, team1: { name: 'Texas Outlaws Club', seed: 2, score: 20 }, team2: { name: 'Pacific Coast Storm', seed: 3, score: 16 }, time: '01:00 PM', court: 'Field 2', winner: 'Texas Outlaws Club' },
    
    { round: 'Championship Final', matchNumber: 7, team1: { name: 'SoCal Elite Vipers', seed: 1, score: 26 }, team2: { name: 'Texas Outlaws Club', seed: 2, score: 21 }, time: '03:30 PM', court: 'Championship Stadium Field 1', winner: 'SoCal Elite Vipers' }
  ]
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'bracket' | 'pools' | 'schedule'>('bracket');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [printTheme, setPrintTheme] = useState<'high_contrast' | 'dark'>('high_contrast');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Title & Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 20);
      doc.text(tournamentTitle, 14, 18);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Division: ${division} | Sport: ${sport} | Dates: ${date}`, 14, 25);
      doc.text(`Venue: ${venueName} | Generated via Just1Play Master Desk`, 14, 31);

      doc.setDrawColor(200, 200, 200);
      doc.line(14, 34, 280, 34);

      let currentY = 42;

      if (activeTab === 'bracket') {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 100, 150);
        doc.text('OFFICIAL CHAMPIONSHIP ELIMINATION BRACKET', 14, currentY);
        currentY += 8;

        const rounds = ['Quarterfinals', 'Semifinals', 'Championship Final'];
        let colX = 14;

        rounds.forEach((rnd) => {
          const matchesInRound = bracketMatches.filter(m => m.round === rnd);
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(40, 40, 40);
          doc.text(rnd.toUpperCase(), colX, currentY);

          let matchY = currentY + 6;
          matchesInRound.forEach((m) => {
            // Draw match box
            doc.setFillColor(245, 247, 250);
            doc.rect(colX, matchY, 80, 20, 'F');
            doc.setDrawColor(180, 190, 205);
            doc.rect(colX, matchY, 80, 20, 'S');

            // Team 1
            doc.setFontSize(9);
            doc.setFont('helvetica', m.winner === m.team1.name ? 'bold' : 'normal');
            doc.setTextColor(m.winner === m.team1.name ? 0 : 70, 0, 0);
            doc.text(`(#${m.team1.seed || 1}) ${m.team1.name}`, colX + 3, matchY + 6);
            if (m.team1.score !== undefined) {
              doc.text(`${m.team1.score}`, colX + 72, matchY + 6);
            }

            // Line
            doc.setDrawColor(220, 220, 220);
            doc.line(colX + 2, matchY + 9, colX + 78, matchY + 9);

            // Team 2
            doc.setFont('helvetica', m.winner === m.team2.name ? 'bold' : 'normal');
            doc.setTextColor(m.winner === m.team2.name ? 0 : 70, 0, 0);
            doc.text(`(#${m.team2.seed || 2}) ${m.team2.name}`, colX + 3, matchY + 15);
            if (m.team2.score !== undefined) {
              doc.text(`${m.team2.score}`, colX + 72, matchY + 15);
            }

            // Info note
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 120, 120);
            doc.text(`${m.court || 'Field'} • ${m.time || 'TBD'}`, colX + 3, matchY + 19);

            matchY += 25;
          });

          colX += 90;
        });

      } else if (activeTab === 'pools') {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 100, 150);
        doc.text('OFFICIAL POOL PLAY STANDINGS & TIEBREAKERS', 14, currentY);
        currentY += 8;

        poolData.forEach((p) => {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(p.poolName, 14, currentY);
          currentY += 6;

          // Table header
          doc.setFillColor(230, 235, 245);
          doc.rect(14, currentY, 266, 6, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(50, 50, 50);
          doc.text('SEED', 16, currentY + 4);
          doc.text('TEAM NAME', 35, currentY + 4);
          doc.text('W', 140, currentY + 4);
          doc.text('L', 165, currentY + 4);
          doc.text('POINTS', 190, currentY + 4);
          doc.text('DIFF (+/-)', 225, currentY + 4);
          currentY += 7;

          p.teams.forEach((tm, idx) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(20, 20, 20);
            doc.text(`#${tm.seed}`, 16, currentY + 4);
            doc.text(tm.name, 35, currentY + 4);
            doc.text(`${tm.wins}`, 140, currentY + 4);
            doc.text(`${tm.losses}`, 165, currentY + 4);
            doc.text(`${tm.points} pts`, 190, currentY + 4);
            doc.text(`${tm.diff > 0 ? '+' + tm.diff : tm.diff}`, 225, currentY + 4);

            doc.setDrawColor(235, 235, 235);
            doc.line(14, currentY + 6, 280, currentY + 6);
            currentY += 7;
          });

          currentY += 6;
        });

      } else {
        // Schedule list
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 100, 150);
        doc.text('MASTER COURT & FIELD GAME SCHEDULE', 14, currentY);
        currentY += 8;

        bracketMatches.forEach((m, idx) => {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(20, 20, 20);
          doc.text(`Match #${m.matchNumber}: ${m.team1.name} vs. ${m.team2.name}`, 14, currentY);
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.text(`[${m.round}]  Time: ${m.time || 'TBD'}  |  Location: ${m.court || 'Field 1'}  |  Status: ${m.winner ? 'Final (Winner: ' + m.winner + ')' : 'Scheduled'}`, 14, currentY + 4.5);
          
          doc.setDrawColor(230, 230, 230);
          doc.line(14, currentY + 6.5, 280, currentY + 6.5);
          currentY += 8.5;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(140, 140, 140);
      doc.text('Official Tournament Document powered by Just1Play • Verified Digital Bracket Sheet', 14, 200);

      doc.save(`${tournamentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${division.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#182232] border border-slate-700 w-full max-w-5xl rounded-3xl p-5 sm:p-7 shadow-2xl relative text-white max-h-[92vh] flex flex-col">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Printable Tournament Sheets & PDFs</span>
                <span className="px-2 py-0.5 rounded-md bg-[#00F2FE]/15 text-[#00F2FE] text-[10px] font-mono uppercase">
                  A4 / Wall Poster
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {tournamentTitle} • {division}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setPrintTheme(printTheme === 'high_contrast' ? 'dark' : 'high_contrast')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              title="Toggle preview theme"
            >
              {printTheme === 'high_contrast' ? '☀️ Print High-Contrast' : '🌙 Night Board Mode'}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-[#00F2FE] hover:bg-[#38BDF8] text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,242,254,0.3)] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Building PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase flex items-center gap-1.5 border border-slate-600 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#00F2FE]" />
              <span>Print Sheet</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 pt-3 shrink-0">
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bracket'
                ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            Championship Bracket View
          </button>
          <button
            onClick={() => setActiveTab('pools')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pools'
                ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            Pool Standings Table
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-[#00F2FE] text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            Master Court Schedule
          </button>
        </div>

        {/* Print Preview Canvas Area */}
        <div className="flex-1 overflow-y-auto mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div 
            ref={printAreaRef}
            className={`p-6 sm:p-8 rounded-2xl shadow-inner transition-all ${
              printTheme === 'high_contrast' 
                ? 'bg-white text-slate-950' 
                : 'bg-[#0F172A] text-white border border-slate-800'
            }`}
          >
            {/* Sheet Header */}
            <div className="border-b-2 border-slate-300 pb-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                    {tournamentTitle}
                  </h1>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
                    Division: <span className="text-slate-900">{division}</span> • Sport: <span className="text-slate-900">{sport}</span>
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{date}</span>
                  </div>
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{venueName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB CONTENT: BRACKET */}
            {activeTab === 'bracket' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Quarterfinals', 'Semifinals', 'Championship Final'].map((rnd) => {
                    const matchesInRound = bracketMatches.filter(m => m.round === rnd);
                    return (
                      <div key={rnd} className="space-y-4">
                        <div className="pb-2 border-b-2 border-slate-400">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                            {rnd}
                          </h3>
                        </div>

                        <div className="space-y-4">
                          {matchesInRound.map((m) => (
                            <div 
                              key={m.matchNumber} 
                              className={`p-3 rounded-xl border-2 ${
                                printTheme === 'high_contrast' 
                                  ? 'bg-slate-50 border-slate-300 text-slate-950' 
                                  : 'bg-slate-800/80 border-slate-700 text-white'
                              } space-y-2`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pb-1 border-b border-slate-200">
                                <span>MATCH #{m.matchNumber} • {m.court}</span>
                                <span>{m.time}</span>
                              </div>

                              <div className="space-y-1 text-xs">
                                <div className={`flex items-center justify-between ${m.winner === m.team1.name ? 'font-black text-cyan-600' : 'text-slate-700'}`}>
                                  <span>(#{m.team1.seed}) {m.team1.name}</span>
                                  <span className="font-mono font-bold">{m.team1.score ?? '-'}</span>
                                </div>
                                <div className={`flex items-center justify-between ${m.winner === m.team2.name ? 'font-black text-cyan-600' : 'text-slate-700'}`}>
                                  <span>(#{m.team2.seed}) {m.team2.name}</span>
                                  <span className="font-mono font-bold">{m.team2.score ?? '-'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: POOLS */}
            {activeTab === 'pools' && (
              <div className="space-y-8">
                {poolData.map((pool) => (
                  <div key={pool.poolName} className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                      {pool.poolName}
                    </h3>

                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
                          <th className="p-2 font-black">SEED</th>
                          <th className="p-2 font-black">TEAM</th>
                          <th className="p-2 font-black text-center">WINS</th>
                          <th className="p-2 font-black text-center">LOSSES</th>
                          <th className="p-2 font-black text-center">DIFF</th>
                          <th className="p-2 font-black text-right">POINTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pool.teams.map((tm) => (
                          <tr key={tm.seed} className="border-b border-slate-200">
                            <td className="p-2 font-mono font-bold">#{tm.seed}</td>
                            <td className="p-2 font-bold">{tm.name}</td>
                            <td className="p-2 text-center font-mono">{tm.wins}</td>
                            <td className="p-2 text-center font-mono">{tm.losses}</td>
                            <td className="p-2 text-center font-mono font-bold">{tm.diff > 0 ? `+${tm.diff}` : tm.diff}</td>
                            <td className="p-2 text-right font-mono font-black text-cyan-700">{tm.points} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: SCHEDULE */}
            {activeTab === 'schedule' && (
              <div className="space-y-3">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
                      <th className="p-2 font-black">GAME</th>
                      <th className="p-2 font-black">ROUND</th>
                      <th className="p-2 font-black">MATCHUP</th>
                      <th className="p-2 font-black">COURT / LOCATION</th>
                      <th className="p-2 font-black">TIME</th>
                      <th className="p-2 font-black text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bracketMatches.map((m) => (
                      <tr key={m.matchNumber} className="border-b border-slate-200">
                        <td className="p-2 font-mono font-bold">#{m.matchNumber}</td>
                        <td className="p-2 font-semibold">{m.round}</td>
                        <td className="p-2 font-bold">{m.team1.name} vs. {m.team2.name}</td>
                        <td className="p-2 text-slate-600">{m.court}</td>
                        <td className="p-2 font-mono">{m.time}</td>
                        <td className="p-2 text-right font-bold text-cyan-700">
                          {m.winner ? `Final (${m.winner})` : 'Scheduled'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sheet Footer */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-400">
              <span>Just1Play Tournament Engine v2.8 • Master Bracket System</span>
              <span>Official Verification Stamp: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
