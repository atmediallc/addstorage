import { describe, it, expect } from 'vitest';
import {
  createFolderSchema,
  renameItemSchema,
  deleteItemSchema,
  moveItemSchema,
  createFileSchema,
  bulkDeleteSchema,
  bulkMoveSchema,
  searchSchema,
} from '@/lib/validators';

describe('File manager validators', () => {
  describe('createFolderSchema', () => {
    it('accepts valid folder name', () => {
      expect(createFolderSchema.safeParse({ name: 'Photos', parentId: 0 }).success).toBe(true);
    });
    it('rejects empty name', () => {
      expect(createFolderSchema.safeParse({ name: '', parentId: 0 }).success).toBe(false);
    });
    it('rejects name over 255 chars', () => {
      expect(createFolderSchema.safeParse({ name: 'a'.repeat(256), parentId: 0 }).success).toBe(false);
    });
    it('defaults parentId to 0', () => {
      const result = createFolderSchema.parse({ name: 'Test' });
      expect(result.parentId).toBe(0);
    });
  });

  describe('renameItemSchema', () => {
    it('accepts valid rename', () => {
      expect(renameItemSchema.safeParse({ uniqueId: 1, name: 'New Name', type: 'folder' }).success).toBe(true);
    });
    it('rejects empty name', () => {
      expect(renameItemSchema.safeParse({ uniqueId: 1, name: '', type: 'folder' }).success).toBe(false);
    });
    it('accepts file type', () => {
      expect(renameItemSchema.safeParse({ uniqueId: 1, name: 'doc.pdf', type: 'file' }).success).toBe(true);
    });
  });

  describe('deleteItemSchema', () => {
    it('accepts valid delete', () => {
      expect(deleteItemSchema.safeParse({ uniqueId: 1, type: 'file' }).success).toBe(true);
    });
    it('rejects invalid type', () => {
      expect(deleteItemSchema.safeParse({ uniqueId: 1, type: 'invalid' }).success).toBe(false);
    });
  });

  describe('moveItemSchema', () => {
    it('accepts valid move', () => {
      expect(moveItemSchema.safeParse({ uniqueId: 1, toFolderId: 2, type: 'folder' }).success).toBe(true);
    });
  });

  describe('createFileSchema', () => {
    it('accepts valid file', () => {
      expect(createFileSchema.safeParse({ name: 'doc.pdf', basename: 'doc.pdf', mimetype: 'application/pdf', filesize: '1024', folderId: 0 }).success).toBe(true);
    });
    it('rejects empty name', () => {
      expect(createFileSchema.safeParse({ name: '', basename: 'doc.pdf', mimetype: 'application/pdf', filesize: '1024', folderId: 0 }).success).toBe(false);
    });
  });

  describe('bulkDeleteSchema', () => {
    it('accepts valid bulk delete', () => {
      expect(bulkDeleteSchema.safeParse({ items: [{ uniqueId: 1, type: 'file' }] }).success).toBe(true);
    });
    it('rejects empty items', () => {
      expect(bulkDeleteSchema.safeParse({ items: [] }).success).toBe(false);
    });
    it('rejects over 100 items', () => {
      const items = Array.from({ length: 101 }, (_, i) => ({ uniqueId: i, type: 'file' as const }));
      expect(bulkDeleteSchema.safeParse({ items }).success).toBe(false);
    });
  });

  describe('bulkMoveSchema', () => {
    it('accepts valid bulk move', () => {
      expect(bulkMoveSchema.safeParse({ ids: [1, 2], type: 'folder', toFolderId: 3 }).success).toBe(true);
    });
  });

  describe('searchSchema', () => {
    it('accepts valid search', () => {
      expect(searchSchema.safeParse({ query: 'photo' }).success).toBe(true);
    });
    it('rejects empty query', () => {
      expect(searchSchema.safeParse({ query: '' }).success).toBe(false);
    });
  });
});
