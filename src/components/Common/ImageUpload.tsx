import { Camera, Image as ImageIcon, Trash2, Upload, ZoomIn } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getScreenshot, saveScreenshot } from '../../lib/screenshotStorage';

interface ImageUploadProps {
  label: string;
  imageId?: string;
  onImageSaved: (imageId: string) => void;
  onImageRemoved: () => void;
  onZoomRequested?: (imageUrl: string) => void;
  hint?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  imageId,
  onImageSaved,
  onImageRemoved,
  onZoomRequested,
  hint = 'Drag & drop, browse, or paste with Ctrl+V',
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load existing image if imageId provided
  useEffect(() => {
    let active = true;
    if (imageId) {
      setIsLoading(true);
      getScreenshot(imageId).then((url) => {
        if (active) {
          setImageUrl(url);
          setIsLoading(false);
        }
      });
    } else {
      setImageUrl(null);
    }
    return () => {
      active = false;
    };
  }, [imageId]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const newId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await saveScreenshot(newId, dataUrl);
      setImageUrl(dataUrl);
      setIsLoading(false);
      onImageSaved(newId);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Clipboard paste listener on container
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onImageRemoved();
  };

  return (
    <div className="space-y-1.5" onPaste={handlePaste} tabIndex={0}>
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-sky-400" />
          {label}
        </label>
        <span className="text-[11px] text-slate-500 font-mono">5m Chart</span>
      </div>

      {imageUrl ? (
        <div className="relative group rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900/90 aspect-video flex items-center justify-center">
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-full object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
            onClick={() => onZoomRequested?.(imageUrl)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
            <button
              type="button"
              onClick={() => onZoomRequested?.(imageUrl)}
              className="px-2.5 py-1 text-xs bg-slate-800/90 hover:bg-slate-700 text-sky-400 rounded flex items-center gap-1 shadow-md transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              Zoom
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-2 py-1 text-xs bg-rose-950/90 hover:bg-rose-900 text-rose-300 rounded flex items-center gap-1 shadow-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-1.5 min-h-[110px] ${
            isDragging
              ? 'border-sky-400 bg-sky-950/20 text-sky-300'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-300'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {isLoading ? (
            <div className="text-xs text-sky-400 animate-pulse font-mono">Processing image...</div>
          ) : (
            <>
              <div className="p-2 rounded-full bg-slate-800/60 text-slate-300">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-slate-300">
                Click to browse or paste screenshot
              </p>
              <p className="text-[11px] text-slate-500">{hint}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
