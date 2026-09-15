import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Radio, 
  Tv, 
  Settings, 
  Copy, 
  Check, 
  Share2, 
  Layers, 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  Send, 
  Flame, 
  Sparkles, 
  RefreshCw, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Laptop, 
  AlertCircle, 
  X,
  Play,
  RotateCcw,
  Tag,
  Trophy,
  Link,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { LiveGame } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { liveStreamService, StandaloneStream } from '../../services/liveStreamService';
import { LiveStreamGateway, StreamRoom } from '../../services/LiveStreamGateway';

interface LiveStreamStudioProps {
  game?: LiveGame;
  stream?: StandaloneStream;
  onClose?: () => void;
  onStreamStarted?: (streamId: string) => void;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

export const LiveStreamStudio: React.FC<LiveStreamStudioProps> = ({ game, stream, onClose, onStreamStarted }) => {
  const { user, profile, role } = useAuth();
  
  // Room Code & Gateway State
  const [roomCode, setRoomCode] = useState<string>(
    (stream as any)?.roomCode || LiveStreamGateway.generateRoomCode()
  );
  const [streamRoom, setStreamRoom] = useState<StreamRoom | null>(null);

  // Stream metadata & mode
  const initialId = stream?.id || (stream as any)?.roomId || game?.id || `room-${roomCode.toLowerCase().replace('-', '')}`;
  const [streamId] = useState<string>(initialId);
  const [streamTitle, setStreamTitle] = useState<string>(stream?.title || game?.title || 'Just1Play Live Broadcast');
  const [sport, setSport] = useState<string>(stream?.sport || game?.sport || "Girls' Flag Football");
  
  // Stream Media State
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(stream?.isBroadcasting || game?.isLiveStreamActive || false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [audioActive, setAudioActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showScoreOverlay, setShowScoreOverlay] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [streamQuality, setStreamQuality] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [streamMode, setStreamMode] = useState<'camera' | 'rtmp' | 'screen'>('camera');
  
  // Teams & Score info
  const [homeTeamName, setHomeTeamName] = useState<string>(stream?.homeTeamName || game?.homeTeam?.name || 'Home Team');
  const [awayTeamName, setAwayTeamName] = useState<string>(stream?.awayTeamName || game?.awayTeam?.name || 'Away Team');
  const [homeScore, setHomeScore] = useState<number>(stream?.homeScore ?? game?.homeTeam?.score ?? 0);
  const [awayScore, setAwayScore] = useState<number>(stream?.awayScore ?? game?.awayTeam?.score ?? 0);

  // RTMP Copy & Custom Stream Settings State
  const [rtmpUrl, setRtmpUrl] = useState<string>(stream?.rtmpUrl || (game as any)?.rtmpUrl || 'rtmp://live.just1play.com/app');
  const [streamKey, setStreamKey] = useState<string>(stream?.streamKey || (game as any)?.streamKey || `j1p_${streamId}_${Math.random().toString(36).substring(2, 8)}`);
  const [broadcastUrl, setBroadcastUrl] = useState<string>(stream?.streamUrl || game?.streamUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [copiedRtmp, setCopiedRtmp] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState<boolean>(false);
  const [savedSettingsSuccess, setSavedSettingsSuccess] = useState<boolean>(false);

  // Chat & Viewer State
  const [viewerCount, setViewerCount] = useState<number>(stream?.viewerCount || game?.viewerCount || 1);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; badge?: string }>>([
    { id: '1', sender: 'Coach Vance', text: 'Great angle on the sideline! Let us go!', time: '12:02', badge: 'COACH' },
    { id: '2', sender: 'Scout Johnson', text: 'Who is #24 for the Home team?', time: '12:03', badge: 'SCOUT' },
    { id: '3', sender: 'Elena R.', text: 'LET\'S GO BOYS!! 🔥🔥🔥', time: '12:04' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  // Video Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const broadcasterName = profile?.displayName || user?.displayName || 'Just1Play Streamer';

  // Subscribe to LiveStreamGateway Stream Room in real-time
  useEffect(() => {
    const unsub = LiveStreamGateway.subscribeToRoom(streamId, (room) => {
      if (room) {
        setStreamRoom(room);
        if (room.roomCode) setRoomCode(room.roomCode);
        if (room.viewerCount) setViewerCount(room.viewerCount);
        if (room.streamUrl) setBroadcastUrl(room.streamUrl);
        if (room.homeScore !== undefined) setHomeScore(room.homeScore);
        if (room.awayScore !== undefined) setAwayScore(room.awayScore);
      }
    });
    return () => unsub();
  }, [streamId]);

  // Generate new unique stream key
  const handleGenerateNewKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const newKey = `j1p_${streamId}_${randomHex}`;
    setStreamKey(newKey);
  };

  // Save & Publish Stream Settings to LiveStreamGateway across all client sessions & devices
  const handleSaveStreamSettings = async () => {
    const createdRoom = await LiveStreamGateway.createStreamRoom({
      roomId: streamId,
      roomCode,
      title: streamTitle,
      sport: sport as any,
      broadcasterUid: user?.uid || 'anon',
      broadcasterName,
      broadcasterRole: role || 'content_creator',
      isBroadcasting: true,
      status: 'live',
      viewerCount,
      streamUrl: broadcastUrl.trim(),
      rtmpUrl: rtmpUrl.trim(),
      streamKey: streamKey.trim(),
      homeTeamName,
      awayTeamName,
      homeScore,
      awayScore,
      activeDevices: [
        {
          sessionId: `sess-${user?.uid || 'broadcaster'}-${Date.now()}`,
          deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
          deviceName: `${broadcasterName} (${window.innerWidth < 768 ? 'Mobile Phone' : 'Desktop Studio'})`,
          joinedAt: new Date().toISOString(),
          isBroadcaster: true
        }
      ]
    });

    // Also sync to legacy collection for backwards compatibility
    await liveStreamService.publishStream({
      id: streamId,
      title: streamTitle,
      sport: sport as any,
      broadcasterUid: user?.uid || 'anon',
      broadcasterName,
      broadcasterRole: role || 'content_creator',
      isBroadcasting: true,
      status: 'live',
      viewerCount,
      streamUrl: broadcastUrl.trim(),
      rtmpUrl: rtmpUrl.trim(),
      streamKey: streamKey.trim(),
      homeTeamName,
      awayTeamName,
      homeScore,
      awayScore,
      deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop'
    });

    if (game?.id) {
      try {
        const gameRef = doc(db, 'liveGames', game.id);
        await updateDoc(gameRef, {
          streamUrl: broadcastUrl.trim(),
          isLiveStreamActive: true,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Game doc update fallback:', err);
      }
    }

    setIsBroadcasting(true);
    setSavedSettingsSuccess(true);
    if (onStreamStarted) onStreamStarted(streamId);
    setTimeout(() => setSavedSettingsSuccess(false), 3000);
  };

  // Initialize Media Stream when camera mode is active
  useEffect(() => {
    if (streamMode === 'camera' && cameraActive) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [cameraActive, facingMode, streamMode]);

  const startCameraStream = async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: streamQuality === '1080p' ? { ideal: 1920 } : streamQuality === '720p' ? { ideal: 1280 } : { ideal: 854 },
          height: streamQuality === '1080p' ? { ideal: 1080 } : streamQuality === '720p' ? { ideal: 720 } : { ideal: 480 },
        },
        audio: audioActive
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera stream permission error or unsupported:', err);
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    setCameraActive(!cameraActive);
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleAudio = () => {
    setAudioActive(!audioActive);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !audioActive;
      });
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      mediaStreamRef.current = screenStream;
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
      }
      setCameraActive(true);
      setStreamMode('screen');
    } catch (err) {
      console.warn('Screen share canceled or failed:', err);
    }
  };

  // Toggle Live Broadcast to Firestore
  const handleToggleBroadcast = async () => {
    const nextState = !isBroadcasting;
    setIsBroadcasting(nextState);

    if (nextState) {
      await handleSaveStreamSettings();
    } else {
      await liveStreamService.endStream(streamId);
      if (game?.id) {
        try {
          const gameRef = doc(db, 'liveGames', game.id);
          await updateDoc(gameRef, { isLiveStreamActive: false });
        } catch (e) {
          console.warn('Game status update fallback:', e);
        }
      }
    }
  };

  // Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      id: Date.now().toString(),
      sender: broadcasterName,
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badge: role?.toUpperCase()
    };

    setChatMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  // Trigger Cheer Reaction
  const handleCheerReaction = (emoji: string) => {
    const newEmoji: FloatingEmoji = {
      id: Date.now().toString() + Math.random(),
      emoji,
      x: Math.floor(Math.random() * 70) + 15
    };

    setFloatingEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 2500);
  };

  const copyToClipboard = (text: string, type: 'rtmp' | 'key' | 'room') => {
    navigator.clipboard.writeText(text);
    if (type === 'rtmp') {
      setCopiedRtmp(true);
      setTimeout(() => setCopiedRtmp(false), 2000);
    } else if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedInviteUrl(true);
      setTimeout(() => setCopiedInviteUrl(false), 2000);
    }
  };

  const getShareableRoomUrl = () => {
    return `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between gap-4 p-5 rounded-3xl bg-[#212A31] border border-white/10 backdrop-blur-2xl shadow-2xl flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#E5B868]/10 border border-[#E5B868]/40 rounded-2xl text-[#E5B868] shadow-[0_0_20px_rgba(214,28,36,0.3)] shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-[#E5B868] text-black rounded-sm">
                GATEWAY STREAM ROOM
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider bg-black/80 text-[#E5B868] border border-[#E5B868]/40 rounded-full flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#E5B868]" />
                ROOM CODE: {roomCode}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-white uppercase font-sans mt-0.5">
              JUST1PLAY STREAM GATEWAY STUDIO
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => copyToClipboard(getShareableRoomUrl(), 'room')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold font-mono flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Copy Direct Room URL"
          >
            {copiedInviteUrl ? <Check className="w-3.5 h-3.5 text-[#E5B868]" /> : <Share2 className="w-3.5 h-3.5 text-[#E5B868]" />}
            <span>{copiedInviteUrl ? 'COPIED LINK!' : 'SHARE ROOM'}</span>
          </button>

          {/* Live Status Indicator */}
          {isBroadcasting ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500 rounded-2xl text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider font-mono">ON AIR • LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-2xl text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-xs font-black uppercase tracking-wider font-mono">STANDBY</span>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* STREAM DETAILS FORM (Title & Sport) */}
      <div className="p-4 rounded-3xl bg-[#212A31] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="text-[10px] font-black uppercase font-mono text-slate-400 mb-1 block">
            Stream Title
          </label>
          <input
            type="text"
            value={streamTitle}
            onChange={(e) => setStreamTitle(e.target.value)}
            placeholder="e.g., Live Mobile Cam - Game 3 Finals"
            className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white font-bold focus:outline-none focus:border-[#E5B868]"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase font-mono text-slate-400 mb-1 block">
            Sport Category
          </label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white font-bold focus:outline-none focus:border-[#E5B868]"
          >
            <option value="Girls' Flag Football">Girls' Flag Football 🏈</option>
            <option value="Boys' Flag Football">Boys' Flag Football 🏈</option>
            <option value="Tackle Football">Tackle Football 🏈</option>
            <option value="Basketball">Basketball 🏀</option>
            <option value="Cheer & Dance">Cheer & Dance 📣</option>
            <option value="Soccer">Soccer ⚽</option>
            <option value="Volleyball">Volleyball 🏐</option>
            <option value="Lacrosse">Lacrosse 🥍</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Live Video Viewport (2 cols) + Stream Control & Chat Panel (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VIDEO BROADCAST CANVAS (2 COLUMNS) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-[#000000] border-2 border-white/15 shadow-2xl flex items-center justify-center group">
            
            {/* Live Camera Stream Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Fallback Display Graphic when Camera is off */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#212A31] via-[#212A31] to-[#000000]">
                <div className="w-20 h-20 rounded-3xl bg-[#E5B868]/10 border border-[#E5B868]/30 flex items-center justify-center mb-4 text-[#E5B868] shadow-[0_0_30px_rgba(214,28,36,0.2)]">
                  <Tv className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">
                  BROADCAST CAMERA STANDBY
                </h3>
                <p className="text-xs text-slate-400 max-w-md mt-2">
                  Click "Enable Phone Camera" or select RTMP Mode to stream live from your phone via PRISM Live or Larix!
                </p>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => { setStreamMode('camera'); toggleCamera(); }}
                    className="px-5 py-3 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] flex items-center gap-2 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Enable Phone Camera</span>
                  </button>

                  <button
                    onClick={startScreenShare}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Laptop className="w-4 h-4" />
                    <span>Share Screen</span>
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY 1: SCOREBOARD TELEMETRY HUD (Top Left) */}
            {showScoreOverlay && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-xs font-bold text-slate-300">{homeTeamName}</span>
                  <span className="text-lg font-black text-[#E5B868] bg-[#E5B868]/20 px-2 py-0.5 rounded-lg border border-[#E5B868]/40">
                    {homeScore}
                  </span>
                  <span className="text-xs text-slate-500">-</span>
                  <span className="text-lg font-black text-slate-300 bg-slate-600/20 px-2 py-0.5 rounded-lg border border-cyan-400/40">
                    {awayScore}
                  </span>
                  <span className="text-xs font-bold text-slate-300">{awayTeamName}</span>
                </div>
              </div>
            )}

            {/* OVERLAY 2: JUST1PLAY BRAND WATERMARK (Top Right) */}
            {showWatermark && (
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E5B868]/40 shadow-lg">
                <Radio className="w-3.5 h-3.5 text-[#E5B868] animate-pulse" />
                <span className="text-[11px] font-black italic tracking-widest text-white uppercase font-sans">
                  JUST1<span className="text-[#E5B868]">PLAY</span> LIVE
                </span>
              </div>
            )}

            {/* OVERLAY 3: FLOATING REACTION EMOJIS */}
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              <AnimatePresence>
                {floatingEmojis.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 1, y: 300, scale: 0.8 }}
                    animate={{ opacity: 0, y: -50, scale: 1.8 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.2, ease: 'easeOut' }}
                    style={{ left: `${item.x}%` }}
                    className="absolute text-4xl drop-shadow-[0_0_15px_rgba(0,0,0,0.9)]"
                  >
                    {item.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* OVERLAY 4: LIVE VIEWER & TELEMETRY BADGE (Bottom Left) */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl border border-white/15 text-xs font-bold text-slate-200">
                <Users className="w-3.5 h-3.5 text-[#E5B868]" />
                <span className="font-mono text-white">{viewerCount} Watching</span>
              </div>

              <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl border border-white/15 text-xs font-mono font-bold text-slate-300">
                {streamQuality} • 60 FPS
              </div>
            </div>
          </div>

          {/* STREAMER ACTION CONTROLS BAR */}
          <div className="p-4 rounded-3xl bg-[#212A31] border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              {/* Camera Toggle Button */}
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-2xl border text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  cameraActive
                    ? 'bg-[#E5B868]/20 border-[#E5B868] text-[#E5B868] shadow-[0_0_15px_rgba(214,28,36,0.3)]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {cameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                <span className="hidden sm:inline">{cameraActive ? 'Camera ON' : 'Camera OFF'}</span>
              </button>

              {/* Front/Back Flip Camera */}
              {cameraActive && (
                <button
                  onClick={toggleFacingMode}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors cursor-pointer"
                  title="Flip Phone Camera (Front / Back)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              {/* Mute/Unmute Mic Button */}
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-2xl border text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  audioActive
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-red-500/20 border-red-500/40 text-red-400'
                }`}
              >
                {audioActive ? <Mic className="w-4 h-4 text-[#E5B868]" /> : <MicOff className="w-4 h-4" />}
                <span className="hidden sm:inline">{audioActive ? 'Mic ON' : 'Muted'}</span>
              </button>

              {/* Overlay Scoreboard Toggle */}
              <button
                onClick={() => setShowScoreOverlay(!showScoreOverlay)}
                className={`p-3 rounded-2xl border text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  showScoreOverlay
                    ? 'bg-slate-600/20 border-cyan-400 text-slate-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden md:inline">Score HUD</span>
              </button>
            </div>

            {/* MAIN "GO LIVE" BROADCAST BUTTON */}
            <button
              onClick={handleToggleBroadcast}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 shadow-2xl cursor-pointer ${
                isBroadcasting
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_25px_rgba(239,68,68,0.6)] animate-pulse'
                  : 'bg-[#E5B868] hover:bg-[#38BDF8] text-black shadow-[0_0_25px_rgba(0,242,254,0.3)]'
              }`}
            >
              <Radio className="w-5 h-5 stroke-[2.5]" />
              <span>{isBroadcasting ? 'STOP BROADCAST' : 'GO LIVE NOW'}</span>
            </button>
          </div>

          {/* SPECTATOR CHEER BAR (Floating Emojis) */}
          <div className="p-4 rounded-3xl bg-[#212A31] border border-white/10 flex items-center justify-between gap-2 shadow-xl">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
              Spectator Cheer Reactions:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto">
              {['🔥', '🏀', '🏈', '🥍', '🏆', '👏', '💯', '⚡'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleCheerReaction(emoji)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-lg transition-transform active:scale-125 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STREAM CONFIG & LIVE CHAT SIDEBAR (1 COLUMN) */}
        <div className="space-y-4">
          
          {/* TAB 1: RTMP / PRISM / LARIX MOBILE BROADCAST SETUP */}
          <div className="p-5 rounded-3xl bg-[#212A31] border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#E5B868]" />
                <span className="text-xs font-black uppercase text-white font-mono tracking-wider">
                  Mobile Stream Settings
                </span>
              </div>
              <span className="text-[10px] bg-[#E5B868]/10 text-[#E5B868] px-2 py-0.5 rounded font-mono font-bold">
                PRISM / OBS / YouTube Ready
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configure your mobile stream inputs or paste your <strong className="text-[#FF0000]">YouTube Live</strong>, <strong className="text-[#9146FF]">Twitch</strong>, or <strong className="text-[#E5B868]">PRISM</strong> broadcast link:
            </p>

            {/* MULTISTREAM TARGET PRESET SWITCHER */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Quick Server Presets</label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-black/60 rounded-2xl border border-white/10 font-mono text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setRtmpUrl('rtmp://a.rtmp.youtube.com/live2')}
                  className={`py-1.5 px-1.5 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    rtmpUrl.includes('youtube')
                      ? 'bg-red-600/30 text-red-400 border-red-500/60 font-black'
                      : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <span>YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRtmpUrl('rtmp://live.twitch.tv/app')}
                  className={`py-1.5 px-1.5 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    rtmpUrl.includes('twitch')
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/60 font-black'
                      : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <span>Twitch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRtmpUrl('rtmp://fa723fc1bdef.global-contribute.live-video.net/app/')}
                  className={`py-1.5 px-1.5 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    rtmpUrl.includes('kick')
                      ? 'bg-red-600/30 text-red-400 border-red-600/60 font-black'
                      : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <span>Kick</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRtmpUrl(`rtmp://live.just1play.com/app`)}
                  className={`py-1.5 px-1.5 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    rtmpUrl.includes('just1play')
                      ? 'bg-[#E5B868]/30 text-[#E5B868] border-[#E5B868]/60 font-black'
                      : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  <span>Just1Play</span>
                </button>
              </div>
            </div>

            {/* EDITABLE RTMP SERVER URL INPUT */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">RTMP Server URL</label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(rtmpUrl, 'rtmp')}
                  className="text-[10px] font-mono text-[#E5B868] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedRtmp ? <Check className="w-3 h-3 text-[#E5B868]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRtmp ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <input
                type="text"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="rtmp://a.rtmp.youtube.com/live2"
                className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 font-mono text-xs text-slate-200 focus:outline-none focus:border-[#E5B868]"
              />
            </div>

            {/* EDITABLE STREAM KEY INPUT */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Game Stream Key</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateNewKey}
                    className="text-[10px] font-mono text-slate-300 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Generate New Stream Key"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>New Key</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(streamKey, 'key')}
                    className="text-[10px] font-mono text-[#E5B868] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-[#E5B868]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Enter or paste stream key..."
                className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 font-mono text-xs text-[#E5B868] focus:outline-none focus:border-[#E5B868]"
              />
            </div>

            {/* EDITABLE EXTERNAL BROADCAST / STREAM URL */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                Post Stream URL (YouTube / Twitch / Kick / HLS)
              </label>
              <input
                type="text"
                value={broadcastUrl}
                onChange={(e) => setBroadcastUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or Twitch link"
                className="w-full px-3 py-2 rounded-xl bg-black/80 border border-white/15 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
              />
              <p className="text-[10px] text-slate-500 font-mono">
                Pasting your stream link immediately broadcasts it to all desktop & mobile users.
              </p>
            </div>

            {/* SAVE & PUBLISH BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveStreamSettings}
                className="w-full py-2.5 px-4 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                <span>SAVE & PUBLISH LIVE STREAM</span>
              </button>
              {savedSettingsSuccess && (
                <div className="mt-2 p-2 rounded-xl bg-[#E5B868]/20 border border-[#E5B868]/50 text-[#E5B868] text-[11px] font-mono text-center font-bold flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Stream Published Across All Devices!
                </div>
              )}
            </div>
          </div>

          {/* TAB 2: REAL-TIME SPECTATOR LIVE CHAT FEED */}
          <div className="p-5 rounded-3xl bg-[#212A31] border border-white/10 space-y-4 shadow-xl flex flex-col h-[360px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-300" />
                <span className="text-xs font-black uppercase text-white font-mono tracking-wider">
                  Live Game Chat
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{chatMessages.length} Messages</span>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs font-sans">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{msg.sender}</span>
                      {msg.badge && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#E5B868]/20 text-[#E5B868] font-mono">
                          {msg.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">{msg.time}</span>
                  </div>
                  <p className="text-slate-300 font-medium">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send cheer or comment..."
                className="flex-1 px-3.5 py-2 rounded-2xl bg-black/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
              />
              <button
                type="submit"
                className="p-2 rounded-2xl bg-[#E5B868] text-black font-bold hover:bg-[#38BDF8] transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
