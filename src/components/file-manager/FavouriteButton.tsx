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
