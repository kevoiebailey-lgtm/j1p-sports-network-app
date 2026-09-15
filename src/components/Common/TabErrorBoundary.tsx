import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert, Database } from 'lucide-react';
import { clearLocalFirestoreCache } from '../../services/firestoreCacheService';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  tabName?: string;
  locationKey?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCount: number;
  isClearingCache: boolean;
  autoReloadCountdown?: number;
}

/**
 * TabErrorBoundary
 * Isolates rendering errors inside active tab views so the universal header,
 * bottom navigation dock, and other tabs remain completely operational.
 * Provides resilient retry with automated local cache clearance and data stream re-subscription.
 */
export class TabErrorBoundary extends Component<Props, State> {
  private countdownTimer?: ReturnType<typeof setInterval>;

  public state: State = {
    hasError: false,
    errorCount: 0,
    isClearingCache: false,
    autoReloadCountdown: undefined
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorCount: 1, isClearingCache: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[TabErrorBoundary] Caught tab error:', error, errorInfo);

    const errorMsg = error?.message?.toLowerCase() || '';
    const isChunkOrFetchError =
      errorMsg.includes('dynamically imported') ||
      errorMsg.includes('loading chunk') ||
      errorMsg.includes('failed to fetch') ||
      error?.name === 'ChunkLoadError';

    // If it is a transient dynamic import failure (e.g. server reload), schedule an automatic refresh
    if (isChunkOrFetchError && typeof window !== 'undefined') {
      let secondsLeft = 4;
      this.setState({ autoReloadCountdown: secondsLeft });
      this.countdownTimer = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          if (this.countdownTimer) clearInterval(this.countdownTimer);
          window.location.reload();
        } else {
          this.setState({ autoReloadCountdown: secondsLeft });
        }
      }, 1000);
    }
  }

  public componentWillUnmount() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.locationKey && this.props.locationKey !== prevProps.locationKey) {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }
      this.setState({
        hasError: false,
        error: undefined,
        isClearingCache: false,
        autoReloadCountdown: undefined
      });
    }
  }

  private handleRetry = async () => {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    const errorMsg = this.state.error?.message?.toLowerCase() || '';
    const isChunkOrFetchError =
      errorMsg.includes('dynamically imported') ||
      errorMsg.includes('loading chunk') ||
      errorMsg.includes('failed to fetch') ||
      this.state.error?.name === 'ChunkLoadError';

    if (isChunkOrFetchError) {
      window.location.reload();
      return;
    }

    this.setState({ isClearingCache: true });
    try {
      // 1. Clear local in-memory & query cache to purge stale permissions or broken documents
      await clearLocalFirestoreCache();
    } catch (e) {
      console.warn('[TabErrorBoundary] Cache clear notice:', e);
    } finally {
      // 2. Clear error state and allow children components to re-mount fresh
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined, isClearingCache: false });
      }, 150);
    }
  };

  private handleHardReload = async () => {
    try {
      await clearLocalFirestoreCache();
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message?.toLowerCase() || '';
      const isPermissionError =
        errorMsg.includes('permission-denied') ||
        errorMsg.includes('permission denied') ||
        errorMsg.includes('missing or insufficient permissions') ||
        errorMsg.includes('unauthorized') ||
        errorMsg.includes('storage/unauthorized');

      const isChunkError =
        this.state.error?.message?.includes('dynamically imported') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.name === 'ChunkLoadError';

      let title = this.props.fallbackTitle;
      if (!title) {
        if (isPermissionError) {
          title = 'Data Permission Notice';
        } else if (isChunkError) {
          title = this.state.autoReloadCountdown !== undefined
            ? `Re-establishing Module (${this.state.autoReloadCountdown}s)...`
            : 'Tab Re-synchronization Required';
        } else {
          title = 'Temporary View Glitch';
        }
      }

      let description = 'This tab encountered a temporary network sync or rendering delay. Your session and navigation remain active.';
      if (isPermissionError) {
        description = 'Access credentials or cached permissions needed a refresh. Tapping "Clear Cache & Retry" will flush stale local records and re-sync live data streams.';
      } else if (isChunkError) {
        description = this.state.autoReloadCountdown !== undefined
          ? `Dev server update or network reconnection detected. Automatically refreshing this view in ${this.state.autoReloadCountdown} seconds, or tap below to reload immediately.`
          : 'A new app update was published or the network was interrupted during module loading. Tap below to reload the latest version.';
      }

      return (
        <div className="w-full min-h-[380px] bg-[#090D16]/95 border border-slate-800/80 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center backdrop-blur-xl shadow-2xl space-y-5 animate-fadeIn my-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
            isPermissionError
              ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(0,184,212,0.2)]'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          }`}>
            {isPermissionError ? (
              <ShieldAlert className="w-8 h-8 text-[#00F5D4]" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            )}
          </div>

          <div className="max-w-md space-y-2">
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider font-sans">
              {title}
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              {description}
            </p>
            {this.state.error?.message && (
              <div className="mt-3 p-2.5 rounded-xl bg-black/50 border border-slate-800 text-[11px] font-mono text-slate-400 text-left overflow-x-auto max-h-20">
                {this.state.error.message}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              disabled={this.state.isClearingCache}
              className="px-5 py-2.5 rounded-xl bg-[#00B8D4] hover:bg-[#00F5D4] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,184,212,0.3)] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${this.state.isClearingCache ? 'animate-spin' : ''}`} />
              <span>{this.state.isClearingCache ? 'Re-syncing...' : isPermissionError ? 'Clear Cache & Retry' : 'Retry Tab'}</span>
            </button>

            <button
              onClick={this.handleHardReload}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border border-slate-700"
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>Refresh Page</span>
            </button>

            <button
              onClick={this.handleGoHome}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-800"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

