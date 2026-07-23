# Phase 3: Core File Manager Design

> **Scope:** Complete file management — folder/file CRUD, S3 upload, navigation, UX features (trash, favourites, zip, search, drag-drop, bulk ops), and sharing system. Three sequential sub-specs: 3A (core), 3B (UX), 3C (sharing).

---

## 1. Architecture

### Route Structure

The file manager is an SPA-style experience. All folder navigation is client-side via Next.js router + tRPC query cache. The URL path maps to folder hierarchy.

```
/files              → root folder (parentId = 0)
/files/abc          → folder with uniqueId = "abc"
/files/abc/def      → nested folder
```

A catch-all `[...path]` segment extracts folder IDs from the URL. The file manager component renders the current folder's contents, breadcrumb, and toolbar.

### Data Flow

1. User navigates to `/files/123`
2. Page component extracts `123` from URL params
3. tRPC `files.listFolders` + `files.listFiles` called with `parentId: 123`
4. React Query caches the result
5. User clicks a sub-folder → `router.push('/files/123/456')` → tRPC re-fetches for `456`
6. Breadcrumb derived from the folder hierarchy (tRPC `files.getBreadcrumb`)

### URL Design

- `/files` — root (user's home folder)
- `/files/[...path]` — path segments are folder uniqueIds
- `/trash` — trash view (shows deleted items)
- `/favourites` — favourites view
- `/s/[token]` — public share page (Phase 3C)

---

## 1.1 Prerequisite: Schema Fix

The `uniqueId` fields on `FileManagerFolder` and `FileManagerFile` lack `@default(autoincrement())`. In the Laravel source, these were auto-generated secondary IDs used in URLs and as parent references. The Prisma schema must be updated:

```prisma
model FileManagerFolder {
  id       Int @id @default(autoincrement())
  uniqueId Int @unique @default(autoincrement()) @map("unique_id")  // ADD @default
  ...
}

model FileManagerFile {
  id       Int @id @default(autoincrement())
  uniqueId Int @unique @default(autoincrement()) @map("unique_id")  // ADD @default
  ...
}
```

After this change, run `prisma db push` to sync the schema. The `id` column remains the primary key; `uniqueId` is the external-facing ID used in URLs, parent references, and the `parent_id` foreign key.

---

## 2. Sub-spec 3A: Core CRUD + Upload + Navigation

### 2.1 Folder Operations

**Create folder:**
- tRPC: `files.createFolder({ name, parentId })`
- Validates: name not empty, max 255 chars, parent exists and is accessible
- Creates folder with `uniqueId` = next auto-increment
- Sets `userId` to current user, `userScope` to "master"
- Returns created folder object
- RBAC: `Permission.FOLDER_CREATE`

**Rename folder:**
- tRPC: `files.renameItem({ uniqueId, name, type: 'folder' })`
- Updates name field
- RBAC: `Permission.FOLDER_UPDATE`

**Delete folder (soft delete):**
- tRPC: `files.deleteItem({ uniqueId, type: 'folder' })`
- Sets `deletedAt` = now (soft delete)
- Recursively soft-deletes all children (folders + files)
- RBAC: `Permission.FOLDER_DELETE`

**Move folder:**
- tRPC: `files.moveItem({ uniqueId, toFolderId, type: 'folder' })`
- Validates: target is not a descendant (prevents cycles)
- Updates `parentId`
- RBAC: `Permission.FOLDER_UPDATE`

**Breadcrumb:**
- tRPC: `files.getBreadcrumb(folderId)` — walks up the tree via `parentId` chain
- Returns array: `[{ uniqueId, name, parentId }, ...]` from root to current
- Client uses this to render `< Root > / > Photos > Vacation >`

### 2.2 File Operations

**Upload file:**
- Small files (<5MB): Client requests pre-signed URL from tRPC `files.getPresignedUrl`, uploads directly to S3
- Large files (≥5MB): Client uploads to tRPC `files.uploadFile` API route, server streams to S3
- After upload completes: tRPC `files.createFile({ name, basename, mimetype, filesize, folderId, metadata })` creates DB record
- File stored at S3 path: `{userId}/{uniqueId}/{filename}`
- Tracks upload progress via XMLHttpRequest `upload.onprogress`
- RBAC: `Permission.FILE_CREATE`

**Rename file:**
- tRPC: `files.renameItem({ uniqueId, name, type: 'file' })`
- Updates `name` field (display name, not physical path)
- RBAC: `Permission.FILE_UPDATE`

**Delete file (soft delete):**
- tRPC: `files.deleteItem({ uniqueId, type: 'file' })`
- Sets `deletedAt` = now
- Does NOT delete from S3 yet (deferred until permanent delete or cleanup cron)
- RBAC: `Permission.FILE_DELETE`

**Move file:**
- tRPC: `files.moveItem({ uniqueId, toFolderId, type: 'file' })`
- Updates `folderId`
- RBAC: `Permission.FILE_UPDATE`

**File preview:**
- tRPC: `files.getPreviewUrl({ uniqueId })` — returns pre-signed S3 URL with 5-minute expiry
- Preview types:
  - **Images:** inline `<img>` in modal
  - **PDF:** inline `<iframe>` or embed in modal
  - **Text/code:** fetch content → render in `<pre>` with syntax highlighting (optional, plain text for MVP)
  - **Video/audio:** HTML5 `<video>`/`<audio>` player with pre-signed src
  - **Other:** file icon + metadata only, no preview
- Preview modal: fullscreen overlay with close button, download button, metadata panel

### 2.3 File Manager UI

**Components:**
- `FileManager.tsx` — root container, manages selected items, view mode, DnD state
- `Breadcrumb.tsx` — clickable path: Root > Folder > Subfolder
- `Toolbar.tsx` — create folder button, upload button, view toggle (grid/list), search input
- `FileGrid.tsx` — grid layout of `FileItem` components (icon + name + meta)
- `FileList.tsx` — table layout: name, size, type, modified date, actions
- `FileItem.tsx` — single item card/row with icon, name, metadata, selection checkbox
- `ContextMenu.tsx` — right-click menu: Open, Rename, Move to, Delete, Preview, Download
- `UploadZone.tsx` — drag-to-upload dropzone overlay + manual upload button
- `UploadProgress.tsx` — floating progress bar showing active uploads
- `PreviewModal.tsx` — fullscreen file preview
- `CreateFolderDialog.tsx` — shadcn Dialog for folder name input
- `RenameDialog.tsx` — shadcn Dialog for rename input
- `DeleteConfirmDialog.tsx` — shadcn AlertDialog for delete confirmation

**View modes:**
- Grid: responsive CSS grid, items as cards with large icons
- List: table with sortable columns (name, size, type, date)
- Toggle persisted to localStorage

**Selection:**
- Click to select single item
- Ctrl/Cmd+click to toggle multi-select
- Shift+click for range select
- Select all button in toolbar

### 2.4 Upload Flow

**Pre-signed URL flow (<5MB):**
```
1. Client: tRPC getPresignedUrl({ filename, mimetype, folderId, size })
2. Server: validates user has permission, checks storage quota
3. Server: generates uniqueId, builds S3 key, creates presigned URL
4. Server: creates file record (status: 'uploading')
5. Client: PUT to S3 presigned URL with progress tracking
6. Client: on success, tRPC confirmUpload({ uniqueId })
7. Server: updates file record status to 'complete'
```

**Server-proxied flow (≥5MB):**
```
1. Client: tRPC getUploadUrl({ filename, mimetype, folderId, size })
2. Server: creates file record (status: 'uploading'), returns upload endpoint
3. Client: POST multipart/form-data to /api/upload/{uniqueId} with progress
4. Server: streams to S3, updates status on completion
5. Client: polls status or waits for completion response
```

**Progress tracking:**
- Per-file progress bar (0-100%)
- Total upload progress (combined bytes uploaded / total bytes)
- Cancel button per upload
- Upload queue: files upload sequentially or in parallel (configurable, default: 3 concurrent)

**Storage quota check:**
- Before upload: tRPC `files.checkQuota({ size })` → compares user's current usage vs `storageCapacity` in `user_settings`
- Returns `{ allowed: boolean, used: number, limit: number }`
- UI shows warning when >80% full, blocks upload at 100%

---

## 3. Sub-spec 3B: UX Features

### 3.1 Trash

- Soft-deleted items (`deletedAt` set) shown in `/trash` view
- tRPC: `files.listTrash()` — returns all soft-deleted items for current user
- **Restore:** tRPC `files.restoreItem({ uniqueId, type })` — clears `deletedAt`, restores to original parent
- **Permanent delete:** tRPC `files.permanentDelete({ uniqueId, type })` — deletes from DB AND deletes S3 objects
- **Empty trash:** tRPC `files.emptyTrash()` — permanent-deletes all trashed items
- Auto-purge: items in trash for >30 days permanently deleted (cron job, not in scope — just flag for later)
- RBAC: `Permission.FILE_DELETE` for permanent delete, `Permission.FOLDER_READ` for restore

### 3.2 Favourites

- Toggle favourite on any folder
- tRPC: `files.toggleFavourite({ folderId })` — inserts/removes from `FavouriteFolder` pivot
- Favourites view at `/favourites`: tRPC `files.listFavourites()` — joins `FavouriteFolder` with `FileManagerFolder`
- Star icon on `FileItem` — filled when favourited, outline when not
- Only folders can be favourited (matches Laravel source)
- RBAC: any authenticated user can favourite their own folders

### 3.3 Zip Download

- User selects multiple files/folders → "Download as ZIP" button appears in toolbar
- tRPC: `files.createZip({ itemIds })` — server creates zip on-demand
- Server: recursively collects all files under selected items, streams to S3, creates `Zips` record
- Returns download URL (pre-signed, 15-minute expiry)
- UI: shows "Preparing download..." progress, then auto-downloads
- For large zips: background job via BullMQ (queue "zips"), polls status
- RBAC: user can only zip items they have `FILE_DOWNLOAD` permission for

### 3.4 Search

- Search bar in toolbar, filters current folder's contents by name
- tRPC: `files.search({ query, parentId?, type? })` — searches by name (case-insensitive LIKE)
- Optional type filter: files only, folders only, or both
- Results shown in the main view (replaces folder listing while search is active)
- Clear button to return to normal folder view
- Phase 8 will upgrade to PostgreSQL full-text search; for now, simple LIKE is sufficient

### 3.5 Drag-and-Drop

- Native HTML5 Drag and Drop API
- **Drag items:** `FileItem` becomes draggable on mousedown (long press on mobile)
- **Drop targets:** Folder items in grid/list, breadcrumb path segments, sidebar folder tree
- **Visual feedback:** dragged item gets opacity, drop target gets highlight border
- **Drop action:** moves item(s) to target folder via `files.moveItem`
- **Multi-drag:** drag selected items together
- **Invalid drops:** same folder = no-op, descendant = prevented with toast warning

### 3.6 Bulk Operations

- Multi-select via Ctrl/Cmd+click, Shift+click, or "Select all" checkbox
- Bulk toolbar appears when >1 item selected: "Move to", "Delete", "Download as ZIP", "Cancel"
- **Bulk move:** tRPC `files.bulkMove({ ids, type, toFolderId })` — moves all selected items
- **Bulk delete:** tRPC `files.bulkDelete({ items })` — soft-deletes all (moves to trash)
- **Bulk download:** creates zip with all selected items
- Maximum 100 items per bulk operation (prevent abuse)

### 3.7 Storage Quota

- Displayed in sidebar or footer: "2.3 GB of 5.0 GB used"
- Progress bar: green <80%, yellow 80-95%, red >95%
- Fetches from tRPC: `files.getQuota()` → `{ used: number, limit: number }`
- `used` = sum of all file sizes for user (computed from `FileManagerFile.filesize`)
- Blocks upload when quota exceeded

---

## 4. Sub-spec 3C: Sharing System

### 4.1 Create Share Link

- User right-clicks item → "Share" → opens `ShareDialog`
- tRPC: `files.createShare({ itemId, type, permission?, protected?, password?, expireIn? })`
- Generates 16-char random token (nanoid or crypto.randomBytes)
- Returns share URL: `{APP_URL}/s/{token}`
- Share settings:
  - **Permission:** visitor (read-only) or editor (can upload to shared folder)
  - **Password:** optional. Hashed with bcrypt before storing
  - **Expiration:** optional. TTL in hours. `expiresAt = now + expireIn`
- RBAC: `Permission.SHARE_CREATE`

### 4.2 Manage Share Links

- tRPC: `files.listShares({ itemId, type })` — lists all shares for an item
- tRPC: `files.deleteShare({ shareId })` — revokes a share link
- tRPC: `files.updateShare({ shareId, permission?, password?, expireIn? })` — updates share settings
- Share dialog shows: list of active links, create new link form
- RBAC: `Permission.SHARE_READ` to list, `Permission.SHARE_DELETE` to revoke

### 4.3 Public Share Page

- Route: `/s/[token]`
- tRPC: `files.getShareContent({ token, password? })` — validates token, checks expiration, verifies password
- **Unprotected share:** directly shows file/folder contents
- **Password-protected share:** shows password form first, validates, then shows contents
- **Expired share:** shows "This link has expired" message
- **Revoked share:** shows "This link is no longer valid"

**Share page layout:**
- Header: TutisCloud logo, shared item name, share owner avatar
- Content: file list (grid or list), download button per item
- Folder shares: show folder contents, breadcrumb within shared folder
- File shares: show file preview + download button

**Download from share:**
- tRPC: `files.getShareDownloadUrl({ token, fileId? })` — returns pre-signed S3 URL
- No authentication required (token is the auth)
- Tracks download in `traffic` table

### 4.4 Share Permissions

- **Visitor:** can view + download. Cannot modify, upload, or delete.
- **Editor:** can view + download + upload. Cannot delete existing files or rename.
- Editor access validated: if share type is "folder" and permission is "editor", the upload endpoint accepts the share token instead of session auth.

---

## 5. tRPC Router Structure

```
src/server/trpc/routers/files.ts:
  // Folder ops
  createFolder       (protectedProcedure)
  renameItem         (protectedProcedure)
  deleteItem         (protectedProcedure)
  moveItem           (protectedProcedure)
  listFolders        (protectedProcedure)
  getBreadcrumb      (protectedProcedure)

  // File ops
  listFiles          (protectedProcedure)
  createFile         (protectedProcedure)
  renameItem         (protectedProcedure)  — shared with folder
  deleteItem         (protectedProcedure)  — shared with folder
  moveItem           (protectedProcedure)  — shared with folder
  getPreviewUrl      (protectedProcedure)
  getPresignedUrl    (protectedProcedure)
  confirmUpload      (protectedProcedure)
  checkQuota         (protectedProcedure)
  getQuota           (protectedProcedure)

  // Trash
  listTrash          (protectedProcedure)
  restoreItem        (protectedProcedure)
  permanentDelete    (protectedProcedure)
  emptyTrash         (protectedProcedure)

  // Favourites
  toggleFavourite    (protectedProcedure)
  listFavourites     (protectedProcedure)

  // Zip
  createZip          (protectedProcedure)
  getZipStatus       (protectedProcedure)

  // Search
  search             (protectedProcedure)

  // Bulk
  bulkMove           (protectedProcedure)
  bulkDelete         (protectedProcedure)

  // Sharing
  createShare        (protectedProcedure)
  listShares         (protectedProcedure)
  deleteShare        (protectedProcedure)
  updateShare        (protectedProcedure)
  getShareContent    (publicProcedure)
  getShareDownloadUrl(publicProcedure)
```

---

## 6. S3 Configuration

### Environment Variables

```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=tutiscloud-files
S3_ENDPOINT=https://s3.amazonaws.com  # or MinIO endpoint for self-hosted
```

### File Storage Path

```
{userId}/{uniqueId}/{sanitized-filename}
```

- `userId`: prevents cross-user access
- `uniqueId`: DB primary key, prevents name collisions
- `sanitized-filename`: original filename with special chars removed

### S3 Client (`src/lib/s3.ts`)

- Singleton AWS S3 client using `@aws-sdk/client-s3`
- `getPresignedUploadUrl(key, contentType, expiresIn)` — generates PUT URL
- `getPresignedDownloadUrl(key, expiresIn)` — generates GET URL
- `deleteObject(key)` — deletes a single object
- `deleteObjects(keys)` — batch delete (up to 1000)
- `getObjectSize(key)` — HEAD request for file size
- All functions use the `@aws-sdk/s3-request-presigner` package

---

## 7. RBAC Integration

All file operations are gated by permissions from Phase 2:

| Operation | Permission | Roles (minimum) |
|-----------|-----------|-----------------|
| Create folder | `FOLDER_CREATE` | editor+ |
| Read folder | `FOLDER_READ` | viewer+ |
| Update folder | `FOLDER_UPDATE` | editor+ |
| Delete folder | `FOLDER_DELETE` | editor+ |
| Create file | `FILE_CREATE` | editor+ |
| Read file | `FILE_READ` | viewer+ |
| Update file | `FILE_UPDATE` | editor+ |
| Delete file | `FILE_DELETE` | editor+ |
| Download file | `FILE_DOWNLOAD` | viewer+ |
| Create share | `SHARE_CREATE` | editor+ |
| Read shares | `SHARE_READ` | viewer+ |
| Delete share | `SHARE_DELETE` | editor+ |

**Ownership check:** Users can only manage their own files (`userId` match). Master/admin roles can manage all files.

---

## 8. Error Handling

| Error | Response |
|-------|----------|
| Folder not found | `NOT_FOUND` — "Folder does not exist" |
| File not found | `NOT_FOUND` — "File does not exist" |
| Permission denied | `FORBIDDEN` — "You don't have permission" |
| Storage quota exceeded | `BAD_REQUEST` — "Storage quota exceeded" |
| Invalid move (cycle) | `BAD_REQUEST` — "Cannot move folder into its own descendant" |
| Upload failed | `INTERNAL_SERVER_ERROR` — "Upload failed. Please try again" |
| Share expired | `NOT_FOUND` — "This link has expired" |
| Share password wrong | `UNAUTHORIZED` — "Invalid password" |
| Name too long | `BAD_REQUEST` — validation message from Zod |

---

## 9. Testing Strategy

### Unit Tests (Vitest)

- RBAC permission checks for file operations
- Zod schema validation (create folder, rename, move, etc.)
- S3 presigned URL generation
- Breadcrumb path computation
- Share token generation and validation
- Quota calculation

### E2E Tests (Playwright)

- Create folder → rename → move → delete flow
- Upload file → preview → download → delete flow
- Trash → restore → permanent delete flow
- Favourite toggle → favourites view flow
- Search by name → clear search flow
- Multi-select → bulk delete flow
- Create share link → visit public page → download
- Password-protected share → enter password → access
- Upload when quota exceeded → blocked

---

## 10. Acceptance Criteria

### 3A: Core
- [ ] Create, rename, move, delete folders
- [ ] Upload files (small via pre-signed, large via server proxy)
- [ ] Upload progress bar per file
- [ ] View files in grid and list modes
- [ ] Breadcrumb navigation works for nested folders
- [ ] Context menu on right-click
- [ ] File preview modal for images, PDFs, text, video
- [ ] Storage quota check before upload
- [ ] TypeScript strict — zero errors
- [ ] All unit tests pass

### 3B: UX
- [ ] Trash view with restore and permanent delete
- [ ] Favourite folders and favourites view
- [ ] Zip download for multiple items
- [ ] Search by name within folder
- [ ] Drag-and-drop to move items
- [ ] Multi-select with bulk operations
- [ ] Storage quota display in sidebar

### 3C: Sharing
- [ ] Create share link with token
- [ ] Optional password protection
- [ ] Optional expiration
- [ ] Public share page renders at /s/[token]
- [ ] Password gate for protected shares
- [ ] Download from share without auth
- [ ] Editor shares allow upload
- [ ] Revoke share link
