import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getS3Key,
  deleteObject,
} from '@/lib/s3';

describe('S3 helpers', () => {
  it('getS3Key builds correct key from userId, uniqueId, filename', () => {
    const key = getS3Key(1, 42, 'photo.jpg');
    expect(key).toBe('1/42/photo.jpg');
  });

  it('getS3Key sanitizes special characters in filename', () => {
    const key = getS3Key(1, 42, 'my file (copy).jpg');
    expect(key).toBe('1/42/my-file-copy.jpg');
  });

  it('getPresignedUploadUrl returns a string URL', async () => {
    const url = await getPresignedUploadUrl('1/42/photo.jpg', 'image/jpeg', 3600);
    expect(typeof url).toBe('string');
    expect(url).toContain('http');
  });

  it('getPresignedDownloadUrl returns a string URL', async () => {
    const url = await getPresignedDownloadUrl('1/42/photo.jpg', 3600);
    expect(typeof url).toBe('string');
    expect(url).toContain('http');
  });
});
