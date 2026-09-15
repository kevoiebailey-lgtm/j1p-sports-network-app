import React from 'react';
import { Link } from 'react-router-dom';
import { UserProfile } from '../../types';
import { AthleteMediaSection } from '../AthleteProfile/AthleteMediaSection';
import { AthleteGameLogsView } from '../AthleteProfile/AthleteGameLogsView';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { generateAthletePdf } from '../../lib/pdfGenerator';
import { 
  X, 
  Bookmark, 
  MapPin, 
  GraduationCap, 
  Ruler, 
  Weight, 
  Award, 
  Instagram, 
  Twitter, 
  Mail, 
  Check, 
  ShieldCheck,
  Flame,
  Activity,
  Download,
  ExternalLink
} from 'lucide-react';

interface AthleteDetailModalProps {
  athlete: UserProfile | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (uid: string) => void;
}

export const AthleteDetailModal: React.FC<AthleteDetailModalProps> = ({
  athlete,
  onClose,
  isBookmarked,
  onToggleBookmark
}) => {
  if (!athlete) return null;

  const stats = athlete.stats as any;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212A31]/80 backdrop-blur-2xl overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-[#212A31]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] my-8 max-h-[90vh] overflow-y-auto text-white backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Vitals */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <img
              src={athlete.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80'}
              alt={athlete.displayName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E5B868] shadow-[0_0_25px_rgba(214,28,36,0.4)] shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-[#E5B868] text-black rounded-sm shadow-[0_0_10px_rgba(214,28,36,0.4)]">
                  {athlete.sport}
                </span>
                <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E5B868]" />
                  CLASS OF {athlete.gradYear}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white font-sans flex items-center gap-2">
                <span>{athlete.displayName}</span>
                {(athlete.isVerified ?? true) && <VerifiedBadge size="md" showLabel />}
                <span className="text-[#E5B868] drop-shadow-[0_0_10px_#E5B868]">.</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">{athlete.position} • {athlete.highSchool} ({athlete.state})</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => generateAthletePdf(athlete)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border border-[#E5B868]/50 bg-black/80 hover:bg-black/90 text-white transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.2)] hover:border-[#E5B868] cursor-pointer"
              title="Download official PDF recruiting sheet"
            >
              <Download className="w-4 h-4 text-[#E5B868]" />
              <span>RECRUITING SHEET (PDF)</span>
            </button>

            <button
              onClick={() => onToggleBookmark(athlete.uid)}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-[#E5B868]'
              }`}
            >
              <Bookmark className={`w-4 h-4 stroke-[2] ${isBookmarked ? 'text-amber-400' : ''}`} />
              <span>{isBookmarked ? 'SAVED' : 'BOOKMARK'}</span>
            </button>

            <Link
              to={`/athlete/${athlete.uid}`}
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 bg-slate-800 hover:bg-slate-700 text-white transition-all flex items-center justify-center gap-2 hover:border-[#E5B868] cursor-pointer"
              title="Open full standalone URL profile page"
            >
              <ExternalLink className="w-4 h-4 text-[#E5B868]" />
              <span>FULL DEEP LINK PAGE</span>
            </Link>

            <a
              href={`mailto:${athlete.email}?subject=Recruiting Inquiry - Just1Play Matrix&body=Hi ${athlete.displayName}, I came across your profile on Just1Play...`}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(214,28,36,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>CONTACT ATHLETE</span>
            </a>
          </div>
        </div>

        {/* Modal Stats & Vitals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-slate-400 uppercase">Height / Weight</p>
            <p className="text-sm font-mono font-black text-white mt-0.5">{athlete.height} / {athlete.weight}</p>
          </div>
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-slate-400 uppercase">Academic GPA</p>
            <p className="text-sm font-mono font-black text-[#E5B868] mt-0.5">{athlete.gpa} GPA</p>
          </div>
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-slate-400 uppercase">High School State</p>
            <p className="text-sm font-mono font-black text-white mt-0.5">{athlete.state}</p>
          </div>
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-slate-400 uppercase">Primary Position</p>
            <p className="text-sm font-mono font-black text-white mt-0.5">{athlete.position}</p>
          </div>
        </div>

        {/* Detailed Season Performance Breakdown */}
        <div className="mb-6 bg-white/5 p-4 rounded-3xl border border-white/10">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#E5B868] mb-3 flex items-center gap-1.5">
            <Activity className="w-4 h-4" />
            Verified {athlete.sport} Season Metrics
          </h4>

          {athlete.sport === 'Basketball' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">PPG</span>
                <span className="text-lg font-black font-mono text-[#E5B868]">{stats.points || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">RPG</span>
                <span className="text-lg font-black font-mono text-white">{stats.rebounds || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">APG</span>
                <span className="text-lg font-black font-mono text-white">{stats.assists || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">SPG</span>
                <span className="text-lg font-black font-mono text-white">{stats.steals || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">BPG</span>
                <span className="text-lg font-black font-mono text-white">{stats.blocks || 0}</span>
              </div>
            </div>
          )}

          {athlete.sport === 'Flag Football' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Pass Yds</span>
                <span className="text-lg font-black font-mono text-[#E5B868]">{stats.passingYards || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Rush Yds</span>
                <span className="text-lg font-black font-mono text-white">{stats.rushingYards || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Receptions</span>
                <span className="text-lg font-black font-mono text-white">{stats.receptions || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Flag Pulls</span>
                <span className="text-lg font-black font-mono text-white">{stats.flagPulls || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Interceptions</span>
                <span className="text-lg font-black font-mono text-white">{stats.interceptions || 0}</span>
              </div>
            </div>
          )}

          {athlete.sport === 'Lacrosse' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Goals</span>
                <span className="text-lg font-black font-mono text-[#E5B868]">{stats.goals || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Assists</span>
                <span className="text-lg font-black font-mono text-white">{stats.assists || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Ground Balls</span>
                <span className="text-lg font-black font-mono text-white">{stats.groundBalls || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Draw Controls</span>
                <span className="text-lg font-black font-mono text-white">{stats.drawControls || 0}</span>
              </div>
              <div className="bg-[#212A31] p-2.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Caused TOs</span>
                <span className="text-lg font-black font-mono text-white">{stats.causedTurnovers || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Verified Game-by-Game Stat Logs */}
        <div className="mb-6 bg-white/5 p-4 rounded-3xl border border-white/10">
          <AthleteGameLogsView
            athlete={athlete}
            canEdit={false}
            onUpdateGameLogs={() => {}}
          />
        </div>

        {/* Video Highlights Embedded Section */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#E5B868] mb-3">
            Embedded Media & Film Reels ({athlete.mediaUrls?.length || 0})
          </h4>
          <AthleteMediaSection
            mediaUrls={athlete.mediaUrls || []}
            onAddVideo={() => {}}
            onDeleteVideo={() => {}}
            isOwner={false}
          />
        </div>
      </div>
    </div>
  );
};
