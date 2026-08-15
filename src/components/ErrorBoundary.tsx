import React, { ReactNode, Component } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ComponentType {
  new (props: ErrorBoundaryProps): {
    props: ErrorBoundaryProps;
    state: ErrorBoundaryState;
    setState(state: Partial<ErrorBoundaryState> | ((prevState: ErrorBoundaryState) => Partial<ErrorBoundaryState>)): void;
    render(): ReactNode;
  };
}

export class ErrorBoundary extends (Component as unknown as ComponentType) {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[200] bg-[#060608] flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#0c0c10] border border-white/10 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertCircle size={28} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black font-display text-white">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed font-sans">
                An unexpected error occurred while rendering this section. You can retry or return to the main contest.
              </p>
              {this.state.error && (
                <div className="p-3 rounded-xl bg-black/50 border border-white/5 text-[11px] font-mono text-red-400/80 break-all text-left max-h-24 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
              {this.props.onReset && (
                <button
                  type="button"
                  onClick={this.props.onReset}
                  className="px-5 py-2.5 rounded-xl bg-fivem-orange hover:bg-orange-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-fivem-orange/20"
                >
                  <ArrowLeft size={13} />
                  <span>Close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
