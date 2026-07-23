# Task 6 Report: Upload System (Pre-signed + Server-proxied + Progress)

## Status: COMPLETE

## Commit
- `f2d14e2` feat: add file upload system — pre-signed URLs, server-proxied, progress tracking

## Files Created
1. **`src/app/api/upload/[uniqueId]/route.ts`** — POST handler for server-proxied large file uploads (>5MB). Validates session via better-auth, finds file record in DB, streams file to S3 via PutObjectCommand, uses getS3Key from @/lib/s3.

2. **`src/components/file-manager/use-upload.ts`** — `useUpload()` hook managing upload state. Pre-sign threshold at 5MB. Small files use tRPC `getPresignedUrl` + PUT to S3 URL via XHR. Large files POST FormData to `/api/upload/${id}` via XHR. Both paths use `xhr.upload.onprogress` for real-time progress tracking. Calls `confirmUpload` after completion and invalidates tRPC queries. Returns `{ uploads, uploadFiles, clearDone }`.

## Files Modified
3. **`src/components/file-manager/UploadZone.tsx`** — Replaced with `onFiles?: (files: FileList, folderId: number) => void` prop. Uses `useFileManager` for `currentFolderId`. Drag counter pattern for accurate drag state. Calls `onFiles` on drop.

4. **`src/components/file-manager/UploadProgress.tsx`** — Replaced stub with real progress display. Accepts `uploads: UploadItem[]` and `onClear` props. Uses `Progress` from `@/components/ui/progress`. Fixed position floating panel showing active uploads with per-file progress bars.

5. **`src/components/file-manager/FileManager.tsx`** — Wires `useUpload()` hook. Passes `uploadFiles` to `UploadZone` and `uploads`/`clearDone` to `UploadProgress`.

6. **`src/components/file-manager/Toolbar.tsx`** — Already had `onFilesSelect` prop (no changes needed).

## Type Check Summary
- `pnpm tsc --noEmit` ran with errors in initial implementation
- Fixed: `uniqueId` was `string` (from URL params) but needed `Number()` conversion for Prisma query
- Fixed: tRPC mutation calls used `trpc.files.X.mutateAsync()` instead of `trpc.files.X.useMutation()` pattern -- switched to `trpc.useUtils()` approach with proper mutation calls
- Final type check: 0 errors

## Concerns
1. **XHR vs fetch**: Using XMLHttpRequest for progress tracking as required. The `uploadWithXhr` function handles both PUT (presigned) and POST (server-proxied) by checking if a FormData body is provided.
2. **confirmUpload uniqueId mismatch**: In `uploadViaServerProxy`, the `confirmUpload` is called with `createResult.uniqueId` from the tRPC response. The `updateUpload` also uses this ID. This assumes `createFile` returns a `uniqueId` matching the DB record.
3. **S3Client duplication**: The API route creates its own S3Client rather than reusing the one from `@/lib/s3`. This is intentional for route handler isolation but could be refactored to share.
