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
        postalCode: true,
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
        .returning({ id: listing.id });

      return {
        id: newListing.id,
        status: "DRAFT" as const,
        success: true,
      };
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

      // For MVP testing: auto-publish in development, otherwise require review
      const isDevelopment = process.env.NODE_ENV === "development";
      const newStatus = isDevelopment ? "PUBLISHED" : "PENDING_REVIEW";
      const publishedAt = isDevelopment ? new Date() : null;

      await ctx.db
        .update(listing)
        .set({
          status: newStatus,
          publishedAt,
          updatedAt: new Date()
        })
        .where(eq(listing.id, input.listingId));

      return {
        id: input.listingId,
        status: newStatus,
        success: true,
        message: isDevelopment
          ? "Listing published successfully (auto-published in development mode)"
          : "Listing submitted for review"
      };
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
            quantityAvailable: true,
            maxPerBuyer: true,
            pickupAddress: true,
            pickupInstructions: true,
            postalCode: true,
            latitude: true,
            longitude: true,
            status: true,
            isActive: true,
          })
          .partial(),
      }),
    )
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

      // Check if listing has any reservations
      const hasReservations = existingListing.reservations.some(
        (r) => r.status === "CONFIRMED" || r.status === "PENDING" || r.status === "COMPLETED",
      );

      // Prevent editing if there are reservations (extra backend protection)
      if (hasReservations) {
        // Allow only status and isActive changes
        const hasNonStatusChanges = Object.keys(input.data).some(
          (key) => key !== "status" && key !== "isActive"
        );
        if (hasNonStatusChanges) {
          throw new Error(
            "Cannot edit listing with reservations. Please create a copy instead."
          );
        }
      }

      // Check if content was changed (requires re-moderation)
      // Exclude status, quantityAvailable, photos, and isActive from triggering re-review
      const contentChanged = Object.keys(input.data).some(
        (key) => key !== "status" && key !== "quantityAvailable" && key !== "photos" && key !== "isActive"
      );

      // Determine new status
      let newStatus = existingListing.status;

      // If status is explicitly provided, use it (for workflow transitions)
      if (input.data.status) {
        newStatus = input.data.status;
      } else if (contentChanged && existingListing.status === "PUBLISHED") {
        // If PUBLISHED listing content changed, needs re-review
        newStatus = "PENDING_REVIEW";
      }
      // DRAFT listings stay DRAFT when edited (until submitted for review)
      // isActive changes don't affect status at all

      await ctx.db
        .update(listing)
        .set({
          ...input.data,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(listing.id, input.listingId));

      return {
        id: input.listingId,
        status: newStatus,
        success: true,
      };
    }),

  // Delete listing
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

      // Get user to check if admin
      const user = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id),
      });

      const isAdmin = user?.userType === "ADMIN";
      const isSeller = existingListing.sellerId === ctx.session.user.id;

      // Check authorization
      if (!isSeller && !isAdmin) {
        throw new Error("Not authorized to delete this listing");
      }

      // Check for active reservations before deleting
      // Sellers can delete any listing as long as there are no active reservations
      const hasActiveReservations = existingListing.reservations.some(
        (r) => r.status === "CONFIRMED" || r.status === "PENDING",
      );

      if (hasActiveReservations) {
        throw new Error("Cannot delete listing with active reservations");
      }

      // Permanently delete the listing
      await ctx.db
        .delete(listing)
        .where(eq(listing.id, input.listingId));

      return {
        id: input.listingId,
        deleted: true,
        success: true,
      };
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
              createdAt: true,
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
          ST_MakePoint(${listing.longitude}, ${listing.latitude})::geography,
          ST_MakePoint(${input.longitude}, ${input.latitude})::geography
        ) / 1000
      `;

      const baseQuery = ctx.db
        .select({
          listing: listing,
          distance: distanceCalc,
        })
        .from(listing)
        .where(
          and(
            eq(listing.status, "PUBLISHED"),
            // PostGIS proximity filter
            sql`ST_DWithin(
              ST_MakePoint(${listing.longitude}, ${listing.latitude})::geography,
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
          ST_MakePoint(${listing.longitude}, ${listing.latitude})::geography,
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
              ST_MakePoint(${listing.longitude}, ${listing.latitude})::geography,
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

  // Lookup postal code and return coordinates
  geocodePostalCode: publicProcedure
    .input(
      z.object({
        postalCode: z.string().regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Format postal code to uppercase with space
      const formatted = input.postalCode.replace(/\s/g, "").toUpperCase();
      const postalWithSpace = `${formatted.slice(0, 3)} ${formatted.slice(3)}`;

      const postal = await ctx.db.query.postalCode.findFirst({
        where: (postalCodes, { eq }) =>
          eq(postalCodes.code, postalWithSpace),
      });

      if (!postal) {
        throw new Error("Postal code not found");
      }

      return {
        code: postal.code,
        city: postal.city,
        province: postal.province,
        latitude: postal.latitude,
        longitude: postal.longitude,
      };
    }),

  // Get seller's own listings
  getMyListings: protectedProcedure.query(async ({ ctx }) => {
    const listings = await ctx.db.query.listing.findMany({
      where: (listings, { eq }) => eq(listings.sellerId, ctx.session.user.id),
      orderBy: (listings, { desc }) => [desc(listings.createdAt)],
    });

    return listings;
  }),

  // Duplicate an existing listing (creates a new draft copy)
  duplicate: protectedProcedure
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

      // Create a copy as DRAFT
      const [newListing] = await ctx.db
        .insert(listing)
        .values({
          sellerId: ctx.session.user.id,
          title: `${existingListing.title} (Copy)`,
          description: existingListing.description,
          category: existingListing.category,
          photos: existingListing.photos,
          pricePerPiece: existingListing.pricePerPiece,
          quantityTotal: existingListing.quantityTotal,
          quantityAvailable: existingListing.quantityTotal, // Reset to total
          maxPerBuyer: existingListing.maxPerBuyer,
          pickupAddress: existingListing.pickupAddress,
          pickupInstructions: existingListing.pickupInstructions,
          latitude: existingListing.latitude,
          longitude: existingListing.longitude,
          status: "DRAFT",
          location: null, // Will be set by PostGIS trigger
        })
        .returning({ id: listing.id });

      return {
        id: newListing.id,
        success: true,
      };
    }),

  // Track listing view
  trackView: publicProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Increment view count
      await ctx.db
        .update(listing)
        .set({
          viewCount: sql`${listing.viewCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(listing.id, input.listingId));

      return { success: true };
    }),
});
