# Task 9: Move Folder/File (Recursive Safety) — Report

## Status: COMPLETED

## Changes Made

### 1. Recursive cycle detection in `moveItem` (already in codebase)
- `src/server/trpc/routers/files.ts` — The `moveItem` procedure already had recursive ancestor-check cycle detection (walks up from `toFolderId` to root, throwing `BAD_REQUEST` if `uniqueId` is found as an ancestor). No additional change was needed; the committed code at HEAD already contains the correct implementation.

### 2. Drag-and-drop in FileItem (`src/components/file-manager/FileItem.tsx`)
- Added `type DragEvent` to React imports
- Added `trpc.files.moveItem.useMutation()` with query invalidation (`listFolders`, `listFiles`)
- Added `handleDragStart` — serializes `{ uniqueId, type }` as JSON into `dataTransfer`
- Added `handleDragOver` — calls `preventDefault` and sets `dropEffect: 'move'` only for folder targets
- Added `handleDrop` — parses drag JSON, validates target is not self, calls `moveItem.mutate()`
- Applied `draggable`, `onDragStart`, `onDragOver`, `onDrop` to both grid `<div>` and list `<tr>` containers

## Commits
- `8ac223d` — `feat: add drag-and-drop move with recursive cycle detection` (1 file changed, 43 insertions, 1 deletion)

## Test Summary
- **TypeScript**: `pnpm tsc --noEmit` passed with zero errors
- **Unit/Integration tests**: Not run (no test files for this component in scope)

## Concerns
- None significant. The recursive cycle detection walks the folder hierarchy on every move, which is O(depth) DB queries. For deeply nested folder structures this could be optimized with a materialized path or recursive CTE, but acceptable for typical usage.
- The drag-and-drop handlers are wired into both grid and list views consistently.
