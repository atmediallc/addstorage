import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { getS3Client } from "@/lib/s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { createWriteStream, createReadStream } from "fs";
import archiver from "archiver";

export const filesRouter = createTRPCRouter({
  // P0 Routes
  uploadPublic: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.token, type: "public" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Generate a unique filename
      const uniqueId = uuidv4();
      const fileName = `${uniqueId}.tmp`;

      // Generate a presigned URL for S3 upload
      const s3 = getS3Client();
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `uploads/${fileName}`,
      });

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      // Create a file record in the database
      const file = await db.fileManagerFile.create({
        data: {
          name: fileName,
          path: `uploads/${fileName}`,
          userId: Number(share.userId),
          folderId: Number(share.folderId),
          size: 0, // Will be updated after upload
          uniqueId: Number(uniqueId),
        },
      });

      return {
        success: true,
        uploadUrl: url,
        fileId: file.uniqueId,
      };
    }),

  renameItemPublic: protectedProcedure
    .input(z.object({ uid: z.string(), token: z.string(), newName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.token, type: "public" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Check if the item belongs to the shared folder
      const item = await db.fileManagerFile.findUnique({
        where: { uniqueId: input.uid, folderId: share.folderId },
      });

      if (!item) {
        throw new Error("Item not found in shared folder");
      }

      // Rename the item
      await db.fileManagerFile.update({
        where: { uniqueId: input.uid },
        data: { name: input.newName },
      });

      return { success: true };
    }),

  createFolderPublic: protectedProcedure
    .input(z.object({ token: z.string(), name: z.string(), parentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.token, type: "public" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Check if the parent folder is the shared folder
      if (input.parentId && input.parentId !== share.folderId) {
        throw new Error("Cannot create folder outside shared folder");
      }

      // Create the folder
      const folder = await db.fileManagerFolder.create({
        data: {
          name: input.name,
          userId: share.userId,
          parentId: input.parentId || share.folderId,
        },
      });

      return { success: true, folderId: folder.uniqueId };
    }),

  removeItemPublic: protectedProcedure
    .input(z.object({ token: z.string(), uid: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.token, type: "public" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Check if the item belongs to the shared folder
      const item = await db.fileManagerFile.findUnique({
        where: { uniqueId: input.uid, folderId: share.folderId },
      });

      if (!item) {
        throw new Error("Item not found in shared folder");
      }

      // Delete the item
      await db.fileManagerFile.delete({
        where: { uniqueId: input.uid },
      });

      return { success: true };
    }),

  moveItemPublic: protectedProcedure
    .input(z.object({ token: z.string(), uid: z.string(), newParentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.token, type: "public" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Check if the item belongs to the shared folder
      const item = await db.fileManagerFile.findUnique({
        where: { uniqueId: input.uid, folderId: share.folderId },
      });

      if (!item) {
        throw new Error("Item not found in shared folder");
      }

      // Check if the new parent folder is the shared folder
      if (input.newParentId && input.newParentId !== share.folderId) {
        throw new Error("Cannot move item outside shared folder");
      }

      // Move the item
      await db.fileManagerFile.update({
        where: { uniqueId: input.uid },
        data: { folderId: input.newParentId || share.folderId },
      });

      return { success: true };
    }),

  zipFolderPublic: protectedProcedure
    .input(z.object({ uid: z.string(), token: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.token, type: "public" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Check if the folder is the shared folder
      if (Number(input.uid) !== Number(share.folderId)) {
        throw new Error("Cannot zip folder outside shared folder");
      }

      // Get all files in the folder
      const files = await db.fileManagerFile.findMany({
        where: {
          folderId: Number(share.folderId),
        },
      });

      // Create a zip file
      const zipFileName = `zip-${uuidv4()}.zip`;
      const zipFilePath = `/tmp/${zipFileName}`;
      const output = createWriteStream(zipFilePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);

      // Add files to the zip
      for (const file of files) {
        const s3 = getS3Client();
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: file.path,
        });

        const response = await s3.send(command);
        if (response.Body) {
          archive.append(response.Body, { name: file.name });
        }
      }

      await archive.finalize();

      // Upload the zip file to S3
      const s3 = getS3Client();
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `zips/${zipFileName}`,
        Body: createReadStream(zipFilePath),
      });

      await s3.send(uploadCommand);

      // Generate a presigned URL for the zip file
      const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `zips/${zipFileName}`,
      });

      const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

      return { url };
    }),

  getFilePublic: protectedProcedure
    .input(z.object({ name: z.string(), token: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.token, type: "public" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Check if the file belongs to the shared folder
      const file = await db.fileManagerFile.findFirst({
        where: {
          name: input.name,
          folderId: share.folderId,
        },
      });

      if (!file) {
        throw new Error("File not found in shared folder");
      }

      // Generate a presigned URL for the file
      const s3 = getS3Client();
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: file.path,
      });

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return { url };
    }),

  getThumbnailPublic: protectedProcedure
    .input(z.object({ name: z.string(), token: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.token, type: "public" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Check if the file belongs to the shared folder
      const file = await db.fileManagerFile.findFirst({
        where: {
          name: input.name,
          folderId: share.folderId,
        },
      });

      if (!file) {
        throw new Error("File not found in shared folder");
      }

      // Generate a presigned URL for the thumbnail
      const s3 = getS3Client();
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `thumbnails/${file.uniqueId}.jpg`,
      });

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return { url };
    }),

  getFile: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if the file belongs to the user
      const file = await db.fileManagerFile.findFirst({
        where: {
          name: input.name,
          userId: ctx.session.user.id,
        },
      });

      if (!file) {
        throw new Error("File not found");
      }

      // Generate a presigned URL for the file
      const s3 = getS3Client();
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: file.path,
      });

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return { url };
    }),

  getThumbnail: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if the file belongs to the user
      const file = await db.fileManagerFile.findFirst({
        where: {
          name: input.name,
          userId: ctx.session.user.id,
        },
      });

      if (!file) {
        throw new Error("File not found");
      }

      // Generate a presigned URL for the thumbnail
      const s3 = getS3Client();
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `thumbnails/${file.uniqueId}.jpg`,
      });

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return { url };
    }),

  listFoldersPrivate: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.uid, type: "private" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // List folders in the shared folder
      const folders = await db.fileManagerFolder.findMany({
        where: {
          parentId: share.folderId,
        },
        select: {
          uniqueId: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { folders };
    }),

  searchPrivate: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      // Search within shared items
      const results = await db.fileManagerFile.findMany({
        where: {
          shares: {
            some: {
              userId: ctx.session.user.id,
              type: "private",
            },
          },
          name: {
            contains: input.query,
            mode: "insensitive",
          },
        },
        select: {
          uniqueId: true,
          name: true,
          path: true,
          size: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { results };
    }),

  listFilesPrivate: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      // List files in shared folders
      const files = await db.fileManagerFile.findMany({
        where: {
          shares: {
            some: {
              userId: ctx.session.user.id,
              type: "private",
            },
          },
        },
        select: {
          uniqueId: true,
          name: true,
          path: true,
          size: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { files };
    }),

  zipPrivate: protectedProcedure
    .input(z.object({ items: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Check if all items belong to shared folders
      const items = await db.fileManagerFile.findMany({
        where: {
          uniqueId: { in: input.items.map(Number) },
          shares: {
            some: {
              userId: Number(ctx.session.user.id),
              type: "private",
            },
          },
        },
      });

      if (items.length !== input.items.length) {
        throw new Error("Some items are not in shared folders");
      }

      // Create a zip file
      const zipFileName = `zip-${uuidv4()}.zip`;
      const zipFilePath = `/tmp/${zipFileName}`;
      const output = createWriteStream(zipFilePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);

      // Add files to the zip
      for (const item of items) {
        const s3 = getS3Client();
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: item.path,
        });

        const response = await s3.send(command);
        if (response.Body) {
          archive.append(response.Body, { name: item.name });
        }
      }

      await archive.finalize();

      // Upload the zip file to S3
      const s3 = getS3Client();
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `zips/${zipFileName}`,
        Body: createReadStream(zipFilePath),
      });

      await s3.send(uploadCommand);

      // Generate a presigned URL for the zip file
      const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `zips/${zipFileName}`,
      });

      const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

      return { url };
    }),

  zipFolderPrivate: protectedProcedure
    .input(z.object({ uid: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify share token exists and is valid
      const share = await db.share.findUnique({
        where: { token: input.uid, type: "private" },
      });

      if (!share) {
        throw new Error("Invalid share token");
      }

      // Get all files in the folder
      const files = await db.fileManagerFile.findMany({
        where: {
          folderId: Number(share.folderId),
        },
      });

      // Create a zip file
      const zipFileName = `zip-${uuidv4()}.zip`;
      const zipFilePath = `/tmp/${zipFileName}`;
      const output = createWriteStream(zipFilePath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);

      // Add files to the zip
      for (const file of files) {
        const s3 = getS3Client();
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: file.path,
        });

        const response = await s3.send(command);
        if (response.Body) {
          archive.append(response.Body, { name: file.name });
        }
      }

      await archive.finalize();

      // Upload the zip file to S3
      const s3 = getS3Client();
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `zips/${zipFileName}`,
        Body: createReadStream(zipFilePath),
      });

      await s3.send(uploadCommand);

      // Generate a presigned URL for the zip file
      const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `zips/${zipFileName}`,
      });

      const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

      return { url };
    }),
});