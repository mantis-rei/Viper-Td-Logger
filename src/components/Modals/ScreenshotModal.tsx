import { Download, X } from 'lucide-react';
import React from 'react';

interface ScreenshotModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative max-w-6xl max-h-[92vh] w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating action bar */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <a
            href={imageUrl}
            download={`trade_chart_${Date.now()}.png`}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-lg backdrop-blur border border-slate-700 shadow-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Download image"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Save Image</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-lg backdrop-blur border border-slate-700 shadow-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <img
          src={imageUrl}
          alt="Expanded 5m chart screenshot"
          className="max-w-full max-h-[88vh] object-contain rounded-xl border border-slate-800 shadow-2xl"
        />
      </div>
    </div>
  );
};
