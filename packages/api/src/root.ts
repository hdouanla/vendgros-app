import { adminRouter } from "./router/admin";
import { analyticsRouter } from "./router/analytics";
import { authRouter } from "./router/auth";
import { listingRouter } from "./router/listing";
import { messagingRouter } from "./router/messaging";
import { moderationRouter } from "./router/moderation";
import { paymentRouter } from "./router/payment";
import { pricingRouter } from "./router/pricing";
import { postRouter } from "./router/post";
import { ratingRouter } from "./router/rating";
import { reservationRouter } from "./router/reservation";
import { uploadRouter } from "./router/upload";
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
});

// export type definition of API
export type AppRouter = typeof appRouter;
