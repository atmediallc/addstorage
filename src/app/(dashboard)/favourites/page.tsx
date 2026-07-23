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
