import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { adminRouter } from "./router/admin";
import { analyticsRouter } from "./router/analytics";
import { apiIntegrationsRouter } from "./router/api-integrations";
import { authRouter } from "./router/auth";
import { bulkImportRouter } from "./router/bulk-import";
import { internationalRouter } from "./router/international";
import { listingRouter } from "./router/listing";
import { messagingRouter } from "./router/messaging";
import { moderationRouter } from "./router/moderation";
import { paymentRouter } from "./router/payment";
import { pricingRouter } from "./router/pricing";
import { postRouter } from "./router/post";
import { ratingRouter } from "./router/rating";
import { reservationRouter } from "./router/reservation";
import { scheduledListingsRouter } from "./router/scheduled-listings";
import { trustSafetyRouter } from "./router/trust-safety";
import { uploadRouter } from "./router/upload";
import { userRouter } from "./router/user";
import { verificationRouter } from "./router/verification";
import { whiteLabelRouter } from "./router/white-label";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter as typeof authRouter,
  post: postRouter as typeof postRouter,
  listing: listingRouter as typeof listingRouter,
  reservation: reservationRouter as typeof reservationRouter,
  rating: ratingRouter as typeof ratingRouter,
  admin: adminRouter as typeof adminRouter,
  payment: paymentRouter as typeof paymentRouter,
  upload: uploadRouter as typeof uploadRouter,
  moderation: moderationRouter as typeof moderationRouter,
  messaging: messagingRouter as typeof messagingRouter,
  analytics: analyticsRouter as typeof analyticsRouter,
  pricing: pricingRouter as typeof pricingRouter,
  verification: verificationRouter as typeof verificationRouter,
  trustSafety: trustSafetyRouter as typeof trustSafetyRouter,
  scheduledListings: scheduledListingsRouter as typeof scheduledListingsRouter,
  bulkImport: bulkImportRouter as typeof bulkImportRouter,
  apiIntegrations: apiIntegrationsRouter as typeof apiIntegrationsRouter,
  whiteLabel: whiteLabelRouter as typeof whiteLabelRouter,
  international: internationalRouter as typeof internationalRouter,
  user: userRouter as typeof userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
