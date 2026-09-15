import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  KeyRound, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Sparkles, 
  RefreshCw,
  Zap,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { WebAuthnCredential } from '../../types';
import { 
  isWebAuthnSupported, 
  getDeviceBiometricLabel, 
  getStoredDeviceCredentials, 
  removeStoredDeviceCredential 
} from '../../services/webAuthnService';

interface WebAuthnPasskeyManagerProps {
  compact?: boolean;
  className?: string;
  onSuccess?: (msg: string) => void;
}

export const WebAuthnPasskeyManager: React.FC<WebAuthnPasskeyManagerProps> = ({
  compact = false,
  className = '',
  onSuccess
}) => {
  const { user, profile, registerPasskey, signInWithWebAuthn } = useAuth();
  
  const [supported, setSupported] = useState<boolean>(true);
  const [deviceLabel, setDeviceLabel] = useState<{ name: string; type: WebAuthnCredential['deviceType'] }>({
    name: 'Device Passkey',
    type: 'passkey'
  });
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [testingAuth, setTestingAuth] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);

  useEffect(() => {
    async function checkSupport() {
      const isSup = await isWebAuthnSupported();
      setSupported(isSup);
      const label = getDeviceBiometricLabel();
      setDeviceLabel(label);
    }
    checkSupport();
  }, []);

  // Sync credentials from profile or local device store
  useEffect(() => {
    const uid = user?.uid || profile?.uid;
    const profCreds = profile?.webAuthnCredentials || [];
    const localCreds = getStoredDeviceCredentials(uid);

    // Merge by ID
    const map = new Map<string, WebAuthnCredential>();
    profCreds.forEach(c => map.set(c.id, c));
    localCreds.forEach(c => map.set(c.id, c));

    setCredentials(Array.from(map.values()));
  }, [profile, user]);

  const handleEnrollPasskey = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await registerPasskey(customName.trim() || undefined);
      setSuccess(result.message || 'Biometric passkey registered successfully!');
      setShowNameInput(false);
      setCustomName('');
      if (onSuccess) onSuccess(result.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to register biometric passkey.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestBiometrics = async () => {
    setError(null);
    setSuccess(null);
    setTestingAuth(true);

    try {
      const res = await signInWithWebAuthn({ uid: user?.uid || profile?.uid });
      setSuccess('Biometric authentication verified successfully! Device sensor is ready for instant login.');
    } catch (err: any) {
      setError(err?.message || 'Biometric test verification failed.');
    } finally {
      setTestingAuth(false);
    }
  };

  const handleRemovePasskey = (credId: string) => {
    const uid = user?.uid || profile?.uid;
    removeStoredDeviceCredential(credId, uid);
    setCredentials(prev => prev.filter(c => c.id !== credId));
    setSuccess('Passkey removed from this device.');
  };

  if (!supported) {
    return (
      <div className={`p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 font-mono ${className}`}>
        <div className="flex items-center gap-2 text-slate-300">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>WebAuthn Biometrics are not supported on this browser or device.</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`space-y-3 ${className}`}>
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] flex items-center gap-2 font-mono">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00B8D4]/10 border border-[#00B8D4]/30 flex items-center justify-center text-[#00F5D4]">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>{deviceLabel.name}</span>
                {credentials.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {credentials.length > 0 ? `${credentials.length} passkey enrolled` : 'Fast 1-tap sign-in'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEnrollPasskey}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00B8D4] to-[#00F5D4] text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,184,212,0.3)] hover:opacity-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>{credentials.length > 0 ? 'Add Passkey' : 'Enable'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 backdrop-blur-xl ${className}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00B8D4]/20 to-[#00F5D4]/10 border border-[#00B8D4]/40 flex items-center justify-center text-[#00F5D4] shadow-[0_0_15px_rgba(0,184,212,0.25)]">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                WebAuthn Biometric Passkeys
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                FIDO2 Standard
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Securely sign in using Face ID, Touch ID, Windows Hello, or Android Biometrics
            </p>
          </div>
        </div>

        {credentials.length > 0 && (
          <button
            type="button"
            onClick={handleTestBiometrics}
            disabled={testingAuth}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#00F5D4]" />
            <span>{testingAuth ? 'Verifying Sensor...' : 'Test Sensor'}</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Credentials List */}
      <div className="space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
          <span>Registered Passkeys on this Device</span>
          <span>{credentials.length} Active</span>
        </div>

        {credentials.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
            <KeyRound className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              No biometric passkeys registered on this browser yet.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Register this device's {deviceLabel.name} to sign in without typing passwords.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                    {cred.deviceType === 'touch_id' || cred.deviceType === 'face_id' ? (
                      <Smartphone className="w-4 h-4 text-[#00F5D4]" />
                    ) : (
                      <Laptop className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{cred.deviceName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-[#00F5D4] text-[9px] font-mono font-bold">
                        PASSKEY
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>Added: {new Date(cred.createdAt).toLocaleDateString()}</span>
                      {cred.lastUsedAt && (
                        <>
                          <span>•</span>
                          <span>Last Used: {new Date(cred.lastUsedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePasskey(cred.id)}
                  title="Remove passkey"
                  className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Passkey Action Form */}
      <div className="pt-2">
        {showNameInput ? (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase font-mono block">
              Device Name (Optional)
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={`e.g. My iPhone 15 Pro, MacBook Touch ID`}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNameInput(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnrollPasskey}
                disabled={loading}
                className="px-4 py-1.5 rounded-xl bg-[#00B8D4] hover:bg-[#00F5D4] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,184,212,0.3)] transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>{loading ? 'Prompting Sensor...' : 'Register Sensor'}</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (deviceLabel.name) {
                setCustomName(deviceLabel.name);
              }
              setShowNameInput(true);
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D4]/20 to-[#00F5D4]/10 hover:from-[#00B8D4]/30 hover:to-[#00F5D4]/20 border border-[#00B8D4]/40 text-[#00F5D4] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Register {deviceLabel.name} on this Device</span>
          </button>
        )}
      </div>

    </div>
  );
};
