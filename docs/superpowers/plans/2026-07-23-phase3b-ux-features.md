# Phase 3B: UX Features Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute this plan task-by-task.

**Goal:** Implement Trash, Favourites, Search, and Bulk Operations for the file manager.

**Prerequisites:** Phase 3A complete (core file manager, S3, tRPC router, shadcn/ui, all components working).

**Tech Stack:** Next.js 16, TypeScript strict, Prisma 7, tRPC 11, shadcn/ui, TailwindCSS, Vitest, Playwright

---

## File Structure

```
tutiscloud/
├── prisma/
│   └── schema.prisma                          # Verify FavouriteFolder exists, add if missing
├── src/
│   ├── lib/
│   │   └── validators.ts                      # MODIFY — add trash, favourite, bulk, search validators
│   ├── server/
│   │   └── trpc/
│   │       └── routers/
│   │           └── files.ts                   # MODIFY — add trash, favourite, search, bulk procedures
│   ├── app/
│   │   └── (dashboard)/
│   │       ├── trash/
│   │       │   └── page.tsx                   # NEW — trash view page
│   │       └── favourites/
│   │           └── page.tsx                   # NEW — favourites view page
│   └── components/
│       └── file-manager/
│           ├── TrashView.tsx                  # NEW — trash list with restore/permanent delete
│           ├── FavouriteButton.tsx            # NEW — star toggle on FileItem
│           ├── SearchBar.tsx                  # NEW — search input with debouncing
│           ├── BulkActions.tsx                # NEW — bulk toolbar (move/delete/download)
│           ├── FileItem.tsx                   # MODIFY — add favourite star, bulk select
│           └── FileManager.tsx                # MODIFY — integrate search
```

---

### Task 1: Trash View + Procedures

**Files:**
- Modify: `src/lib/validators.ts` (add trash validators)
- Modify: `src/server/trpc/routers/files.ts` (add trash procedures)
- Create: `src/components/file-manager/TrashView.tsx`
- Create: `src/app/(dashboard)/trash/page.tsx`

**Interfaces:**
- Produces: `files.listTrash`, `files.restoreItem`, `files.permanentDelete`, `files.emptyTrash`

- [ ] **Step 1: Add trash validators**

Add to `src/lib/validators.ts`:

```typescript
export const trashItemSchema = z.object({
  uniqueId: z.number(),
  type: z.enum(['file', 'folder']),
});

export const emptyTrashSchema = z.object({}); // no params needed
```

- [ ] **Step 2: Add trash procedures to files router**

Add to `src/server/trpc/routers/files.ts`:

```typescript
  // ─── Trash ──────────────────────────────────────────────────────
  listTrash: protectedProcedure.query(async ({ ctx }) => {
    const folders = await ctx.db.fileManagerFolder.findMany({
      where: { userId: ctx.session.user.id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
    const files = await ctx.db.fileManagerFile.findMany({
      where: { userId: ctx.session.user.id, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
    return { folders, files };
  }),

  restoreItem: protectedProcedure
    .input(z.object({ uniqueId: z.number(), type: z.enum(['file', 'folder']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'folder') {
        await ctx.db.fileManagerFolder.update({
          where: { uniqueId: input.uniqueId },
          data: { deletedAt: null },
        });
      } else {
        await ctx.db.fileManagerFile.update({
          where: { uniqueId: input.uniqueId },
          data: { deletedAt: null },
        });
      }
      return { success: true };
    }),

  permanentDelete: protectedProcedure
    .input(z.object({ uniqueId: z.number(), type: z.enum(['file', 'folder']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'file') {
        const file = await ctx.db.fileManagerFile.findFirst({
          where: { uniqueId: input.uniqueId },
        });
        if (file) {
          const { getS3Key, deleteObject } = await import('@/lib/s3');
          const key = getS3Key(ctx.session.user.id, file.uniqueId, file.basename ?? file.name ?? 'unknown');
          await deleteObject(key);
        }
        await ctx.db.fileManagerFile.delete({
          where: { uniqueId: input.uniqueId },
        });
      } else {
        // Delete all files in folder first
        const files = await ctx.db.fileManagerFile.findMany({
          where: { folderId: input.uniqueId },
        });
        const { getS3Key, deleteObject } = await import('@/lib/s3');
        for (const file of files) {
          const key = getS3Key(ctx.session.user.id, file.uniqueId, file.basename ?? file.name ?? 'unknown');
          await deleteObject(key);
          await ctx.db.fileManagerFile.delete({ where: { uniqueId: file.uniqueId } });
        }
        await ctx.db.fileManagerFolder.delete({
          where: { uniqueId: input.uniqueId },
        });
      }
      return { success: true };
    }),

  emptyTrash: protectedProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const files = await ctx.db.fileManagerFile.findMany({
        where: { userId: ctx.session.user.id, deletedAt: { not: null } },
      });
      const { getS3Key, deleteObject } = await import('@/lib/s3');
      for (const file of files) {
        const key = getS3Key(ctx.session.user.id, file.uniqueId, file.basename ?? file.name ?? 'unknown');
        await deleteObject(key);
        await ctx.db.fileManagerFile.delete({ where: { uniqueId: file.uniqueId } });
      }
      await ctx.db.fileManagerFolder.deleteMany({
        where: { userId: ctx.session.user.id, deletedAt: { not: null } },
      });
      return { success: true };
    }),
```

- [ ] **Step 3: Create TrashView component**

Create `src/components/file-manager/TrashView.tsx`:

```tsx
'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { RotateCcw, Trash2, Folder, File } from 'lucide-react';

export function TrashView() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.files.listTrash.useQuery();

  const restore = trpc.files.restoreItem.useMutation({
    onSuccess: () => {
      toast('Item restored', 'success');
      utils.files.listTrash.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const permanentDelete = trpc.files.permanentDelete.useMutation({
    onSuccess: () => {
      toast('Item permanently deleted', 'success');
      utils.files.listTrash.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const emptyTrash = trpc.files.emptyTrash.useMutation({
    onSuccess: () => {
      toast('Trash emptied', 'success');
      utils.files.listTrash.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  if (isLoading) return <div className="p-4">Loading...</div>;

  const items = [
    ...(data?.folders.map(f => ({ ...f, type: 'folder' as const })) ?? []),
    ...(data?.files.map(f => ({ ...f, type: 'file' as const })) ?? []),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h1 className="text-lg font-semibold">Trash</h1>
        {items.length > 0 && (
          <button
            onClick={() => emptyTrash.mutate({})}
            disabled={emptyTrash.isPending}
            className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Empty Trash
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            Trash is empty
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.uniqueId} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  {item.type === 'folder' ? (
                    <Folder className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <File className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.name ?? 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">
                      Deleted {new Date(item.deletedAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restore.mutate({ uniqueId: item.uniqueId, type: item.type })}
                    disabled={restore.isPending}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600"
                    title="Restore"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => permanentDelete.mutate({ uniqueId: item.uniqueId, type: item.type })}
                    disabled={permanentDelete.isPending}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create trash page**

Create `src/app/(dashboard)/trash/page.tsx`:

```tsx
'use client';

import { TrashView } from '@/components/file-manager/TrashView';

export default function TrashPage() {
  return <TrashView />;
}
```

- [ ] **Step 5: Add trash link to sidebar**

Update `src/app/(dashboard)/layout.tsx` to add Trash link:

```tsx
<a href="/trash" className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
  Trash
</a>
```

- [ ] **Step 6: Type check and commit**

```bash
pnpm tsc --noEmit
git add src/lib/validators.ts src/server/trpc/routers/files.ts src/components/file-manager/TrashView.tsx "src/app/(dashboard)/trash/" "src/app/(dashboard)/layout.tsx" && git commit -m "feat: add trash view with restore, permanent delete, and empty trash"
```

---

### Task 2: Favourites

**Files:**
- Modify: `src/server/trpc/routers/files.ts` (add favourite procedures)
- Create: `src/components/file-manager/FavouriteButton.tsx`
- Modify: `src/components/file-manager/FileItem.tsx` (add star)
- Create: `src/app/(dashboard)/favourites/page.tsx`

**Interfaces:**
- Produces: `files.toggleFavourite`, `files.listFavourites`, `files.isFavourited`

- [ ] **Step 1: Add favourite procedures**

Add to `src/server/trpc/routers/files.ts`:

```typescript
  // ─── Favourites ──────────────────────────────────────────────────
  toggleFavourite: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.favouriteFolder.findUnique({
        where: {
          userId_folderUniqueId: {
            userId: ctx.session.user.id,
            folderUniqueId: input.folderId,
          },
        },
      });
      if (existing) {
        await ctx.db.favouriteFolder.delete({
          where: {
            userId_folderUniqueId: {
              userId: ctx.session.user.id,
              folderUniqueId: input.folderId,
            },
          },
        });
        return { favourited: false };
      }
      await ctx.db.favouriteFolder.create({
        data: {
          userId: ctx.session.user.id,
          folderUniqueId: input.folderId,
        },
      });
      return { favourited: true };
    }),

  listFavourites: protectedProcedure.query(async ({ ctx }) => {
    const favourites = await ctx.db.favouriteFolder.findMany({
      where: { userId: ctx.session.user.id },
      include: { folder: true },
    });
    return favourites.map(f => f.folder);
  }),

  isFavourited: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const exists = await ctx.db.favouriteFolder.findUnique({
        where: {
          userId_folderUniqueId: {
            userId: ctx.session.user.id,
            folderUniqueId: input.folderId,
          },
        },
      });
      return !!exists;
    }),
```

- [ ] **Step 2: Create FavouriteButton**

Create `src/components/file-manager/FavouriteButton.tsx`:

```tsx
'use client';

import { Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface FavouriteButtonProps {
  folderId: number;
  size?: 'sm' | 'md';
}

export function FavouriteButton({ folderId, size = 'sm' }: FavouriteButtonProps) {
  const utils = trpc.useUtils();
  const { data: isFavourited } = trpc.files.isFavourited.useQuery({ folderId });

  const toggle = trpc.files.toggleFavourite.useMutation({
    onSuccess: () => {
      utils.files.isFavourited.invalidate({ folderId });
      utils.files.listFavourites.invalidate();
    },
  });

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate({ folderId });
      }}
      className={`rounded p-0.5 ${isFavourited ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
      title={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
    >
      <Star className={`${iconSize} ${isFavourited ? 'fill-current' : ''}`} />
    </button>
  );
}
```

- [ ] **Step 3: Update FileItem with FavouriteButton**

Read `src/components/file-manager/FileItem.tsx` — add `FavouriteButton` to folder items:

- Import `FavouriteButton` from './FavouriteButton'
- For grid view: render `<FavouriteButton folderId={item.uniqueId} />` in the folder card
- For list view: render in the Name cell for folders

- [ ] **Step 4: Create favourites page**

Create `src/app/(dashboard)/favourites/page.tsx`:

```tsx
'use client';

import { trpc } from '@/lib/trpc';
import { FileItem } from '@/components/file-manager/FileItem';
import { Star } from 'lucide-react';

export default function FavouritesPage() {
  const { data: favourites, isLoading } = trpc.files.listFavourites.useQuery();

  if (isLoading) return <div className="p-4">Loading...</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2">
        <Star className="h-5 w-5 text-yellow-500 fill-current" />
        <h1 className="text-lg font-semibold">Favourites</h1>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {(!favourites || favourites.length === 0) ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            No favourites yet
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {favourites.map((folder) => (
              <FileItem key={folder.uniqueId} item={folder} type="folder" viewMode="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add favourites link to sidebar**

Update `src/app/(dashboard)/layout.tsx`:

```tsx
<a href="/favourites" className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
  Favourites
</a>
```

- [ ] **Step 6: Type check and commit**

```bash
pnpm tsc --noEmit
git add src/server/trpc/routers/files.ts src/components/file-manager/FavouriteButton.tsx src/components/file-manager/FileItem.tsx "src/app/(dashboard)/favourites/" "src/app/(dashboard)/layout.tsx" && git commit -m "feat: add favourites system — toggle, view, sidebar link"
```

---

### Task 3: Search

**Files:**
- Modify: `src/server/trpc/routers/files.ts` (verify search procedure exists)
- Create: `src/components/file-manager/SearchBar.tsx`
- Modify: `src/components/file-manager/FileManager.tsx` (integrate search)

**Interfaces:**
- Produces: `SearchBar` component with debounced input

- [ ] **Step 1: Verify search procedure exists**

Check `src/server/trpc/routers/files.ts` for `search` procedure. If missing, add it:

```typescript
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(255), parentId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const where = {
        userId: ctx.session.user.id,
        deletedAt: null,
        name: { contains: input.query, mode: 'insensitive' as const },
        ...(input.parentId !== undefined ? { folderId: input.parentId } : {}),
      };
      const files = await ctx.db.fileManagerFile.findMany({ where, orderBy: { name: 'asc' } });
      return files;
    }),
```

- [ ] **Step 2: Create SearchBar**

Create `src/components/file-manager/SearchBar.tsx`:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface SearchBarProps {
  onResults: (files: Array<{ uniqueId: number; name: string | null }>) => void;
  onClear: () => void;
}

export function SearchBar({ onResults, onClear }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = trpc.files.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );

  useEffect(() => {
    if (results && debouncedQuery) {
      onResults(results);
    }
  }, [results, debouncedQuery, onResults]);

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    onClear();
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search files..."
        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Integrate SearchBar into FileManager**

Update `src/components/file-manager/FileManager.tsx`:

- Import `SearchBar`
- Add state: `const [searchResults, setSearchResults] = useState<Array<{ uniqueId: number; name: string | null }> | null>(null)`
- Render `<SearchBar>` in the toolbar area
- When `searchResults` is set, show those files instead of normal folder listing
- When cleared, return to normal view

- [ ] **Step 4: Type check and commit**

```bash
pnpm tsc --noEmit
git add src/components/file-manager/SearchBar.tsx src/components/file-manager/FileManager.tsx && git commit -m "feat: add search with debounced input and real-time results"
```

---

### Task 4: Bulk Operations

**Files:**
- Modify: `src/lib/validators.ts` (add bulkMoveSchema, bulkDeleteSchema if missing)
- Modify: `src/server/trpc/routers/files.ts` (add bulkMove, bulkDelete, bulkDownload procedures)
- Create: `src/components/file-manager/BulkActions.tsx`
- Modify: `src/components/file-manager/FileManager.tsx` (integrate bulk actions)
- Modify: `src/components/file-manager/FileManagerContext.tsx` (add bulk select helpers)

**Interfaces:**
- Produces: `BulkActions` toolbar, `files.bulkMove`, `files.bulkDelete`

- [ ] **Step 1: Verify bulk validators exist**

Check `src/lib/validators.ts` for `bulkDeleteSchema` and `bulkMoveSchema`. If missing, add them.

- [ ] **Step 2: Add bulk procedures**

Add to `src/server/trpc/routers/files.ts`:

```typescript
  bulkMove: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1).max(100),
      type: z.enum(['file', 'folder']),
      toFolderId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const id of input.ids) {
        if (input.type === 'folder') {
          await ctx.db.fileManagerFolder.update({
            where: { uniqueId: id },
            data: { parentId: input.toFolderId },
          });
        } else {
          await ctx.db.fileManagerFile.update({
            where: { uniqueId: id },
            data: { folderId: input.toFolderId },
          });
        }
      }
      return { moved: input.ids.length };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        uniqueId: z.number(),
        type: z.enum(['file', 'folder']),
      })).min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      for (const item of input.items) {
        if (item.type === 'folder') {
          await ctx.db.fileManagerFolder.update({
            where: { uniqueId: item.uniqueId },
            data: { deletedAt: now },
          });
        } else {
          await ctx.db.fileManagerFile.update({
            where: { uniqueId: item.uniqueId },
            data: { deletedAt: now },
          });
        }
      }
      return { deleted: input.items.length };
    }),
```

- [ ] **Step 3: Create BulkActions**

Create `src/components/file-manager/BulkActions.tsx`:

```tsx
'use client';

import { useFileManager } from './FileManagerContext';
import { Trash2, FolderInput, X } from 'lucide-react';

export function BulkActions() {
  const { selectedItems, clearSelection } = useFileManager();

  if (selectedItems.size === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
      <span className="text-sm font-medium text-blue-700">
        {selectedItems.size} item(s) selected
      </span>
      <button className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <FolderInput className="h-4 w-4" />
        Move
      </button>
      <button className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
      <button
        onClick={clearSelection}
        className="rounded p-1.5 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Update FileManagerContext with bulk helpers**

Add to `FileManagerContext.tsx`:

```typescript
  const selectAll = useCallback((ids: number[]) => {
    setSelectedItems(new Set(ids));
  }, []);
```

(Already exists in Phase 3A context — verify it's there.)

- [ ] **Step 5: Integrate BulkActions into FileManager**

Update `src/components/file-manager/FileManager.tsx`:

- Import `BulkActions`
- Render `<BulkActions />` below the toolbar

- [ ] **Step 6: Type check and commit**

```bash
pnpm tsc --noEmit
git add src/lib/validators.ts src/server/trpc/routers/files.ts src/components/file-manager/BulkActions.tsx src/components/file-manager/FileManager.tsx src/components/file-manager/FileManagerContext.tsx && git commit -m "feat: add bulk operations — multi-select, bulk move, bulk delete"
```

---

### Task 5: Final Integration Check

- [ ] **Step 1: TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

- [ ] **Step 3: Prisma validate**

```bash
npx prisma validate
```

- [ ] **Step 4: Check for any types**

```bash
grep -rn ": any" src/components/file-manager/ src/server/trpc/routers/files.ts
```

- [ ] **Step 5: Update progress ledger**

Add to `.superpowers/sdd/progress.md`:

```markdown
# Phase 3B Progress Ledger

- [x] Task 1: Trash View + Procedures
- [x] Task 2: Favourites
- [x] Task 3: Search
- [x] Task 4: Bulk Operations
- [x] Task 5: Final Integration Check
```

- [ ] **Step 6: Commit**

```bash
git add .superpowers/sdd/progress.md && git commit -m "chore: mark Phase 3B complete in progress ledger"
```
