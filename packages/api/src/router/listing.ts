import { z } from "zod/v4";
import { and, desc, eq, sql } from "drizzle-orm";

import {
  insertListingSchema,
  listing,
  selectListingSchema,
} from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { geocodeAddress } from "../services/geocoding";

export const listingRouter = createTRPCRouter({
  // Create a new listing (sellers only)
  create: protectedProcedure
    .input(
      insertListingSchema.pick({
        title: true,
        description: true,
        category: true,
        photos: true,
        pricePerPiece: true,
        quantityTotal: true,
        maxPerBuyer: true,
        pickupAddress: true,
        pickupInstructions: true,
        latitude: true,
        longitude: true,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is verified
      const user = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id),
      });

      if (user?.accountStatus !== "ACTIVE") {
        throw new Error("Account must be verified to create listings");
      }

      // Create listing with DRAFT status
      const [newListing] = await ctx.db
        .insert(listing)
        .values({
          ...input,
          sellerId: ctx.session.user.id,
          quantityAvailable: input.quantityTotal,
          status: "DRAFT",
          location: null, // Will be set by PostGIS trigger
        })
        .returning();

      return newListing;
    }),

  // Submit listing for review
  submitForReview: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingListing = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!existingListing) {
        throw new Error("Listing not found");
      }

      if (existingListing.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      if (existingListing.status !== "DRAFT") {
        throw new Error("Only draft listings can be submitted for review");
      }

      const [updated] = await ctx.db
        .update(listing)
        .set({ status: "PENDING_REVIEW" })
        .where(eq(listing.id, input.listingId))
        .returning();

      return updated;
    }),

  // Update listing
  update: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        data: insertListingSchema
          .pick({
            title: true,
            description: true,
            category: true,
            photos: true,
            pricePerPiece: true,
            quantityTotal: true,
            maxPerBuyer: true,
            pickupAddress: true,
            pickupInstructions: true,
            latitude: true,
            longitude: true,
          })
          .partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingListing = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!existingListing) {
        throw new Error("Listing not found");
      }

      if (existingListing.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      // Check if critical fields changed (requires re-moderation)
      const criticalFieldsChanged =
        input.data.pricePerPiece !== undefined ||
        input.data.quantityTotal !== undefined ||
        input.data.description !== undefined;

      const newStatus = criticalFieldsChanged
        ? "PENDING_REVIEW"
        : existingListing.status;

      const [updated] = await ctx.db
        .update(listing)
        .set({
          ...input.data,
          status: newStatus,
        })
        .where(eq(listing.id, input.listingId))
        .returning();

      return updated;
    }),

  // Delete (cancel) listing
  delete: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingListing = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
        with: {
          reservations: true,
        },
      });

      if (!existingListing) {
        throw new Error("Listing not found");
      }

      if (existingListing.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      // Check for active reservations
      const hasActiveReservations = existingListing.reservations.some(
        (r) => r.status === "CONFIRMED" || r.status === "PENDING",
      );

      if (hasActiveReservations) {
        throw new Error("Cannot delete listing with active reservations");
      }

      const [updated] = await ctx.db
        .update(listing)
        .set({ status: "CANCELLED" })
        .where(eq(listing.id, input.listingId))
        .returning();

      return updated;
    }),

  // Get listing by ID (public)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.id),
        with: {
          seller: {
            columns: {
              id: true,
              userType: true,
              ratingAverage: true,
              ratingCount: true,
            },
          },
        },
      });

      return result;
    }),

  // Get my listings (protected)
  myListings: protectedProcedure.query(async ({ ctx }) => {
    const results = await ctx.db.query.listing.findMany({
      where: (listings, { eq }) => eq(listings.sellerId, ctx.session.user.id),
      orderBy: (listings, { desc }) => [desc(listings.createdAt)],
    });

    return results;
  }),

  // Search nearby listings (public)
  searchNearby: publicProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number().default(10),
        category: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sortBy: z
          .enum(["distance", "price", "date", "rating"])
          .default("distance"),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Use PostGIS ST_Distance for proximity search
      const distanceCalc = sql<number>`
        ST_Distance(
          ST_GeomFromText(${listing.location}, 4326)::geography,
          ST_MakePoint(${input.longitude}, ${input.latitude})::geography
        ) / 1000
      `;

      const baseQuery = ctx.db
        .select({
          listing: listing,
          distance: distanceCalc,
          sellerRating: sql<number>`${ctx.db.query.user.findFirst({
            where: (users) => eq(users.id, listing.sellerId),
            columns: { ratingAverage: true },
          })}`,
        })
        .from(listing)
        .where(
          and(
            eq(listing.status, "PUBLISHED"),
            // PostGIS proximity filter
            sql`ST_DWithin(
              ST_GeomFromText(${listing.location}, 4326)::geography,
              ST_MakePoint(${input.longitude}, ${input.latitude})::geography,
              ${input.radiusKm * 1000}
            )`,
            input.category ? eq(listing.category, input.category) : undefined,
            input.minPrice
              ? sql`${listing.pricePerPiece} >= ${input.minPrice}`
              : undefined,
            input.maxPrice
              ? sql`${listing.pricePerPiece} <= ${input.maxPrice}`
              : undefined,
          ),
        );

      // Apply sorting, then limit
      let query;
      if (input.sortBy === "price") {
        query = baseQuery.orderBy(listing.pricePerPiece).limit(input.limit);
      } else if (input.sortBy === "date") {
        query = baseQuery.orderBy(desc(listing.createdAt)).limit(input.limit);
      } else {
        // Distance sorting is default
        query = baseQuery.limit(input.limit);
      }

      const results = await query;
      return results;
    }),

  // Search by postal code
  searchByPostalCode: publicProcedure
    .input(
      z.object({
        postalCode: z.string().regex(/^[A-Z]\d[A-Z] \d[A-Z]\d$/),
        radiusKm: z.number().default(10),
        category: z.string().optional(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get coordinates from postal code
      const postal = await ctx.db.query.postalCode.findFirst({
        where: (postalCodes, { eq }) =>
          eq(postalCodes.code, input.postalCode.toUpperCase()),
      });

      if (!postal) {
        return [];
      }

      // Use PostGIS ST_Distance for proximity search
      const distanceCalc = sql<number>`
        ST_Distance(
          ST_GeomFromText(${listing.location}, 4326)::geography,
          ST_MakePoint(${postal.longitude}, ${postal.latitude})::geography
        ) / 1000
      `;

      const results = await ctx.db
        .select({
          listing: listing,
          distance: distanceCalc,
        })
        .from(listing)
        .where(
          and(
            eq(listing.status, "PUBLISHED"),
            sql`ST_DWithin(
              ST_GeomFromText(${listing.location}, 4326)::geography,
              ST_MakePoint(${postal.longitude}, ${postal.latitude})::geography,
              ${input.radiusKm * 1000}
            )`,
            input.category ? eq(listing.category, input.category) : undefined,
          ),
        )
        .limit(input.limit);

      return results;
    }),

  // Geocode address to coordinates
  geocodeAddress: publicProcedure
    .input(
      z.object({
        address: z.string().min(5),
        countryCode: z.string().length(2).optional(),
      }),
    )
    .query(async ({ input }) => {
      const result = await geocodeAddress(input.address, input.countryCode);
      return result;
    }),
});
