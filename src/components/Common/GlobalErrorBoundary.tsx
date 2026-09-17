import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, ShieldAlert, Trash2 } from 'lucide-react';
import { pruneStaleFirestoreLeaseKeys } from '../../lib/firebase';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isClearingCache?: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isClearingCache: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Just1Play App:', error, errorInfo);
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    // Suppress benign Vite dev-server HMR WebSocket notices
    const msg = typeof reason === 'string' ? reason : (reason?.message || reason?.toString?.() || '');
    if (msg.includes('WebSocket') || msg.includes('websocket')) return;

    console.warn('[GlobalErrorBoundary] Caught unhandled async rejection (non-fatal):', reason);
    // CRITICAL: Do NOT crash the entire UI on non-fatal async background rejections
    // React Error Boundaries only catch render lifecycle errors via getDerivedStateFromError
  };

  private handleWindowError = (event: ErrorEvent) => {
    const error = event.error;
    const msg = event.message || '';
    if (msg.includes('WebSocket') || msg.includes('websocket')) return;

    console.warn('[GlobalErrorBoundary] Caught global window error (non-fatal):', error || msg);
    // CRITICAL: Do NOT crash the entire UI on script resource warnings or background errors
  };

  public componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
      window.addEventListener('error', this.handleWindowError);
    }
  }

  public componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
      window.removeEventListener('error', this.handleWindowError);
    }
  }

  private handleClearCacheAndReload = async () => {
    this.setState({ isClearingCache: true });
    try {
      if (typeof window !== 'undefined') {
        // 1. Purge stale Firestore leases from localStorage (keeping Auth keys intact)
        pruneStaleFirestoreLeaseKeys();

        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            // CRITICAL: Protect Firebase Auth, Firestore multi-tab leases, and user account credentials from deletion
            if (
              k && 
              !k.startsWith('firebase') && 
              !k.startsWith('firestore') && 
              !k.startsWith('just1play_admin') && 
              !k.startsWith('just1play_user') &&
              !k.startsWith('just1play_active_role') &&
              !k.startsWith('just1play_profile')
            ) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => {
            try { localStorage.removeItem(k); } catch {}
          });
          sessionStorage.clear();
        } catch (storageErr) {
          console.warn('Storage purge warning:', storageErr);
        }

        // 2. Clear browser CacheStorage
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          } catch (cacheErr) {
            console.warn('Cache clear warning:', cacheErr);
          }
        }
      }
    } catch (e) {
      console.warn('Global cache clear error:', e);
    } finally {
      this.setState({ hasError: false, error: undefined, isClearingCache: false });
      window.location.replace('/');
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || '';
      const isQuotaOrAssertion =
        errorMsg.includes('QuotaExceededError') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('b815') ||
        errorMsg.includes('Unexpected state');

      const isChunkError =
        errorMsg.includes('dynamically imported module') ||
        errorMsg.includes('Loading chunk') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div 
          id="global-error-boundary-screen"
          className="min-h-[100dvh] bg-[#08090C] text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans antialiased select-none"
          style={{ backgroundColor: '#08090C', color: '#FFFFFF' }}
        >
          {/* Recovery Surface Card */}
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#12151C] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.8)] space-y-6">
            
            {/* Crest Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFB800]/10 border border-[#FFB800]/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,184,0,0.2)]">
              <ShieldAlert className="w-8 h-8 text-[#FFB800]" />
            </div>
            
            {/* Header & Subtitle */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white font-sans">
                {isQuotaOrAssertion
                  ? 'Storage Quota Recovered'
                  : isChunkError
                  ? 'Platform Update Available'
                  : 'Temporary View Glitch'}
              </h1>
              
              <p className="text-xs text-[#8E9BB0] font-medium leading-relaxed">
                {isQuotaOrAssertion
                  ? 'Browser storage limit exceeded. Tap below to clear cached queries and restore smooth operation.'
                  : isChunkError
                  ? 'A fresh update was published to Just1Play. Tap below to clear local assets and load the latest version.'
                  : 'An unexpected rendering state occurred. Tap below to clear cached session data and restart cleanly.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                id="btn-clear-cache-reload"
                type="button"
                onClick={this.handleClearCacheAndReload}
                disabled={this.state.isClearingCache}
                className="w-full sm:w-auto flex-1 bg-[#00F0D0] hover:bg-[#00D8BC] text-slate-950 font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,240,208,0.3)] transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {this.state.isClearingCache ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{this.state.isClearingCache ? 'Clearing...' : 'Clear Cache & Reload'}</span>
              </button>

              <button
                id="btn-error-go-home"
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto flex-1 bg-[#08090C] hover:bg-white/5 text-[#8E9BB0] hover:text-white font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-white/[0.08] transition-all active:scale-[0.97]"
              >
                <Home className="w-4 h-4" />
                <span>Return Home</span>
              </button>
            </div>

            {/* Error telemetry details (safe & concise) */}
            {errorMsg && (
              <div className="pt-2 text-[10px] font-mono text-zinc-500 truncate max-w-full text-center">
                Ref: {errorMsg.substring(0, 70)}...
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
