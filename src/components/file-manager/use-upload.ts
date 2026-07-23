// src/components/file-manager/use-upload.ts
'use client';

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

const PRESIGN_THRESHOLD = 5 * 1024 * 1024; // 5MB

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  folderId: number;
}

export function useUpload() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const utils = trpc.useUtils();

  const confirmUploadMutation = trpc.files.confirmUpload.useMutation({
    onSuccess: () => {
      utils.files.listFiles.invalidate();
      utils.files.listFolders.invalidate();
    },
  });

  const getPresignedUrlMutation = trpc.files.getPresignedUrl.useMutation();

  const createFileMutation = trpc.files.createFile.useMutation({
    onSuccess: () => {
      utils.files.listFiles.invalidate();
      utils.files.listFolders.invalidate();
    },
  });

  const updateUpload = useCallback((id: string, update: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...update } : u)),
    );
  }, []);

  const uploadFiles = useCallback(
    (files: FileList, folderId: number) => {
      const newItems: UploadItem[] = Array.from(files).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        progress: 0,
        status: 'pending' as const,
        folderId,
      }));

      setUploads((prev) => [...prev, ...newItems]);

      for (const item of newItems) {
        uploadSingleFile(item);
      }

      async function uploadSingleFile(item: UploadItem) {
        updateUpload(item.id, { status: 'uploading' });

        try {
          if (item.file.size < PRESIGN_THRESHOLD) {
            await uploadViaPresignedUrl(item);
          } else {
            await uploadViaServerProxy(item);
          }

          updateUpload(item.id, { progress: 100, status: 'done' });
        } catch {
          updateUpload(item.id, { status: 'error' });
        }
      }

      async function uploadViaPresignedUrl(item: UploadItem) {
        const { getS3Key, getPresignedUploadUrl } = await import('@/lib/s3');

        const presignResult = await getPresignedUrlMutation.mutateAsync({
          filename: item.file.name,
          mimetype: item.file.type,
          filesize: item.file.size,
        });

        await uploadWithXhr(presignResult.url, item.file, (progress) => {
          updateUpload(item.id, { progress });
        });

        await confirmUploadMutation.mutateAsync({
          name: item.file.name,
          basename: item.file.name,
          mimetype: item.file.type,
          filesize: String(item.file.size),
          folderId: item.folderId,
          key: presignResult.key,
        });
      }

      async function uploadViaServerProxy(item: UploadItem) {
        const createResult = await createFileMutation.mutateAsync({
          name: item.file.name,
          basename: item.file.name,
          mimetype: item.file.type,
          filesize: String(item.file.size),
          folderId: item.folderId,
        });

        const formData = new FormData();
        formData.append('file', item.file);

        await uploadWithXhr(
          `/api/upload/${createResult.uniqueId}`,
          item.file,
          (progress) => {
            updateUpload(createResult.uniqueId.toString(), { progress });
          },
          formData,
        );
      }
    },
    [updateUpload, confirmUploadMutation, getPresignedUrlMutation, createFileMutation],
  );

  const clearDone = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== 'done'));
  }, []);

  return { uploads, uploadFiles, clearDone };
}

function uploadWithXhr(
  url: string,
  file: File,
  onProgress: (progress: number) => void,
  body?: FormData,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (body) {
      xhr.open('POST', url, true);
    } else {
      xhr.open('PUT', url, true);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed'));

    if (body) {
      xhr.send(body);
    } else {
      xhr.send(file);
    }
  });
}
