// src/app/api/upload/[uniqueId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { auth } from '@/server/auth';
import { getS3Key } from '@/lib/s3';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { isMimetypeBlocked } from '@/lib/constants';
import fs from 'fs';
import path from 'path';
import os from 'os';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uniqueId: string }> },
) {
  const { uniqueId } = await params;
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fileRecord = await db.fileManagerFile.findFirst({
    where: { uniqueId: Number(uniqueId), userId: Number(session.user.id) },
  });

  if (!fileRecord) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (isMimetypeBlocked(file.type)) {
    return NextResponse.json(
      { error: 'Type of this mime type is not allowed.' },
      { status: 415 }
    );
  }

  const chunkIndexStr = formData.get('chunkIndex') as string | null;
  const totalChunksStr = formData.get('totalChunks') as string | null;
  const uploadSessionId = formData.get('uploadSessionId') as string | null;

  const key = getS3Key(
    Number(session.user.id),
    fileRecord.uniqueId,
    fileRecord.basename ?? fileRecord.name ?? 'unknown',
  );

  // If chunk parameters are present, process fragment upload
  if (chunkIndexStr && totalChunksStr && uploadSessionId) {
    const chunkIndex = parseInt(chunkIndexStr, 10);
    const totalChunks = parseInt(totalChunksStr, 10);

    const chunkDir = path.join(os.tmpdir(), 'tutiscloud-chunks');
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, `${uploadSessionId}-${chunkIndex}`);
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(chunkPath, Buffer.from(arrayBuffer));

    // Check if we received all chunks
    let allChunksExist = true;
    const chunkPaths: string[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(chunkDir, `${uploadSessionId}-${i}`);
      chunkPaths.push(p);
      if (!fs.existsSync(p)) {
        allChunksExist = false;
        break;
      }
    }

    // Merge and upload when done
    if (allChunksExist) {
      const mergedPath = path.join(chunkDir, `${uploadSessionId}-merged`);
      const writeStream = fs.createWriteStream(mergedPath);
      for (const p of chunkPaths) {
        const data = fs.readFileSync(p);
        writeStream.write(data);
      }
      writeStream.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      const fileBuffer = fs.readFileSync(mergedPath);
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME ?? 'tutiscloud-files',
          Key: key,
          Body: fileBuffer,
          ContentType: fileRecord.mimetype ?? 'application/octet-stream',
        }),
      );

      // Clean up temp files
      for (const p of chunkPaths) {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      }
      if (fs.existsSync(mergedPath)) {
        fs.unlinkSync(mergedPath);
      }

      return NextResponse.json({ success: true, assembled: true });
    }

    return NextResponse.json({ success: true, chunkReceived: true, index: chunkIndex });
  }

  // Fallback to legacy single file upload
  const arrayBuffer = await file.arrayBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME ?? 'tutiscloud-files',
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    }),
  );

  return NextResponse.json({ success: true });
}
