'use client';

import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Printer,
  Download,
  Trophy,
  Filter,
  Layers,
  Calendar,
  Clock,
  Shield,
  CheckCircle2,
  Eye,
  Sparkles,
  FileCheck,
  ChevronRight,
  RefreshCw,
  Sliders,
  UserCheck
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type DocumentType = 'scorecard' | 'wall_bracket';

export interface ScorecardGame {
  id: string;
  divisionName: string;
  fieldName: string;
  matchTime: string;
  matchDate: string;
  roundName: string;
  homeTeam: {
    name: string;
    seed?: number;
    jerseyColor?: string;
    coachName?: string;
  };
  awayTeam: {
    name: string;
    seed?: number;
    jerseyColor?: string;
    coachName?: string;
  };
}

export interface BracketTeamSeed {
  seed: number;
  teamName: string;
  divisionName: string;
  record?: string;
}

export interface PrintBracketSheetsProps {
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  venueName?: string;
  games?: ScorecardGame[];
  seeds?: BracketTeamSeed[];
}

// Sample Fallback Dataset for Immediate Testing
const SAMPLE_SCORECARD_GAMES: ScorecardGame[] = [
  {
    id: 'sc-1',
    divisionName: '16U Girls Flag Championship',
    fieldName: 'Field 1 (Main Turf)',
    matchDate: 'Saturday, Oct 14, 2026',
    matchTime: '9:00 AM',
    roundName: 'Quarterfinal 1',
    homeTeam: { name: 'Lady Lightning Elite', seed: 1, jerseyColor: 'White / Teal', coachName: 'Coach Bailey' },
    awayTeam: { name: 'Philly Blitz', seed: 8, jerseyColor: 'Midnight Navy', coachName: 'Coach Roberts' }
  },
  {
    id: 'sc-2',
    divisionName: '16U Girls Flag Championship',
    fieldName: 'Field 2 (West Meadow)',
    matchDate: 'Saturday, Oct 14, 2026',
    matchTime: '9:00 AM',
    roundName: 'Quarterfinal 2',
    homeTeam: { name: 'Jersey Shore Wave', seed: 4, jerseyColor: 'Royal Blue', coachName: 'Coach Miller' },
    awayTeam: { name: 'Metro Sting', seed: 5, jerseyColor: 'Black / Gold', coachName: 'Coach Harrison' }
  },
  {
    id: 'sc-3',
    divisionName: '16U Girls Flag Championship',
    fieldName: 'Field 1 (Main Turf)',
    matchDate: 'Saturday, Oct 14, 2026',
    matchTime: '10:15 AM',
    roundName: 'Quarterfinal 3',
    homeTeam: { name: 'NYC Empire Flag', seed: 2, jerseyColor: 'Heather Gray', coachName: 'Coach Davis' },
    awayTeam: { name: 'Midwest Storm', seed: 7, jerseyColor: 'Crimson Red', coachName: 'Coach Hayes' }
  },
  {
    id: 'sc-4',
    divisionName: '16U Girls Flag Championship',
    fieldName: 'Field 2 (West Meadow)',
    matchDate: 'Saturday, Oct 14, 2026',
    matchTime: '10:15 AM',
    roundName: 'Quarterfinal 4',
    homeTeam: { name: 'Texas Lone Stars', seed: 3, jerseyColor: 'Silver / Navy', coachName: 'Coach Vance' },
    awayTeam: { name: 'SoCal All-Stars', seed: 6, jerseyColor: 'Sunset Orange', coachName: 'Coach Brooks' }
  },
  {
    id: 'sc-5',
    divisionName: '14U Open Division',
    fieldName: 'Field 3 (East Arena)',
    matchDate: 'Saturday, Oct 14, 2026',
    matchTime: '9:00 AM',
    roundName: 'Semifinal 1',
    homeTeam: { name: 'Georgia Prime 14U', seed: 1, jerseyColor: 'Red / Black', coachName: 'Coach Carter' },
    awayTeam: { name: 'Carolina Heights', seed: 4, jerseyColor: 'Carolina Blue', coachName: 'Coach Evans' }
  }
];

const SAMPLE_BRACKET_SEEDS: BracketTeamSeed[] = [
  { seed: 1, teamName: 'Lady Lightning Elite', divisionName: '16U Girls Flag Championship', record: '3-0 (+45)' },
  { seed: 2, teamName: 'NYC Empire Flag', divisionName: '16U Girls Flag Championship', record: '3-0 (+38)' },
  { seed: 3, teamName: 'Texas Lone Stars', divisionName: '16U Girls Flag Championship', record: '2-1 (+22)' },
  { seed: 4, teamName: 'Jersey Shore Wave', divisionName: '16U Girls Flag Championship', record: '2-1 (+15)' },
  { seed: 5, teamName: 'Metro Sting', divisionName: '16U Girls Flag Championship', record: '2-1 (+9)' },
  { seed: 6, teamName: 'SoCal All-Stars', divisionName: '16U Girls Flag Championship', record: '1-2 (-6)' },
  { seed: 7, teamName: 'Midwest Storm', divisionName: '16U Girls Flag Championship', record: '1-2 (-18)' },
  { seed: 8, teamName: 'Philly Blitz', divisionName: '16U Girls Flag Championship', record: '0-3 (-42)' }
];

export default function PrintBracketSheets({
  eventId = 'j1p-event-2026',
  eventName = 'Just One Play Fall National Championship',
  eventDate = 'October 14-15, 2026',
  venueName = 'Apex Sports Complex • Fields 1-4',
  games = SAMPLE_SCORECARD_GAMES,
  seeds = SAMPLE_BRACKET_SEEDS
}: PrintBracketSheetsProps) {
  const [docType, setDocType] = useState<DocumentType>('scorecard');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedGameId, setSelectedGameId] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Extract unique divisions
  const uniqueDivisions = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => set.add(g.divisionName));
    seeds.forEach((s) => set.add(s.divisionName));
    return ['all', ...Array.from(set)];
  }, [games, seeds]);

  // Extract unique fields
  const uniqueFields = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => set.add(g.fieldName));
    return ['all', ...Array.from(set)];
  }, [games]);

  // Filtered games for scorecards
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      const matchDiv = selectedDivision === 'all' || g.divisionName === selectedDivision;
      const matchField = selectedField === 'all' || g.fieldName === selectedField;
      const matchGame = selectedGameId === 'all' || g.id === selectedGameId;
      return matchDiv && matchField && matchGame;
    });
  }, [games, selectedDivision, selectedField, selectedGameId]);

  // Filtered seeds for bracket
  const filteredSeeds = useMemo(() => {
    if (selectedDivision === 'all') {
      const targetDiv = uniqueDivisions[1] || '16U Girls Flag Championship';
      return seeds.filter((s) => s.divisionName === targetDiv);
    }
    return seeds.filter((s) => s.divisionName === selectedDivision);
  }, [seeds, selectedDivision, uniqueDivisions]);

  // ============================================================================
  // PDF BUILDER: REFEREE GAME SCORECARD (8.5" x 11" Portrait)
  // ============================================================================
  const generateScorecardsPDF = (): jsPDF => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    const gamesToPrint = filteredGames.length > 0 ? filteredGames : games.slice(0, 1);

    gamesToPrint.forEach((game, pageIdx) => {
      if (pageIdx > 0) doc.addPage();

      const pageWidth = 8.5;
      const pageHeight = 11.0;
      const margin = 0.5;

      // 1. Outer Border
      doc.setLineWidth(0.02);
      doc.setDrawColor(30, 30, 30);
      doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

      // 2. Header Banner
      doc.setFillColor(15, 23, 42); // Dark Navy / Slate
      doc.rect(margin, margin, pageWidth - margin * 2, 0.9, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('JUST ONE PLAY • OFFICIAL GAME SCORECARD', margin + 0.25, margin + 0.35);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`${eventName.toUpperCase()}  |  ${venueName}`, margin + 0.25, margin + 0.58);
      doc.text(`Official Match Ledger & Verified Sign-Off Sheet`, margin + 0.25, margin + 0.76);

      // 3. Match Meta Bar
      let y = margin + 1.1;
      doc.setFillColor(241, 245, 249);
      doc.rect(margin + 0.1, y, pageWidth - margin * 2 - 0.2, 0.45, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin + 0.1, y, pageWidth - margin * 2 - 0.2, 0.45, 'S');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`DIVISION: ${game.divisionName}`, margin + 0.25, y + 0.28);
      doc.text(`STAGE: ${game.roundName}`, margin + 3.4, y + 0.28);
      doc.text(`FIELD: ${game.fieldName}`, margin + 5.5, y + 0.28);

      // 4. Team Matchup & Jersey Colors Box
      y += 0.65;
      const colWidth = (pageWidth - margin * 2 - 0.3) / 2;

      // Home Team Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.015);
      doc.rect(margin + 0.1, y, colWidth, 1.1);

      doc.setFillColor(248, 250, 252);
      doc.rect(margin + 0.1, y, colWidth, 0.3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`HOME TEAM (Seed #${game.homeTeam.seed || '—'})`, margin + 0.2, y + 0.2);

      doc.setFontSize(12);
      doc.text(game.homeTeam.name, margin + 0.2, y + 0.58);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Jersey: ${game.homeTeam.jerseyColor || 'Light'}  |  Coach: ${game.homeTeam.coachName || 'N/A'}`, margin + 0.2, y + 0.85);

      // Away Team Box
      const awayX = margin + 0.1 + colWidth + 0.1;
      doc.setFillColor(255, 255, 255);
      doc.rect(awayX, y, colWidth, 1.1);

      doc.setFillColor(248, 250, 252);
      doc.rect(awayX, y, colWidth, 0.3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`AWAY TEAM (Seed #${game.awayTeam.seed || '—'})`, awayX + 0.1, y + 0.2);

      doc.setFontSize(12);
      doc.text(game.awayTeam.name, awayX + 0.1, y + 0.58);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Jersey: ${game.awayTeam.jerseyColor || 'Dark'}  |  Coach: ${game.awayTeam.coachName || 'N/A'}`, awayX + 0.1, y + 0.85);

      // 5. Scoring & Period Ledger (AutoTable)
      y += 1.3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL SCORING LEDGER', margin + 0.1, y);

      autoTable(doc, {
        startY: y + 0.1,
        margin: { left: margin + 0.1, right: margin + 0.1 },
        head: [['TEAM', '1st HALF', '2nd HALF', 'OT 1', 'OT 2', 'FINAL SCORE', 'INITIALS']],
        body: [
          [game.homeTeam.name, '', '', '', '', '', ''],
          [game.awayTeam.name, '', '', '', '', '', '']
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 9.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          minCellHeight: 0.45,
          fontSize: 10,
          valign: 'middle',
          textColor: [15, 23, 42],
          lineWidth: 0.01
        },
        columnStyles: {
          0: { cellWidth: 2.2, fontStyle: 'bold' },
          1: { cellWidth: 0.85, halign: 'center' },
          2: { cellWidth: 0.85, halign: 'center' },
          3: { cellWidth: 0.75, halign: 'center' },
          4: { cellWidth: 0.75, halign: 'center' },
          5: { cellWidth: 1.1, halign: 'center', fontStyle: 'bold' },
          6: { halign: 'center' }
        }
      });

      // 6. Timeouts & Possession Ledger
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 0.35;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TIMEOUTS TRACKER (Check Box when Used - 2 per Half):', margin + 0.1, y);

      // Timeout Checkboxes
      const drawTimeoutRow = (teamLabel: string, currY: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(teamLabel, margin + 0.15, currY + 0.15);

        doc.setFont('helvetica', 'normal');
        doc.text('1st Half:', margin + 2.2, currY + 0.15);
        doc.rect(margin + 2.8, currY, 0.2, 0.2);
        doc.rect(margin + 3.1, currY, 0.2, 0.2);

        doc.text('2nd Half:', margin + 3.6, currY + 0.15);
        doc.rect(margin + 4.2, currY, 0.2, 0.2);
        doc.rect(margin + 4.5, currY, 0.2, 0.2);

        doc.text('OT:', margin + 5.0, currY + 0.15);
        doc.rect(margin + 5.3, currY, 0.2, 0.2);
      };

      drawTimeoutRow(`HOME: ${game.homeTeam.name}`, y + 0.2);
      drawTimeoutRow(`AWAY: ${game.awayTeam.name}`, y + 0.55);

      // 7. Penalty & Incident Log Box
      y += 1.0;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('INFRACTIONS & PENALTY NOTATIONS:', margin + 0.1, y);

      autoTable(doc, {
        startY: y + 0.1,
        margin: { left: margin + 0.1, right: margin + 0.1 },
        head: [['HALF', 'TEAM', 'PLAYER #', 'INFRACTION CODE / DESCRIPTION', 'YARDS', 'OFFICIAL']],
        body: [
          ['', '', '', '', '', ''],
          ['', '', '', '', '', ''],
          ['', '', '', '', '', '']
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [51, 65, 85],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: {
          minCellHeight: 0.3,
          fontSize: 8.5,
          lineWidth: 0.01
        }
      });

      // 8. Official Sign-Off Verification Box
      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 0.35;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.015);
      doc.rect(margin + 0.1, y, pageWidth - margin * 2 - 0.2, 1.45, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL VERIFICATION & DISPUTE SIGN-OFF', margin + 0.25, y + 0.25);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('By signing below, coaches certify the score and statistics entered are final and undisputed.', margin + 0.25, y + 0.42);

      // Signature Lines
      const sigY = y + 0.95;
      const sigCol = (pageWidth - margin * 2 - 0.6) / 3;

      // Line 1: Head Referee
      doc.setDrawColor(15, 23, 42);
      doc.line(margin + 0.25, sigY, margin + 0.25 + sigCol - 0.2, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Head Referee Signature', margin + 0.25, sigY + 0.18);
      doc.setFont('helvetica', 'normal');
      doc.text('Printed Name: ____________________', margin + 0.25, sigY + 0.35);

      // Line 2: Home Head Coach
      const homeSigX = margin + 0.25 + sigCol;
      doc.line(homeSigX, sigY, homeSigX + sigCol - 0.2, sigY);
      doc.setFont('helvetica', 'bold');
      doc.text('Home Coach Signature', homeSigX, sigY + 0.18);
      doc.setFont('helvetica', 'normal');
      doc.text(`Team: ${game.homeTeam.name.substring(0, 18)}`, homeSigX, sigY + 0.35);

      // Line 3: Away Head Coach
      const awaySigX = margin + 0.25 + sigCol * 2;
      doc.line(awaySigX, sigY, awaySigX + sigCol - 0.2, sigY);
      doc.setFont('helvetica', 'bold');
      doc.text('Away Coach Signature', awaySigX, sigY + 0.18);
      doc.setFont('helvetica', 'normal');
      doc.text(`Team: ${game.awayTeam.name.substring(0, 18)}`, awaySigX, sigY + 0.35);

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated by Just One Play Tournament Suite • ID: ${game.id} • Page ${pageIdx + 1} of ${gamesToPrint.length}`,
        margin + 0.25,
        pageHeight - margin - 0.1
      );
    });

    return doc;
  };

  // ============================================================================
  // PDF BUILDER: LARGE-FORMAT WALL BRACKET (11" x 8.5" Landscape)
  // ============================================================================
  const generateWallBracketPDF = (): jsPDF => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: 'letter'
    });

    const pageWidth = 11.0;
    const pageHeight = 8.5;
    const margin = 0.5;

    // 1. Outer Border
    doc.setLineWidth(0.02);
    doc.setDrawColor(15, 23, 42);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    // 2. Header Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, margin, pageWidth - margin * 2, 0.85, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const targetDivision = selectedDivision === 'all' ? (uniqueDivisions[1] || '16U Girls Flag') : selectedDivision;
    doc.text(`JUST ONE PLAY • ${targetDivision.toUpperCase()}`, margin + 0.3, margin + 0.35);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`${eventName}  |  Official Elimination Tree & Results Ledger`, margin + 0.3, margin + 0.58);
    doc.text(`Date: ${eventDate}  |  Venue: ${venueName}`, margin + 0.3, margin + 0.73);

    // 3. Round Column Headings
    const colQuarterX = margin + 0.4;
    const colSemiX = margin + 3.0;
    const colFinalX = margin + 5.6;
    const colChampionX = margin + 8.2;
    const headerY = margin + 1.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('QUARTERFINALS', colQuarterX, headerY);
    doc.text('SEMIFINALS', colSemiX, headerY);
    doc.text('CHAMPIONSHIP', colFinalX, headerY);
    doc.text('CHAMPION', colChampionX, headerY);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.01);
    doc.line(margin + 0.3, headerY + 0.1, pageWidth - margin - 0.3, headerY + 0.1);

    // Helper: Draw Matchup Box with Underlines for Score
    const drawBracketNode = (x: number, y: number, seed: string, team: string, score: string = '') => {
      const boxWidth = 2.2;
      const boxHeight = 0.32;

      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.015);
      doc.line(x, y + boxHeight, x + boxWidth, y + boxHeight); // Underline

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`(${seed})`, x + 0.05, y + 0.22);

      doc.setFont('helvetica', 'normal');
      doc.text(team.substring(0, 18), x + 0.38, y + 0.22);

      // Score line at the end
      doc.line(x + boxWidth - 0.45, y + boxHeight, x + boxWidth, y + boxHeight);
      if (score) {
        doc.setFont('helvetica', 'bold');
        doc.text(score, x + boxWidth - 0.35, y + 0.22);
      }
    };

    // Seeds array mapping
    const s = filteredSeeds;
    const t = (idx: number, def: string) => s[idx]?.teamName || def;

    // QUARTERFINALS (8 Teams -> 4 Matches)
    const qY = [margin + 1.6, margin + 2.7, margin + 3.8, margin + 4.9];

    // QF 1 (1 vs 8)
    drawBracketNode(colQuarterX, qY[0], '1', t(0, 'Seed #1'));
    drawBracketNode(colQuarterX, qY[0] + 0.4, '8', t(7, 'Seed #8'));
    // QF 2 (4 vs 5)
    drawBracketNode(colQuarterX, qY[1], '4', t(3, 'Seed #4'));
    drawBracketNode(colQuarterX, qY[1] + 0.4, '5', t(4, 'Seed #5'));
    // QF 3 (2 vs 7)
    drawBracketNode(colQuarterX, qY[2], '2', t(1, 'Seed #2'));
    drawBracketNode(colQuarterX, qY[2] + 0.4, '7', t(6, 'Seed #7'));
    // QF 4 (3 vs 6)
    drawBracketNode(colQuarterX, qY[3], '3', t(2, 'Seed #3'));
    drawBracketNode(colQuarterX, qY[3] + 0.4, '6', t(5, 'Seed #6'));

    // Connecting Lines for QF -> SF
    const drawTreeFork = (x1: number, yTop: number, yBottom: number, nextX: number, nextY: number) => {
      doc.setDrawColor(71, 85, 105);
      doc.setLineWidth(0.015);
      // Horizontal from top node
      doc.line(x1, yTop, x1 + 0.2, yTop);
      // Horizontal from bottom node
      doc.line(x1, yBottom, x1 + 0.2, yBottom);
      // Vertical stem
      doc.line(x1 + 0.2, yTop, x1 + 0.2, yBottom);
      // Horizontal connector to next round
      doc.line(x1 + 0.2, nextY, nextX, nextY);
    };

    // SEMIFINALS (2 Matches)
    const sfY = [margin + 2.15, margin + 4.35];
    drawBracketNode(colSemiX, sfY[0], 'W1', 'Winner QF 1');
    drawBracketNode(colSemiX, sfY[0] + 0.5, 'W2', 'Winner QF 2');

    drawBracketNode(colSemiX, sfY[1], 'W3', 'Winner QF 3');
    drawBracketNode(colSemiX, sfY[1] + 0.5, 'W4', 'Winner QF 4');

    // QF -> SF Forks
    drawTreeFork(colQuarterX + 2.2, qY[0] + 0.32, qY[0] + 0.72, colSemiX, sfY[0] + 0.32);
    drawTreeFork(colQuarterX + 2.2, qY[1] + 0.32, qY[1] + 0.72, colSemiX, sfY[0] + 0.82);

    drawTreeFork(colQuarterX + 2.2, qY[2] + 0.32, qY[2] + 0.72, colSemiX, sfY[1] + 0.32);
    drawTreeFork(colQuarterX + 2.2, qY[3] + 0.32, qY[3] + 0.72, colSemiX, sfY[1] + 0.82);

    // FINALS
    const finalY = margin + 3.25;
    drawBracketNode(colFinalX, finalY, 'SF1', 'Winner Semi 1');
    drawBracketNode(colFinalX, finalY + 0.6, 'SF2', 'Winner Semi 2');

    // SF -> Final Forks
    drawTreeFork(colSemiX + 2.2, sfY[0] + 0.32, sfY[0] + 0.82, colFinalX, finalY + 0.32);
    drawTreeFork(colSemiX + 2.2, sfY[1] + 0.32, sfY[1] + 0.82, colFinalX, finalY + 0.92);

    // CHAMPION BOX
    const champY = margin + 3.55;
    doc.setFillColor(254, 243, 199); // Light Amber
    doc.rect(colChampionX, champY, 2.0, 0.8, 'F');
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.02);
    doc.rect(colChampionX, champY, 2.0, 0.8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 83, 9);
    doc.text('★ TOURNAMENT CHAMPION', colChampionX + 0.12, champY + 0.28);

    doc.line(colChampionX + 0.1, champY + 0.65, colChampionX + 1.9, champY + 0.65);

    // Final -> Champion Connector
    doc.setDrawColor(71, 85, 105);
    doc.line(colFinalX + 2.2, finalY + 0.62, colChampionX, finalY + 0.62);

    // 3rd Place Match Box
    const thirdY = margin + 5.9;
    doc.setFillColor(248, 250, 252);
    doc.rect(colFinalX, thirdY, 2.2, 0.9, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('3RD PLACE CONSOLATION', colFinalX + 0.1, thirdY + 0.25);
    drawBracketNode(colFinalX + 0.1, thirdY + 0.3, 'L1', 'Loser Semi 1');
    drawBracketNode(colFinalX + 0.1, thirdY + 0.6, 'L2', 'Loser Semi 2');

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Printed from Just One Play Ops Suite • High-Resolution Vector Print • All Rights Reserved`,
      margin + 0.3,
      pageHeight - margin - 0.15
    );

    return doc;
  };

  // ============================================================================
  // ACTION HANDLERS: DOWNLOAD & DIRECT PRINT
  // ============================================================================
  const handleDownloadPDF = () => {
    setIsGenerating(true);
    try {
      const doc = docType === 'scorecard' ? generateScorecardsPDF() : generateWallBracketPDF();
      const filename =
        docType === 'scorecard'
          ? `J1P-Referee-Scorecards-${selectedDivision.replace(/\s+/g, '-')}.pdf`
          : `J1P-Wall-Bracket-${selectedDivision.replace(/\s+/g, '-')}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF Download failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInstantPrint = () => {
    setIsGenerating(true);
    try {
      const doc = docType === 'scorecard' ? generateScorecardsPDF() : generateWallBracketPDF();
      const blobUrl = doc.output('bloburl');
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err) {
      console.error('Instant Print failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans space-y-8 rounded-3xl border border-slate-800 shadow-2xl">
      
      {/* ======================================================================= */}
      {/* 1. HEADER & DOCUMENT TYPE SELECTOR                                      */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Printer className="w-3.5 h-3.5" />
            <span>Venue Print & PDF Export Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white">
            Scorecards & Wall Brackets
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {eventName} &bull; High-contrast vector PDFs optimized for laser & inkjet printers
          </p>
        </div>

        {/* Document Type Selector Segmented Tabs */}
        <div className="flex items-center p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setDocType('scorecard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer ${
              docType === 'scorecard'
                ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Referee Scorecards (8.5x11)</span>
          </button>

          <button
            type="button"
            onClick={() => setDocType('wall_bracket')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer ${
              docType === 'wall_bracket'
                ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Wall Bracket (11x8.5)</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. FILTER & BATCH CONTROLS                                              */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 p-4 sm:p-5 rounded-3xl text-xs font-mono">
        {/* Division Filter */}
        <div className="space-y-1.5">
          <label className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-400" />
            <span>Tournament Division</span>
          </label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-teal-400 cursor-pointer"
          >
            {uniqueDivisions.map((div) => (
              <option key={div} value={div}>
                {div === 'all' ? 'All Divisions' : div}
              </option>
            ))}
          </select>
        </div>

        {/* Field Filter (Scorecard Mode Only) */}
        {docType === 'scorecard' ? (
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>Field / Court Location</span>
            </label>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              {uniqueFields.map((f) => (
                <option key={f} value={f}>
                  {f === 'all' ? 'All Fields & Courts' : f}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Bracket Format</span>
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-bold">
              8-Team Single Elimination + 3rd Place
            </div>
          </div>
        )}

        {/* Scope Batch Summary */}
        <div className="space-y-1.5 flex flex-col justify-end">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Pages in Export:</span>
            <strong className="text-teal-400 font-bold">
              {docType === 'scorecard' ? `${filteredGames.length} Sheet(s)` : '1 Wall Poster'}
            </strong>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 3. IN-APP INTERACTIVE PREVIEW CANVAS                                    */}
      {/* ======================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-teal-400" />
            <span>Live Printable Layout Preview</span>
          </span>
          <span>B&W Toner Saver Format</span>
        </div>

        {/* Scorecard Preview */}
        {docType === 'scorecard' ? (
          <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-2xl border-4 border-slate-300 shadow-2xl font-mono text-xs max-w-2xl mx-auto space-y-4">
            {/* Header */}
            <div className="border-b-2 border-slate-950 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight">JUST ONE PLAY • GAME SCORECARD</h3>
                  <p className="text-[10px] text-slate-600 uppercase font-bold">{eventName}</p>
                </div>
                <div className="text-right text-[10px] font-bold">
                  <div>FIELD: {filteredGames[0]?.fieldName || 'Field 1'}</div>
                  <div>TIME: {filteredGames[0]?.matchTime || '9:00 AM'}</div>
                </div>
              </div>
            </div>

            {/* Matchup */}
            <div className="grid grid-cols-2 gap-3 border border-slate-950 p-3 rounded-lg bg-slate-50">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">HOME TEAM (Seed #{filteredGames[0]?.homeTeam.seed || '1'})</div>
                <div className="text-sm font-black">{filteredGames[0]?.homeTeam.name || 'Lady Lightning Elite'}</div>
                <div className="text-[9px] text-slate-600">Jersey: White / Coach Bailey</div>
              </div>
              <div className="border-l border-slate-300 pl-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">AWAY TEAM (Seed #{filteredGames[0]?.awayTeam.seed || '8'})</div>
                <div className="text-sm font-black">{filteredGames[0]?.awayTeam.name || 'Philly Blitz'}</div>
                <div className="text-[9px] text-slate-600">Jersey: Navy / Coach Roberts</div>
              </div>
            </div>

            {/* Score Ledger */}
            <table className="w-full border-collapse border border-slate-950 text-center text-[10px]">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-1.5 text-left pl-2">TEAM</th>
                  <th className="p-1.5 border border-slate-700">1ST</th>
                  <th className="p-1.5 border border-slate-700">2ND</th>
                  <th className="p-1.5 border border-slate-700">OT</th>
                  <th className="p-1.5 border border-slate-700">FINAL</th>
                  <th className="p-1.5 border border-slate-700">SIG</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-300 h-8 font-bold">
                  <td className="text-left pl-2">{filteredGames[0]?.homeTeam.name || 'Home'}</td>
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                </tr>
                <tr className="h-8 font-bold">
                  <td className="text-left pl-2">{filteredGames[0]?.awayTeam.name || 'Away'}</td>
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                </tr>
              </tbody>
            </table>

            {/* Timeouts */}
            <div className="text-[10px] space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="font-bold uppercase text-slate-700">Timeouts (Check when used):</div>
              <div className="flex gap-4">
                <span>HOME: [ ] [ ] (1st) | [ ] [ ] (2nd)</span>
                <span>AWAY: [ ] [ ] (1st) | [ ] [ ] (2nd)</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-2 border-t border-slate-950 grid grid-cols-3 gap-2 text-[9px]">
              <div>
                <div className="h-6 border-b border-slate-950" />
                <span className="font-bold">Referee Signature</span>
              </div>
              <div>
                <div className="h-6 border-b border-slate-950" />
                <span className="font-bold">Home Coach Signature</span>
              </div>
              <div>
                <div className="h-6 border-b border-slate-950" />
                <span className="font-bold">Away Coach Signature</span>
              </div>
            </div>
          </div>
        ) : (
          /* Wall Bracket Preview */
          <div className="bg-white text-slate-950 p-6 sm:p-8 rounded-2xl border-4 border-slate-300 shadow-2xl font-mono text-xs max-w-3xl mx-auto space-y-4">
            <div className="border-b-2 border-slate-950 pb-2 flex justify-between items-center">
              <div>
                <h3 className="font-black text-base uppercase tracking-tight">
                  JUST ONE PLAY • {selectedDivision.toUpperCase()}
                </h3>
                <span className="text-[10px] text-slate-600">{eventName} &bull; Elimination Bracket</span>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 border border-slate-300 px-2 py-1 rounded">
                11x8.5 Poster
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 text-[10px]">
              {/* Quarterfinals */}
              <div className="space-y-3">
                <span className="font-bold uppercase text-slate-500 block border-b border-slate-200 pb-1">Quarterfinals</span>
                <div className="space-y-2">
                  <div className="border-b border-slate-950 pb-0.5 font-bold">(1) Lady Lightning</div>
                  <div className="border-b border-slate-950 pb-0.5 font-bold">(8) Philly Blitz</div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="border-b border-slate-950 pb-0.5 font-bold">(4) Jersey Shore</div>
                  <div className="border-b border-slate-950 pb-0.5 font-bold">(5) Metro Sting</div>
                </div>
              </div>

              {/* Semifinals */}
              <div className="space-y-6 pt-3">
                <span className="font-bold uppercase text-slate-500 block border-b border-slate-200 pb-1">Semifinals</span>
                <div className="space-y-2">
                  <div className="border-b border-slate-950 pb-0.5 text-slate-400">Winner QF 1</div>
                  <div className="border-b border-slate-950 pb-0.5 text-slate-400">Winner QF 2</div>
                </div>
              </div>

              {/* Championship */}
              <div className="space-y-6 pt-6">
                <span className="font-bold uppercase text-slate-500 block border-b border-slate-200 pb-1">Championship</span>
                <div className="p-3 bg-amber-50 border border-amber-400 rounded-lg text-center space-y-1">
                  <span className="text-[9px] font-black text-amber-800 uppercase block">★ Tournament Champion</span>
                  <div className="border-b border-slate-950 pt-2" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 4. PRIMARY ACTIONS: DOWNLOAD PDF & INSTANT PRINT                        */}
      {/* ======================================================================= */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <FileCheck className="w-4 h-4 text-teal-400" />
          <span>Vector PDF generated client-side via jsPDF &bull; Crisp lines & zero toner waste</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleInstantPrint}
            disabled={isGenerating}
            className="flex-1 sm:flex-none py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Instant Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex-1 sm:flex-none py-3 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-teal-500/20 active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
