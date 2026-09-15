import React, { useState, useEffect, useRef } from 'react';
import { Camera, Video, ShieldAlert, RotateCcw, Radio } from 'lucide-react';

export interface BuiltInStreamPlayerProps {
  isMuted?: boolean;
  activeCamAngle?: string;
  onStreamActiveChange?: (active: boolean) => void;
}

export const BuiltInStreamPlayer: React.FC<BuiltInStreamPlayerProps> = ({
  isMuted = false,
  activeCamAngle = 'main',
  onStreamActiveChange
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Start camera stream
  const startCameraStream = async () => {
    setPermissionError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera streaming is not supported in this browser.');
      }

      stopCameraStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: !isMuted
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Native video autoplay:', e));
      }

      setCameraActive(true);
      if (onStreamActiveChange) onStreamActiveChange(true);
    } catch (err: any) {
      console.error('Built-in stream camera failed:', err);
      setCameraActive(false);
      if (onStreamActiveChange) onStreamActiveChange(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera or Microphone access was denied in browser permissions.');
      } else {
        setPermissionError(err.message || 'Unable to access live camera feed.');
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

  useEffect(() => {
    startCameraStream();

    return () => {
      stopCameraStream();
    };
  }, [facingMode]);

  useEffect(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="relative w-full h-full bg-[#212A31] flex items-center justify-center overflow-hidden">
      
      {/* Video Element for Native Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
      />

      {/* Stream Source Status Indicator */}
      {cameraActive && (
        <div className="absolute bottom-16 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#212A31]/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-red-500 font-bold uppercase pointer-events-none">
          <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>Just1Play Native HD Encoder • 1080p60 ({activeCamAngle.toUpperCase()} CAM)</span>
        </div>
      )}

      {/* Permission Error or Inactive State Poster */}
      {!cameraActive && (
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-md z-10">
          <div className="w-16 h-16 rounded-3xl bg-red-600/10 border border-red-600/30 flex items-center justify-center mb-4 text-red-500">
            <Camera className="w-8 h-8 animate-pulse" />
          </div>
          <h4 className="text-lg sm:text-xl font-black italic text-white uppercase font-sans">
            NATIVE CAMERA FEED ACTIVATING
          </h4>
          <p className="text-xs text-slate-400 mt-1 mb-4 font-sans">
            {permissionError ? permissionError : 'Connecting to local device camera feed & encoder...'}
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={startCameraStream}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>ACTIVATE CAMERA FEED</span>
            </button>

            <button
              onClick={toggleFacingMode}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Flip Camera"
            >
              <RotateCcw className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
