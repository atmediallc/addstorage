'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';

type FileType = 'all' | 'image' | 'document' | 'video' | 'audio' | 'other';
type SortBy = 'name' | 'date' | 'size';
type SortOrder = 'asc' | 'desc';

interface SearchBarProps {
  onResults: (files: Array<{ uniqueId: number; name: string | null }>) => void;
  onClear: () => void;
}

const fileTypeOptions: { value: FileType; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'image', label: 'Images' },
  { value: 'document', label: 'Documents' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Other' },
];

const mimePrefixes: Record<FileType, string[]> = {
  image: ['image/'],
  document: ['application/pdf', 'application/msword', 'application/vnd', 'text/'],
  video: ['video/'],
  audio: ['audio/'],
  other: [],
  all: [],
};

export function SearchBar({ onResults, onClear }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [fileType, setFileType] = useState<FileType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results } = trpc.files.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 },
  );

  // Apply client-side filters and sorting
  useEffect(() => {
    if (!results) {
      onClear();
      return;
    }

    let filtered = results;

    // Filter by file type
    if (fileType !== 'all') {
      const prefixes = mimePrefixes[fileType];
      filtered = filtered.filter((f) => {
        if (!f.mimetype) return fileType === 'other';
        return prefixes.some((p) => f.mimetype?.startsWith(p));
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'date':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          cmp = Number(a.filesize ?? '0') - Number(b.filesize ?? '0');
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    onResults(filtered);
  }, [results, fileType, sortBy, sortOrder]);

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setFileType('all');
    onClear();
  }, [onClear]);

  const toggleSortOrder = () => {
    setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files by name..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-16 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <button
              onClick={handleClear}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded p-1 ${
              showFilters ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={toggleSortOrder}
            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
          {/* File type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Type:</span>
            <div className="flex gap-1">
              {fileTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFileType(opt.value)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    fileType === opt.value
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort by */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort:</span>
            <div className="flex gap-1">
              {(['name', 'date', 'size'] as SortBy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
                    sortBy === s
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {debouncedQuery && results && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {results.length} result(s)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
