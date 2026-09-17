import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Sparkles, 
  UserPlus, 
  LogIn, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  ArrowRight,
  Shield,
  Activity,
  Flame,
  Award,
  Users,
  Search,
  Camera,
  Building2,
  Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { registerUserWithProfile } from '../../services/authService';

interface RoleChoice {
  id: UserRole;
  label: string;
  desc: string;
  icon: any;
  color: string;
}

const SIGNUP_ROLES: RoleChoice[] = [
  { id: 'member', label: 'Member', desc: 'Community Member & Fan', icon: Sparkles, color: 'text-cyan-400' },
  { id: 'athlete', label: 'Athlete', desc: 'HS & College Player', icon: Award, color: 'text-[#FF6A00]' },
  { id: 'coach', label: 'Coach', desc: 'Team & Academy Coach', icon: Users, color: 'text-[#00B8D4]' },
  { id: 'scout', label: 'Scout', desc: 'Recruiting Evaluator', icon: Search, color: 'text-amber-400' },
  { id: 'creator', label: 'Media / Creator', desc: 'Videographer & Highlights', icon: Camera, color: 'text-purple-400' },
  { id: 'organization', label: 'Organization', desc: 'Club, League & School', icon: Building2, color: 'text-emerald-400' },
  { id: 'viewer', label: 'Fan / Parent', desc: 'Supporter & Spectator', icon: Heart, color: 'text-rose-400' }
];

export const MandatoryAuthGate: React.FC = () => {
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    signInWithAdminKey, 
    sendPasswordReset,
    resendVerificationEmail,
    signInGuest,
    setDemoProfile
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'admin'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('member');
  const [adminPasskey, setAdminPasskey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (authMode === 'signin') {
        if (!cleanEmail || !password) {
          throw new Error('Please provide both your email address and password.');
        }
        await signInWithEmail(cleanEmail, password);
      } else if (authMode === 'signup') {
        if (!cleanEmail || !password || !fullName.trim()) {
          throw new Error('Please fill in your full name, email, and choose a secure password.');
        }
        if (password.length < 6) {
          throw new Error('Password must contain at least 6 characters.');
        }
        // Unified authentication handler: createUserWithEmailAndPassword, updateProfile, and /users/${user.uid} Firestore doc
        await registerUserWithProfile({
          email: cleanEmail,
          password,
          displayName: fullName.trim(),
          role: selectedRole
        });
        setSuccessMessage('Account registered successfully! Loading your athletic profile hub...');
      } else if (authMode === 'forgot') {
        if (!cleanEmail) {
          throw new Error('Please enter your account email address.');
        }
        const res = await sendPasswordReset(cleanEmail);
        setSuccessMessage(res.message);
      } else if (authMode === 'admin') {
        if (!adminPasskey.trim()) {
          throw new Error('Please enter the administrative platform passkey.');
        }
        await signInWithAdminKey(adminPasskey.trim(), cleanEmail || 'kevoiebailey@gmail.com');
        setSuccessMessage('Administrator credential authorized. Launching command center...');
      }
    } catch (err: any) {
      console.error('Authentication gate error:', err);
      let msg = err?.message || 'Authentication failed. Please verify your credentials.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid email or password combination. If you forgot your password, use the reset option below.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email address already exists. Please switch to Sign In.';
      } else if (msg.includes('auth/network-request-failed')) {
        msg = 'Network connection interrupted. Please check your internet connection.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await signInWithGoogle(selectedRole);
    } catch (err: any) {
      console.error('Google Auth Gate Error:', err);
      setError(err?.message || 'Google authentication encountered an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (roleToUse: UserRole = 'athlete') => {
    setError(null);
    setLoading(true);
    try {
      await signInGuest(roleToUse);
    } catch (err: any) {
      console.error('Demo login notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError('Please enter your account email above first.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await resendVerificationEmail(email.trim().toLowerCase());
      setSuccessMessage(res.message);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-x-hidden selection:bg-[#FF6A00] selection:text-white">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-radial from-[#FF6A00]/15 via-[#00B8D4]/10 to-transparent blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[350px] bg-radial from-[#00E5FF]/10 to-transparent blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1E293B08_1px,transparent_1px),linear-gradient(to_bottom,#1E293B08_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111928] border border-white/10 shadow-[0_0_20px_rgba(255,106,0,0.15)] mb-3">
            <Flame className="w-4 h-4 text-[#FF6A00]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#FF6A00] uppercase">
              ATHLETIC RECRUITING & MEDIA PLATFORM
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
            <span>JUST</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF9100]">1</span>
            <span>PLAY</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Authentication Required • High School & Collegiate Sports Hub
          </p>
        </div>

        {/* Auth Container */}
        <div className="bg-[#0B111E]/95 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#060A12] rounded-2xl border border-white/5 mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#E55D00] text-white shadow-lg shadow-[#FF6A00]/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-[#00B8D4] to-[#0097A7] text-white shadow-lg shadow-[#00B8D4]/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>

          {/* Error & Success Alert Banners */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 font-medium"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                {error.includes('unverified') && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="mt-1 text-[11px] font-bold text-amber-400 underline hover:text-amber-300 block cursor-pointer"
                  >
                    Click to resend verification email →
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 font-medium"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="flex-1">{successMessage}</p>
            </motion.div>
          )}

          {/* Google OAuth Quick Button */}
          {authMode !== 'admin' && (
            <>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50 mb-4"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
                <span>Continue with Google Account</span>
              </button>

              <div className="relative flex items-center justify-center mb-4">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0B111E] px-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest absolute">
                  OR WITH EMAIL
                </span>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                    Select Your Platform Role
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
                    {SIGNUP_ROLES.map((r) => {
                      const Icon = r.icon;
                      const isChosen = selectedRole === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRole(r.id)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isChosen
                              ? 'bg-[#00B8D4]/15 border-[#00B8D4] text-white shadow-sm shadow-[#00B8D4]/20'
                              : 'bg-[#060A12] border-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                            <span className="text-[11px] font-bold tracking-tight">{r.label}</span>
                          </div>
                          <p className="text-[9px] font-mono text-slate-500 truncate">{r.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                    Full Name / Athlete Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jordan Hayes"
                      className="w-full bg-[#060A12] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00B8D4] transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {authMode !== 'admin' && (
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="athlete@domain.com"
                    className="w-full bg-[#060A12] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] transition-all"
                  />
                </div>
              </div>
            )}

            {authMode !== 'forgot' && authMode !== 'admin' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Password
                  </label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] font-mono text-[#00B8D4] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#060A12] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF6A00] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Admin Key Bypass Mode */}
            {authMode === 'admin' && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                  <p className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Admin Passkey Verification
                  </p>
                  <span>Administrative access strictly authenticates authorized Just1Play Operations Staff.</span>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kevoiebailey@gmail.com"
                    className="w-full bg-[#060A12] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                      Security Passkey
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdminPasskey('JUST1PLAY2025')}
                      className="text-[10px] font-mono text-amber-400 hover:underline cursor-pointer"
                    >
                      Fill Default Staff Passkey
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminPasskey}
                      onChange={(e) => setAdminPasskey(e.target.value)}
                      placeholder="Enter Admin Passkey"
                      className="w-full bg-[#060A12] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-50 ${
                authMode === 'signup'
                  ? 'bg-[#00B8D4] hover:bg-[#0097A7] text-black shadow-[#00B8D4]/20'
                  : authMode === 'admin'
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                  : 'bg-[#FF6A00] hover:bg-[#E55D00] text-white shadow-[#FF6A00]/20'
              }`}
            >
              {loading ? (
                <span>Authenticating with Just1Play...</span>
              ) : authMode === 'signup' ? (
                <>
                  <span>Create Account & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : authMode === 'forgot' ? (
                <>
                  <span>Send Reset Email</span>
                  <Mail className="w-4 h-4" />
                </>
              ) : authMode === 'admin' ? (
                <>
                  <span>Authorize Passkey</span>
                  <ShieldCheck className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Enter Just1Play Hub</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Instant 1-Click Athlete Demo Button */}
          {authMode === 'signin' && (
            <div className="mt-3.5 pt-3.5 border-t border-white/5 text-center">
              <button
                type="button"
                onClick={() => handleDemoLogin('athlete')}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-[11px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>Quick Test Mode: 1-Click Athlete Access</span>
              </button>
            </div>
          )}

          {/* Secondary Action Triggers */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
            {authMode === 'admin' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[#00B8D4] hover:underline cursor-pointer flex items-center gap-1"
              >
                ← Back to Member Login
              </button>
            ) : authMode === 'forgot' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[#00B8D4] hover:underline cursor-pointer flex items-center gap-1"
              >
                ← Back to Sign In
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
                >
                  Resend verification
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('admin');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-slate-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Admin Passkey</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-5 text-center text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Platform Security • Firestore Profile Binding Enforced</span>
        </div>
      </motion.div>
    </div>
  );
};
export default MandatoryAuthGate;
