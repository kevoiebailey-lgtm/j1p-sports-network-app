import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Award, 
  Zap, 
  Search,
  GraduationCap, 
  Gauge, 
  Video, 
  Mail
} from 'lucide-react';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { SwipeableBottomSheet } from '../Common/SwipeableBottomSheet';

export interface ProspectProfile {
  id: string;
  name: string;
  avatarUrl: string;
  sport: string;
  position: string;
  school: string;
  classYear: string;
  gpa: number;
  height: string;
  weight: string;
  wingspan: string;
  dash40: string;
  vertical: string;
  bench: string;
  ncaaEligible: boolean;
  hudlTapeUrl?: string;
  scoringAvg?: string;
  scoutEvaluation?: string;
  recruiterNotes?: string[];
}

export const AthleteProfileMatrixView: React.FC<{ onNavigateTab?: (tab: any) => void }> = ({ onNavigateTab }) => {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProfile, setActiveProfile] = useState<ProspectProfile | null>(null);
  const [showContactSheet, setShowContactSheet] = useState<boolean>(false);

  // Sample Verified Recruits Data
  const prospects: ProspectProfile[] = [
    {
      id: 'p1',
      name: 'Jayden Carter',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      sport: 'Basketball',
      position: 'Point Guard',
      school: 'Nexus Prep Academy • NJ',
      classYear: 'Class of 2026',
      gpa: 3.80,
      height: '6\'3"',
      weight: '185 lbs',
      wingspan: '6\'7"',
      dash40: '4.42s',
      vertical: '38.5"',
      bench: '185 lbs x 8',
      ncaaEligible: true,
      hudlTapeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      scoringAvg: '28.4 PPG • 6.2 APG',
      scoutEvaluation: 'Lethal 3-point pull-up off the dribble with elite transition court vision. High-IQ floor general with Division I speed.',
      recruiterNotes: ['Reviewed by D1 Scouting Matrix', 'Hudl Tape Verified 2026', 'Official SAT Score On File']
    },
    {
      id: 'p2',
      name: 'Maya Sanchez',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      sport: "Girls' Flag Football",
      position: 'Quarterback',
      school: 'Metro Tech High • NJ',
      classYear: 'Class of 2027',
      gpa: 3.90,
      height: '5\'9"',
      weight: '145 lbs',
      wingspan: '5\'11"',
      dash40: '4.58s',
      vertical: '31.0"',
      bench: '125 lbs x 10',
      ncaaEligible: true,
      hudlTapeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      scoringAvg: '34 Pass TD • 128.5 Passer Rating',
      scoutEvaluation: 'Exceptional pocket poise with laser accuracy on deep seam routes. Dual-threat capability in red-zone rollouts.',
      recruiterNotes: ['Top Tri-State Flag Football Prospect', 'Gatorade Combine MVP']
    },
    {
      id: 'p3',
      name: 'Marcus Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      sport: 'Football',
      position: 'Wide Receiver',
      school: 'Bergen Catholic • NJ',
      classYear: 'Class of 2026',
      gpa: 3.65,
      height: '6\'2"',
      weight: '195 lbs',
      wingspan: '6\'5"',
      dash40: '4.38s',
      vertical: '39.0"',
      bench: '225 lbs x 12',
      ncaaEligible: true,
      hudlTapeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      scoringAvg: '14 Receiving TD • 1,120 YDS',
      scoutEvaluation: 'Explosive release off the line with elite catch radius and contested ball win rate.',
      recruiterNotes: ['4.38s Laser-Timed 40-Yard Dash', 'Verified Nike Combine Metrics']
    }
  ];

  const filteredProspects = prospects.filter(p => {
    const matchesSport = selectedSport === 'all' || p.sport === selectedSport;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.school.toLowerCase().includes(searchQuery.toLowerCase()) || p.position.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#212A31] text-white font-sans space-y-6 pb-32">
      
      {/* HEADER BAR */}
      <section className="bg-[#212A31]/90 border-b border-slate-800 p-4 sm:p-6 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="bg-[#E5B868]/20 text-[#E5B868] border border-[#E5B868]/40 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(214,28,36,0.2)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E5B868]" /> NCAA VERIFIED RECRUITING MATRIX
            </span>
            <span className="text-xs font-mono text-slate-400">
              1,200+ Division I, II & III Coaches Active
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-wide text-white">
            Scout Prospect Evaluation Hub
          </h1>

          {/* Search & Sport Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search athletes by name, school, position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#212A31] border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#E2E8F0] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
              {['all', 'Basketball', "Girls' Flag Football", 'Football'].map((sport) => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase whitespace-nowrap transition-all cursor-pointer ${
                    selectedSport === sport
                      ? 'bg-[#E2E8F0] text-white shadow-[0_0_12px_rgba(56,142,255,0.4)]'
                      : 'bg-[#212A31] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {sport === 'all' ? 'All Sports' : sport}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROSPECT CARDS GRID */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProspects.map((prospect) => (
          <div
            key={prospect.id}
            onClick={() => setActiveProfile(prospect)}
            className="bg-[#212A31]/90 border border-slate-800 hover:border-[#E5B868]/60 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl cursor-pointer group transition-all"
          >
            {/* Top Prospect Badge & Academic Status */}
            <div className="space-y-3">
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-3">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  {prospect.sport} • {prospect.position}
                </span>
                <span className="bg-[#E5B868]/15 text-[#E5B868] text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border border-[#E5B868]/30">
                  {prospect.classYear}
                </span>
              </div>

              {/* Avatar & Key Metadata */}
              <div className="flex items-center gap-3">
                <img
                  src={prospect.avatarUrl}
                  alt={prospect.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#E5B868] shadow-[0_0_12px_rgba(214,28,36,0.2)]"
                />
                <div>
                  <h3 className="text-base font-black uppercase text-white flex items-center gap-1.5 group-hover:text-[#E5B868] transition-colors">
                    <span>{prospect.name}</span>
                    <VerifiedBadge size="sm" />
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{prospect.school}</p>
                  <span className="text-[10px] text-[#E2E8F0] font-mono font-bold flex items-center gap-1 mt-0.5">
                    <GraduationCap className="w-3 h-3 text-[#E2E8F0]" />
                    <span>NCAA Eligible ({prospect.gpa.toFixed(2)} GPA)</span>
                  </span>
                </div>
              </div>

              {/* Physical Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                <div className="bg-[#212A31] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">40-YD DASH</span>
                  <span className="text-base font-black text-amber-400">{prospect.dash40}</span>
                </div>
                <div className="bg-[#212A31] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">VERTICAL JUMP</span>
                  <span className="text-base font-black text-[#E2E8F0]">{prospect.vertical}</span>
                </div>
                <div className="bg-[#212A31] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">HEIGHT / WEIGHT</span>
                  <span className="text-xs font-bold text-white">{prospect.height} • {prospect.weight}</span>
                </div>
                <div className="bg-[#212A31] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">WINGSPAN</span>
                  <span className="text-xs font-bold text-white">{prospect.wingspan}</span>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <button
              onClick={() => setActiveProfile(prospect)}
              className="w-full bg-[#212A31] hover:bg-[#E5B868] text-slate-300 hover:text-black font-mono font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all border border-slate-800 hover:border-[#E5B868] flex items-center justify-center gap-1.5"
            >
              <span>View Full Scout File &rarr;</span>
            </button>
          </div>
        ))}
      </div>

      {/* LEVEL 2: ATHLETE PROFILE SCOUT DRAWER */}
      <SwipeableBottomSheet
        isOpen={!!activeProfile}
        onClose={() => setActiveProfile(null)}
        title={activeProfile ? `${activeProfile.name} • ${activeProfile.classYear}` : 'Prospect File'}
      >
        {activeProfile && (
          <div className="space-y-6 font-mono text-xs">
            
            {/* Verified Header Header Card */}
            <div className="bg-[#212A31] p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeProfile.avatarUrl}
                  alt={activeProfile.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#E5B868]"
                />
                <div>
                  <h3 className="text-base font-black text-white uppercase flex items-center gap-1">
                    <span>{activeProfile.name}</span>
                    <VerifiedBadge size="sm" />
                  </h3>
                  <p className="text-[11px] text-slate-400">{activeProfile.school}</p>
                </div>
              </div>
              <span className="bg-[#E5B868]/15 text-[#E5B868] border border-[#E5B868]/30 text-[10px] font-bold px-2.5 py-1 rounded">
                NCAA ELIGIBLE
              </span>
            </div>

            {/* Verified Physical & Testing Radar Matrix */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#E2E8F0]" />
                <span>Verified Physical Combine Metrics</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#212A31] p-3 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">40-YD DASH</span>
                  <span className="text-sm font-black text-amber-400">{activeProfile.dash40}</span>
                </div>
                <div className="bg-[#212A31] p-3 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">VERTICAL</span>
                  <span className="text-sm font-black text-[#E2E8F0]">{activeProfile.vertical}</span>
                </div>
                <div className="bg-[#212A31] p-3 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">WINGSPAN</span>
                  <span className="text-xs font-bold text-white">{activeProfile.wingspan}</span>
                </div>
              </div>
            </div>

            {/* Embedded Hudl / YouTube Game Tape */}
            {activeProfile.hudlTapeUrl && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#E5B868]" />
                  <span>Verified Game Film Highlight</span>
                </h4>
                <div className="relative aspect-video w-full bg-[#212A31] rounded-2xl overflow-hidden border border-slate-800">
                  <iframe
                    src={activeProfile.hudlTapeUrl}
                    title={`${activeProfile.name} Game Film`}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Scout Evaluation Report */}
            {activeProfile.scoutEvaluation && (
              <div className="p-4 rounded-2xl bg-[#212A31] border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-[#E5B868] font-bold text-[11px]">
                  <Award className="w-4 h-4 text-[#E5B868]" />
                  <span>D1 SCOUT EVALUATION NOTES</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed font-sans">{activeProfile.scoutEvaluation}</p>
              </div>
            )}

            {/* Contact Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowContactSheet(true)}
                className="flex-1 bg-[#E5B868] hover:bg-[#B8141B] text-black font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(214,28,36,0.3)] flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-black fill-black" />
                <span>Contact High School Coach / Scout</span>
              </button>
            </div>

          </div>
        )}
      </SwipeableBottomSheet>

      {/* LEVEL 3: SCOUT DIRECT CONTACT FORM */}
      <SwipeableBottomSheet
        isOpen={showContactSheet}
        onClose={() => setShowContactSheet(false)}
        title="Official Scout Inquiry"
      >
        <div className="space-y-4 font-mono text-xs">
          <p className="text-slate-300 text-xs font-sans">
            Send an official recruiting inquiry or request transcript/Hudl access for <strong className="text-[#E5B868]">{activeProfile?.name}</strong>.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Scout / College Program Name</label>
              <input
                type="text"
                placeholder="e.g., Rutgers University Recruiting Staff"
                className="w-full bg-[#212A31] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E2E8F0]"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Official University Email</label>
              <input
                type="email"
                placeholder="scout@university.edu"
                className="w-full bg-[#212A31] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E2E8F0]"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Inquiry Message</label>
              <textarea
                rows={3}
                placeholder="Requesting official transcript and spring game schedule..."
                className="w-full bg-[#212A31] border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-[#E2E8F0]"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setShowContactSheet(false);
              setActiveProfile(null);
            }}
            className="w-full bg-[#E5B868] hover:bg-[#B8141B] text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,87,184,0.4)]"
          >
            Submit Official Inquiry &rarr;
          </button>
        </div>
      </SwipeableBottomSheet>

    </div>
  );
};
