import {
  Activity,
  BarChart2,
  Clock,
  Cloud,
  Database,
  Layers,
  Loader2,
  LogOut,
  PlusCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { getEasternTimeInfo, SessionStatus } from '../lib/tradeCalculations';

interface HeaderProps {
  activeTab: 'log' | 'analytics' | 'history';
  onTabChange: (tab: 'log' | 'analytics' | 'history') => void;
  onOpenImportExport: () => void;
  onOpenCloudSync: () => void;
  onNewTrade: () => void;
  openTradesCount: number;
  currentUser: User | null;
  isSyncing: boolean;
  onSignOut?: () => void;
  onShowLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenImportExport,
  onOpenCloudSync,
  onNewTrade,
  openTradesCount,
  currentUser,
  isSyncing,
  onSignOut,
  onShowLogin,
}) => {

  const [session, setSession] = useState<SessionStatus>(getEasternTimeInfo());

  useEffect(() => {
    const timer = setInterval(() => {
      setSession(getEasternTimeInfo());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#080c14]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Wordmark with Viper Td Logger branding */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 flex items-center justify-center font-black tracking-tight text-white shadow-sm shadow-emerald-500/20 text-xs">
            VTL
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap flex items-center gap-1.5">
              <span>Viper Td Logger</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400/80 whitespace-nowrap">
              MNQ $2/pt · MES $5/pt
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (single line, functional tabs) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onTabChange('log')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'log'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Log Trade</span>
            {openTradesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] font-mono rounded">
                {openTradesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('analytics')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Rule Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'history'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Trade Ledger</span>
          </button>
        </nav>

        {/* Zone 3: Market Clock & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Session Clock */}
          <div className="hidden md:flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-300">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{session.timeETString.split(' ')[1]} ET</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span
                className={`font-semibold ${
                  session.isHighQuality
                    ? 'text-emerald-400'
                    : session.isDeadZone
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {session.sessionName.split(' ')[0]} {session.sessionName.split(' ')[1] || ''}
              </span>
            </div>
          </div>

          {/* Cloud Sync Status Indicator & Trigger */}
          <button
            id="cloud-sync-button"
            type="button"
            onClick={currentUser ? onOpenCloudSync : (onShowLogin || onOpenCloudSync)}
            title={currentUser ? `Cloud Synced as ${currentUser.email}` : 'Sign in to Viper Td Logger'}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
              currentUser
                ? 'bg-slate-900/90 border-slate-700/80 hover:border-emerald-500/60 text-slate-200 hover:text-white shadow-sm'
                : 'bg-emerald-950/40 border-emerald-800/60 hover:border-emerald-500/80 text-emerald-300 hover:text-white'
            }`}
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
            ) : currentUser ? (
              <div className="relative shrink-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google'}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-emerald-900 text-emerald-300 text-[9px] font-bold flex items-center justify-center">
                    {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-slate-950" />
              </div>
            ) : (
              <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}

            <span className="hidden sm:inline">
              {isSyncing
                ? 'Syncing...'
                : currentUser
                ? 'Cloud Synced'
                : 'Sign In'}
            </span>
          </button>

          {/* Quick Sign Out button when logged in */}
          {currentUser && onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Backup / Restore Menu button */}
          <button
            type="button"
            onClick={onOpenImportExport}
            title="Import/Export JSON & CSV"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded transition-colors"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Quick New Trade */}
          <button
            type="button"
            onClick={() => {
              onNewTrade();
              onTabChange('log');
            }}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-md shadow-sm transition-colors whitespace-nowrap"
          >
            New Trade
          </button>
        </div>
      </div>
    </header>
  );
};
