import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

type Emoji = {
  id: number;
  name: string;
  unicode: string;
  shortcode: string;
};

type EmojiGroup = Record<string, Emoji[]>;

export const emojisRouter = createTRPCRouter({
  getEmojiList: publicProcedure
    .query(
      unstable_cache(
        async () => {
          // Get all emojis from database
const emojis = await db.emoji.findMany({
  orderBy: { category: "asc" },
}).catch(error => {
  console.error("Failed to fetch emojis:", error);
  return [] as Array<{
    id: number;
    name: string;
    unicode: string;
    shortcode: string;
    category: string;
  }>;
}) as Array<{
  id: number;
  name: string;
  unicode: string;
  shortcode: string;
  category: string;
}>;

          // Group emojis by category
const groupedEmojis = emojis.reduce((acc: EmojiGroup, emoji) => {
  if (!emoji.category) {
    console.warn("Emoji missing category:", emoji);
    return acc;
  }

  if (!acc[emoji.category]) {
    acc[emoji.category] = [];
  }

  acc[emoji.category].push({
    id: emoji.id,
    name: emoji.name,
    unicode: emoji.unicode,
    shortcode: emoji.shortcode,
    category: emoji.category
  } as Emoji);

  return acc;
}, {} as EmojiGroup) as EmojiGroup;

          return groupedEmojis;
        },
        ["emojis", "list"],
        {
          tags: ["emojis"],
          revalidate: 86400, // Cache for 24 hours
        }
      )
    ),
});