import type { TRPCRouterRecord } from "@trpc/server";

import { protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    // Include impersonation state in session response
    return {
      ...ctx.session,
      isImpersonating: ctx.impersonation?.isImpersonating ?? false,
      originalAdmin: ctx.impersonation?.originalAdmin ?? null,
    };
  }),
  getSecretMessage: protectedProcedure.query(() => {
    return "you can see this secret message!";
  }),
} satisfies TRPCRouterRecord;
