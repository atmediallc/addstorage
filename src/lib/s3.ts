// src/lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET_NAME ?? 'tutiscloud-files';
const REGION = process.env.AWS_REGION ?? 'us-east-1';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

export function getS3Key(userId: number, uniqueId: number, filename: string): string {
  const sanitized = filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/-\./g, '.')
    .replace(/^-|-$/g, '');
  return `${userId}/${uniqueId}/${sanitized}`;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function deleteObjects(keys: string[]): Promise<void> {
  // AWS SDK batch delete is done via DeleteObjectsCommand, but it's limited to 1000
  // For simplicity, we delete sequentially. A real implementation would use batch.
  for (const key of keys) {
    await deleteObject(key);
  }
}

export async function getFileSize(key: string): Promise<number> {
  const response = await s3.send(
    new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  return response.ContentLength ?? 0;
}
