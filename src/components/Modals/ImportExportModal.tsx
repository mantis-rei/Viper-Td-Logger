import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import {
  exportToCSV,
  exportToJSON,
  getSampleTrades,
  importFromJSON,
  saveTradesToStorage,
} from '../../lib/tradeStorage';
import { TradeRecord } from '../../types/trade';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradesCount: number;
  onDataChanged: (trades: TradeRecord[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  tradesCount,
  onDataChanged,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      const jsonStr = await exportToJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viper_td_logger_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ text: 'JSON backup downloaded successfully (includes screenshots).', type: 'success' });
    } catch (err) {
      setStatusMessage({ text: 'Failed to generate JSON backup.', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const csvStr = exportToCSV();
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viper_td_logger_ledger_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ text: 'CSV spreadsheet exported successfully.', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to export CSV.', type: 'error' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importFromJSON(text);
      // Reload trades from storage
      const raw = localStorage.getItem('trade_logger_records_v1');
      const updated = raw ? JSON.parse(raw) : [];
      onDataChanged(updated);
      setStatusMessage({
        text: `Successfully imported ${res.count} trades with screenshot references.`,
        type: 'success',
      });
    } catch (err) {
      setStatusMessage({
        text: 'Failed to import backup file. Please verify JSON format.',
        type: 'error',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadSampleData = () => {
    const samples = getSampleTrades();
    saveTradesToStorage(samples);
    onDataChanged(samples);
    setStatusMessage({
      text: 'Loaded 7 realistic MNQ/MES trend-pullback trades with full analytics.',
      type: 'success',
    });
  };

  const handleClearAll = () => {
    if (confirm('Warning: Are you sure you want to clear all trade records? This cannot be undone.')) {
      saveTradesToStorage([]);
      onDataChanged([]);
      setStatusMessage({ text: 'All trade records cleared.', type: 'success' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e1424] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Data Management & Backup
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* Status Alert if any */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-300">Export & Backup</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportJSON}
                disabled={isExporting}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800/40 text-sky-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200 block">Export JSON</span>
                  <span className="text-[11px] text-slate-400">
                    Full backup with all screenshots
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200 block">Export CSV</span>
                  <span className="text-[11px] text-slate-400">
                    Portable spreadsheet ledger
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="font-semibold text-slate-300">Import & Restore</h4>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200 block">Import JSON Backup</span>
                  <span className="text-[11px] text-slate-400">
                    Merges trades and restores chart screenshots
                  </span>
                </div>
              </div>
              <span className="text-xs text-sky-400 font-semibold">Select File</span>
            </button>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="font-semibold text-slate-300">Preloaded Exploration & Reset</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Load Sample Trades</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="py-2 px-3 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/40 rounded-lg text-rose-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Current ledger size: {tradesCount} trade{tradesCount === 1 ? '' : 's'} stored locally in browser
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
