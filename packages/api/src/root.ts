import { adminRouter } from "./router/admin";
import { analyticsRouter } from "./router/analytics";
import { authRouter } from "./router/auth";
import { bulkImportRouter } from "./router/bulk-import";
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
import { verificationRouter } from "./router/verification";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  listing: listingRouter,
  reservation: reservationRouter,
  rating: ratingRouter,
  admin: adminRouter,
  payment: paymentRouter,
  upload: uploadRouter,
  moderation: moderationRouter,
  messaging: messagingRouter,
  analytics: analyticsRouter,
  pricing: pricingRouter,
  verification: verificationRouter,
  trustSafety: trustSafetyRouter,
  scheduledListings: scheduledListingsRouter,
  bulkImport: bulkImportRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
