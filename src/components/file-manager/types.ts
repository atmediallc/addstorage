// src/components/file-manager/types.ts
// tRPC serializes Date fields to strings, so we define
// the serialized versions of the Prisma models for component props.

export interface SerializedFolder {
  uniqueId: number;
  parentId: number;
  name: string | null;
  type: string | null;
  userId: number | null;
  userScope: string;
  iconColor: string | null;
  iconEmoji: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedFile {
  uniqueId: number;
  folderId: number;
  thumbnail: string | null;
  name: string | null;
  basename: string | null;
  mimetype: string | null;
  filesize: string | null;
  type: string | null;
  userId: number | null;
  userScope: string;
  metadata: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
