import { z } from "zod/v4";
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";

import { listing, reservation, user } from "@acme/db/schema";

import {
  notifyAccountBanned,
  notifyAccountReactivated,
  notifyAccountSuspended,
  notifyListingApproved,
  notifyListingRejected,
} from "../lib/notifications";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Middleware to check if user is admin
async function requireAdmin(ctx: any) {
  const currentUser = await ctx.db.query.user.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, ctx.session.user.id),
  });

  if (!currentUser || !currentUser.isAdmin) {
    throw new Error("Admin access required");
  }
}

export const adminRouter = createTRPCRouter({
  // Get listings pending review
  getPendingListings: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const results = await ctx.db.query.listing.findMany({
        where: (listings, { eq }) => eq(listings.status, "PENDING_REVIEW"),
        with: {
          seller: {
            columns: {
              id: true,
              email: true,
              phone: true,
              accountStatus: true,
              verificationBadge: true,
              ratingAverage: true,
              ratingCount: true,
              createdAt: true,
            },
          },
        },
        orderBy: (listings, { asc }) => [asc(listings.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      const totalResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(listing)
        .where(eq(listing.status, "PENDING_REVIEW"));
      const total = Number(totalResult[0]?.count ?? 0);

      return {
        listings: results,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Approve listing
  approveListing: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const existingListing = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
        with: {
          seller: {
            columns: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!existingListing) {
        throw new Error("Listing not found");
      }

      if (existingListing.status !== "PENDING_REVIEW") {
        throw new Error("Listing is not pending review");
      }

      const [updated] = await ctx.db
        .update(listing)
        .set({
          status: "PUBLISHED",
          publishedAt: new Date(),
        })
        .where(eq(listing.id, input.listingId))
        .returning();

      // Send approval notification to seller
      await notifyListingApproved({
        sellerEmail: existingListing.seller.email!,
        sellerPhone: existingListing.seller.phone ?? undefined,
        listingTitle: existingListing.title,
      }).catch((err) => console.error("Failed to send notification:", err));

      return updated;
    }),

  // Reject listing
  rejectListing: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        reason: z.string().min(10).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const existingListing = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!existingListing) {
        throw new Error("Listing not found");
      }

      if (existingListing.status !== "PENDING_REVIEW") {
        throw new Error("Listing is not pending review");
      }

      const [updated] = await ctx.db
        .update(listing)
        .set({
          status: "DRAFT",
          moderationNotes: input.reason,
        })
        .where(eq(listing.id, input.listingId))
        .returning();

      // Send rejection notification to seller
      const seller = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, existingListing.sellerId),
      });

      if (seller && updated) {
        await notifyListingRejected({
          sellerEmail: seller.email,
          listingTitle: updated.title,
          reason: input.reason,
        });
      }

      return updated;
    }),

  // Get user details for moderation
  getUserDetails: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const targetUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      // Get user's listings
      const listings = await ctx.db.query.listing.findMany({
        where: (listings, { eq }) => eq(listings.sellerId, input.userId),
        orderBy: (listings, { desc }) => [desc(listings.createdAt)],
        limit: 10,
      });

      // Get user's reservations as buyer
      const buyerReservations = await ctx.db.query.reservation.findMany({
        where: (reservations, { eq }) => eq(reservations.buyerId, input.userId),
        orderBy: (reservations, { desc }) => [desc(reservations.createdAt)],
        limit: 10,
      });

      // Get user's ratings received
      const ratingsReceived = await ctx.db.query.rating.findMany({
        where: (ratings, { eq }) => eq(ratings.ratedId, input.userId),
        orderBy: (ratings, { desc }) => [desc(ratings.createdAt)],
        limit: 10,
      });

      return {
        user: targetUser,
        listings,
        buyerReservations,
        ratingsReceived,
      };
    }),

  // Suspend user account
  suspendUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().min(10).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const targetUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      if (targetUser.isAdmin) {
        throw new Error("Cannot suspend admin users");
      }

      const [updated] = await ctx.db
        .update(user)
        .set({
          accountStatus: "SUSPENDED",
          moderationNotes: input.reason,
        })
        .where(eq(user.id, input.userId))
        .returning();

      // Send suspension notification to user
      if (updated) {
        await notifyAccountSuspended({
          userEmail: updated.email,
          reason: input.reason,
        });

        // Cancel all active listings
        await ctx.db
          .update(listing)
          .set({ status: "EXPIRED" })
          .where(
            and(
              eq(listing.sellerId, input.userId),
              inArray(listing.status, ["PUBLISHED", "DRAFT", "PENDING_REVIEW"]),
            ),
          );
      }

      return updated;
    }),

  // Reactivate suspended user
  reactivateUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const targetUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      if (targetUser.accountStatus !== "SUSPENDED") {
        throw new Error("User is not suspended");
      }

      const [updated] = await ctx.db
        .update(user)
        .set({
          accountStatus: "ACTIVE",
          moderationNotes: null,
        })
        .where(eq(user.id, input.userId))
        .returning();

      // Send reactivation notification to user
      if (updated) {
        await notifyAccountReactivated({
          userEmail: updated.email,
        });
      }

      return updated;
    }),

  // Ban user permanently
  banUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().min(10).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const targetUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      if (targetUser.isAdmin) {
        throw new Error("Cannot ban admin users");
      }

      const [updated] = await ctx.db
        .update(user)
        .set({
          accountStatus: "BANNED",
          moderationNotes: input.reason,
        })
        .where(eq(user.id, input.userId))
        .returning();

      // Send ban notification to user
      if (updated) {
        await notifyAccountBanned({
          userEmail: updated.email,
          reason: input.reason,
        });

        // Cancel all active listings
        await ctx.db
          .update(listing)
          .set({ status: "EXPIRED" })
          .where(
            and(
              eq(listing.sellerId, input.userId),
              inArray(listing.status, ["PUBLISHED", "DRAFT", "PENDING_REVIEW"]),
            ),
          );

        // Cancel all active reservations as buyer
        await ctx.db
          .update(reservation)
          .set({ status: "CANCELLED" })
          .where(
            and(
              eq(reservation.buyerId, input.userId),
              inArray(reservation.status, ["PENDING", "CONFIRMED"]),
            ),
          );

        // Cancel all active reservations as seller (through listings)
        const userListings = await ctx.db.query.listing.findMany({
          where: (listings, { eq }) => eq(listings.sellerId, input.userId),
          columns: { id: true },
        });

        if (userListings.length > 0) {
          const listingIds = userListings.map((l) => l.id);
          await ctx.db
            .update(reservation)
            .set({ status: "CANCELLED" })
            .where(
              and(
                inArray(reservation.listingId, listingIds),
                inArray(reservation.status, ["PENDING", "CONFIRMED"]),
              ),
            );
        }
      }

      return updated;
    }),

  // Get dashboard statistics
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx);

    // Total users
    const totalUsersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(user);
    const totalUsers = Number(totalUsersResult[0]?.count ?? 0);

    // Active users
    const activeUsersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.accountStatus, "ACTIVE"));
    const activeUsers = Number(activeUsersResult[0]?.count ?? 0);

    // Suspended users
    const suspendedUsersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.accountStatus, "SUSPENDED"));
    const suspendedUsers = Number(suspendedUsersResult[0]?.count ?? 0);

    // Banned users
    const bannedUsersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.accountStatus, "BANNED"));
    const bannedUsers = Number(bannedUsersResult[0]?.count ?? 0);

    // Total listings
    const totalListingsResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listing);
    const totalListings = Number(totalListingsResult[0]?.count ?? 0);

    // Published listings
    const publishedListingsResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .where(eq(listing.status, "PUBLISHED"));
    const publishedListings = Number(publishedListingsResult[0]?.count ?? 0);

    // Pending review listings
    const pendingListingsResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .where(eq(listing.status, "PENDING_REVIEW"));
    const pendingListings = Number(pendingListingsResult[0]?.count ?? 0);

    // Total reservations
    const totalReservationsResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation);
    const totalReservations = Number(totalReservationsResult[0]?.count ?? 0);

    // Completed reservations
    const completedReservationsResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation)
      .where(eq(reservation.status, "COMPLETED"));
    const completedReservations = Number(completedReservationsResult[0]?.count ?? 0);

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(gte(user.createdAt, sevenDaysAgo));
    const recentUsers = Number(recentUsersResult[0]?.count ?? 0);

    // Recent listings (last 7 days)
    const recentListingsResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .where(gte(listing.createdAt, sevenDaysAgo));
    const recentListings = Number(recentListingsResult[0]?.count ?? 0);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        banned: bannedUsers,
        recentSignups: recentUsers,
      },
      listings: {
        total: totalListings,
        published: publishedListings,
        pendingReview: pendingListings,
        recentCreated: recentListings,
      },
      reservations: {
        total: totalReservations,
        completed: completedReservations,
      },
    };
  }),

  // Get all users for management
  getAllUsers: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
        status: z.enum(["ALL", "ACTIVE", "SUSPENDED", "BANNED"]).default("ALL"),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      let whereConditions = [];

      // Filter by status
      if (input.status !== "ALL") {
        whereConditions.push(eq(user.accountStatus, input.status));
      }

      // Search by email
      if (input.search) {
        whereConditions.push(sql`${user.email} ILIKE ${"%" + input.search + "%"}`);
      }

      const users = await ctx.db.query.user.findMany({
        where: whereConditions.length > 0
          ? and(...whereConditions)
          : undefined,
        columns: {
          id: true,
          email: true,
          name: true,
          phone: true,
          accountStatus: true,
          verificationBadge: true,
          emailVerified: true,
          isAdmin: true,
          ratingAverage: true,
          ratingCount: true,
          buyerRatingAverage: true,
          buyerRatingCount: true,
          sellerRatingAverage: true,
          sellerRatingCount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: (users, { desc }) => [desc(users.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Get total count
      const totalResult = whereConditions.length > 0
        ? await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(user)
            .where(and(...whereConditions))
        : await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(user);
      const total = Number(totalResult[0]?.count ?? 0);

      return {
        users,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),
});
