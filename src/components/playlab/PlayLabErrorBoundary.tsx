import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PlayLabErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PlayLab Canvas ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-[#0B0F19] rounded-3xl border border-rose-500/30 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
            Vector Canvas Protected
          </h3>

          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            The PlayLab vector calculation engine isolated an invalid coordinate or path geometry error to protect your active playbook session.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-[#00F0D0] hover:bg-[#00d0b4] text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#00F0D0]/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Default Preset</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>
          </div>

          {this.state.error && (
            <div className="mt-6 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 max-w-lg overflow-x-auto text-left">
              {this.state.error.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default PlayLabErrorBoundary;
