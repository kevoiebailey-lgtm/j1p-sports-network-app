import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  FileText, 
  Camera, 
  Download, 
  Sparkles, 
  Play, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Share2, 
  Lock, 
  Layers, 
  Flame, 
  Activity,
  ArrowRight,
  Info,
  Check,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  EventItem, 
  TournamentDivision, 
  TeamItem, 
  GameItem, 
  StandingItem, 
  RosterPlayer,
  PlayerVerificationBadge 
} from '../../types';
import { DocumentVerificationModal } from './DocumentVerificationModal';
import { PaymentStatusAlert } from '../PaymentStatusAlert';
import { TournamentCheckoutModal } from './TournamentCheckoutModal';

export const EventClubhouse: React.FC<{ eventIdProp?: string }> = ({ eventIdProp }) => {
  const { id } = useParams<{ id: string }>();
  const eventId = eventIdProp || id || 'evt-demo';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'standings' | 'brackets' | 'matrix' | 'media'>('overview');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState<boolean>(false);

  // OCR Verification Modal State
  const [ocrModalOpen, setOcrModalOpen] = useState<boolean>(false);
  const [selectedPlayerForOcr, setSelectedPlayerForOcr] = useState<RosterPlayer | null>(null);
  const [ocrTargetDivision, setOcrTargetDivision] = useState<string>('12U');

  // Event State
  const [eventData, setEventData] = useState<EventItem>({
    id: eventId,
    title: 'Tri-State Elite 7v7 National Shootout',
    name: 'Tri-State Elite 7v7 National Shootout',
    sport: '7v7 Football',
    eventType: 'Tournament',
    date: '2026-08-22',
    startDate: '2026-08-22',
    endDate: '2026-08-23',
    time: '08:00 AM',
    location: 'MetLife Sports Complex, East Rutherford, NJ',
    state: 'NJ',
    description: 'The premier East Coast showcase tournament featuring elite 7v7 squads, official college scouts, multi-camera live streams, and automated AI game recaps.',
    organizer: 'Just1Play Sports Network',
    creatorUid: 'admin',
    capacity: 240,
    maxTeams: 32,
    registeredCount: 26,
    price: 350,
    teamFee: 350,
    depositAmount: 100,
    divisions: ['10U Girls', '12U Pro', '14U Elite', 'High School Varsity'],
    divisionConfigs: [
      { id: 'd1', name: '10U Girls', minAge: 8, maxAge: 10, maxTeams: 8, teamFee: 250, depositAmount: 75, registeredTeamCount: 6 },
      { id: 'd2', name: '12U Pro', minAge: 10, maxAge: 12, maxTeams: 8, teamFee: 300, depositAmount: 100, registeredTeamCount: 8 },
      { id: 'd3', name: '14U Elite', minAge: 12, maxAge: 14, maxTeams: 8, teamFee: 350, depositAmount: 100, registeredTeamCount: 8 },
      { id: 'd4', name: 'High School Varsity', minAge: 14, maxAge: 18, maxTeams: 8, teamFee: 400, depositAmount: 150, registeredTeamCount: 4 }
    ],
    venueDetails: {
      facilityName: 'MetLife Practice Complex',
      address: '102 Route 120, East Rutherford, NJ 07073',
      city: 'East Rutherford',
      state: 'NJ',
      zip: '07073',
      fieldsCount: 4,
      subLocations: ['Field 1 (Turf Championship)', 'Field 2 (Turf)', 'Field 3', 'Field 4'],
      gateFeeInfo: '$10 Adults / Kids Under 10 Free',
      parkingNotes: 'Free parking in Lot 3. No open flame grills.',
      rules: [
        'Mouthpieces mandatory during all match play',
        'Molded rubber or turf cleats only (no metal studs)',
        'Softshell helmets required for all 7v7 play',
        'Respect all referee rulings immediately'
      ]
    },
    waiverConfig: {
      verificationLevel: 'verified_ocr',
      waiverTemplate: 'Standard Just1Play Participant Waiver',
      concussionProtocolRequired: true,
      photoReleaseConsent: true
    },
    status: 'Upcoming',
    bannerUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1600',
    isFeatured: true,
    registeredUserIds: []
  });

  // Teams State
  const [teams, setTeams] = useState<TeamItem[]>([
    {
      id: 'tm-1',
      eventId,
      division: '14U Elite',
      teamName: 'NJ Lightning Elite',
      coachId: 'c1',
      coachName: 'Marcus Vance',
      coachEmail: 'marcus@njlightning.com',
      coachPhone: '555-0182',
      seed: 1,
      paymentStatus: 'Paid',
      roster: ['p1', 'p2', 'p3'],
      rosterPlayers: [
        { athleteUid: 'p1', athleteName: 'Camren Harris', jerseyNumber: '1', position: 'QB', dob: '2012-04-10', verificationStatus: 'OCR Verified', waiverSigned: true },
        { athleteUid: 'p2', athleteName: 'Trevor Allen', jerseyNumber: '7', position: 'WR', dob: '2012-08-15', verificationStatus: 'OCR Verified', waiverSigned: true },
        { athleteUid: 'p3', athleteName: 'Malik Jenkins', jerseyNumber: '24', position: 'DB', dob: '2012-11-02', verificationStatus: 'Pending Waiver', waiverSigned: false }
      ]
    },
    {
      id: 'tm-2',
      eventId,
      division: '14U Elite',
      teamName: 'Philly Pride Select',
      coachId: 'c2',
      coachName: 'David Sterling',
      coachEmail: 'david@phillypride.com',
      coachPhone: '555-0193',
      seed: 2,
      paymentStatus: 'Paid',
      roster: ['p4', 'p5'],
      rosterPlayers: [
        { athleteUid: 'p4', athleteName: 'Jaden Ortiz', jerseyNumber: '3', position: 'WR', dob: '2012-05-20', verificationStatus: 'OCR Verified', waiverSigned: true },
        { athleteUid: 'p5', athleteName: 'Noah Washington', jerseyNumber: '11', position: 'DB', dob: '2012-09-14', verificationStatus: 'Verified', waiverSigned: true }
      ]
    },
    {
      id: 'tm-3',
      eventId,
      division: '14U Elite',
      teamName: 'NYC Titans 7v7',
      coachId: 'c3',
      coachName: 'Anthony Rossi',
      seed: 3,
      paymentStatus: 'Deposit Paid',
      roster: ['p6'],
      rosterPlayers: [
        { athleteUid: 'p6', athleteName: 'Dominic Cruz', jerseyNumber: '5', position: 'ATH', dob: '2012-07-08', verificationStatus: 'OCR Verified', waiverSigned: true }
      ]
    },
    {
      id: 'tm-4',
      eventId,
      division: '14U Elite',
      teamName: 'Tri-State Ravens',
      coachId: 'c4',
      coachName: 'Tyrone King',
      seed: 4,
      paymentStatus: 'Paid',
      roster: ['p7'],
      rosterPlayers: [
        { athleteUid: 'p7', athleteName: 'Xavier Brooks', jerseyNumber: '10', position: 'QB', dob: '2012-02-18', verificationStatus: 'Verified', waiverSigned: true }
      ]
    }
  ]);

  // Standings State
  const [standings, setStandings] = useState<StandingItem[]>([
    { teamId: 'tm-1', teamName: 'NJ Lightning Elite', division: '14U Elite', played: 3, wins: 3, losses: 0, ties: 0, pointsFor: 84, pointsAgainst: 42, pointsDiff: 21, streak: '3W' },
    { teamId: 'tm-2', teamName: 'Philly Pride Select', division: '14U Elite', played: 3, wins: 2, losses: 1, ties: 0, pointsFor: 68, pointsAgainst: 54, pointsDiff: 14, streak: '1W' },
    { teamId: 'tm-3', teamName: 'NYC Titans 7v7', division: '14U Elite', played: 3, wins: 1, losses: 2, ties: 0, pointsFor: 52, pointsAgainst: 66, pointsDiff: -14, streak: '1L' },
    { teamId: 'tm-4', teamName: 'Tri-State Ravens', division: '14U Elite', played: 3, wins: 0, losses: 3, ties: 0, pointsFor: 38, pointsAgainst: 80, pointsDiff: -21, streak: '3L' }
  ]);

  // Games State
  const [games, setGames] = useState<GameItem[]>([
    {
      id: 'gm-101',
      eventId,
      division: '14U Elite',
      teamA_Id: 'tm-1',
      teamA_Name: 'NJ Lightning Elite',
      teamB_Id: 'tm-2',
      teamB_Name: 'Philly Pride Select',
      teamA_Score: 28,
      teamB_Score: 21,
      gameType: 'Bracket',
      round: 'Semifinals',
      bracketSlot: 'W-SF-1',
      matchNumber: 1,
      startTime: '10:00 AM',
      courtOrField: 'Field 1 (Turf Championship)',
      status: 'Final',
      period: 'Final',
      winnerId: 'tm-1',
      recap: 'NJ Lightning held off a clutch 4th quarter drive to win 28-21.',
      mvpPlayer: 'Camren Harris (3 Passing TDs)'
    },
    {
      id: 'gm-102',
      eventId,
      division: '14U Elite',
      teamA_Id: 'tm-3',
      teamA_Name: 'NYC Titans 7v7',
      teamB_Id: 'tm-4',
      teamB_Name: 'Tri-State Ravens',
      teamA_Score: 18,
      teamB_Score: 14,
      gameType: 'Bracket',
      round: 'Semifinals',
      bracketSlot: 'W-SF-2',
      matchNumber: 2,
      startTime: '10:00 AM',
      courtOrField: 'Field 2 (Turf)',
      status: 'In Progress',
      period: '2nd Half',
      gameClock: '06:15'
    },
    {
      id: 'gm-103',
      eventId,
      division: '14U Elite',
      teamA_Id: 'tm-1',
      teamA_Name: 'NJ Lightning Elite',
      teamB_Id: 'tbd',
      teamB_Name: 'Winner SF 2',
      teamA_Score: 0,
      teamB_Score: 0,
      gameType: 'Bracket',
      round: 'Championship',
      bracketSlot: 'W-CHAMP',
      matchNumber: 3,
      startTime: '01:00 PM',
      courtOrField: 'Field 1 (Turf Championship)',
      status: 'Scheduled'
    }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Check Registration URL parameters
  useEffect(() => {
    if (searchParams.get('registration') === 'success') {
      const newTeamName = searchParams.get('teamName') || 'Registered Team';
      const divName = searchParams.get('division') || '14U Elite';
      const status = (searchParams.get('status') || 'Paid') as any;

      showToast(`Success! ${newTeamName} registered for ${divName} (${status}).`);
    }
  }, [searchParams]);

  // Load Event from Firestore
  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        if (db && eventId) {
          const snap = await getDoc(doc(db, 'events', eventId));
          if (snap.exists()) {
            setEventData({ id: snap.id, ...snap.data() } as EventItem);
          }
        }
      } catch (err) {
        console.warn('Error loading event from firestore:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleOpenOcrForPlayer = (player: RosterPlayer, divName: string) => {
    setSelectedPlayerForOcr(player);
    setOcrTargetDivision(divName);
    setOcrModalOpen(true);
  };

  const handleOcrComplete = (updatedPlayer: RosterPlayer, badge: PlayerVerificationBadge) => {
    setTeams(prev => prev.map(t => {
      const updatedRoster = (t.rosterPlayers || []).map(p => 
        p.athleteUid === updatedPlayer.athleteUid ? updatedPlayer : p
      );
      return { ...t, rosterPlayers: updatedRoster };
    }));
    showToast(`OCR Verification complete for ${updatedPlayer.athleteName} (${badge})`);
  };

  return (
    <div className="min-h-screen bg-[#080B0E] text-slate-100 font-sans pb-24 selection:bg-[#E5B868] selection:text-black">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 py-3 px-5 rounded-2xl bg-[#E5B868] text-slate-950 font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
        <img
          src={eventData.bannerUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1600'}
          alt="Event Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080B0E] via-[#080B0E]/60 to-transparent"></div>

        <div className="absolute bottom-6 left-4 right-4 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#E5B868] text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
                {eventData.sport}
              </span>
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-bold">
                {eventData.divisionConfigs?.length || eventData.divisions?.length || 4} Divisions
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                {eventData.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wide">
              {eventData.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#E5B868]" />
                {eventData.startDate || eventData.date} to {eventData.endDate || eventData.date}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#E5B868]" />
                {eventData.venueDetails?.facilityName || eventData.location}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowRegModal(true);
              }}
              className="py-3 px-6 rounded-2xl bg-[#E5B868] hover:bg-[#d4a34f] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(229,184,104,0.4)] cursor-pointer transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Register Team</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation Bar */}
      <div className="sticky top-0 z-30 bg-[#121820]/95 backdrop-blur-xl border-y border-white/10 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none py-2 gap-2">
          {[
            { id: 'overview', label: '1. Overview & Logistics', icon: Info },
            { id: 'teams', label: '2. Divisions & Teams', icon: Users },
            { id: 'standings', label: '3. Pool Standings', icon: Trophy },
            { id: 'brackets', label: '4. Dynamic Brackets', icon: Layers },
            { id: 'matrix', label: '5. Field Matrix Radar', icon: Activity },
            { id: 'media', label: '6. Media & Scouting', icon: Camera }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E5B868] text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Payment Confirmation / Cancellation Alert Banner */}
        <PaymentStatusAlert />
        
        {/* TAB 1: OVERVIEW & LOGISTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Event Description & Registration Progress Bar */}
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide">
                    Tournament Overview &amp; Format
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {eventData.description}
                  </p>
                </div>

                {/* Team Capacity Gauge */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 min-w-[240px] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400 uppercase">Registration Capacity</span>
                    <span className="font-mono font-bold text-[#E5B868]">
                      {eventData.registeredCount} / {eventData.maxTeams} Teams
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#E5B868] to-emerald-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((eventData.registeredCount || 0) / (eventData.maxTeams || 32)) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Registration Closes: {eventData.registrationCutoffDate || 'August 18, 2026'}
                  </p>
                </div>
              </div>

              {/* Venue & Rules Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                
                {/* Facility Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-[#E5B868] uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Facility &amp; Parking Logistics
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">Location</span>
                      <span className="text-white font-medium">{eventData.venueDetails?.address || eventData.location}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">Gate Fee</span>
                      <span className="text-white font-medium">{eventData.venueDetails?.gateFeeInfo || '$10 Day Pass / Kids Free'}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">Parking Notes</span>
                      <span className="text-white font-medium">{eventData.venueDetails?.parkingNotes || 'Free parking available in main lots.'}</span>
                    </div>
                  </div>
                </div>

                {/* Tournament Rules */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Equipment &amp; Field Rules
                  </h4>

                  <div className="space-y-2">
                    {(eventData.venueDetails?.rules || [
                      'Mouthpieces mandatory for all athletes during play',
                      'Turf or rubber molded cleats only (no metal spikes)',
                      'Softshell helmets required for 7v7 play',
                      'Zero tolerance policy for official harassment'
                    ]).map((r, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIVISIONS & TEAMS */}
        {activeTab === 'teams' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Division Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
              {['All', ...(eventData.divisions || ['10U Girls', '12U Pro', '14U Elite', 'High School Varsity'])].map((div) => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedDivision === div
                      ? 'bg-[#E5B868] text-slate-950 font-black shadow-md'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((t) => (
                <div 
                  key={t.id}
                  className="p-6 rounded-3xl bg-[#121820] border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#E5B868]/20 text-[#E5B868] font-black text-sm flex items-center justify-center border border-[#E5B868]/40 font-mono">
                        #{t.seed || 1}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">{t.teamName}</h4>
                        <p className="text-xs text-slate-400 font-mono">
                          Coach: {t.coachName} • {t.division}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                      t.paymentStatus === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {t.paymentStatus}
                    </span>
                  </div>

                  {/* Roster Athletes & Verification Badges */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">
                        Roster Athletes ({t.rosterPlayers?.length || 0})
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {t.rosterPlayers?.map((player) => (
                        <div 
                          key={player.athleteUid}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-slate-800 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                              #{player.jerseyNumber || '00'}
                            </span>
                            <span className="font-bold text-white">{player.athleteName}</span>
                            <span className="text-slate-500 font-mono text-[10px]">({player.position})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              player.verificationStatus === 'OCR Verified' || player.verificationStatus === 'Verified'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}>
                              {player.verificationStatus}
                            </span>

                            {player.verificationStatus !== 'OCR Verified' && (
                              <button
                                onClick={() => handleOpenOcrForPlayer(player, t.division)}
                                className="p-1 rounded bg-[#E5B868]/20 hover:bg-[#E5B868]/30 text-[#E5B868] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Run Gemini Multimodal OCR Document Verification"
                              >
                                <Sparkles className="w-3 h-3" /> OCR Verify
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: POOL PLAY & STANDINGS */}
        {activeTab === 'standings' && (
          <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  Division Standings &amp; Tiebreakers
                </h3>
                <p className="text-xs text-slate-400">
                  Automated tiebreaker calculations: Head-to-Head, Differential (max ±21 per game), Points Against.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                    <th className="py-3 px-4">Rank &amp; Team</th>
                    <th className="py-3 px-3">Division</th>
                    <th className="py-3 px-3 text-center">W-L-T</th>
                    <th className="py-3 px-3 text-center">PF</th>
                    <th className="py-3 px-3 text-center">PA</th>
                    <th className="py-3 px-3 text-center">DIFF (±21)</th>
                    <th className="py-3 px-3 text-center">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {standings.map((s, idx) => (
                    <tr key={s.teamId} className="hover:bg-white/5">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center ${
                          idx === 0 ? 'bg-[#E5B868] text-slate-950' : 'bg-white/5 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-white font-sans">{s.teamName}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{s.division}</td>
                      <td className="py-3 px-3 text-center font-bold text-white">{s.wins}-{s.losses}-{s.ties}</td>
                      <td className="py-3 px-3 text-center text-emerald-400">{s.pointsFor}</td>
                      <td className="py-3 px-3 text-center text-rose-400">{s.pointsAgainst}</td>
                      <td className="py-3 px-3 text-center font-bold text-[#E5B868]">
                        {s.pointsDiff > 0 ? `+${s.pointsDiff}` : s.pointsDiff}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-emerald-400">
                          {s.streak}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INTERACTIVE DYNAMIC BRACKETS */}
        {activeTab === 'brackets' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#E5B868]" />
                    Interactive Single-Elimination Bracket
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live match pulse indicators with automatic winner advancement.
                  </p>
                </div>
              </div>

              {/* Bracket Tree Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                
                {/* Semifinals Column */}
                <div className="space-y-6">
                  <span className="text-xs font-black uppercase text-[#E5B868] tracking-wider block">
                    Round: Semifinals
                  </span>

                  {games.filter(g => g.round === 'Semifinals').map((m) => (
                    <div 
                      key={m.id}
                      className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-[#E5B868]/50 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[#E5B868] font-bold">{m.startTime} • {m.courtOrField}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          m.status === 'Final' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                        }`}>
                          {m.status}
                        </span>
                      </div>

                      {/* Team A */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                        <span className="text-xs font-black text-white truncate">{m.teamA_Name}</span>
                        <span className="font-mono text-sm font-black text-white">{m.teamA_Score}</span>
                      </div>

                      {/* Team B */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                        <span className="text-xs font-black text-white truncate">{m.teamB_Name}</span>
                        <span className="font-mono text-sm font-black text-white">{m.teamB_Score}</span>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => navigate(`/referee/${m.id}`)}
                          className="text-[10px] font-bold uppercase text-[#E5B868] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Official Scorekeeper <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Championship Column */}
                <div className="space-y-6">
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider block">
                    Round: Championship Final
                  </span>

                  {games.filter(g => g.round === 'Championship').map((m) => (
                    <div 
                      key={m.id}
                      className="p-5 rounded-2xl bg-[#151D26] border-2 border-[#E5B868] shadow-[0_0_25px_rgba(229,184,104,0.2)] space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[#E5B868] font-bold">{m.startTime} • {m.courtOrField}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                          {m.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                        <span className="text-xs font-black text-white">{m.teamA_Name}</span>
                        <span className="font-mono text-base font-black text-[#E5B868]">{m.teamA_Score}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                        <span className="text-xs font-black text-white">{m.teamB_Name}</span>
                        <span className="font-mono text-base font-black text-[#E5B868]">{m.teamB_Score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LIVE FIELD MATRIX (GAME-DAY RADAR) */}
        {activeTab === 'matrix' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#E5B868]" />
                    Real-Time Field Matrix Radar
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live schedule overview mapping current, next, and on-deck matchups across all tournament fields.
                  </p>
                </div>
              </div>

              {/* Grid of Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(eventData.venueDetails?.subLocations || ['Field 1 (Turf Championship)', 'Field 2 (Turf)', 'Field 3', 'Field 4']).map((fieldName, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-black text-white truncate">{fieldName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>

                    {/* Current Game */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[9px] font-mono uppercase font-bold text-[#E5B868]">LIVE NOW</span>
                      <p className="text-xs font-black text-white">NJ Lightning vs Philly Pride</p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                        <span>Score: 28 - 21</span>
                        <span className="text-emerald-400">Final</span>
                      </div>
                    </div>

                    {/* Next Game */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <span className="text-[9px] font-mono uppercase font-bold text-slate-400">NEXT UP (11:30 AM)</span>
                      <p className="text-xs font-medium text-slate-200">NYC Titans vs Tri-State Ravens</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EVENT MEDIA & SCOUTING SHOWCASE */}
        {activeTab === 'media' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#121820] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#E5B868]" />
                    Scouting Media &amp; High-Res Gallery
                  </h3>
                  <p className="text-xs text-slate-400">
                    Watermarked media downloads, scout takeaways, and Gemini AI game stories.
                  </p>
                </div>
              </div>

              {/* Photo Gallery Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { img: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=80&w=800', title: 'Camren Harris 40-yd Bomb', price: '$9.99' },
                  { img: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&q=80&w=800', title: 'Goal-Line Interception', price: '$9.99' },
                  { img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800', title: 'Championship Trophy Celebration', price: '$9.99' }
                ].map((item, idx) => (
                  <div key={idx} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-lg">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                      <p className="text-xs font-black text-white">{item.title}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-mono text-[#E5B868] font-bold">{item.price}</span>
                        <button
                          onClick={() => showToast(`Purchased digital high-res download for ${item.title}`)}
                          className="py-1 px-2.5 rounded-lg bg-[#E5B868] text-slate-950 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Buy Photo
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Team Registration & Stripe Checkout Modal */}
      {showRegModal && (
        <TournamentCheckoutModal
          isOpen={showRegModal}
          onClose={() => setShowRegModal(false)}
          eventId={eventData.id}
          eventTitle={eventData.title}
          organizerStripeAccountId={(eventData as any).organizerStripeAccountId || (eventData as any).organizerAccountId}
          divisions={
            eventData.divisionConfigs && eventData.divisionConfigs.length > 0
              ? eventData.divisionConfigs.map((d: any) => ({
                  id: d.id || d.name,
                  name: d.name,
                  entryFee: d.teamFee || 350,
                  maxTeams: d.maxTeams || 16,
                }))
              : (eventData.divisions || ['10U Girls', '12U Pro', '14U Elite', 'High School Varsity']).map(name => ({
                  id: name,
                  name,
                  entryFee: 350,
                  maxTeams: 16,
                }))
          }
          defaultEntryFee={350.0}
          onSuccess={() => {
            setShowRegModal(false);
          }}
        />
      )}

      {/* OCR Document Verification Modal */}
      <DocumentVerificationModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        player={selectedPlayerForOcr}
        divisionName={ocrTargetDivision}
        maxAge={ocrTargetDivision.includes('10U') ? 10 : (ocrTargetDivision.includes('12U') ? 12 : 14)}
        eventStartDate={eventData.startDate || '2026-08-22'}
        onVerificationComplete={handleOcrComplete}
      />
    </div>
  );
};
