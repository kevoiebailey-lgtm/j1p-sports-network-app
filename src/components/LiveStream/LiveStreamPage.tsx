import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Tv, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Play, 
  Square, 
  Users, 
  Share2, 
  Send, 
  Sparkles, 
  Flame, 
  Trophy, 
  Clock, 
  MapPin, 
  Check, 
  RotateCcw, 
  Camera, 
  Video, 
  Layers, 
  ExternalLink, 
  MessageSquare, 
  Calendar, 
  Bell, 
  Zap, 
  Activity, 
  Eye,
  Smartphone,
  Laptop,
  Tag,
  LogIn,
  Link,
  Link2,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LiveGame, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { parseVideoUrl } from '../../lib/videoEmbedUtils';
import { VerifiedBadge } from '../Common/VerifiedBadge';
import { LiveStreamStudio } from './LiveStreamStudio';
import { HybridStreamPlayer } from './HybridStreamPlayer';
import { liveStreamService, StandaloneStream } from '../../services/liveStreamService';
import { LiveStreamGateway, StreamRoom } from '../../services/LiveStreamGateway';
import { ScorekeeperDrawerModal } from './ScorekeeperDrawerModal';
import { ActiveGameScoreBar } from './ActiveGameScoreBar';
import { ScrollableMatchCenter } from './ScrollableMatchCenter';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrorHandler';

interface ChatMessage {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;
  authorIsVerified?: boolean;
  text: string;
  timestamp: string;
  reaction?: string;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

export const LiveStreamPage: React.FC = () => {
  const { user, profile, role } = useAuth();
  
  // Standalone Streams, Gateway Stream Rooms & Games State
  const [streamRooms, setStreamRooms] = useState<StreamRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StreamRoom | null>(null);
  const [activeStreams, setActiveStreams] = useState<StandaloneStream[]>([]);
  const [games, setGames] = useState<LiveGame[]>([]);
  const [activeStreamId, setActiveStreamId] = useState<string>('room-j1p-101');
  const [loading, setLoading] = useState<boolean>(true);

  // Join Room by Invite Code modal/input state
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string>('');
  const [currentSessionId] = useState<string>(`sess-client-${Math.random().toString(36).substring(2, 9)}`);

  // Active Stream Player Controls & Hybrid Stream State
  const [showStudioModal, setShowStudioModal] = useState<boolean>(false);
  const [showScorekeeperModal, setShowScorekeeperModal] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [isNativeBroadcastActive, setIsNativeBroadcastActive] = useState<boolean>(false);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showScoreOverlay, setShowScoreOverlay] = useState<boolean>(false); // Disabled overlay inside player for clean mobile view
  const [viewerCount, setViewerCount] = useState<number>(348);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [activeCamAngle, setActiveCamAngle] = useState<'main' | 'high' | 'endzone' | 'iso'>('main');

  // Active Possession
  const [possession, setPossession] = useState<'home' | 'away' | null>('home');

  // Floating Cheers particles
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  // Live Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputChat, setInputChat] = useState<string>('');

  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Authorization check for scorekeeper / admin controls
  const canEditScore = role === 'admin' || role === 'coach' || role === 'organization' || role === 'content_creator' || role === 'creator';

  // 1. URL Query Parameter Parser
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('roomId') || params.get('roomCode');
    if (roomParam) {
      handleJoinRoomByCode(roomParam);
    }
  }, []);

  // 2. Subscribe to Gateway Stream Rooms across the platform
  useEffect(() => {
    const unsub = LiveStreamGateway.subscribeToAllRooms((rooms) => {
      setStreamRooms(rooms);
      if (rooms.length > 0 && (!activeStreamId || activeStreamId === 'game-201')) {
        const first = rooms[0];
        setActiveStreamId(first.roomId);
        setCurrentRoom(first);
        if (first.streamUrl) setActiveStreamUrl(first.streamUrl);
      }
    });

    return () => unsub();
  }, []);

  // 3. Real-time Subscription to the selected Stream Room by ID / Code
  useEffect(() => {
    if (!activeStreamId) return;

    const unsubRoom = LiveStreamGateway.subscribeToRoom(activeStreamId, (room) => {
      if (room) {
        setCurrentRoom(room);
        if (room.streamUrl) setActiveStreamUrl(room.streamUrl);
        if (room.viewerCount) setViewerCount(room.viewerCount);
      }
    });

    // Register active device session in room
    LiveStreamGateway.joinRoom(activeStreamId, {
      sessionId: currentSessionId,
      deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
      deviceName: `${user?.displayName || 'Sports Fan'} (${window.innerWidth < 768 ? 'Mobile' : 'Desktop'})`
    });

    return () => {
      unsubRoom();
      LiveStreamGateway.leaveRoom(activeStreamId, currentSessionId);
    };
  }, [activeStreamId, currentSessionId, user]);

  // 4. Subscribe to Standalone Streams & Games
  useEffect(() => {
    const unsubscribe = liveStreamService.subscribeToActiveStreams((streams) => {
      setActiveStreams(streams);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const liveGamesRef = collection(db, 'liveGames');
      unsubscribe = onSnapshot(
        liveGamesRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: LiveGame[] = [];
            snapshot.forEach((docSnap) => {
              fetched.push({ id: docSnap.id, ...docSnap.data() } as LiveGame);
            });
            setGames(fetched);
          } else {
            setGames([]);
          }
          setLoading(false);
        },
        (err) => {
          setGames([]);
          setLoading(false);
        }
      );
    } catch (e) {
      setGames([]);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // 5. Subscribe to Chat for current Stream Room
  useEffect(() => {
    if (!activeStreamId) return;

    const unsubChat = LiveStreamGateway.subscribeToRoomChat(activeStreamId, (msgs) => {
      if (msgs && msgs.length > 0) {
        setChatMessages(
          msgs.map((m) => ({
            id: m.id,
            authorName: m.authorName || 'Sports Fan',
            authorAvatar: m.authorAvatar,
            authorRole: (m.authorRole as UserRole) || 'athlete',
            authorIsVerified: true,
            text: m.text,
            timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          }))
        );
      } else {
        setChatMessages([
          {
            id: 'c1',
            authorName: 'Coach Vance',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            authorRole: 'coach',
            authorIsVerified: true,
            text: 'Live scores updating in real time across mobile & desktop! 🔥',
            timestamp: 'Just now'
          }
        ]);
      }
    });

    return () => unsubChat();
  }, [activeStreamId]);

  // Handler to Join Room by Invite Code
  const handleJoinRoomByCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    const joined = await LiveStreamGateway.joinRoom(cleanCode, {
      sessionId: currentSessionId,
      deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
      deviceName: `${user?.displayName || 'Sports Fan'} (${window.innerWidth < 768 ? 'Mobile' : 'Desktop'})`
    });

    if (joined) {
      setActiveStreamId(joined.roomId);
      setCurrentRoom(joined);
      if (joined.streamUrl) setActiveStreamUrl(joined.streamUrl);
      setShowJoinModal(false);
      setJoinCodeInput('');
      setJoinErrorMessage('');
    } else {
      setJoinErrorMessage(`Stream Room "${cleanCode}" not found. Please check code and try again.`);
    }
  };

  // Find currently selected stream object
  const currentStandalone = activeStreams.find(s => s.id === activeStreamId);
  const currentGame = games.find(g => g.id === activeStreamId) || games[0] || null;

  const currentTitle = currentRoom?.title || currentStandalone?.title || currentGame?.title || 'Just1Play Live Championship';
  const currentSport = currentRoom?.sport || currentStandalone?.sport || currentGame?.sport || 'Basketball';
  
  const currentHomeTeam = currentRoom
    ? { name: currentRoom.homeTeamName || 'Home Team', abbreviation: 'HOM', score: currentRoom.homeScore ?? 0 }
    : currentStandalone
    ? { name: currentStandalone.homeTeamName || 'Home Team', abbreviation: 'HOM', score: currentStandalone.homeScore ?? 0 }
    : currentGame?.homeTeam || { name: 'St. Anthony Prep', abbreviation: 'STA', score: 68 };
    
  const currentAwayTeam = currentRoom
    ? { name: currentRoom.awayTeamName || 'Away Team', abbreviation: 'AWY', score: currentRoom.awayScore ?? 0 }
    : currentStandalone
    ? { name: currentStandalone.awayTeamName || 'Away Team', abbreviation: 'AWY', score: currentStandalone.awayScore ?? 0 }
    : currentGame?.awayTeam || { name: 'Bergen Catholic', abbreviation: 'BC', score: 64 };

  const currentPeriod = currentRoom?.period || currentGame?.period || '3rd Qtr';
  const currentGameClock = currentRoom?.gameClock || currentGame?.gameClock || '04:12';
  const currentRoomCode = currentRoom?.roomCode || 'J1P-101';

  // Send Live Chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputChat.trim()) return;

    const authorName = user?.displayName || profile?.displayName || 'Sports Fan';
    const authorAvatar = user?.photoURL || profile?.avatarUrl || profile?.photoURL || '';
    const authorRole = role || 'athlete';

    const text = inputChat.trim();
    setInputChat('');

    await LiveStreamGateway.sendRoomChatMessage(activeStreamId, {
      authorName,
      authorAvatar,
      authorRole,
      text
    });
  };

  // Trigger cheer reaction
  const triggerCheer = (emoji: string) => {
    const newId = `emoji-${Date.now()}-${Math.random()}`;
    const xPos = Math.floor(Math.random() * 70) + 15;

    setFloatingEmojis(prev => [...prev, { id: newId, emoji, x: xPos }]);

    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newId));
    }, 2500);
  };

  // Real-time Scorekeeper Firestore Sync Handler
  const handleSaveScorekeeperUpdate = async (data: {
    homeScore: number;
    awayScore: number;
    period: string;
    gameClock: string;
    possession: 'home' | 'away' | null;
  }) => {
    setPossession(data.possession);

    try {
      // 1. Update StreamRoom signals in Firestore
      await LiveStreamGateway.updateRoomSignals(activeStreamId, {
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        period: data.period,
        gameClock: data.gameClock
      });

      // 2. Also update liveGames doc in Firestore if exists
      const targetGameId = currentGame?.id || 'game-201';
      try {
        const gameRef = doc(db, 'liveGames', targetGameId);
        await setDoc(gameRef, {
          homeTeam: {
            ...(currentGame?.homeTeam || {}),
            name: currentHomeTeam.name,
            score: data.homeScore
          },
          awayTeam: {
            ...(currentGame?.awayTeam || {}),
            name: currentAwayTeam.name,
            score: data.awayScore
          },
          period: data.period,
          gameClock: data.gameClock,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (gameErr) {
        console.warn('liveGames update fallback:', gameErr);
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, 'liveStreams/scoreSync');
      } catch (e) {
        console.warn('Score sync notice handled:', e);
      }
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  // Copy Direct Stream Room Share Deep Link
  const handleCopyShareLink = (targetStreamId?: string, targetRoomCode?: string) => {
    const idToShare = targetStreamId || activeStreamId || 'room-j1p-101';
    const codeToShare = targetRoomCode || currentRoomCode || 'J1P-101';
    const inviteUrl = `${window.location.origin}${window.location.pathname}?streamId=${encodeURIComponent(idToShare)}&room=${encodeURIComponent(codeToShare)}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Deduplicated unique gateway rooms
  const uniqueStreamRooms = React.useMemo(() => {
    const map = new Map<string, {
      id: string;
      code: string;
      title: string;
      sport: string;
      broadcasterName: string;
      viewerCount: number;
      streamUrl?: string;
      rawRoom?: StreamRoom;
    }>();

    streamRooms.forEach(room => {
      const key = (room.roomId || room.roomCode || '').toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, {
          id: room.roomId,
          code: room.roomCode,
          title: room.title,
          sport: room.sport,
          broadcasterName: room.broadcasterName,
          viewerCount: room.viewerCount || 1,
          streamUrl: room.streamUrl,
          rawRoom: room
        });
      }
    });

    activeStreams.forEach(s => {
      const roomCode = (s as any).roomCode;
      const key = (s.id || roomCode || '').toLowerCase();
      const codeKey = (roomCode || '').toLowerCase();
      if (key && !map.has(key) && (!codeKey || !map.has(codeKey))) {
        map.set(key, {
          id: s.id,
          code: roomCode || s.id.toUpperCase().slice(-6),
          title: s.title,
          sport: s.sport,
          broadcasterName: s.broadcasterName,
          viewerCount: s.viewerCount || 1,
          streamUrl: s.streamUrl
        });
      }
    });

    return Array.from(map.values());
  }, [streamRooms, activeStreams]);

  return (
    <div className="min-h-screen bg-[#161C22] text-slate-100 flex flex-col font-sans">
      
      {/* 1. TOP DOCKED STICKY HERO VIDEO PLAYER CONTAINER (ZERO OVERLAYS ON MOBILE) */}
      <div 
        ref={playerContainerRef}
        className="sticky top-0 z-30 w-full bg-black shadow-2xl transition-all border-b border-slate-800"
      >
        <div className="max-w-7xl mx-auto">
          <HybridStreamPlayer
            isLive={true}
            isNativeBroadcastActive={isNativeBroadcastActive}
            streamUrl={activeStreamUrl}
            homeTeam={currentHomeTeam}
            awayTeam={currentAwayTeam}
            period={currentPeriod}
            gameClock={currentGameClock}
            sport={currentSport}
            title={currentTitle}
            thumbnailUrl={currentGame?.bannerUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80'}
            showScoreOverlay={showScoreOverlay}
            viewerCount={viewerCount}
            isMuted={isMuted}
            isPlaying={isPlaying}
            activeCamAngle={activeCamAngle}
            floatingEmojis={floatingEmojis}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onToggleMute={() => setIsMuted(!isMuted)}
            onToggleScoreOverlay={() => setShowScoreOverlay(!showScoreOverlay)}
            onToggleFullscreen={toggleFullscreen}
            onTriggerCheer={triggerCheer}
            onToggleNativeBroadcast={() => setIsNativeBroadcastActive(!isNativeBroadcastActive)}
            onCopyShareLink={() => handleCopyShareLink()}
            copiedLink={copiedLink}
          />
        </div>
      </div>

      {/* 2. DEDICATED HIGH-CONTRAST LIVE SCORE BAR (IMMEDIATELY BELOW VIDEO PLAYER) */}
      <ActiveGameScoreBar
        homeTeamName={currentHomeTeam.name}
        awayTeamName={currentAwayTeam.name}
        homeScore={currentHomeTeam.score}
        awayScore={currentAwayTeam.score}
        period={currentPeriod}
        gameClock={currentGameClock}
        possession={possession}
        sport={currentSport}
        isLive={true}
        canEditScore={canEditScore}
        onOpenScorekeeper={() => setShowScorekeeperModal(true)}
      />

      {/* 3. SCROLLABLE MATCH CENTER (BELOW SCORE BAR) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-6">
        <ScrollableMatchCenter
          currentRoom={currentRoom}
          activeStreamId={activeStreamId}
          games={games}
          uniqueStreamRooms={uniqueStreamRooms}
          onSelectStreamRoom={(id, rawRoom, url) => {
            setActiveStreamId(id);
            if (rawRoom) setCurrentRoom(rawRoom);
            if (url) setActiveStreamUrl(url);
          }}
          chatMessages={chatMessages}
          inputChat={inputChat}
          onChangeInputChat={(val) => setInputChat(val)}
          onSendChat={handleSendChat}
          activeCamAngle={activeCamAngle}
          onSelectCamAngle={(angle) => setActiveCamAngle(angle)}
          copiedLink={copiedLink}
          onCopyShareLink={() => handleCopyShareLink()}
        />
      </div>

      {/* 4. REAL-TIME SCOREKEEPER ADMIN CONTROL DRAWER MODAL */}
      <ScorekeeperDrawerModal
        isOpen={showScorekeeperModal}
        onClose={() => setShowScorekeeperModal(false)}
        roomIdOrGameId={currentRoomCode || activeStreamId}
        homeTeamName={currentHomeTeam.name}
        awayTeamName={currentAwayTeam.name}
        initialHomeScore={currentHomeTeam.score}
        initialAwayScore={currentAwayTeam.score}
        initialPeriod={currentPeriod}
        initialGameClock={currentGameClock}
        initialPossession={possession}
        onSaveScores={handleSaveScorekeeperUpdate}
      />

      {/* 5. JOIN STREAM ROOM MODAL */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#1E2630] border border-slate-700 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2 text-[#F59E0B]">
                  <LogIn className="w-5 h-5" />
                  <h3 className="text-base font-black uppercase font-mono text-white">
                    JOIN STREAM ROOM VIA CODE
                  </h3>
                </div>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                Enter the 6-character Stream Room invite code (e.g., <strong className="text-[#00F2FE]">J1P-101</strong>) to sync scores & feed:
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value.toUpperCase());
                    setJoinErrorMessage('');
                  }}
                  placeholder="e.g. J1P-101"
                  className="w-full px-4 py-3 rounded-2xl bg-[#161C22] border border-slate-700 font-mono text-center text-lg text-[#F59E0B] font-black uppercase tracking-widest focus:outline-none focus:border-[#F59E0B]"
                />

                {joinErrorMessage && (
                  <p className="text-xs font-mono text-red-400 text-center font-bold">
                    {joinErrorMessage}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleJoinRoomByCode(joinCodeInput)}
                  className="flex-1 py-3 bg-[#F59E0B] hover:bg-[#d98700] text-slate-950 font-mono font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Sync & Join Room
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase font-mono rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. GO LIVE BROADCAST STUDIO MODAL */}
      <AnimatePresence>
        {showStudioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-6xl my-auto"
            >
              <LiveStreamStudio
                onClose={() => setShowStudioModal(false)}
                onStreamStarted={(id) => {
                  setActiveStreamId(id);
                  setShowStudioModal(false);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LiveStreamPage;
