import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';

const PlayerComponent = ReactPlayer as any;
import { 
  Camera, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Radio, 
  Tv, 
  Play, 
  Square, 
  Maximize, 
  Volume2, 
  VolumeX, 
  Users, 
  ShieldAlert, 
  RotateCcw, 
  Laptop, 
  Share2, 
  Layers, 
  Check, 
  Copy, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export interface LiveStreamComponentProps {
  streamUrl?: string; // e.g. YouTube URL, Twitch URL, HLS .m3u8, or WebRTC stream
  gameId?: string;
  gameTitle?: string;
  sport?: string;
  homeTeam?: { name: string; score: number; abbrev: string };
  awayTeam?: { name: string; score: number; abbrev: string };
  isLiveDefault?: boolean;
  onStreamStateChange?: (isLive: boolean) => void;
  className?: string;
}

export const LiveStreamComponent: React.FC<LiveStreamComponentProps> = ({
  streamUrl = 'https://www.youtube.com/watch?v=live_demo_stream',
  gameId,
  gameTitle = 'Championship Game Live',
  sport = 'Basketball',
  homeTeam = { name: 'Eagles', score: 78, abbrev: 'EAG' },
  awayTeam = { name: 'Tigers', score: 74, abbrev: 'TIG' },
  isLiveDefault = false,
  onStreamStateChange,
  className = ''
}) => {
  // Mode state: 'player' (watching embed) vs 'broadcaster' (broadcasting camera)
  const [mode, setMode] = useState<'player' | 'broadcaster'>('player');

  // Player State
  const [urlInput, setUrlInput] = useState<string>(streamUrl);
  const [activePlaybackUrl, setActivePlaybackUrl] = useState<string>(streamUrl);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [viewerCount, setViewerCount] = useState<number>(142);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);

  // Broadcaster Camera State
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(isLiveDefault);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'prompting' | 'granted' | 'denied'>('idle');

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Clean up camera stream on unmount or when leaving broadcaster mode
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Request Camera & Audio Permission and start WebRTC stream
  const requestCameraAndStartStream = async () => {
    setPermissionError(null);
    setPermissionStatus('prompting');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser environment.');
      }

      // Stop any existing tracks
      stopCameraStream();

      // Request WebRTC MediaStream with camera & mic
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: micActive
      });

      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
      }

      setCameraActive(true);
      setPermissionStatus('granted');
      setMode('broadcaster');
    } catch (err: any) {
      console.error('Camera permission request failed:', err);
      setPermissionStatus('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera or Microphone access was denied. Please allow camera permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No video camera device was detected on your device.');
      } else {
        setPermissionError(err.message || 'Failed to initiate camera video stream.');
      }
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
    setCameraActive(false);
  };

  // Toggle Go Live Broadcast
  const handleGoLive = async () => {
    if (!cameraActive && mode === 'broadcaster') {
      await requestCameraAndStartStream();
      return;
    }

    if (mode === 'player') {
      await requestCameraAndStartStream();
    }

    const nextBroadcasting = !isBroadcasting;
    setIsBroadcasting(nextBroadcasting);
    if (onStreamStateChange) onStreamStateChange(nextBroadcasting);

    // Sync with Firestore if gameId is provided
    if (gameId) {
      try {
        const gameRef = doc(db, 'liveGames', gameId);
        await updateDoc(gameRef, {
          isLiveStreamActive: nextBroadcasting,
          viewerCount: nextBroadcasting ? viewerCount + 1 : viewerCount,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Firestore game stream status update fallback:', e);
      }
    }
  };

  // Switch facing camera (Front / Back on mobile)
  const toggleFacingMode = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (cameraActive) {
      // Re-trigger stream with new facing mode
      stopCameraStream();
      setTimeout(() => {
        requestCameraAndStartStream();
      }, 200);
    }
  };

  // Toggle Mic
  const toggleMic = () => {
    const nextMic = !micActive;
    setMicActive(nextMic);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = nextMic;
      });
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  // Update URL Embed
  const handleLoadCustomStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setActivePlaybackUrl(urlInput.trim());
      setMode('player');
      setIsPlaying(true);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* PLAYER / CAMERA CONTAINER CANVAS */}
      <div 
        ref={playerContainerRef}
        className="relative aspect-video rounded-3xl overflow-hidden bg-black border-2 border-white/15 shadow-2xl group flex items-center justify-center"
      >
        {/* MODE 1: BROADCASTER WEBRTC CAMERA STREAM */}
        {mode === 'broadcaster' ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
                <div className="w-16 h-16 rounded-3xl bg-[#E5B868]/10 border border-[#E5B868]/30 flex items-center justify-center mb-4 text-[#E5B868]">
                  <Camera className="w-8 h-8 animate-pulse" />
                </div>
                <h4 className="text-xl font-black italic text-white uppercase font-sans">
                  CAMERA PERMISSION REQUIRED
                </h4>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Allow browser camera & microphone access to stream live video directly from your device.
                </p>
                <button
                  onClick={requestCameraAndStartStream}
                  className="px-6 py-3 bg-[#E5B868] hover:bg-[#38BDF8] text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,242,254,0.3)] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>ALLOW CAMERA & GO LIVE</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* MODE 2: EMBEDDED STREAM PLAYER (ReactPlayer) */
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            {activePlaybackUrl.includes('youtube') || activePlaybackUrl.includes('twitch') || activePlaybackUrl.includes('.m3u8') ? (
              <PlayerComponent
                url={activePlaybackUrl}
                playing={isPlaying}
                muted={isMuted}
                width="100%"
                height="100%"
                controls={false}
              />
            ) : (
              /* Fallback HTML5 Video or Placeholder */
              <video
                src={activePlaybackUrl}
                autoPlay={isPlaying}
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {/* OVERLAY: HUD SCOREBOARD BAR */}
        {showOverlay && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-2xl">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-black text-white">{homeTeam.abbrev}</span>
              <span className="text-base font-black text-[#E5B868] bg-[#E5B868]/20 px-2 py-0.5 rounded border border-[#E5B868]/40">
                {homeTeam.score}
              </span>
              <span className="text-slate-500 text-[10px]">VS</span>
              <span className="text-base font-black text-slate-300 bg-slate-600/20 px-2 py-0.5 rounded border border-cyan-400/40">
                {awayTeam.score}
              </span>
              <span className="font-black text-white">{awayTeam.abbrev}</span>
            </div>

            <div className="h-4 w-px bg-white/20" />

            <div className="text-[10px] font-mono font-bold text-[#E5B868]">
              {sport.toUpperCase()}
            </div>
          </div>
        )}

        {/* OVERLAY: LIVE STATUS BADGE (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {isBroadcasting ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/90 border border-red-400 rounded-xl text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider font-mono">LIVE NOW</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-xl border border-white/15 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-[#E5B868]" />
              <span className="text-[11px] font-black uppercase tracking-wider font-mono">READY</span>
            </div>
          )}

          <div className="flex items-center gap-1 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-xl border border-white/15 text-xs font-mono font-bold text-slate-200">
            <Users className="w-3.5 h-3.5 text-[#E5B868]" />
            <span>{viewerCount}</span>
          </div>
        </div>

        {/* OVERLAY: PLAYER CONTROLS (Bottom Bar) */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-3 bg-black/80 backdrop-blur-md p-2.5 rounded-2xl border border-white/15">
          <div className="flex items-center gap-2">
            {mode === 'player' ? (
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={isPlaying ? 'Pause Stream' : 'Play Stream'}
              >
                {isPlaying ? <Square className="w-4 h-4 text-red-400" /> : <Play className="w-4 h-4 text-[#E5B868]" />}
              </button>
            ) : (
              <button
                onClick={toggleFacingMode}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Flip Camera (Front/Rear)"
              >
                <RotateCcw className="w-4 h-4 text-[#E5B868]" />
              </button>
            )}

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-200" />}
            </button>

            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Toggle Score Overlay"
            >
              <Layers className={`w-4 h-4 ${showOverlay ? 'text-slate-300' : 'text-slate-400'}`} />
            </button>
          </div>

          {/* MAIN GO LIVE / BROADCAST BUTTON */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoLive}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl cursor-pointer ${
                isBroadcasting
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
                  : 'bg-[#E5B868] hover:bg-[#38BDF8] text-black shadow-[0_0_20px_rgba(0,242,254,0.3)]'
              }`}
            >
              <Radio className="w-4 h-4 stroke-[2.5]" />
              <span>{isBroadcasting ? 'END BROADCAST' : 'GO LIVE CAMERA'}</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PERMISSION ERROR ALERT BANNER */}
      {permissionError && (
        <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-start gap-3 text-red-300 text-xs">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white uppercase tracking-wider">Camera Access Needed</p>
            <p>{permissionError}</p>
            <p className="text-[11px] text-red-200 font-mono pt-1">
              Tip: Click the camera icon near your browser's URL address bar to grant access, then click "GO LIVE CAMERA" again.
            </p>
          </div>
        </div>
      )}

      {/* EMBEDDING SOURCE SELECTOR & INPUT FORM */}
      <div className="p-4 rounded-2xl bg-[#212A31] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleLoadCustomStream} className="flex-1 flex items-center gap-2 min-w-[280px]">
          <span className="text-[10px] font-bold uppercase font-mono text-slate-400 shrink-0">
            Stream URL:
          </span>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste YouTube, Twitch, or .m3u8 live stream link..."
            className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-[#E5B868]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all shrink-0 cursor-pointer"
          >
            Load Stream
          </button>
        </form>

        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-400">
          <span className="text-[#E5B868]">Supported:</span>
          <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">YouTube</span>
          <span className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30">Twitch</span>
          <span className="px-2 py-0.5 rounded bg-cyan-600/20 text-cyan-300 border border-cyan-500/30">HLS .m3u8</span>
        </div>
      </div>

    </div>
  );
};
