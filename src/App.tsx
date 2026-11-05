import { CheckCircle2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { LoginView } from './components/Auth/LoginView';
import { Header } from './components/Header';
import { HistoryView } from './components/History/HistoryView';
import { TradeDetailModal } from './components/History/TradeDetailModal';
import { LogTradeView } from './components/LogTrade/LogTradeView';
import { CloudSyncModal } from './components/Modals/CloudSyncModal';
import { ImportExportModal } from './components/Modals/ImportExportModal';
import { ScreenshotModal } from './components/Modals/ScreenshotModal';
import {
  deleteTradeFromCloud,
  performFullSync,
  saveTradeToCloud,
  subscribeToTrades,
} from './lib/cloudSync';
import { onAuthChange, signOutUser } from './lib/firebase';
import {
  deleteTradeAndAssets,
  getSampleTrades,
  loadTradesFromStorage,
  saveTradesToStorage,
} from './lib/tradeStorage';
import { TradeRecord } from './types/trade';

export default function App() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'log' | 'analytics' | 'history'>('analytics');
  const [tradeToEdit, setTradeToEdit] = useState<TradeRecord | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud Sync & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Keep a ref to current trades to access fresh state in sync callbacks
  const tradesRef = useRef<TradeRecord[]>(trades);
  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  // Track IDs that are currently being deleted so the real-time snapshot
  // callback doesn't resurrect them before Firestore removal propagates.
  const deletingIdsRef = useRef<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 1. Initialize trades from localStorage or seed with realistic demo trades on first visit
  useEffect(() => {
    const existing = loadTradesFromStorage();
    if (existing.length > 0) {
      setTrades(existing);
    } else {
      const samples = getSampleTrades();
      saveTradesToStorage(samples);
      setTrades(samples);
    }
  }, []);

  // 2. Listen to Firebase Google Auth state & subscribe to real-time Cloud Firestore updates
  useEffect(() => {
    let unsubscribeTradesListener: (() => void) | null = null;

    const unsubscribeAuth = onAuthChange(async (user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);

      if (unsubscribeTradesListener) {
        unsubscribeTradesListener();
        unsubscribeTradesListener = null;
      }

      if (user) {
        setIsSyncing(true);
        try {
          // Perform initial 2-way cloud merge
          const currentLocal = tradesRef.current.length > 0 ? tradesRef.current : loadTradesFromStorage();
          const merged = await performFullSync(user, currentLocal);
          saveTradesToStorage(merged);
          setTrades(merged);
          setLastSyncedAt(new Date());

          // Subscribe to ongoing real-time remote updates
          unsubscribeTradesListener = subscribeToTrades(user, (remoteTrades) => {
            // Filter out any trades that are currently being deleted locally
            // to prevent a resurrection race between local delete and Firestore propagation.
            const activeDeletingIds = deletingIdsRef.current;
            const filtered = remoteTrades.filter((t) => !activeDeletingIds.has(t.id));
            if (Array.isArray(filtered)) {
              saveTradesToStorage(filtered);
              setTrades(filtered);
              setLastSyncedAt(new Date());
            }
          });
        } catch (err: any) {
          console.error('Initial cloud sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTradesListener) {
        unsubscribeTradesListener();
      }
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      setIsGuestMode(false);
      showToast('Signed out of Viper Td Logger.');
    } catch (err: any) {
      showToast('Error signing out.');
    }
  };

  const handleSaveTrade = async (trade: TradeRecord) => {
    const existingIndex = trades.findIndex((t) => t.id === trade.id);
    let updated: TradeRecord[];

    if (existingIndex >= 0) {
      updated = [...trades];
      updated[existingIndex] = trade;
      showToast('Trade record updated successfully.');
    } else {
      updated = [trade, ...trades];
      showToast(trade.status === 'OPEN' ? 'Logged as active open position.' : 'Trade saved to ledger.');
    }

    saveTradesToStorage(updated);
    setTrades(updated);
    setTradeToEdit(null);
    setSelectedTrade(null);
    setActiveTab(trade.status === 'OPEN' ? 'history' : 'analytics');

    // Cloud push if user is logged into Google
    if (currentUser) {
      try {
        setIsSyncing(true);
        await saveTradeToCloud(currentUser, trade);
        setLastSyncedAt(new Date());
      } catch (err) {
        console.warn('Failed auto-syncing saved trade to cloud:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleDeleteTrade = async (id: string) => {
    const tradeToDelete = trades.find((t) => t.id === id);

    // Mark as deleting BEFORE any async work so the real-time snapshot
    // callback filters it out if Firestore fires before the doc is removed.
    deletingIdsRef.current.add(id);

    // Remove from localStorage and local state immediately
    const updated = await deleteTradeAndAssets(id);
    setTrades(updated);
    if (selectedTrade?.id === id) {
      setSelectedTrade(null);
    }
    showToast('Trade deleted.');

    // Cloud deletion if user is logged into Google
    if (currentUser) {
      try {
        setIsSyncing(true);
        await deleteTradeFromCloud(
          currentUser,
          id,
          tradeToDelete?.entryImageId,
          tradeToDelete?.exitImageId
        );
        setLastSyncedAt(new Date());
      } catch (err) {
        console.warn('Failed deleting trade from cloud:', err);
      } finally {
        setIsSyncing(false);
      }
    }

    // Clear the deletion guard only after Firestore has confirmed removal
    // (500 ms buffer for the snapshot listener to settle).
    setTimeout(() => {
      deletingIdsRef.current.delete(id);
    }, 2000);
  };

  const handleEditTrade = (trade: TradeRecord) => {
    setTradeToEdit(trade);
    setSelectedTrade(null);
    setActiveTab('log');
  };

  const handleNewTrade = () => {
    setTradeToEdit(null);
    setActiveTab('log');
  };

  const openTradesCount = trades.filter((t) => t.status === 'OPEN').length;

  // 1. Splash loading screen while checking remembered Firebase session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center gap-3 selection:bg-emerald-500/30">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 flex items-center justify-center font-black text-white text-lg shadow-xl shadow-emerald-500/20 animate-pulse">
          VTL
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Connecting Viper Td Logger...</span>
        </div>
      </div>
    );
  }

  // 2. Auth Gate: Automatically open at login page unless logged in or in guest mode
  if (!currentUser && !isGuestMode) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.displayName || user.email}!`);
        }}
        onContinueAsGuest={() => {
          setIsGuestMode(true);
          showToast('Continuing in Guest mode. Sign in anytime via Cloud Sync.');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'log') setTradeToEdit(null);
        }}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onNewTrade={handleNewTrade}
        openTradesCount={openTradesCount}
        currentUser={currentUser}
        isSyncing={isSyncing}
        onSignOut={handleSignOut}
        onShowLogin={() => setIsGuestMode(false)}
      />

      {/* Main View Area */}
      <main className="flex-1 px-4 lg:px-8 py-6">
        {activeTab === 'log' && (
          <LogTradeView
            onSaveTrade={handleSaveTrade}
            activeTradeToEdit={tradeToEdit}
            onCancelEdit={() => setTradeToEdit(null)}
            onZoomRequested={(url) => setZoomedImageUrl(url)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            trades={trades}
            onSelectTrade={(t) => setSelectedTrade(t)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            trades={trades}
            onSelectTrade={(t) => setSelectedTrade(t)}
            onDeleteTrade={handleDeleteTrade}
            onNewTrade={handleNewTrade}
          />
        )}
      </main>

      {/* Detail Inspector Modal */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onEdit={handleEditTrade}
          onDelete={handleDeleteTrade}
          onZoomRequested={(url) => setZoomedImageUrl(url)}
        />
      )}

      {/* Full-Screen Zoom Lightbox */}
      <ScreenshotModal
        imageUrl={zoomedImageUrl}
        onClose={() => setZoomedImageUrl(null)}
      />

      {/* Google Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        currentUser={currentUser}
        trades={trades}
        onTradesUpdated={(updated) => {
          saveTradesToStorage(updated);
          setTrades(updated);
        }}
        onShowToast={showToast}
        isSyncing={isSyncing}
        setIsSyncing={setIsSyncing}
        lastSyncedAt={lastSyncedAt}
        setLastSyncedAt={setLastSyncedAt}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        tradesCount={trades.length}
        onDataChanged={(updatedTrades) => {
          setTrades(updatedTrades);
          showToast(`Ledger synchronized (${updatedTrades.length} trades).`);
          if (currentUser) {
            performFullSync(currentUser, updatedTrades).catch((err) =>
              console.warn('Sync after import failed', err)
            );
          }
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-700/80 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

