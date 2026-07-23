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
