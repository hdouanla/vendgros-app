import { authRouter } from "./router/auth";
import { listingRouter } from "./router/listing";
import { postRouter } from "./router/post";
import { ratingRouter } from "./router/rating";
import { reservationRouter } from "./router/reservation";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  listing: listingRouter,
  reservation: reservationRouter,
  rating: ratingRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
