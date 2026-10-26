import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  ExternalLink,
  HardDrive,
  HelpCircle,
  Image as ImageIcon,
  Key,
  Layers,
  Lock,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  clearFirebaseConfig,
  getFirebaseConfig,
  isFirebaseConfigured,
  saveFirebaseConfig,
  signInWithGoogle,
  signOutUser,
  FirebaseConfig,
} from '../../lib/firebase';
import { performFullSync } from '../../lib/cloudSync';
import { TradeRecord } from '../../types/trade';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  trades: TradeRecord[];
  onTradesUpdated: (mergedTrades: TradeRecord[]) => void;
  onShowToast: (message: string) => void;
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  lastSyncedAt: Date | null;
  setLastSyncedAt: (date: Date) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  trades,
  onTradesUpdated,
  onShowToast,
  isSyncing,
  setIsSyncing,
  lastSyncedAt,
  setLastSyncedAt,
}) => {
  const [showConfigSettings, setShowConfigSettings] = useState(!isFirebaseConfigured());
  const [showRulesHelper, setShowRulesHelper] = useState(false);
  const [rawConfigInput, setRawConfigInput] = useState('');
  const [apiKey, setApiKey] = useState(getFirebaseConfig()?.apiKey || '');
  const [projectId, setProjectId] = useState(getFirebaseConfig()?.projectId || '');
  const [authDomain, setAuthDomain] = useState(getFirebaseConfig()?.authDomain || '');
  const [appId, setAppId] = useState(getFirebaseConfig()?.appId || '');
  const [storageBucket, setStorageBucket] = useState(getFirebaseConfig()?.storageBucket || '');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [configSuccessMessage, setConfigSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured()) {
      setShowConfigSettings(true);
      setErrorMessage('Please configure your Firebase credentials below before signing in.');
      return;
    }

    try {
      setIsSigningIn(true);
      setErrorMessage(null);
      const user = await signInWithGoogle();
      onShowToast(`Signed in as ${user.displayName || user.email}`);

      // Perform immediate sync
      setIsSyncing(true);
      const merged = await performFullSync(user, trades);
      onTradesUpdated(merged);
      setLastSyncedAt(new Date());
      setIsSyncing(false);
      onShowToast(`Synced ${merged.length} trades with Google Cloud.`);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google. Check Firebase Console configuration.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      onShowToast('Signed out of Google Cloud.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error signing out.');
    }
  };

  const handleManualSync = async () => {
    if (!currentUser) return;
    try {
      setIsSyncing(true);
      setErrorMessage(null);
      const merged = await performFullSync(currentUser, trades);
      onTradesUpdated(merged);
      setLastSyncedAt(new Date());
      onShowToast(`Cloud synchronization complete (${merged.length} trades).`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync with cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper to parse pasted Firebase config snippet
  const handleParseRawConfig = (raw: string) => {
    setRawConfigInput(raw);
    try {
      // Matches both JSON and JS object literal notation
      const extractField = (key: string) => {
        const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
        const match = raw.match(regex);
        return match ? match[1] : '';
      };

      const extractedApiKey = extractField('apiKey');
      const extractedProjectId = extractField('projectId');
      const extractedAuthDomain = extractField('authDomain');
      const extractedAppId = extractField('appId');
      const extractedStorageBucket = extractField('storageBucket');

      if (extractedApiKey) setApiKey(extractedApiKey);
      if (extractedProjectId) setProjectId(extractedProjectId);
      if (extractedAuthDomain) setAuthDomain(extractedAuthDomain);
      if (extractedAppId) setAppId(extractedAppId);
      if (extractedStorageBucket) setStorageBucket(extractedStorageBucket);

      if (extractedApiKey && extractedProjectId) {
        setConfigSuccessMessage('Detected Firebase credentials from pasted snippet!');
        setTimeout(() => setConfigSuccessMessage(null), 3000);
      }
    } catch (e) {
      // ignore parse errors while typing
    }
  };

  const handleSaveConfig = () => {
    if (!apiKey || !projectId) {
      setErrorMessage('API Key and Project ID are required.');
      return;
    }

    const newConfig: FirebaseConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      appId: appId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
    };

    saveFirebaseConfig(newConfig);
    setConfigSuccessMessage('Firebase configuration saved successfully! You can now sign in.');
    setErrorMessage(null);
    setTimeout(() => {
      setConfigSuccessMessage(null);
      setShowConfigSettings(false);
    }, 2000);
  };

  const handleResetConfig = () => {
    if (confirm('Reset custom Firebase configuration?')) {
      clearFirebaseConfig();
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setAppId('');
      setStorageBucket('');
      setRawConfigInput('');
      onShowToast('Firebase configuration reset.');
    }
  };

  const firestoreRulesSample = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/trades/{tradeId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/screenshots/{imageId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  return (
    <div id="cloud-sync-modal" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b101d] border border-slate-800/90 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-950 via-[#0a1222] to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-sky-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Cloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Viper Td Logger — Cloud Sync
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Google Firebase
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Access your trades, rules, and chart screenshots online across all devices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status / Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Sync Notification:</span>
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-200 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {configSuccessMessage && (
            <div className="p-3.5 rounded-xl border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{configSuccessMessage}</span>
            </div>
          )}

          {/* Section 1: User Profile / Sign In */}
          {currentUser ? (
            <div className="bg-gradient-to-br from-slate-900 to-[#0e1628] border border-slate-800/90 rounded-xl p-4.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google Account'}
                      className="w-12 h-12 rounded-full border-2 border-sky-500/40 shadow-md object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-sky-950 border border-sky-800/60 flex items-center justify-center text-sky-300 font-bold text-lg">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {currentUser.displayName || 'Google User'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block font-mono">
                      {currentUser.email}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Cloud User ID: <span className="font-mono text-slate-400">{currentUser.uid.slice(0, 10)}...</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 rounded-lg transition-colors text-xs"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sync Metrics Dashboard */}
              <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-800/80">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-sky-400" />
                    Ledger Size
                  </span>
                  <span className="text-base font-bold text-white mt-0.5 block">
                    {trades.length} trades
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-indigo-400" />
                    Screenshots
                  </span>
                  <span className="text-base font-bold text-white mt-0.5 block">
                    Auto-Synced
                  </span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    Last Synced
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 mt-1 block">
                    {lastSyncedAt
                      ? lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-900/90 via-[#0e1628]/80 to-slate-900/90 border border-slate-800/90 rounded-2xl p-6 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/10">
                <svg className="w-7 h-7" viewBox="0 0 24 24">
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
              </div>

              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-lg font-bold text-white tracking-tight">
                  Sign in with Google to Enable Cloud Sync
                </h4>
                <p className="text-xs text-slate-400">
                  Connect your Google account to automatically synchronize your trade logs, analytics, and chart screenshots across all your devices.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50"
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
                  <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                </button>
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <Smartphone className="w-4 h-4 text-sky-400 mb-1.5" />
                  <span className="font-semibold text-white text-xs block">Multi-Device Access</span>
                  <span className="text-[11px] text-slate-400">
                    Switch between desktop, phone, or laptop with zero sync friction.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <ImageIcon className="w-4 h-4 text-indigo-400 mb-1.5" />
                  <span className="font-semibold text-white text-xs block">Chart Screenshots</span>
                  <span className="text-[11px] text-slate-400">
                    5m entry and exit chart snapshots safely stored in Google Cloud.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1.5" />
                  <span className="font-semibold text-white text-xs block">Private & Isolated</span>
                  <span className="text-[11px] text-slate-400">
                    Encrypted under your private Google user profile ID.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Firebase Connection Settings & Credentials */}
          <div className="border border-slate-800/90 rounded-xl overflow-hidden bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowConfigSettings(!showConfigSettings)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-xs">
                      Firebase Project Credentials
                    </span>
                    {isFirebaseConfigured() ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        Configured
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                        Setup Required
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {isFirebaseConfigured()
                      ? `Target Project: ${getFirebaseConfig()?.projectId || 'Configured via Env'}`
                      : 'Connect your free Google Firebase project to host online'}
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-sky-400">
                {showConfigSettings ? 'Hide' : 'Configure'}
              </span>
            </button>

            {showConfigSettings && (
              <div className="p-4 pt-1 space-y-4 border-t border-slate-800/80 text-xs bg-slate-900/30">
                {/* Quick instructions banner */}
                <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/40 text-slate-300 space-y-1">
                  <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    How to get your free Google Firebase credentials:
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-400 pl-1">
                    <li>
                      Visit{' '}
                      <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 underline inline-flex items-center gap-0.5"
                      >
                        console.firebase.google.com <ExternalLink className="w-2.5 h-2.5 inline" />
                      </a>{' '}
                      and create a project.
                    </li>
                    <li>Go to <b>Authentication</b> → Enable <b>Google</b> sign-in provider.</li>
                    <li>Go to <b>Firestore Database</b> → Create Database.</li>
                    <li>Go to <b>Project Settings</b> → Add Web App (`&lt;/&gt;`) → Copy the `firebaseConfig`.</li>
                  </ol>
                </div>

                {/* Instant Paste Snippet Box */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block flex items-center justify-between">
                    <span>1-Click Paste: `firebaseConfig` snippet</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Paste full snippet or fill fields below
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={rawConfigInput}
                    onChange={(e) => handleParseRawConfig(e.target.value)}
                    placeholder='const firebaseConfig = { apiKey: "AIzaSy...", projectId: "my-trade-logger", ... };'
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-200 font-mono text-[11px] focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Individual Config Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">
                      API Key <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">
                      Project ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="trade-logger-app"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">
                      Auth Domain
                    </label>
                    <input
                      type="text"
                      value={authDomain}
                      onChange={(e) => setAuthDomain(e.target.value)}
                      placeholder="trade-logger-app.firebaseapp.com"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">
                      App ID
                    </label>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="1:123456789:web:abcdef..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleResetConfig}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Reset Credentials
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    Save & Activate Firebase
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Firestore Security Rules Guide (Collapsible) */}
          <div className="border border-slate-800/90 rounded-xl overflow-hidden bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowRulesHelper(!showRulesHelper)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-semibold text-slate-200 text-xs block">
                    Recommended Firestore Security Rules
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Paste in Firebase Console → Firestore Database → Rules
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {showRulesHelper ? 'Hide' : 'View Rules'}
              </span>
            </button>

            {showRulesHelper && (
              <div className="p-4 pt-1 space-y-2 border-t border-slate-800/80 text-xs bg-slate-900/30">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Ensures each trader can only read and write their own trades & screenshots:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(firestoreRulesSample);
                      onShowToast('Copied Firestore Security Rules to clipboard!');
                    }}
                    className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto selection:bg-sky-500/30">
                  {firestoreRulesSample}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
