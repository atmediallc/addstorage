'use client';

import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, ZoomIn, ZoomOut, RotateCw, X, Maximize2, Play, Pause, Volume2 } from 'lucide-react';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  name: string;
  mimetype: string | null;
}

export function PreviewModal({ open, onOpenChange, url, name, mimetype }: PreviewModalProps) {
  const mime = mimetype ?? '';
  const isImage = mime.startsWith('image/');
  const isPdf = mime === 'application/pdf';
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');
  const isText = mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <DialogTitle className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {name}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex min-h-[400px] items-center justify-center bg-gray-50 dark:bg-gray-950">
          {isImage && <ImageViewer url={url} name={name} />}
          {isPdf && <PdfViewer url={url} name={name} />}
          {isVideo && <VideoPlayer url={url} name={name} />}
          {isAudio && <AudioPlayer url={url} name={name} />}
          {isText && <TextViewer url={url} name={name} mime={mime} />}
          {!isImage && !isPdf && !isVideo && !isAudio && !isText && (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Preview not available for this file type.
              </p>
              <a
                href={url}
                download={name}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download to view
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Image Viewer with Zoom/Pan ──────────────────────────────────
function ImageViewer({ url, name }: { url: string; name: string }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - lastPos.current.x,
      y: e.clientY - lastPos.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const reset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full">
      {/* Controls */}
      <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.25, 5))}
          className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
          className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setRotation((r) => r + 90)}
          className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={reset}
          className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Reset"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-2 left-2 z-10 rounded bg-black/50 px-2 py-1 text-xs text-white">
        {Math.round(zoom * 100)}%
      </div>

      {/* Image */}
      <div
        className="flex min-h-[400px] items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={url}
          alt={name}
          className="max-h-[65vh] select-none transition-transform"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// ─── PDF Viewer ──────────────────────────────────────────────────
function PdfViewer({ url, name }: { url: string; name: string }) {
  return (
    <iframe
      src={url}
      className="h-[65vh] w-full border-0"
      title={name}
    />
  );
}

// ─── Video Player ────────────────────────────────────────────────
function VideoPlayer({ url, name }: { url: string; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      videoRef.current.currentTime = (Number(e.target.value) / 100) * videoRef.current.duration;
    }
  };

  return (
    <div className="w-full">
      <video
        ref={videoRef}
        src={url}
        className="mx-auto max-h-[60vh] w-full"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        controls={false}
      />
      <div className="flex items-center gap-3 bg-gray-900 px-4 py-3">
        <button onClick={togglePlay} className="text-white">
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="flex-1 accent-blue-500"
        />
        <div className="flex items-center gap-1">
          <Volume2 className="h-4 w-4 text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={(e) => {
              setVolume(Number(e.target.value) / 100);
              if (videoRef.current) videoRef.current.volume = Number(e.target.value) / 100;
            }}
            className="w-20 accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Audio Player ────────────────────────────────────────────────
function AudioPlayer({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
        <Volume2 className="h-12 w-12 text-white" />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
      <audio src={url} controls className="w-full max-w-md" />
    </div>
  );
}

// ─── Text Viewer ─────────────────────────────────────────────────
function TextViewer({ url, name, mime }: { url: string; name: string; mime: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch(url)
      .then((r) => r.text())
      .then((t) => setContent(t))
      .catch(() => setContent('Failed to load file'))
      .finally(() => setLoading(false));
  });

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="w-full p-4">
      <pre className="overflow-auto rounded-lg border border-gray-200 bg-white p-4 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" style={{ maxHeight: '60vh' }}>
        {content}
      </pre>
    </div>
  );
}
