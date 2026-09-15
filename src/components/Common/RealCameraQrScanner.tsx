import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, 
  RefreshCw, 
  AlertTriangle, 
  SwitchCamera, 
  Upload, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  ShieldCheck,
  Zap,
  Image as ImageIcon
} from 'lucide-react';

interface RealCameraQrScannerProps {
  onScanSuccess: (scannedText: string) => void;
  onScanError?: (error: string) => void;
  autoStopOnScan?: boolean;
  paused?: boolean;
}

export const RealCameraQrScanner: React.FC<RealCameraQrScannerProps> = ({
  onScanSuccess,
  onScanError,
  autoStopOnScan = true,
  paused = false
}) => {
  const [scannerId] = useState(() => `qr-reader-${Math.random().toString(36).substring(2, 9)}`);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);
  const [showSuccessFlash, setShowSuccessFlash] = useState<boolean>(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger feedback mechanism: audio beep, haptic pulse vibration & green flash overlay
  const triggerSuccessFeedback = () => {
    playBeep();

    // Haptic feedback pulse on mobile devices supporting Navigator.vibrate
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 80]); // Success double-vibration pulse pattern
      } catch {
        // Safe fallback if blocked
      }
    }

    // Green visual flash state
    setShowSuccessFlash(true);
    setTimeout(() => {
      setShowSuccessFlash(false);
    }, 900);
  };

  // Audio scan beep synthesis
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz pitch
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio fallback ignored if blocked
    }
  };

  // Stop camera stream safely
  const stopScanner = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping Html5Qrcode:', err);
      }
    }
    setIsCameraActive(false);
  };

  // Start camera stream
  const startScanner = async (cameraIdToUse?: string) => {
    setCameraError(null);
    setIsInitializing(true);

    try {
      // 1. Get camera devices if not loaded
      let availableCameras = cameras;
      if (availableCameras.length === 0) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            availableCameras = devices.map(d => ({ id: d.id, label: d.label || `Camera (${d.id.slice(0, 5)}...)` }));
            setCameras(availableCameras);
          }
        } catch (camErr) {
          console.warn('Camera enumeration info:', camErr);
        }
      }

      // Ensure DOM element exists
      const element = document.getElementById(scannerId);
      if (!element) {
        setIsInitializing(false);
        return;
      }

      // Cleanup existing scanner if running
      if (html5QrcodeRef.current) {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      }

      const scannerInstance = new Html5Qrcode(scannerId, { verbose: false });
      html5QrcodeRef.current = scannerInstance;

      const targetCameraConfig = cameraIdToUse || (availableCameras.length > 0 ? availableCameras[0].id : { facingMode: 'environment' });

      await scannerInstance.start(
        targetCameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minDim * 0.75),
              height: Math.floor(minDim * 0.75)
            };
          },
          aspectRatio: 1.0
        },
        (decodedText) => {
          triggerSuccessFeedback();
          setLastScannedText(decodedText);
          onScanSuccess(decodedText);

          if (autoStopOnScan) {
            scannerInstance.stop().then(() => {
              scannerInstance.clear();
              setIsCameraActive(false);
            }).catch(e => console.warn('Stop on scan error:', e));
          }
        },
        (errorMessage) => {
          if (onScanError) onScanError(errorMessage);
        }
      );

      setIsCameraActive(true);
      if (typeof targetCameraConfig === 'string') {
        setSelectedCameraId(targetCameraConfig);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('NotAllowedError') || 
        msg.includes('Permission denied') || 
        msg.includes('not allowed') ||
        msg.includes('userMedia')
      ) {
        console.warn('Camera permission pending or denied:', msg);
        setCameraError('Camera access requires permission. Click "Start Camera" to grant access, or upload a QR image.');
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        console.warn('No camera hardware detected:', msg);
        setCameraError('No camera hardware detected on this device.');
      } else {
        console.warn('Camera startup warning:', msg);
        setCameraError(`Camera Notice: ${msg || 'Unable to access camera feed'}`);
      }
      setIsCameraActive(false);
    } finally {
      setIsInitializing(false);
    }
  };

  // Toggle or switch camera
  const switchCamera = async () => {
    if (cameras.length <= 1) {
      // Default flip between environment / user
      const nextConfig = selectedCameraId === 'user' ? 'environment' : 'user';
      setSelectedCameraId(nextConfig);
      await startScanner(nextConfig);
      return;
    }

    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    await startScanner(nextCamera.id);
  };

  // Handle file upload scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    try {
      const scanner = html5QrcodeRef.current || new Html5Qrcode(scannerId, { verbose: false });
      html5QrcodeRef.current = scanner;

      const decodedText = await scanner.scanFile(file, true);
      triggerSuccessFeedback();
      setLastScannedText(decodedText);
      onScanSuccess(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setCameraError('Could not decode a valid QR code from the selected image.');
    }
  };

  useEffect(() => {
    if (!paused) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().then(() => html5QrcodeRef.current?.clear()).catch(() => {});
      }
    };
  }, [paused]);

  return (
    <div className="w-full space-y-4">
      
      {/* SCANNER CONTAINER */}
      <div className="relative w-full aspect-square max-w-[340px] mx-auto bg-black rounded-3xl border-2 border-[#E5B868] overflow-hidden shadow-[0_0_35px_rgba(214,28,36,0.25)] flex flex-col items-center justify-center">
        
        {/* HTML5 QR READER TARGET ELEMENT */}
        <div id={scannerId} className="w-full h-full object-cover overflow-hidden" />

        {/* VISUAL FEEDBACK FLASH OVERLAY ON VALID SCAN */}
        {showSuccessFlash && (
          <div className="absolute inset-0 z-30 bg-[#E5B868]/30 border-4 border-[#E5B868] rounded-3xl backdrop-blur-xs flex flex-col items-center justify-center space-y-2 animate-pulse transition-all">
            <div className="p-3.5 rounded-full bg-[#E5B868] text-black shadow-[0_0_30px_#E5B868] animate-bounce">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <div className="px-3.5 py-1.5 bg-black/90 text-[#E5B868] font-mono font-black text-xs uppercase tracking-wider rounded-full border border-[#E5B868]/80 shadow-[0_0_20px_rgba(214,28,36,0.5)]">
              SCAN SUCCESSFUL
            </div>
          </div>
        )}

        {/* OVERLAY HUD RETICLE (Visible when active) */}
        {isCameraActive && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
            
            {/* Top Bar HUD */}
            <div className="w-full flex items-center justify-between z-10">
              <div className="px-2.5 py-1 rounded-full bg-black/80 border border-[#E5B868]/60 text-[10px] font-mono font-bold text-[#E5B868] flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-[#E5B868] animate-ping" />
                <span>LIVE {selectedCameraId === 'user' ? 'FRONT' : 'REAR'} LENS</span>
              </div>

              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={switchCamera}
                  className="px-2 py-1 rounded-full bg-black/80 border border-[#E5B868]/40 text-[#E5B868] hover:bg-white/10 text-[10px] font-mono font-bold flex items-center gap-1"
                  title="Switch Camera Lens"
                >
                  <SwitchCamera className="w-3 h-3 text-[#E5B868]" />
                  <span>FLIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 rounded-full bg-black/80 border border-white/20 text-white hover:bg-white/10"
                  title="Toggle Scan Sound"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#E5B868]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Corner Frame Lines */}
            <div className="relative w-48 h-48 my-auto">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#E5B868]" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#E5B868]" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#E5B868]" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#E5B868]" />

              {/* Laser Scan Bar */}
              <div className="absolute inset-x-0 h-0.5 bg-[#E5B868] shadow-[0_0_15px_#E5B868] animate-bounce top-1/2 -translate-y-1/2" />
            </div>

            {/* Bottom Target Hint */}
            <div className="text-[10px] font-mono font-bold text-white bg-black/80 px-3 py-1 rounded-full border border-white/10 uppercase tracking-wider">
              Align Pass QR in Frame Center
            </div>
          </div>
        )}

        {/* INITIALIZING / OFF STATE */}
        {isInitializing && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <RefreshCw className="w-8 h-8 text-[#E5B868] animate-spin" />
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Initializing Camera Optics...
            </div>
            <div className="text-[10px] text-slate-400">
              Requesting hardware media device access
            </div>
          </div>
        )}

        {/* CAMERA ERROR STATE */}
        {cameraError && (
          <div className="absolute inset-0 bg-[#212A31] flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-white uppercase font-mono">Camera Stream Unavailable</div>
              <p className="text-[11px] text-slate-300 font-sans max-w-xs leading-relaxed">
                {cameraError}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2 w-full max-w-xs">
              <button
                type="button"
                onClick={() => startScanner()}
                className="py-2.5 px-4 rounded-xl bg-[#E5B868] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(214,28,36,0.4)]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera Feed</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 border border-white/10"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#E5B868]" />
                <span>Upload QR Image File</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTROLS TOOLBAR */}
      <div className="flex items-center justify-center gap-2 max-w-[340px] mx-auto">
        <button
          type="button"
          onClick={() => isCameraActive ? stopScanner() : startScanner()}
          className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            isCameraActive 
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
              : 'bg-[#E5B868] border-[#E5B868] text-black shadow-[0_0_15px_rgba(214,28,36,0.4)]'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>{isCameraActive ? 'Pause Stream' : 'Start Camera'}</span>
        </button>

        {/* Camera Switch Toggle Button */}
        <button
          type="button"
          onClick={switchCamera}
          disabled={!isCameraActive}
          className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-all"
          title="Switch Camera (Rear / Front)"
        >
          <SwitchCamera className="w-4 h-4 text-[#E5B868]" />
          <span className="hidden sm:inline font-mono text-[11px] uppercase">
            {selectedCameraId === 'user' ? 'Front' : 'Rear'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white"
          title="Upload QR Code Image"
        >
          <Upload className="w-4 h-4 text-[#E5B868]" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* LAST SCANNED BANNER */}
      {lastScannedText && (
        <div className="p-3 rounded-2xl bg-[#E5B868]/10 border border-[#E5B868]/40 text-center max-w-[340px] mx-auto space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[#E5B868] text-xs font-bold font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#E5B868]" />
            <span>LAST DECODED QR PASS</span>
          </div>
          <p className="text-[11px] font-mono font-bold text-white truncate px-2 bg-black/50 py-1 rounded-lg border border-white/10">
            {lastScannedText}
          </p>
        </div>
      )}

    </div>
  );
};
