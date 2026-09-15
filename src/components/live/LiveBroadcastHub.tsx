import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  increment,
  orderBy
} from 'firebase/firestore';
import { 
  Radio, 
  Tv, 
  Flame, 
  Share2, 
  Sparkles, 
  Trophy, 
  Clock, 
  Eye, 
  Smartphone, 
  Video, 
  ExternalLink, 
  Check, 
  X, 
  Plus, 
  Play, 
  Square, 
  Zap, 
  Layers, 
  ChevronRight, 
  ShieldCheck, 
  RefreshCw, 
  Maximize2, 
  HelpCircle,
  Film,
  Camera,
  Users
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_TOURNAMENT_GAMES, INITIAL_TOURNAMENT_DOC } from '../../lib/platformData';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

export interface LiveStreamDoc {
  id: string;
  isLive: boolean;
  platform: 'youtube' | 'twitch' | 'custom';
  streamUrl: string;
  embedUrl: string;
  title: string;
  matchup?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;
  period?: string;
  clock?: string;
  tournamentName?: string;
  gameId?: string;
  courtName?: string;
  broadcasterUid: string;
  broadcasterName: string;
  broadcasterRole?: string;
  broadcasterAvatar?: string;
  viewerCount: number;
  thumbnailUrl?: string;
  sport?: string;
  reactions?: {
    headTap?: number;
    saucy?: number;
    clamps?: number;
    cold?: number;
    dot?: number;
  };
  createdAt?: any;
  startedAt?: string;
  endedAt?: string;
}

interface FloatingParticle {
  id: string;
  emoji: string;
  label: string;
  x: number; // percentage across player
}

const INITIAL_FALLBACK_STREAMS: LiveStreamDoc[] = [
  {
    id: 'stream-live-101',
    isLive: true,
    platform: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&rel=0',
    title: 'Varsity Gold Feature Match: California Golden Bears vs Texas Outlaws',
    matchup: 'Golden Bears vs Outlaws',
    homeTeam: 'California Golden Bears',
    awayTeam: 'Texas Outlaws Flag',
    homeScore: 28,
    awayScore: 24,
    period: '4th Qtr',
    clock: '02:15',
    tournamentName: 'Northeast Championship Finals',
    courtName: 'Court 1 (Stadium Turf)',
    sport: "Girls' Flag Football",
    broadcasterUid: 'coach-vance-1',
    broadcasterName: 'Coach Vance (Sideline Cam 1)',
    broadcasterRole: 'coach',
    broadcasterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    viewerCount: 1420,
    thumbnailUrl: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&auto=format&fit=crop&q=80',
    reactions: {
      headTap: 88,
      saucy: 142,
      clamps: 67,
      cold: 104,
      dot: 95
    },
    startedAt: new Date().toISOString()
  },
  {
    id: 'stream-live-102',
    isLive: true,
    platform: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&rel=0',
    title: 'Tri-State Showcase: SoCal Elite Vipers vs Las Vegas Lightning',
    matchup: 'Vipers vs Lightning',
    homeTeam: 'SoCal Elite Vipers',
    awayTeam: 'Las Vegas Lightning',
    homeScore: 21,
    awayScore: 19,
    period: '2nd Half',
    clock: '05:40',
    tournamentName: 'West Coast Invitational',
    courtName: 'Court 2 (North Field)',
    sport: "Girls' Flag Football",
    broadcasterUid: 'creator-media-2',
    broadcasterName: 'J1P Sideline Crew',
    broadcasterRole: 'creator',
    broadcasterAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    viewerCount: 680,
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
    reactions: {
      headTap: 42,
      saucy: 79,
      clamps: 51,
      cold: 63,
      dot: 38
    },
    startedAt: new Date().toISOString()
  },
  {
    id: 'stream-replay-201',
    isLive: false,
    platform: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0&mute=0&rel=0',
    title: 'Full Game Replay: Paramus Catholic vs Hillsborough High (Championship Final)',
    matchup: 'Paramus Catholic vs Hillsborough',
    homeTeam: 'Paramus Catholic',
    awayTeam: 'Hillsborough High',
    homeScore: 35,
    awayScore: 28,
    period: 'FINAL',
    clock: '00:00',
    tournamentName: 'Northeast Championship Finals',
    courtName: 'Center Field Stadium',
    sport: "Girls' Flag Football",
    broadcasterUid: 'admin-hq',
    broadcasterName: 'Just1Play Official Replay Hub',
    broadcasterRole: 'admin',
    broadcasterAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    viewerCount: 3890,
    thumbnailUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop&q=80',
    reactions: {
      headTap: 215,
      saucy: 340,
      clamps: 180,
      cold: 290,
      dot: 175
    },
    endedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

export function parseStreamEmbedUrl(url: string, platformType?: 'youtube' | 'twitch' | 'custom'): { embedUrl: string; platform: 'youtube' | 'twitch' | 'custom' } {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return {
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&rel=0',
      platform: 'youtube'
    };
  }

  // 1. YouTube Live / Standard / Shorts / ID
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || platformType === 'youtube') {
    let videoId = '';
    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      videoId = ytMatch[1];
    } else if (trimmed.length === 11 && !trimmed.includes('/')) {
      videoId = trimmed;
    }
    
    if (videoId) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&rel=0&playsinline=1`,
        platform: 'youtube'
      };
    }
  }

  // 2. Twitch Channel or Stream
  if (trimmed.includes('twitch.tv') || platformType === 'twitch') {
    const parentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    let channelOrVideo = '';
    const channelMatch = trimmed.match(/twitch\.tv\/([\w-]+)/i);
    const videoMatch = trimmed.match(/twitch\.tv\/videos\/(\d+)/i);

    if (videoMatch && videoMatch[1]) {
      channelOrVideo = videoMatch[1];
      return {
        embedUrl: `https://player.twitch.tv/?video=${channelOrVideo}&parent=${parentHost}&autoplay=true&muted=false`,
        platform: 'twitch'
      };
    } else if (channelMatch && channelMatch[1] && channelMatch[1] !== 'directory') {
      channelOrVideo = channelMatch[1];
      return {
        embedUrl: `https://player.twitch.tv/?channel=${channelOrVideo}&parent=${parentHost}&autoplay=true&muted=false`,
        platform: 'twitch'
      };
    } else if (!trimmed.includes('/') && !trimmed.includes('.')) {
      // Just channel name provided
      return {
        embedUrl: `https://player.twitch.tv/?channel=${trimmed}&parent=${parentHost}&autoplay=true&muted=false`,
        platform: 'twitch'
      };
    }
  }

  // 3. Custom iframe or direct embed
  return {
    embedUrl: trimmed,
    platform: 'custom'
  };
}

export default function LiveBroadcastHub() {
  const { user, profile, role } = useAuth();
  
  // Real-time Firestore streams
  const [allStreams, setAllStreams] = useState<LiveStreamDoc[]>(INITIAL_FALLBACK_STREAMS);
  const [activeStreamId, setActiveStreamId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Floating reaction particles over theater player
  const [particles, setParticles] = useState<FloatingParticle[]>([]);

  // Go Live Broadcaster Modal state
  const [isGoLiveModalOpen, setIsGoLiveModalOpen] = useState<boolean>(false);
  const [broadcasterTab, setBroadcasterTab] = useState<'youtube' | 'twitch'>('youtube');
  
  // Go Live Form State
  const [streamUrlInput, setStreamUrlInput] = useState<string>('');
  const [selectedGameId, setSelectedGameId] = useState<string>('game-101');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customMatchup, setCustomMatchup] = useState<string>('');
  const [customTournament, setCustomTournament] = useState<string>('Northeast Championship Finals');
  const [customCourt, setCustomCourt] = useState<string>('Court 1 (Stadium Turf)');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // Quick score updater for active broadcaster
  const [isScoreDrawerOpen, setIsScoreDrawerOpen] = useState<boolean>(false);
  const [scoreHomeInput, setScoreHomeInput] = useState<number>(0);
  const [scoreAwayInput, setScoreAwayInput] = useState<number>(0);
  const [periodInput, setPeriodInput] = useState<string>('1st Qtr');
  const [clockInput, setClockInput] = useState<string>('12:00');

  // Filter streams
  const liveStreams = allStreams.filter(s => s.isLive);
  const replayStreams = allStreams.filter(s => !s.isLive);

  // Active stream selection
  const currentStream: LiveStreamDoc | undefined = 
    allStreams.find(s => s.id === activeStreamId) || liveStreams[0] || replayStreams[0] || allStreams[0];

  // Permissions to Go Live
  const canGoLive = Boolean(
    role === 'coach' || 
    role === 'admin' || 
    role === 'creator' || 
    role === 'content_creator' || 
    role === 'director' || 
    profile?.role === 'coach' || 
    profile?.role === 'admin' || 
    profile?.role === 'creator'
  );

  // Check if current user is broadcasting this active stream
  const isBroadcasterOfCurrent = Boolean(
    user && currentStream && currentStream.broadcasterUid === user.uid
  );

  // 1. Subscribe to Firestore `live_streams` collection in real time
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const streamsCollectionRef = collection(db, 'live_streams');
      const q = query(streamsCollectionRef, orderBy('createdAt', 'desc'));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: LiveStreamDoc[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              list.push({
                id: docSnap.id,
                isLive: data.isLive ?? true,
                platform: data.platform || 'youtube',
                streamUrl: data.streamUrl || '',
                embedUrl: data.embedUrl || parseStreamEmbedUrl(data.streamUrl || '', data.platform).embedUrl,
                title: data.title || 'Live Sideline Broadcast',
                matchup: data.matchup || `${data.homeTeam || 'Home'} vs ${data.awayTeam || 'Away'}`,
                homeTeam: data.homeTeam || 'Home Team',
                awayTeam: data.awayTeam || 'Away Team',
                homeScore: data.homeScore ?? 0,
                awayScore: data.awayScore ?? 0,
                period: data.period || '1st Half',
                clock: data.clock || '12:00',
                tournamentName: data.tournamentName || INITIAL_TOURNAMENT_DOC.title,
                gameId: data.gameId || '',
                courtName: data.courtName || 'Court 1',
                broadcasterUid: data.broadcasterUid || 'creator-1',
                broadcasterName: data.broadcasterName || 'Sideline Broadcaster',
                broadcasterRole: data.broadcasterRole || 'coach',
                broadcasterAvatar: data.broadcasterAvatar || '',
                viewerCount: data.viewerCount || 1,
                thumbnailUrl: data.thumbnailUrl || 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&auto=format&fit=crop&q=80',
                sport: data.sport || "Girls' Flag Football",
                reactions: data.reactions || { headTap: 0, saucy: 0, clamps: 0, cold: 0, dot: 0 },
                startedAt: data.startedAt,
                endedAt: data.endedAt
              });
            });
            setAllStreams(list);
          } else {
            setAllStreams(INITIAL_FALLBACK_STREAMS);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Firestore live_streams snapshot notice (using fallback streams):', err);
          try {
            handleFirestoreError(err, OperationType.LIST, 'live_streams');
          } catch (handled) {
            console.warn('Firestore live_streams access notice handled:', handled);
          }
          setAllStreams(INITIAL_FALLBACK_STREAMS);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn('Error subscribing to live_streams:', err);
      setAllStreams(INITIAL_FALLBACK_STREAMS);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Default active stream
  useEffect(() => {
    if (!activeStreamId && allStreams.length > 0) {
      const firstLive = allStreams.find(s => s.isLive);
      setActiveStreamId(firstLive ? firstLive.id : allStreams[0].id);
    }
  }, [allStreams, activeStreamId]);

  // Sync score drawer inputs when active stream changes
  useEffect(() => {
    if (currentStream) {
      setScoreHomeInput(currentStream.homeScore || 0);
      setScoreAwayInput(currentStream.awayScore || 0);
      setPeriodInput(currentStream.period || '1st Qtr');
      setClockInput(currentStream.clock || '12:00');
    }
  }, [currentStream]);

  // 2. Handle Reaction with Particle Animation & Firestore Increment
  const handleReaction = async (reactionKey: 'headTap' | 'saucy' | 'clamps' | 'cold' | 'dot', emoji: string, label: string) => {
    if (!currentStream) return;

    // A. Add visual floating particle
    const newParticle: FloatingParticle = {
      id: `${reactionKey}-${Date.now()}-${Math.random()}`,
      emoji,
      label,
      x: 15 + Math.random() * 70 // spread randomly across center 70% of player
    };

    setParticles(prev => [...prev.slice(-15), newParticle]);

    // Cleanup particle after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 2400);

    // B. Optimistic local update
    setAllStreams(prev => prev.map(s => {
      if (s.id === currentStream.id) {
        const currentCount = s.reactions?.[reactionKey] || 0;
        return {
          ...s,
          reactions: {
            ...s.reactions,
            [reactionKey]: currentCount + 1
          }
        };
      }
      return s;
    }));

    // C. Firestore persist if real document exists
    if (!currentStream.id.startsWith('stream-')) {
      try {
        const streamDocRef = doc(db, 'live_streams', currentStream.id);
        await updateDoc(streamDocRef, {
          [`reactions.${reactionKey}`]: increment(1),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn('Could not increment reaction in Firestore:', err);
      }
    }
  };

  // 3. Handle Go Live from Phone Form Submission
  const handlePublishStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamUrlInput.trim()) return;

    setPublishing(true);
    try {
      const { embedUrl, platform } = parseStreamEmbedUrl(streamUrlInput.trim(), broadcasterTab);
      
      // Look up tournament game if selected
      const matchedGame = INITIAL_TOURNAMENT_GAMES.find(g => g.id === selectedGameId);
      
      const homeTeam = matchedGame ? matchedGame.homeTeam : (customMatchup.split(' vs ')[0] || 'Home Team');
      const awayTeam = matchedGame ? matchedGame.awayTeam : (customMatchup.split(' vs ')[1] || 'Away Team');
      const title = customTitle || (matchedGame ? `${matchedGame.division}: ${matchedGame.homeTeam} vs ${matchedGame.awayTeam}` : `${homeTeam} vs ${awayTeam} Live Sideline Stream`);
      const courtName = matchedGame ? matchedGame.courtName : customCourt;

      const newStreamPayload: Omit<LiveStreamDoc, 'id'> & { createdAt: any; updatedAt: any } = {
        isLive: true,
        platform,
        streamUrl: streamUrlInput.trim(),
        embedUrl,
        title,
        matchup: `${homeTeam} vs ${awayTeam}`,
        homeTeam,
        awayTeam,
        homeScore: matchedGame ? matchedGame.homeScore : 0,
        awayScore: matchedGame ? matchedGame.awayScore : 0,
        period: matchedGame ? matchedGame.period : '1st Qtr',
        clock: matchedGame ? matchedGame.clock : '12:00',
        tournamentName: customTournament,
        gameId: selectedGameId || '',
        courtName,
        broadcasterUid: user?.uid || 'broadcaster-coach',
        broadcasterName: profile?.displayName || user?.displayName || 'Coach Sideline Broadcaster',
        broadcasterRole: role || profile?.role || 'coach',
        broadcasterAvatar: profile?.avatarUrl || user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        viewerCount: 1,
        thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
        sport: matchedGame ? "Girls' Flag Football" : "Basketball",
        reactions: {
          headTap: 0,
          saucy: 0,
          clamps: 0,
          cold: 0,
          dot: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startedAt: new Date().toISOString()
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'live_streams'), newStreamPayload);
      
      // Switch active view to newly created live stream
      setActiveStreamId(docRef.id);
      setIsGoLiveModalOpen(false);
      setStreamUrlInput('');
      setCustomTitle('');
      setCustomMatchup('');
    } catch (err) {
      console.error('Error starting live broadcast:', err);
      // Fallback local addition if offline or firestore rules prevent
      const tempId = `stream-user-${Date.now()}`;
      const { embedUrl, platform } = parseStreamEmbedUrl(streamUrlInput.trim(), broadcasterTab);
      const fallbackDoc: LiveStreamDoc = {
        id: tempId,
        isLive: true,
        platform,
        streamUrl: streamUrlInput.trim(),
        embedUrl,
        title: customTitle || 'Sideline Mobile Live Stream',
        matchup: customMatchup || 'Live Game Broadcast',
        homeTeam: 'Team Alpha',
        awayTeam: 'Team Omega',
        homeScore: 0,
        awayScore: 0,
        period: '1st Qtr',
        clock: '12:00',
        tournamentName: customTournament,
        courtName: customCourt,
        broadcasterUid: user?.uid || 'guest-broadcaster',
        broadcasterName: profile?.displayName || user?.displayName || 'Sideline Broadcaster',
        broadcasterRole: role || 'coach',
        broadcasterAvatar: profile?.avatarUrl || '',
        viewerCount: 1,
        thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
        sport: "Girls' Flag Football",
        reactions: { headTap: 0, saucy: 0, clamps: 0, cold: 0, dot: 0 },
        startedAt: new Date().toISOString()
      };
      setAllStreams(prev => [fallbackDoc, ...prev]);
      setActiveStreamId(tempId);
      setIsGoLiveModalOpen(false);
    } finally {
      setPublishing(false);
    }
  };

  // 4. Handle End Stream & Archive to Film
  const handleEndStream = async (streamId: string) => {
    if (!confirm('End this live broadcast and archive it to the Recent Replays & Film vault?')) return;

    try {
      if (!streamId.startsWith('stream-')) {
        const streamRef = doc(db, 'live_streams', streamId);
        await updateDoc(streamRef, {
          isLive: false,
          endedAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      }

      setAllStreams(prev => prev.map(s => {
        if (s.id === streamId) {
          return {
            ...s,
            isLive: false,
            endedAt: new Date().toISOString()
          };
        }
        return s;
      }));
    } catch (err) {
      console.warn('Error ending stream:', err);
    }
  };

  // 5. Update Live Game Score in Firestore
  const handleUpdateLiveScore = async () => {
    if (!currentStream) return;
    try {
      if (!currentStream.id.startsWith('stream-')) {
        const streamRef = doc(db, 'live_streams', currentStream.id);
        await updateDoc(streamRef, {
          homeScore: scoreHomeInput,
          awayScore: scoreAwayInput,
          period: periodInput,
          clock: clockInput,
          updatedAt: serverTimestamp()
        });
      }

      setAllStreams(prev => prev.map(s => {
        if (s.id === currentStream.id) {
          return {
            ...s,
            homeScore: scoreHomeInput,
            awayScore: scoreAwayInput,
            period: periodInput,
            clock: clockInput
          };
        }
        return s;
      }));
      setIsScoreDrawerOpen(false);
    } catch (err) {
      console.warn('Error updating score:', err);
    }
  };

  // Copy share match link
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2200);
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-indigo-500 selection:text-white">
      
      {/* 1. TOP HEADER & BROADCASTER QUICK ACTION BAR */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 p-0.5 shadow-lg shadow-rose-950/40 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  JUST1PLAY <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-indigo-300 to-cyan-400">LIVE HUB</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  0-COST SYNC
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Zero-latency sideline streaming, instant phone broadcast & live match reactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
              title="Share Stream"
            >
              {copySuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Share</span>
                </>
              )}
            </button>

            {/* + GO LIVE FROM SIDELINE ACTION BUTTON (Prominent for Coaches/Creators/Admins) */}
            <button
              onClick={() => setIsGoLiveModalOpen(true)}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:brightness-110 text-white text-xs sm:text-sm font-black tracking-wide shadow-lg shadow-rose-950/50 hover:shadow-rose-900/60 transition-all transform active:scale-95 cursor-pointer border border-rose-400/30"
            >
              <Smartphone className="w-4 h-4 text-white" />
              <span>+ GO LIVE FROM SIDELINE</span>
            </button>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 space-y-6">

        {/* 2. DEDICATED THEATER STAGE (VIEWER VIEW) */}
        {currentStream ? (
          <div className="space-y-4">
            
            {/* OBSIDIAN THEATER PLAYER CONTAINER */}
            <div className="relative w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl shadow-black/80 ring-1 ring-slate-800/60">
              
              {/* TOP FLOATING OVERLAY BAR */}
              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-20 flex items-center justify-between pointer-events-none">
                
                {/* LIVE STATUS & DETAILS BADGE */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  {currentStream.isLive ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600/90 backdrop-blur-md border border-rose-400/40 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-950/60">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/90 backdrop-blur-md border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider shadow-lg">
                      <Film className="w-3.5 h-3.5 text-indigo-400" />
                      ARCHIVED FILM REPLAY
                    </span>
                  )}

                  <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 font-semibold text-xs">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{currentStream.viewerCount?.toLocaleString() || 1} Watching</span>
                  </span>

                  {currentStream.courtName && (
                    <span className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-indigo-300 font-medium text-xs">
                      <Tv className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{currentStream.courtName}</span>
                    </span>
                  )}
                </div>

                {/* BROADCASTER ACTIONS (IF OWNER OR ADMIN) */}
                {(isBroadcasterOfCurrent || canGoLive) && (
                  <div className="flex items-center gap-2 pointer-events-auto">
                    {currentStream.isLive && (
                      <button
                        onClick={() => setIsScoreDrawerOpen(true)}
                        className="px-3 py-1 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 backdrop-blur-md border border-indigo-400/30 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Update Score</span>
                      </button>
                    )}

                    {currentStream.isLive && (
                      <button
                        onClick={() => handleEndStream(currentStream.id)}
                        className="px-3 py-1 rounded-xl bg-red-900/80 hover:bg-red-800 backdrop-blur-md border border-red-500/40 text-red-200 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>End Stream</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* FLOATING REACTION PARTICLES CANVAS */}
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                <AnimatePresence>
                  {particles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 1, y: '80%', scale: 0.8, x: `${p.x}%` }}
                      animate={{ 
                        opacity: [1, 1, 0], 
                        y: ['75%', '20%', '0%'], 
                        scale: [0.8, 1.4, 1.1],
                        rotate: [-10, 10, -5] 
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.2, ease: 'easeOut' }}
                      className="absolute flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl backdrop-blur-md text-white font-black text-sm"
                    >
                      <span className="text-xl">{p.emoji}</span>
                      <span className="text-xs uppercase tracking-wider text-amber-300">{p.label}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* EMBEDDED ZERO-COST VIDEO PLAYER */}
              <div className="relative aspect-video w-full bg-black">
                {currentStream.embedUrl ? (
                  <iframe
                    src={currentStream.embedUrl}
                    title={currentStream.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full object-cover border-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center space-y-3">
                    <Video className="w-12 h-12 text-slate-600 animate-bounce" />
                    <p className="text-sm text-slate-400 font-semibold">Connecting to sideline camera stream...</p>
                  </div>
                )}
              </div>

              {/* LIVE GAME CONTEXT BAR (UNDER STREAM PLAYER) */}
              <div className="bg-slate-900/95 border-t border-slate-800/80 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* MATCHUP INFO & TOURNAMENT */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold">
                      {currentStream.tournamentName || INITIAL_TOURNAMENT_DOC.title}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-medium">{currentStream.sport || "Girls' Flag Football"}</span>
                    {currentStream.courtName && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 font-medium">{currentStream.courtName}</span>
                      </>
                    )}
                  </div>

                  <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
                    {currentStream.title}
                  </h2>

                  {/* BROADCASTER META */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {currentStream.broadcasterAvatar ? (
                      <img 
                        src={currentStream.broadcasterAvatar} 
                        alt={currentStream.broadcasterName}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-500/50"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                        {currentStream.broadcasterName.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs text-slate-300 font-medium">
                      Broadcaster: <strong className="text-white">{currentStream.broadcasterName}</strong>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                      {currentStream.broadcasterRole || 'Coach'}
                    </span>
                  </div>
                </div>

                {/* CURRENT SCORE & PERIOD DISPLAY CARD */}
                <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 px-4 shadow-inner self-start md:self-auto shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-300 max-w-[110px] sm:max-w-[130px] truncate">
                      {currentStream.homeTeam || 'Home'}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                      {currentStream.homeScore ?? 0}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-2 py-0.5 border-x border-slate-800 text-center">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      {currentStream.period || 'LIVE'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400 tabular-nums">
                      {currentStream.clock || '12:00'}
                    </span>
                  </div>

                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-300 max-w-[110px] sm:max-w-[130px] truncate">
                      {currentStream.awayTeam || 'Away'}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                      {currentStream.awayScore ?? 0}
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. INTEGRATED ATHLETE REACTION BAR */}
              <div className="bg-slate-950 px-4 sm:px-5 py-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Fan & Athlete Live Reactions:
                  </span>
                </div>

                {/* REACTION CHIPS (Head Tap, Saucy, Clamps, Cold, Dot) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  
                  {/* 1. HEAD TAP */}
                  <button
                    onClick={() => handleReaction('headTap', '🫵', 'Head Tap')}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/50 text-slate-200 hover:text-white text-xs font-bold transition-all transform active:scale-90 cursor-pointer shadow-sm shrink-0"
                  >
                    <span className="text-base group-hover:scale-125 transition-transform">🫵</span>
                    <span>Head Tap</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 text-[10px] font-black tabular-nums">
                      {currentStream.reactions?.headTap || 0}
                    </span>
                  </button>

                  {/* 2. SAUCY */}
                  <button
                    onClick={() => handleReaction('saucy', '🔥', 'Saucy')}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 text-slate-200 hover:text-white text-xs font-bold transition-all transform active:scale-90 cursor-pointer shadow-sm shrink-0"
                  >
                    <span className="text-base group-hover:scale-125 transition-transform">🔥</span>
                    <span>Saucy</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-black tabular-nums">
                      {currentStream.reactions?.saucy || 0}
                    </span>
                  </button>

                  {/* 3. CLAMPS */}
                  <button
                    onClick={() => handleReaction('clamps', '🔒', 'Clamps')}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 text-slate-200 hover:text-white text-xs font-bold transition-all transform active:scale-90 cursor-pointer shadow-sm shrink-0"
                  >
                    <span className="text-base group-hover:scale-125 transition-transform">🔒</span>
                    <span>Clamps</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-black tabular-nums">
                      {currentStream.reactions?.clamps || 0}
                    </span>
                  </button>

                  {/* 4. COLD */}
                  <button
                    onClick={() => handleReaction('cold', '🧊', 'Cold')}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 text-slate-200 hover:text-white text-xs font-bold transition-all transform active:scale-90 cursor-pointer shadow-sm shrink-0"
                  >
                    <span className="text-base group-hover:scale-125 transition-transform">🧊</span>
                    <span>Cold</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 text-[10px] font-black tabular-nums">
                      {currentStream.reactions?.cold || 0}
                    </span>
                  </button>

                  {/* 5. DOT */}
                  <button
                    onClick={() => handleReaction('dot', '🎯', 'Dot')}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-slate-200 hover:text-white text-xs font-bold transition-all transform active:scale-90 cursor-pointer shadow-sm shrink-0"
                  >
                    <span className="text-base group-hover:scale-125 transition-transform">🎯</span>
                    <span>Dot</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 text-[10px] font-black tabular-nums">
                      {currentStream.reactions?.dot || 0}
                    </span>
                  </button>

                </div>
              </div>

            </div>

          </div>
        ) : (
          /* EMPTY STATE GRAPHIC PLACEHOLDER */
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-indigo-400 shadow-inner">
              <Tv className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-lg font-black text-white">No Live Sideline Broadcasts Active</h3>
              <p className="text-sm text-slate-400">
                No games are currently broadcasting. Check back at game time or tap '+ GO LIVE FROM SIDELINE' to broadcast from the field.
              </p>
            </div>
            <button
              onClick={() => setIsGoLiveModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              + Go Live from Phone
            </button>
          </div>
        )}

        {/* 4. STREAM SELECTOR RAIL (CAROUSEL OF OTHER LIVE & RECENT GAMES) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                Sideline Match Feeds & Film Vault
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {liveStreams.length} Live • {replayStreams.length} Replays
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allStreams.map((stream) => {
              const isSelected = stream.id === currentStream?.id;
              return (
                <div
                  key={stream.id}
                  onClick={() => setActiveStreamId(stream.id)}
                  className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/40 ring-2 ring-indigo-500/50'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* THUMBNAIL */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                    <img 
                      src={stream.thumbnailUrl || 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=600&auto=format&fit=crop&q=80'} 
                      alt={stream.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                    />

                    {/* OVERLAY BADGES */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      {stream.isLive ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          LIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-300 font-bold text-[10px] uppercase">
                          REPLAY
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/90 text-slate-300 font-mono text-[10px] font-bold">
                      {stream.period || 'FINAL'}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[150px] font-semibold text-indigo-400">{stream.courtName || 'Court Feed'}</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Eye className="w-3 h-3" /> {stream.viewerCount || 1}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {stream.title}
                    </h4>

                    {/* SCORE SUMMARY */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                      <span className="font-semibold text-slate-300 truncate max-w-[120px]">{stream.homeTeam}</span>
                      <span className="font-black text-white tabular-nums px-1.5 py-0.5 rounded bg-slate-950">
                        {stream.homeScore} - {stream.awayScore}
                      </span>
                      <span className="font-semibold text-slate-300 truncate max-w-[120px] text-right">{stream.awayTeam}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. "GO LIVE FROM PHONE" BROADCASTER DRAWER / MODAL */}
      <AnimatePresence>
        {isGoLiveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0"
            >
              {/* MODAL HEADER */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">Go Live from Sideline</h3>
                    <p className="text-xs text-slate-400">Broadcast directly from your phone with $0 server cost</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGoLiveModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* MODAL BODY FORM */}
              <form onSubmit={handlePublishStream} className="p-5 sm:p-6 space-y-4">
                
                {/* 2 SETUP OPTIONS TABS */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Choose Broadcast Source:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBroadcasterTab('youtube')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        broadcasterTab === 'youtube'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>YouTube Live</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBroadcasterTab('twitch')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        broadcasterTab === 'twitch'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Tv className="w-4 h-4" />
                      <span>Twitch / Custom</span>
                    </button>
                  </div>
                </div>

                {/* OPTION 1: YOUTUBE INSTRUCTIONS & URL INPUT */}
                {broadcasterTab === 'youtube' && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>How to Stream via YouTube Live on Phone:</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      1. Open the YouTube app on your mobile device.<br />
                      2. Tap <strong>'+'</strong> &rarr; <strong>'Go Live'</strong> (Unlisted or Public).<br />
                      3. Tap <strong>Share</strong>, copy the live stream link, and paste it below:
                    </p>
                    <input
                      type="text"
                      required
                      value={streamUrlInput}
                      onChange={(e) => setStreamUrlInput(e.target.value)}
                      placeholder="e.g. https://youtube.com/live/xxx or https://youtu.be/xxx"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-rose-500 focus:outline-none text-white text-xs font-mono"
                    />
                  </div>
                )}

                {/* OPTION 2: TWITCH / CUSTOM STREAM */}
                {broadcasterTab === 'twitch' && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>How to Stream via Twitch / Larix Broadcaster:</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Use the free Twitch App or Larix Broadcaster on iOS/Android to broadcast in 1080p. Enter your Twitch channel name or URL below:
                    </p>
                    <input
                      type="text"
                      required
                      value={streamUrlInput}
                      onChange={(e) => setStreamUrlInput(e.target.value)}
                      placeholder="e.g. twitch.tv/yourchannel or yourchannel"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-white text-xs font-mono"
                    />
                  </div>
                )}

                {/* GAME LINKER DROPDOWN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Link to Tournament Game:
                  </label>
                  <select
                    value={selectedGameId}
                    onChange={(e) => setSelectedGameId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-white text-xs"
                  >
                    <option value="">-- Custom Matchup / Non-Tournament Game --</option>
                    {INITIAL_TOURNAMENT_GAMES.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.scheduledTime} • {g.homeTeam} vs {g.awayTeam} ({g.courtName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* OPTIONAL CUSTOM MATCH TITLE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Custom Match Title (Optional)</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. 16U Showcase Semifinal"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Court / Field Location</label>
                    <input
                      type="text"
                      value={customCourt}
                      onChange={(e) => setCustomCourt(e.target.value)}
                      placeholder="e.g. Court 1 Stadium Turf"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGoLiveModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing || !streamUrlInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-white text-xs sm:text-sm font-black tracking-wide shadow-lg shadow-rose-950/40 cursor-pointer flex items-center gap-2"
                  >
                    {publishing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Radio className="w-4 h-4" />
                    )}
                    <span>START LIVE BROADCAST</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. QUICK SCORE UPDATER DRAWER MODAL */}
      <AnimatePresence>
        {isScoreDrawerOpen && currentStream && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-white">Update Match Score</h3>
                </div>
                <button
                  onClick={() => setIsScoreDrawerOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 truncate block">{currentStream.homeTeam || 'Home'}</label>
                  <input
                    type="number"
                    min="0"
                    value={scoreHomeInput}
                    onChange={(e) => setScoreHomeInput(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-lg font-black text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 truncate block">{currentStream.awayTeam || 'Away'}</label>
                  <input
                    type="number"
                    min="0"
                    value={scoreAwayInput}
                    onChange={(e) => setScoreAwayInput(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-lg font-black text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Period / Half</label>
                  <select
                    value={periodInput}
                    onChange={(e) => setPeriodInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    <option value="1st Qtr">1st Qtr</option>
                    <option value="2nd Qtr">2nd Qtr</option>
                    <option value="1st Half">1st Half</option>
                    <option value="Halftime">Halftime</option>
                    <option value="3rd Qtr">3rd Qtr</option>
                    <option value="4th Qtr">4th Qtr</option>
                    <option value="2nd Half">2nd Half</option>
                    <option value="Overtime">Overtime</option>
                    <option value="FINAL">FINAL</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Game Clock</label>
                  <input
                    type="text"
                    value={clockInput}
                    onChange={(e) => setClockInput(e.target.value)}
                    placeholder="e.g. 04:30"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScoreDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateLiveScore}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Save Score
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export { LiveBroadcastHub };
