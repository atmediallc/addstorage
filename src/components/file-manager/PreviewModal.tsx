// src/components/file-manager/PreviewModal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download } from 'lucide-react';

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
  const isText = mime.startsWith('text/') || mime === 'application/json';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{name}</span>
            <a
              href={url}
              download={name}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 flex items-center gap-1 text-sm font-normal text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-[300px] items-center justify-center">
          {isImage && (
            <img src={url} alt={name} className="max-h-[70vh] max-w-full object-contain" />
          )}
          {isPdf && (
            <iframe src={url} className="h-[70vh] w-full border-0" title={name} />
          )}
          {isVideo && (
            <video src={url} controls className="max-h-[70vh] max-w-full">
              Your browser does not support video playback.
            </video>
          )}
          {isAudio && (
            <audio src={url} controls className="w-full">
              Your browser does not support audio playback.
            </audio>
          )}
          {isText && (
            <pre className="max-h-[70vh] w-full overflow-auto rounded-lg bg-gray-50 p-4 text-sm">
              <iframe src={url} className="h-full w-full border-0 bg-transparent" title={name} />
            </pre>
          )}
          {!isImage && !isPdf && !isVideo && !isAudio && !isText && (
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">Preview not available</p>
              <p className="mt-1 text-sm">Download the file to view it.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
