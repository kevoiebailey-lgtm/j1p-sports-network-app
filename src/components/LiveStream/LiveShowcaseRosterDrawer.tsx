import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  FileText, 
  Plus, 
  Download, 
  Trash2, 
  Clock, 
  Tag, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  Award,
  Flame,
  Bookmark
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserProfile } from '../../types';

interface LiveShowcaseRosterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeamName?: string;
  awayTeamName?: string;
  currentQuarter?: string;
  gameClock?: string;
}

interface RosterPlayer {
  id: string;
  number: number;
  name: string;
  position: string;
  height: string;
  classYear: string;
  points: number;
  rebounds: number;
  assists: number;
  fouls: number;
  isVerified: boolean;
  avatarUrl: string;
}

interface ScoutNote {
  id: string;
  timestamp: string;
  playerName: string;
  category: 'Shooting' | 'Defense' | 'Playmaking' | 'Athleticism' | 'General';
  note: string;
}

const HOME_ROSTER: RosterPlayer[] = [
  { id: 'ath-101', number: 3, name: 'Jordan Hayes', position: 'PG', height: "6'2\"", classYear: '2026', points: 18, rebounds: 4, assists: 7, fouls: 2, isVerified: true, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: 'ath-102', number: 11, name: 'Marcus Sterling', position: 'SG', height: "6'5\"", classYear: '2025', points: 14, rebounds: 3, assists: 2, fouls: 1, isVerified: true, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { id: 'ath-103', number: 23, name: 'Trey Westbrook', position: 'SF', height: "6'7\"", classYear: '2026', points: 12, rebounds: 8, assists: 3, fouls: 3, isVerified: true, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { id: 'ath-104', number: 34, name: 'Amari Vance', position: 'PF', height: "6'9\"", classYear: '2027', points: 8, rebounds: 11, assists: 1, fouls: 4, isVerified: false, avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80' },
  { id: 'ath-105', number: 55, name: 'Deandre Okafor', position: 'C', height: "6'11\"", classYear: '2025', points: 10, rebounds: 9, assists: 0, fouls: 2, isVerified: true, avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80' }
];

const AWAY_ROSTER: RosterPlayer[] = [
  { id: 'ath-201', number: 1, name: 'Kyrie Patterson', position: 'PG', height: "6'1\"", classYear: '2026', points: 16, rebounds: 2, assists: 6, fouls: 1, isVerified: true, avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80' },
  { id: 'ath-202', number: 5, name: 'Christian Miller', position: 'SG', height: "6'4\"", classYear: '2025', points: 21, rebounds: 5, assists: 1, fouls: 2, isVerified: true, avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80' },
  { id: 'ath-203', number: 14, name: 'Xavier Brooks', position: 'SF', height: "6'6\"", classYear: '2026', points: 9, rebounds: 6, assists: 4, fouls: 3, isVerified: false, avatarUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80' },
  { id: 'ath-204', number: 22, name: 'Kaelen Washington', position: 'PF', height: "6'8\"", classYear: '2025', points: 7, rebounds: 8, assists: 2, fouls: 2, isVerified: true, avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80' }
];

export const LiveShowcaseRosterDrawer: React.FC<LiveShowcaseRosterDrawerProps> = ({
  isOpen,
  onClose,
  homeTeamName = 'Lightning Elite AAU',
  awayTeamName = 'Metro All-Stars Academy',
  currentQuarter = 'Q3',
  gameClock = '04:18'
}) => {
  const [activeTab, setActiveTab] = useState<'rosters' | 'notes'>('rosters');
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  
  // Scouting Notes state
  const [notes, setNotes] = useState<ScoutNote[]>([
    { id: 'note-1', timestamp: 'Q2 07:45', playerName: 'Jordan Hayes (#3)', category: 'Playmaking', note: 'Elite change of pace in transition; excellent vision kicking to corner shooters.' },
    { id: 'note-2', timestamp: 'Q2 03:10', playerName: 'Christian Miller (#5)', category: 'Shooting', note: 'Pure stroke off pin-down screen; quick release with contested hand in face.' }
  ]);
  const [newPlayerName, setNewPlayerName] = useState<string>('Jordan Hayes (#3)');
  const [newCategory, setNewCategory] = useState<'Shooting' | 'Defense' | 'Playmaking' | 'Athleticism' | 'General'>('Shooting');
  const [newNoteText, setNewNoteText] = useState<string>('');

  if (!isOpen) return null;

  const currentRoster = selectedTeam === 'home' ? HOME_ROSTER : AWAY_ROSTER;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const noteItem: ScoutNote = {
      id: `note-${Date.now()}`,
      timestamp: `${currentQuarter} ${gameClock}`,
      playerName: newPlayerName,
      category: newCategory,
      note: newNoteText.trim()
    };

    setNotes([noteItem, ...notes]);
    setNewNoteText('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const handleExportNotes = () => {
    const text = notes.map(n => `[${n.timestamp}] ${n.playerName} (${n.category}): ${n.note}`).join('\n\n');
    const blob = new Blob([`JUST1PLAY LIVE STREAM SCOUTING NOTES\nGame: ${homeTeamName} vs ${awayTeamName}\nGenerated: ${new Date().toLocaleString()}\n\n${text}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scout_notes_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="bg-[#0B111E] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col h-full rounded-2xl lg:rounded-none overflow-hidden">
      {/* Drawer Top Navigation */}
      <div className="p-3 bg-[#060A12] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('rosters')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rosters'
                ? 'bg-[#00B8D4] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Live Rosters</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-[#FF6A00] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Scout Notes ({notes.length})</span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          LIVE {currentQuarter} • {gameClock}
        </span>
      </div>

      {/* Tab Content */}
      {activeTab === 'rosters' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Team Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedTeam('home')}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                selectedTeam === 'home'
                  ? 'bg-white/10 border-[#00B8D4] text-white shadow-md'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-[9px] font-mono uppercase text-[#00B8D4] block font-bold">HOME TEAM</span>
              <span className="text-xs font-bold truncate block">{homeTeamName}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTeam('away')}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                selectedTeam === 'away'
                  ? 'bg-white/10 border-[#FF6A00] text-white shadow-md'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-[9px] font-mono uppercase text-[#FF6A00] block font-bold">AWAY TEAM</span>
              <span className="text-xs font-bold truncate block">{awayTeamName}</span>
            </button>
          </div>

          {/* Roster Cards List */}
          <div className="space-y-2">
            {currentRoster.map((player) => (
              <div
                key={player.id}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0 overflow-hidden relative">
                    <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-amber-400">#{player.number}</span>
                      <span className="text-xs font-bold text-white truncate">{player.name}</span>
                      {player.isVerified && <ShieldCheck className="w-3 h-3 text-[#00B8D4] shrink-0" />}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block truncate">
                      {player.position} • {player.height} • Class of '{player.classYear}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-black font-mono text-white">{player.points} PTS</div>
                    <div className="text-[9px] font-mono text-slate-400">{player.rebounds}R • {player.assists}A</div>
                  </div>

                  <Link
                    to={`/profile/${player.id}`}
                    target="_blank"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00B8D4] text-slate-300 hover:text-slate-950 transition-all cursor-pointer"
                    title="View Athlete Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Scouting Notes Pad */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                Live Scouting Evaluations
              </span>
              {notes.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportNotes}
                  className="text-[10px] font-mono text-[#00B8D4] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Export TXT</span>
                </button>
              )}
            </div>

            {notes.map((note) => (
              <div key={note.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-amber-300">
                      {note.timestamp}
                    </span>
                    <span className="font-bold text-white">{note.playerName}</span>
                    <span className="text-[9px] font-mono text-slate-400 uppercase">[{note.category}]</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{note.note}</p>
              </div>
            ))}
          </div>

          {/* New Note Form */}
          <form onSubmit={handleAddNote} className="p-3 bg-[#060A12] border-t border-white/10 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name or #"
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#00B8D4]"
              />
              <select
                value={newCategory}
                onChange={(e: any) => setNewCategory(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#00B8D4]"
              >
                <option value="Shooting">Shooting</option>
                <option value="Defense">Defense</option>
                <option value="Playmaking">Playmaking</option>
                <option value="Athleticism">Athleticism</option>
                <option value="General">General Evaluation</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Type quick scouting observation..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="px-3 py-1.5 rounded-lg bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default LiveShowcaseRosterDrawer;
