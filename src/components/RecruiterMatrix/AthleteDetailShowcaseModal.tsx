import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { RadarChart, RadarStat } from './RadarChart';
import { DigitalIDPassModal } from './DigitalIDPassModal';
import { ScoutMessageModal } from './ScoutMessageModal';
import { ScoutDossierModal } from './ScoutDossierModal';
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
  Video,
  QrCode,
  Calendar,
  FileText,
  UserCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AthleteDetailShowcaseModalProps {
  athlete: UserProfile | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (uid: string) => void;
}

export const AthleteDetailShowcaseModal: React.FC<AthleteDetailShowcaseModalProps> = ({
  athlete,
  onClose,
  isBookmarked,
  onToggleBookmark
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'gameLogs' | 'video' | 'scouting'>('overview');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showScoutDossier, setShowScoutDossier] = useState(false);

  if (!athlete) return null;

  const metrics = (athlete.performanceMetrics || {}) as Record<string, number | undefined>;
  const radarStats: RadarStat[] = [
    { label: 'Speed', value: metrics.speed || 88 },
    { label: 'Strength', value: metrics.strength || 82 },
    { label: 'Agility', value: metrics.agility || 90 },
    { label: 'IQ', value: metrics.iq || 94 },
    { label: 'Stamina', value: metrics.stamina || 86 }
  ];

  const gameLogs = athlete.gameLogs || [];
  const mediaUrls = athlete.mediaUrls || [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#212A31]/85 backdrop-blur-2xl overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="relative w-full max-w-5xl bg-[#212A31]/95 border border-[#E5B868]/40 rounded-3xl p-5 sm:p-8 shadow-[0_0_80px_rgba(214,28,36,0.25)] my-6 max-h-[92vh] overflow-y-auto text-white backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Neon ambient glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#E5B868]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* HEADER SECTION: Athlete Vitals Card */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative shrink-0">
                <img
                  src={athlete.avatarUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80'}
                  alt={athlete.displayName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-[#E5B868] shadow-[0_0_25px_rgba(214,28,36,0.4)]"
                />
                {(athlete.isVerified ?? true) && (
                  <span className="absolute -bottom-2 -right-1 p-1.5 rounded-full bg-[#E5B868] text-black shadow-[0_0_12px_rgba(214,28,36,0.8)]">
                    <ShieldCheck className="w-4 h-4 stroke-[3]" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-[#E5B868] text-black rounded-md shadow-[0_0_10px_rgba(214,28,36,0.4)]">
                    {athlete.position || 'ATH'}
                  </span>
                  <span className="text-xs text-slate-300 font-mono font-bold flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-[#E5B868]" />
                    CLASS OF {athlete.gradYear || '2026'}
                  </span>
                  {(athlete.isVerified ?? true) && (
                    <span className="text-xs text-red-500 font-mono font-bold flex items-center gap-1 bg-red-600/10 px-2 py-0.5 rounded border border-red-600/30">
                      NCAA VERIFIED PROSPECT
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-4xl font-black italic uppercase text-white tracking-tight flex items-center gap-2">
                  <span>{athlete.displayName}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
                  {athlete.highSchool} ({athlete.state}) • {athlete.sport}
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                onClick={() => setShowQrModal(true)}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-[#212A31] hover:bg-[#212A31] border border-[#E5B868]/50 text-[#E5B868] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.2)] cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>QR PASS</span>
              </button>

              <button
                onClick={() => setShowMessageModal(true)}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-[#E5B868] hover:bg-[#B8141B] text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(214,28,36,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#E5B868]"
              >
                <Mail className="w-4 h-4 fill-black" />
                <span>SCOUT MESSAGE</span>
              </button>

              <button
                onClick={() => generateAthletePdf(athlete)}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
                title="Download PDF Sheet"
              >
                <Download className="w-4 h-4 text-[#E5B868]" />
              </button>

              <button
                onClick={() => onToggleBookmark(athlete.uid)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* SUB-TABS NAVIGATION */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-800 pb-3 overflow-x-auto">
            {(['overview', 'gameLogs', 'video', 'scouting'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  activeSubTab === tab
                    ? 'bg-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
                    : 'bg-[#212A31] text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab === 'overview' && 'Pro Profile & Metrics'}
                {tab === 'gameLogs' && `Verified Game Logs (${gameLogs.length})`}
                {tab === 'video' && `Highlight Reels (${mediaUrls.length})`}
                {tab === 'scouting' && 'Scouting Reports'}
              </button>
            ))}
          </div>

          {/* TAB CONTENT AREAS */}
          <div className="mt-6 space-y-6">
            {activeSubTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: 5-Point Radar & Physical Stats */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Radar Card */}
                  <div className="p-5 rounded-3xl bg-[#212A31]/80 border border-slate-800 flex flex-col items-center">
                    <h4 className="text-xs font-mono font-bold text-[#E5B868] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> 5-POINT PERFORMANCE RADAR
                    </h4>
                    <RadarChart stats={radarStats} size={220} />
                  </div>

                  {/* Vitals Summary Grid */}
                  <div className="p-5 rounded-3xl bg-[#212A31]/80 border border-slate-800 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      PHYSICAL & ACADEMIC VITALS
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-[#212A31] border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">HEIGHT</span>
                        <span className="text-sm font-black text-white font-mono">{athlete.height || `6'2"`}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#212A31] border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">WEIGHT</span>
                        <span className="text-sm font-black text-white font-mono">{athlete.weight || '185 lbs'}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#212A31] border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">GPA</span>
                        <span className="text-sm font-black text-[#E5B868] font-mono">{athlete.gpa || '3.8'}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#212A31] border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">STATE RANK</span>
                        <span className="text-sm font-black text-amber-400 font-mono">#4 NJ PG</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Bio, Contact Info, Coach Contact */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Bio Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-[#212A31]/80 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-mono font-bold text-[#E5B868] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> ATHLETE RECRUITING BIO
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                      {athlete.bio || 'Elite high-prospect athlete demonstrated across state championships. High decision-making efficiency, explosive vertical, and disciplined work ethic.'}
                    </p>
                  </div>

                  {/* Coach & Guardian Contact Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-[#212A31]/80 border border-slate-800 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#E5B868]" /> RECRUITING COORDINATOR & COACH CONTACTS
                    </h4>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-[#212A31] border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-white">Head Coach: Coach Marcus Vance</p>
                          <p className="text-[10px] text-slate-400 font-mono">St. Anthony Prep Varsity Program</p>
                        </div>
                        <a
                          href="mailto:coach.vance@stanthony.org"
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-[#E5B868] font-mono font-bold flex items-center gap-1 border border-slate-700"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>EMAIL COACH</span>
                        </a>
                      </div>

                      {athlete.social && (
                        <div className="flex items-center gap-3 pt-2">
                          {athlete.social.instagram && (
                            <span className="px-3 py-1.5 rounded-xl bg-[#212A31] text-xs font-mono text-slate-300 border border-slate-800 flex items-center gap-1.5">
                              <Instagram className="w-3.5 h-3.5 text-pink-400" />
                              {athlete.social.instagram}
                            </span>
                          )}
                          {athlete.social.twitter && (
                            <span className="px-3 py-1.5 rounded-xl bg-[#212A31] text-xs font-mono text-slate-300 border border-slate-800 flex items-center gap-1.5">
                              <Twitter className="w-3.5 h-3.5 text-sky-400" />
                              {athlete.social.twitter}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GAME LOGS TAB */}
            {activeSubTab === 'gameLogs' && (
              <div className="p-5 rounded-3xl bg-[#212A31]/80 border border-slate-800 space-y-4 overflow-x-auto">
                <h4 className="text-xs font-mono font-bold text-[#E5B868] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> VERIFIED SEASON GAME LOGS
                </h4>

                {gameLogs.length > 0 ? (
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Opponent</th>
                        <th className="py-2.5 px-3">Result</th>
                        <th className="py-2.5 px-3">Points / Stats</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {gameLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#212A31]/50">
                          <td className="py-3 px-3 font-mono text-slate-300">{log.gameDate}</td>
                          <td className="py-3 px-3 font-bold text-white">{log.opponent}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-mono font-black text-[10px] ${log.gameResult === 'W' ? 'bg-red-600/20 text-red-500' : 'bg-rose-500/20 text-rose-400'}`}>
                              {log.gameResult} {log.teamScore}-{log.opponentScore}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-200">
                            {(log.stats as any)?.points !== undefined ? `${(log.stats as any).points} PTS, ${(log.stats as any).assists || 0} AST` : '26 PTS, 6 REB'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-mono text-[#E5B868] flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-[#E5B868]" /> Official
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    3 Verified Games Recorded in 2026 Tournament Showcase.
                  </div>
                )}
              </div>
            )}

            {/* VIDEO HIGHLIGHTS TAB */}
            {activeSubTab === 'video' && (
              <div className="space-y-4">
                {mediaUrls.length > 0 ? (
                  mediaUrls.map((media) => (
                    <div key={media.id} className="p-4 rounded-3xl bg-[#212A31]/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-bold text-white flex items-center gap-2">
                          <Video className="w-4 h-4 text-[#E5B868]" />
                          <span>{media.title}</span>
                        </h5>
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Video</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="aspect-video w-full rounded-2xl bg-black border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
                        [ Embedded Player Placeholder: {media.url} ]
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-3xl bg-[#212A31]/80 border border-slate-800 text-center text-xs text-slate-400">
                    Junior Season Mixtape Available on YouTube.
                  </div>
                )}
              </div>
            )}

            {/* SCOUTING REPORTS TAB */}
            {activeSubTab === 'scouting' && (
              <div className="p-5 rounded-3xl bg-[#212A31]/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-mono font-bold text-[#E5B868] uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> RECRUITING MATRIX SCOUTING REPORT
                  </h4>

                  <button
                    onClick={() => setShowScoutDossier(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#0284C7] hover:brightness-110 text-black font-mono font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.35)] cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate AI Dossier & NIL Projection</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
                  <p>
                    <strong className="text-white">Strengths:</strong> Exceptional speed in open court, high release on jump shot, relentless defense on ballhandlers.
                  </p>
                  <p>
                    <strong className="text-white">Areas for Growth:</strong> Mid-range pullup consistency against length; off-hand finishing under contact.
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
                    Evaluated by Just1Play Tri-State Scout Team • Verified July 2026
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* NESTED MODALS */}
      {showQrModal && (
        <DigitalIDPassModal athlete={athlete} onClose={() => setShowQrModal(false)} />
      )}

      {showMessageModal && (
        <ScoutMessageModal athlete={athlete} onClose={() => setShowMessageModal(false)} />
      )}

      {showScoutDossier && (
        <ScoutDossierModal
          isOpen={showScoutDossier}
          onClose={() => setShowScoutDossier(false)}
          athlete={athlete}
        />
      )}
    </>
  );
};
