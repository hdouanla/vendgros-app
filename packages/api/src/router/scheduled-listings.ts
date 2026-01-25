import { z } from "zod/v4";
import { and, eq, lte, sql } from "@acme/db";

import { listing } from "@acme/db/schema";

import { notifyScheduledListingPublished } from "../lib/notifications";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const scheduledListingsRouter = createTRPCRouter({
  /**
   * Schedule a listing for automatic publication
   */
  scheduleListingPublication: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        scheduledPublishAt: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify listing ownership
      const listingData = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!listingData) {
        throw new Error("Listing not found");
      }

      if (listingData.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized to schedule this listing");
      }

      // Check that scheduled time is in the future
      if (input.scheduledPublishAt <= new Date()) {
        throw new Error("Scheduled time must be in the future");
      }

      // Update listing with scheduled publish time
      const [updated] = await ctx.db
        .update(listing)
        .set({
          scheduledPublishAt: input.scheduledPublishAt,
          autoPublishEnabled: true,
        })
        .where(eq(listing.id, input.listingId))
        .returning();

      return {
        success: true,
        listing: updated,
        message: `Listing scheduled for publication at ${input.scheduledPublishAt.toLocaleString()}`,
      };
    }),

  /**
   * Cancel scheduled publication
   */
  cancelScheduledPublication: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify listing ownership
      const listingData = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!listingData) {
        throw new Error("Listing not found");
      }

      if (listingData.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized to cancel scheduled publication");
      }

      // Remove scheduling
      const [updated] = await ctx.db
        .update(listing)
        .set({
          scheduledPublishAt: null,
          autoPublishEnabled: false,
        })
        .where(eq(listing.id, input.listingId))
        .returning();

      return {
        success: true,
        listing: updated,
        message: "Scheduled publication cancelled",
      };
    }),

  /**
   * Get all scheduled listings for current user
   */
  getMyScheduledListings: protectedProcedure.query(async ({ ctx }) => {
    const scheduledListings = await ctx.db.query.listing.findMany({
      where: (listings, { and, eq, isNotNull }) =>
        and(
          eq(listings.sellerId, ctx.session.user.id),
          eq(listings.autoPublishEnabled, true),
          isNotNull(listings.scheduledPublishAt),
        ),
      orderBy: (listings, { asc }) => [asc(listings.scheduledPublishAt)],
    });

    return scheduledListings;
  }),

  /**
   * Process scheduled listings (called by cron job)
   * Admin only
   */
  processScheduledListings: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user is admin
    const currentUser = await ctx.db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.session.user.id),
    });

    if (!currentUser || !currentUser.isAdmin) {
      throw new Error("Admin access required");
    }

    // Find all listings scheduled to be published now or earlier
    const now = new Date();
    const listingsToPublish = await ctx.db.query.listing.findMany({
      where: (listings, { and, eq, lte, isNotNull }) =>
        and(
          eq(listings.autoPublishEnabled, true),
          isNotNull(listings.scheduledPublishAt),
          lte(listings.scheduledPublishAt, now),
          eq(listings.status, "DRAFT"),
        ),
    });

    // Publish each listing
    const published = [];
    for (const listingData of listingsToPublish) {
      try {
        const [updated] = await ctx.db
          .update(listing)
          .set({
            status: "PUBLISHED",
            publishedAt: now,
            autoPublishEnabled: false, // Disable after publishing
          })
          .where(eq(listing.id, listingData.id))
          .returning();

        published.push(updated);

        // Send notification to seller about successful publication
        if (updated) {
          const seller = await ctx.db.query.user.findFirst({
            where: (users, { eq }) => eq(users.id, updated.sellerId),
          });

          if (seller) {
            await notifyScheduledListingPublished({
              sellerEmail: seller.email,
              sellerPhone: seller.phone ?? undefined,
              listingTitle: updated.title,
            });
          }
        }
      } catch (error) {
        console.error(
          `Failed to publish scheduled listing ${listingData.id}:`,
          error,
        );
      }
    }

    return {
      processed: listingsToPublish.length,
      published: published.length,
      listings: published,
    };
  }),

  /**
   * Get statistics about scheduled listings (admin only)
   */
  getScheduledListingsStats: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    const currentUser = await ctx.db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.session.user.id),
    });

    if (!currentUser || !currentUser.isAdmin) {
      throw new Error("Admin access required");
    }

    // Count scheduled listings
    const totalScheduled = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .where(
        and(
          eq(listing.autoPublishEnabled, true),
          sql`${listing.scheduledPublishAt} IS NOT NULL`,
        ),
      );

    // Count due for publication
    const now = new Date();
    const dueForPublication = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .where(
        and(
          eq(listing.autoPublishEnabled, true),
          sql`${listing.scheduledPublishAt} IS NOT NULL`,
          lte(listing.scheduledPublishAt, now),
          eq(listing.status, "DRAFT"),
        ),
      );

    return {
      totalScheduled: totalScheduled[0]?.count ?? 0,
      dueForPublication: dueForPublication[0]?.count ?? 0,
      lastChecked: new Date(),
    };
  }),
});
