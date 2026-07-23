// src/app/api/upload/[uniqueId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { auth } from '@/server/auth';
import { getS3Key } from '@/lib/s3';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

  const key = getS3Key(
    Number(session.user.id),
    fileRecord.uniqueId,
    fileRecord.basename ?? fileRecord.name ?? 'unknown',
  );

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
