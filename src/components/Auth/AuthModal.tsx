import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, User, Shield, Sparkles, AlertCircle, CheckCircle2, ArrowRight, KeyRound, Zap, RefreshCw, Send, Fingerprint } from 'lucide-react';
import { useAuth, getRoleDashboardUrl } from '../../context/AuthContext';
import { ensureAuthReady } from '../../lib/firebase';
import { UserRole, UserProfile } from '../../types';
import { BrandLogo } from '../Common/BrandLogo';
import { isWebAuthnSupported, getDeviceBiometricLabel, getLastPasskeyUser } from '../../services/webAuthnService';
import { registerUserWithProfile } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup' | 'reset' | 'verify' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { signInWithEmail, signUpWithEmail, sendPasswordReset, resendVerificationEmail, signInWithGoogle, signInWithWebAuthn, signInWithAdminKey, switchRole } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'verify' | 'admin'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('athlete');
  
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Face ID / Touch ID');
  const [lastPasskeyUser, setLastPasskeyUser] = useState<{ uid: string; email: string; deviceName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function checkWebAuthn() {
      const supported = await isWebAuthnSupported();
      setWebAuthnAvailable(supported);
      const label = getDeviceBiometricLabel();
      setBiometricLabel(label.name);
      const lastUser = getLastPasskeyUser();
      setLastPasskeyUser(lastUser);
      if (lastUser?.email && !email) {
        setEmail(lastUser.email);
      }
    }
    if (isOpen) {
      checkWebAuthn();
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAutoRedirect = async (userProf: UserProfile | null, fallbackRole: UserRole) => {
    try {
      await ensureAuthReady();
    } catch (authErr) {
      console.warn('ensureAuthReady before redirect warning:', authErr);
    }
    const targetRole = userProf?.role || fallbackRole;
    const hasCompleted = userProf?.hasCompletedOnboarding;
    
    const targetUrl = getRoleDashboardUrl(targetRole, hasCompleted);
    onClose();
    navigate(targetUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      if (mode === 'login') {
        if (!cleanEmail || !cleanPassword) {
          setError('Please enter both email and password.');
          setLoading(false);
          return;
        }
        const userProf = await signInWithEmail(cleanEmail, cleanPassword);
        handleAutoRedirect(userProf, role);
      } else if (mode === 'signup') {
        if (!cleanEmail || !cleanPassword || !displayName.trim()) {
          setError('Please fill out all required fields.');
          setLoading(false);
          return;
        }
        if (cleanPassword.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        // Unified authentication handler: createUserWithEmailAndPassword, updateProfile, and /users/${user.uid} Firestore doc
        const { profile: userProf } = await registerUserWithProfile({
          email: cleanEmail,
          password: cleanPassword,
          displayName: displayName.trim(),
          role: role
        });
        handleAutoRedirect(userProf, role);
      } else if (mode === 'reset') {
        if (!cleanEmail) {
          setError('Please enter your email address to receive reset instructions.');
          setLoading(false);
          return;
        }
        const res = await sendPasswordReset(cleanEmail);
        setSuccessMsg(res.message || `Password reset link sent to ${cleanEmail}. Check your inbox!`);
      } else if (mode === 'verify') {
        if (!cleanEmail) {
          setError('Please enter your email address to send the verification link.');
          setLoading(false);
          return;
        }
        const res = await resendVerificationEmail(cleanEmail);
        setSuccessMsg(res.message || `Verification link sent to ${cleanEmail}. Check your inbox!`);
      } else if (mode === 'admin') {
        if (!adminKey.trim()) {
          setError('Please enter your Administrative Access Passkey.');
          setLoading(false);
          return;
        }
        const userProf = await signInWithAdminKey(adminKey.trim(), cleanEmail || 'kevoiebailey@gmail.com');
        setSuccessMsg('Administrative authentication confirmed! Access granted to Just1Play Operations.');
        setTimeout(() => {
          handleAutoRedirect(userProf, 'admin');
        }, 350);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err?.message || 'Authentication failed. Please try again.';
      if (message.includes('auth/invalid-credential') || message.includes('auth/user-not-found')) {
        message = 'Invalid email or password. If your account is unverified or you need a password reset, use the triggers below.';
      } else if (message.includes('auth/email-already-in-use')) {
        message = 'An account with this email already exists. Try signing in or resetting your password.';
      } else if (message.includes('auth/api-key-not-valid') || message.includes('api-key-not-valid') || message.includes('auth/invalid-api-key')) {
        message = 'Firebase API Key is invalid or not yet configured. Please set VITE_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY in your environment configuration.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickResendVerification = async () => {
    if (!email) {
      setMode('verify');
      setError('Please enter your email address below to receive your verification link.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await resendVerificationEmail(email);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const userProf = await signInWithGoogle(role);
      handleAutoRedirect(userProf, role);
    } catch (err: any) {
      setError(err?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setBiometricLoading(true);
    try {
      const userProf = await signInWithWebAuthn({
        email: email.trim() || lastPasskeyUser?.email || undefined,
        uid: lastPasskeyUser?.uid || undefined
      });
      
      if (userProf) {
        setSuccessMsg(`Welcome back, ${userProf.displayName || 'Athlete'}! Biometric verification verified.`);
        setTimeout(() => {
          handleAutoRedirect(userProf, userProf.role || role);
        }, 350);
      } else {
        setError('Biometric authentication verified, but no matching account found. Sign in with password or Google to link your passkey.');
      }
    } catch (err: any) {
      console.error('Biometric auth error:', err);
      setError(err?.message || 'Biometric verification cancelled or unavailable.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-sans overflow-hidden"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md mx-auto my-auto max-h-[92dvh] overflow-y-auto no-scrollbar rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151C22] border border-slate-200 dark:border-white/15 p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-[#263238] dark:text-white flex flex-col"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF6A00]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-4">
          <div className="flex justify-center pb-0.5">
            <BrandLogo size="md" layout="vertical" showTagline={false} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-[#263238] dark:text-white font-sans">
            {mode === 'login' && 'Sign In to Just1Play'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'reset' && 'Reset Password'}
            {mode === 'verify' && 'Resend Email Verification'}
            {mode === 'admin' && 'Admin Passkey Access'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {mode === 'login' && 'Access tournament brackets, recruit matrix, and 4K media reels'}
            {mode === 'signup' && 'Select your sports role and join the verified talent network'}
            {mode === 'reset' && 'Enter your account email to receive password reset instructions'}
            {mode === 'verify' && 'Blocked by unverified status? We will resend your activation link'}
            {mode === 'admin' && 'Authenticate using your pre-shared secret key to bypass onboarding and access administrative desks'}
          </p>
        </div>

        {/* Recovery Mode Selector Tabs (For Reset / Verify Modes) */}
        {(mode === 'reset' || mode === 'verify') && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 mb-5">
            <button
              type="button"
              onClick={() => { setMode('reset'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'reset' 
                  ? 'bg-white dark:bg-[#263238] text-[#FF6A00] shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password Reset</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('verify'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'verify' 
                  ? 'bg-white dark:bg-[#263238] text-[#FF6A00] shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resend Verification</span>
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs flex flex-col gap-2 font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            {mode === 'login' && (
              <div className="flex items-center gap-3 pt-1 border-t border-red-500/20 text-[11px]">
                <button
                  type="button"
                  onClick={handleQuickResendVerification}
                  className="text-[#FF6A00] hover:underline font-bold"
                >
                  Resend Verification Email
                </button>
                <span className="text-slate-400">•</span>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(null); }}
                  className="text-[#FF6A00] hover:underline font-bold"
                >
                  Reset Password
                </button>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#FF6A00]/15 border border-[#FF6A00]/30 text-[#FF6A00] text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#FF6A00]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Display Name (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider mb-1 block">
                Full Name / Athlete Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 text-xs text-[#263238] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6A00]"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider mb-1 block">
              {mode === 'admin' ? 'Admin Account Email (Optional)' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required={mode !== 'admin'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'admin' ? 'kevoiebailey@gmail.com' : 'you@domain.com'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 text-base sm:text-xs text-[#263238] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6A00]"
              />
            </div>
          </div>

          {/* Admin Passkey / Master Secret (Admin Mode Only) */}
          {mode === 'admin' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#FF6A00] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span>Administrative Master Key</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Bypasses Onboarding</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#FF6A00] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter pre-shared Admin Passkey..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/60 border border-[#FF6A00]/50 text-base sm:text-xs text-[#263238] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00] font-mono"
                />
              </div>
            </div>
          )}

          {/* Password (Login or Sign Up) */}
          {(mode === 'login' || mode === 'signup') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setMode('verify'); setError(null); setSuccessMsg(null); }}
                      className="text-[10px] text-cyan-500 hover:underline font-bold font-mono"
                    >
                      Resend Link
                    </button>
                    <span className="text-slate-400 text-[10px]">•</span>
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(null); setSuccessMsg(null); }}
                      className="text-[10px] text-[#FF6A00] hover:underline font-bold font-mono"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 text-base sm:text-xs text-[#263238] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6A00]"
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading || biometricLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8C00] hover:from-[#E05D00] hover:to-[#FF6A00] text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,106,0,0.45)] border border-[#FFC857]/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Sign In with Password'}
                  {mode === 'signup' && 'Create Free Account'}
                  {mode === 'reset' && 'Send Password Reset Email'}
                  {mode === 'verify' && 'Resend Email Verification'}
                  {mode === 'admin' && 'Authenticate Admin & Enter'}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Biometric WebAuthn Passkey Login (For Login Mode) */}
        {mode === 'login' && webAuthnAvailable && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
            <button
              type="button"
              onClick={handleBiometricSignIn}
              disabled={biometricLoading || loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00B8D4]/15 via-[#00F5D4]/20 to-[#00B8D4]/15 hover:from-[#00B8D4]/25 hover:to-[#00F5D4]/30 border border-[#00B8D4]/50 text-[#00E5FF] dark:text-[#00F5D4] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,184,212,0.25)] transition-all cursor-pointer disabled:opacity-50"
            >
              {biometricLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#00F5D4]" />
              ) : (
                <Fingerprint className="w-4 h-4 text-[#00F5D4]" />
              )}
              <span>
                {biometricLoading ? 'Scanning Biometrics...' : `Sign in with ${biometricLabel}`}
              </span>
            </button>
            {lastPasskeyUser && (
              <p className="text-[10px] text-center text-slate-400 font-mono">
                Saved passkey for <span className="text-[#00F5D4] font-bold">{lastPasskeyUser.email || lastPasskeyUser.deviceName}</span>
              </p>
            )}
          </div>
        )}

        {/* Google Auth Divider */}
        {(mode === 'login' || mode === 'signup') && (
          <div className={`pt-3 text-center space-y-3 ${mode === 'login' && webAuthnAvailable ? '' : 'mt-5 pt-4 border-t border-slate-200 dark:border-white/10'}`}>
            <p className="text-[10px] text-slate-400 uppercase font-mono font-bold">
              Or continue with Google One-Tap
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading || biometricLoading}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/20 text-[#263238] dark:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        )}

        {/* Mode Switcher Footer */}
        <div className="mt-5 text-center text-xs font-mono space-y-2">
          {mode === 'login' && (
            <>
              <p className="text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-[#FF6A00] hover:underline font-bold"
                >
                  Sign Up Free
                </button>
              </p>
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => { setMode('admin'); setError(null); setSuccessMsg(null); }}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-[#FF6A00] dark:hover:text-[#FF6A00] flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span>Admin Passkey Authentication</span>
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <p className="text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#FF6A00] hover:underline font-bold"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === 'admin' && (
            <p className="text-slate-500 dark:text-slate-400">
              Standard athlete or member?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className="text-[#FF6A00] hover:underline font-bold"
              >
                Return to Member Sign In
              </button>
            </p>
          )}

          {(mode === 'reset' || mode === 'verify') && (
            <p className="text-slate-500 dark:text-slate-400">
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#FF6A00] hover:underline font-bold"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default AuthModal;

