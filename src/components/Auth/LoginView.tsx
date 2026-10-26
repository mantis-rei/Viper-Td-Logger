import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Cloud,
  Layers,
  Lock,
  Shield,
  Smartphone,
  Sparkles,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  getRememberedLogin,
  signInWithGoogle,
  RememberedLogin,
} from '../../lib/firebase';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
  onContinueAsGuest: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [remembered] = useState<RememberedLogin | null>(getRememberedLogin());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const user = await signInWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastActive = (timestamp?: number) => {
    if (!timestamp) return 'Recently';
    const diffHours = Math.round((Date.now() - timestamp) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const days = Math.round(diffHours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-[500px] h-[300px] bg-sky-500/5 blur-3xl pointer-events-none" />

      {/* Top micro bar */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 flex items-center justify-center font-black tracking-tight text-white shadow-sm shadow-emerald-500/20 text-xs">
            VTL
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            Viper Td Logger
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/80 bg-emerald-950/30 border border-emerald-800/30 px-3 py-1 rounded-full">
          <span>MNQ · MES · Cloud Synced</span>
        </div>
      </header>

      {/* Center login card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10 my-4">
        <div className="w-full max-w-md bg-[#0c1222]/90 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Brand Wordmark & Tagline */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 flex items-center justify-center mx-auto text-white font-black text-xl shadow-lg shadow-emerald-500/20">
              VTL
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white pt-1">
              Viper Td Logger
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Institutional Futures Journal & Empirical Execution Gate Analytics
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Remembered User Banner */}
          {remembered && (
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {remembered.photoURL ? (
                  <img
                    src={remembered.photoURL}
                    alt={remembered.displayName || 'User'}
                    className="w-10 h-10 rounded-full border border-emerald-500/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-300 font-bold shrink-0">
                    {(remembered.displayName || remembered.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate block">
                      {remembered.displayName || 'Google Trader'}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-semibold">
                      Remembered
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block font-mono">
                    {remembered.email}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Active {formatLastActive(remembered.lastLoginAt)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Primary Action Button: Sign In with Google */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
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
              )}
              <span>
                {isLoading
                  ? 'Connecting to Google...'
                  : remembered
                  ? `Continue as ${remembered.displayName?.split(' ')[0] || 'User'}`
                  : 'Sign in with Google'}
              </span>
            </button>

            {/* Offline Guest Option */}
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="w-full py-2.5 px-3 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-800/40 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Continue in Guest / Offline Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Feature Pillars */}
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-left">
            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
              <Cloud className="w-3.5 h-3.5 text-sky-400 mb-1" />
              <span className="text-[11px] font-bold text-white block">Cloud Synced</span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Any screen, anywhere
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
              <Shield className="w-3.5 h-3.5 text-emerald-400 mb-1" />
              <span className="text-[11px] font-bold text-white block">6 Gate Rules</span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Empirical edge stats
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400 mb-1" />
              <span className="text-[11px] font-bold text-white block">Chart Vault</span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                5m screenshots kept
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-[11px] text-slate-500 font-mono z-10">
        Viper Td Logger · Powered by Google Firebase & Cloud Firestore
      </footer>
    </div>
  );
};
