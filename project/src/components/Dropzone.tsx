import { useCallback, useRef, useState, type DragEvent } from 'react';
import { UploadCloud, Image as ImageIcon, X } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
  compact?: boolean;
  hint?: string;
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];

export function Dropzone({ onFile, disabled, compact, hint }: Props) {
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setError('Please upload a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8 MB.');
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    onFile(file);
  }, [onFile]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const reset = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (preview) {
    return (
      <div className={`glass overflow-hidden ${compact ? '' : 'p-3'}`}>
        <div className="relative">
          <img src={preview} alt="Chart preview" className="w-full rounded-xl object-contain max-h-[380px] bg-ink-900" />
          <button
            onClick={reset}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-ink-950/80 text-ink-200 ring-1 ring-white/10 hover:text-white"
            aria-label="Remove"
          >
            <X size={16} />
          </button>
          {!disabled && (
            <div className="pointer-events-none absolute inset-0 scanline rounded-xl opacity-60" />
          )}
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <span className="flex items-center gap-2 text-xs text-ink-300">
            <ImageIcon size={14} className="text-neon-400" /> Chart ready
          </span>
          <button onClick={reset} className="text-xs text-ink-400 hover:text-white">Choose another</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`glass relative flex cursor-pointer flex-col items-center justify-center text-center transition-all duration-300 ${
          compact ? 'px-6 py-8' : 'px-6 py-12'
        } ${drag ? 'border-neon-500/60 bg-neon-500/[0.04] shadow-glow' : 'hover:border-neon-500/30'} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className={`flex items-center justify-center rounded-2xl ${drag ? 'bg-neon-500/15' : 'bg-white/[0.04]'} ${compact ? 'h-12 w-12' : 'h-16 w-16'} ring-1 ring-white/[0.06] transition-all`}>
          <UploadCloud size={compact ? 22 : 30} className={drag ? 'text-neon-400' : 'text-ink-200'} />
        </div>
        <p className={`mt-4 font-display ${compact ? 'text-base' : 'text-lg'} font-600 text-white`}>
          {drag ? 'Drop your chart here' : 'Drag & drop your MT5 chart'}
        </p>
        <p className="mt-1.5 text-sm text-ink-400">
          or <span className="text-neon-400 neon-underline">browse files</span>
        </p>
        <p className="mt-3 text-[11px] text-ink-500">{hint ?? 'PNG, JPEG or WebP · up to 8 MB'}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
      {error && <p className="mt-3 text-xs text-bear-400">{error}</p>}
    </div>
  );
}
