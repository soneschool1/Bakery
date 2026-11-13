import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 antialiased">
          <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-2xl font-black">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-stone-900">
                {this.props.title || 'Something went wrong in this section'}
              </h2>
              <p className="text-xs text-stone-500 font-semibold">
                An unexpected interface error occurred. Your bakery data is safe on the server.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-left font-mono text-[11px] text-rose-800 break-words max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-[#064e3b] hover:bg-emerald-900 text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
