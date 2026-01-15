import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { protectedProcedure, publicProcedure } from "../trpc";

// Legacy post router - deprecated in favor of listing router
// Kept for backward compatibility but returns empty data
export const postRouter = {
  all: publicProcedure.query(() => {
    return [];
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(() => {
      return null;
    }),

  create: protectedProcedure
    .input(z.object({ title: z.string(), content: z.string() }))
    .mutation(() => {
      throw new Error("This endpoint is deprecated. Use listing.create instead.");
    }),

  delete: protectedProcedure.input(z.string()).mutation(() => {
    throw new Error("This endpoint is deprecated. Use listing.delete instead.");
  }),
} satisfies TRPCRouterRecord;
