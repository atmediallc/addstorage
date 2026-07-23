# Task 7 Report: Rename + Delete Dialogs

**Status:** COMPLETED  
**Commit:** `4ee4e37` — `feat: add rename and delete dialogs to file manager`  
**Branch:** `main`

## Files Created/Modified

| File | Action |
|------|--------|
| `src/components/file-manager/RenameDialog.tsx` | Created (77 lines) |
| `src/components/file-manager/DeleteDialog.tsx` | Created (56 lines) |
| `src/components/file-manager/FileItem.tsx` | Modified (wired dialogs) |

## What Was Done

### RenameDialog.tsx
- Dialog with text input pre-filled with current item name
- `trpc.files.renameItem.useMutation()` with invalidation of `listFolders` and `listFiles`
- Enter key submits, Escape cancels (handled by Dialog primitive)
- `useEffect` resets name input when dialog opens
- Toast on success ("Renamed successfully") / error
- Rename button disabled when name is empty or unchanged

### DeleteDialog.tsx
- AlertDialog (shadcn/ui) with confirm/cancel pattern
- Shows item name in description: `Are you sure you want to delete "X"? It will be moved to trash.`
- `trpc.files.deleteItem.useMutation()` with query invalidation
- Toast "Moved to trash" on success
- Red-styled delete action button with pending state text

### FileItem.tsx
- Added imports for `RenameDialog` and `DeleteDialog`
- Wired `showRename`/`showDelete` state (already existed from Task 5) to render both dialogs
- Both dialogs receive `itemId`, `itemType`, and name props
- `onRename`/`onDelete` in `ItemContextMenu` already set state (from Task 5)

## Test Summary

- **Type check:** `pnpm tsc --noEmit` — PASS (exit code 0, zero errors)
- Pre-existing errors before this change: 0
- New errors introduced: 0

## Concerns

- The `createdAt` type in `FileItemProps` was set to `string | Date` to accommodate both Prisma Date objects and tRPC-serialized strings. This is a pragmatic fix; a cleaner approach would be to use a consistent type across all components.
- The rename mutation reuses `listFolders`/`listFiles` invalidation keyed on `currentFolderId`. If the renamed item is the current folder, a refetch of the parent would be needed — not handled yet.
- Delete is a soft delete (moves to trash). Hard delete is deferred to Task 9.
