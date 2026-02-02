import { z } from "zod/v4";
import { and, desc, eq, gte, inArray, lte, or, sql } from "@acme/db";

import { listing, reservation, user, impersonationLog } from "@acme/db/schema";

import {
  notifyAccountBanned,
  notifyAccountReactivated,
  notifyAccountSuspended,
  notifyListingApproved,
  notifyListingRejected,
} from "../lib/notifications";
import { cache } from "../lib/cache";
import {
  createImpersonationCookie,
  clearImpersonationCookie,
  getImpersonationState,
} from "../lib/impersonation";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Middleware to check if user is admin
// When impersonating, we check the original admin's privileges
async function requireAdmin(ctx: any) {
  // If impersonating, check the original admin's privileges
  const userIdToCheck = ctx.impersonation?.isImpersonating
    ? ctx.impersonation.originalAdmin?.id
    : ctx.session.user.id;

  if (!userIdToCheck) {
    throw new Error("Admin access required");
  }

  const currentUser = await ctx.db.query.user.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, userIdToCheck),
  });

  if (!currentUser || !currentUser.isAdmin) {
    throw new Error("Admin access required");
  }

  return currentUser;
}

// Helper to get client IP from headers
function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  );
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

      // Invalidate listing caches (new published listing affects latest + category counts)
      await Promise.all([
        cache.invalidatePrefix("listings:latest"),
        cache.invalidate("listings:category-counts"),
      ]);

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

  // Get all listings for management
  getAllListings: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        search: z.string().optional(),
        status: z
          .enum([
            "ALL",
            "DRAFT",
            "PENDING_REVIEW",
            "PUBLISHED",
            "RESERVED",
            "COMPLETED",
            "EXPIRED",
            "CANCELLED",
          ])
          .default("ALL"),
        featured: z.enum(["ALL", "FEATURED", "NOT_FEATURED"]).default("ALL"),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      let whereConditions = [];

      // Filter by status
      if (input.status !== "ALL") {
        whereConditions.push(eq(listing.status, input.status));
      }

      // Filter by featured
      if (input.featured === "FEATURED") {
        whereConditions.push(eq(listing.isFeatured, true));
      } else if (input.featured === "NOT_FEATURED") {
        whereConditions.push(eq(listing.isFeatured, false));
      }

      // Search by title
      if (input.search) {
        whereConditions.push(
          sql`${listing.title} ILIKE ${"%" + input.search + "%"}`,
        );
      }

      const listings = await ctx.db.query.listing.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: {
          seller: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (listings, { desc }) => [desc(listings.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Get total count
      const totalResult =
        whereConditions.length > 0
          ? await ctx.db
              .select({ count: sql<number>`count(*)` })
              .from(listing)
              .where(and(...whereConditions))
          : await ctx.db.select({ count: sql<number>`count(*)` }).from(listing);
      const total = Number(totalResult[0]?.count ?? 0);

      return {
        listings,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Toggle featured status for a listing
  toggleFeatured: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        isFeatured: z.boolean(),
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

      const [updated] = await ctx.db
        .update(listing)
        .set({
          isFeatured: input.isFeatured,
          updatedAt: new Date(),
        })
        .where(eq(listing.id, input.listingId))
        .returning();

      // Invalidate featured listings cache
      await cache.invalidatePrefix("listings:featured");

      return updated;
    }),

  // ============================================================================
  // IMPERSONATION ENDPOINTS
  // ============================================================================

  // Start impersonating a user
  startImpersonation: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const admin = await requireAdmin(ctx);

      // Prevent impersonation while already impersonating
      if (ctx.impersonation?.isImpersonating) {
        throw new Error("Cannot start new impersonation while already impersonating. Please exit current impersonation first.");
      }

      // Get target user
      const targetUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      // Prevent impersonating admin users
      if (targetUser.isAdmin) {
        throw new Error("Cannot impersonate admin users");
      }

      // Prevent impersonating banned/suspended users
      if (targetUser.accountStatus === "BANNED") {
        throw new Error("Cannot impersonate banned users");
      }

      if (targetUser.accountStatus === "SUSPENDED") {
        throw new Error("Cannot impersonate suspended users");
      }

      // Create audit log entry
      const [logEntry] = await ctx.db
        .insert(impersonationLog)
        .values({
          adminId: admin.id,
          impersonatedUserId: targetUser.id,
          ipAddress: getClientIp(ctx.headers),
          userAgent: ctx.headers.get("user-agent") || undefined,
          reason: input.reason,
        })
        .returning();

      if (!logEntry) {
        throw new Error("Failed to create impersonation log entry");
      }

      // Create the impersonation cookie
      const cookie = createImpersonationCookie({
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        impersonatedUserId: targetUser.id,
        impersonatedUserEmail: targetUser.email,
        impersonatedUserName: targetUser.name,
        logId: logEntry.id,
      });

      return {
        success: true,
        logId: logEntry.id,
        cookie,
        impersonatedUser: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
        },
      };
    }),

  // Stop impersonation
  stopImpersonation: protectedProcedure.mutation(async ({ ctx }) => {
    // Must be in impersonation state
    if (!ctx.impersonation?.isImpersonating || !ctx.impersonation.logId) {
      throw new Error("Not currently impersonating");
    }

    // Update the audit log entry with end time
    await ctx.db
      .update(impersonationLog)
      .set({
        endedAt: new Date(),
      })
      .where(eq(impersonationLog.id, ctx.impersonation.logId));

    // Return the cookie clearing instruction
    const cookie = clearImpersonationCookie();

    return {
      success: true,
      cookie,
    };
  }),

  // Get current impersonation state
  getImpersonationState: protectedProcedure.query(async ({ ctx }) => {
    return {
      isImpersonating: ctx.impersonation?.isImpersonating ?? false,
      originalAdmin: ctx.impersonation?.originalAdmin ?? null,
      impersonatedUser: ctx.impersonation?.impersonatedUser ?? null,
    };
  }),

  // Get impersonation audit log
  getImpersonationLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        adminId: z.string().optional(),
        impersonatedUserId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      let whereConditions = [];

      if (input.adminId) {
        whereConditions.push(eq(impersonationLog.adminId, input.adminId));
      }

      if (input.impersonatedUserId) {
        whereConditions.push(eq(impersonationLog.impersonatedUserId, input.impersonatedUserId));
      }

      const logs = await ctx.db.query.impersonationLog.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: {
          admin: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          impersonatedUser: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (logs, { desc }) => [desc(logs.startedAt)],
        limit: input.limit,
        offset: input.offset,
      });

      const totalResult = whereConditions.length > 0
        ? await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(impersonationLog)
            .where(and(...whereConditions))
        : await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(impersonationLog);
      const total = Number(totalResult[0]?.count ?? 0);

      return {
        logs,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // ============================================================================
  // RESERVATIONS MANAGEMENT ENDPOINTS
  // ============================================================================

  // Get all reservations with filters
  getAllReservations: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        status: z
          .enum(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"])
          .default("ALL"),
        sellerId: z.string().optional(),
        buyerId: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      let whereConditions = [];

      // Filter by status
      if (input.status !== "ALL") {
        whereConditions.push(eq(reservation.status, input.status));
      }

      // Filter by seller (via listing)
      if (input.sellerId) {
        const sellerListings = await ctx.db.query.listing.findMany({
          where: (listings, { eq }) => eq(listings.sellerId, input.sellerId!),
          columns: { id: true },
        });
        const listingIds = sellerListings.map((l) => l.id);
        if (listingIds.length > 0) {
          whereConditions.push(inArray(reservation.listingId, listingIds));
        } else {
          // No listings for this seller means no reservations
          return { reservations: [], total: 0, hasMore: false };
        }
      }

      // Filter by buyer
      if (input.buyerId) {
        whereConditions.push(eq(reservation.buyerId, input.buyerId));
      }

      // Search by verification code, reservation ID, or listing title
      if (input.search) {
        const searchTerm = input.search.trim();
        // First check if it matches a verification code or reservation ID
        const directMatch = await ctx.db.query.reservation.findFirst({
          where: (reservations, { or, eq }) =>
            or(
              eq(reservations.verificationCode, searchTerm.toUpperCase()),
              eq(reservations.id, searchTerm),
            ),
        });

        if (directMatch) {
          whereConditions.push(eq(reservation.id, directMatch.id));
        } else {
          // Search by listing title
          const matchingListings = await ctx.db.query.listing.findMany({
            where: (listings) =>
              sql`${listings.title} ILIKE ${"%" + searchTerm + "%"}`,
            columns: { id: true },
          });
          if (matchingListings.length > 0) {
            whereConditions.push(
              inArray(
                reservation.listingId,
                matchingListings.map((l) => l.id),
              ),
            );
          } else {
            // No matching listings means no results
            return { reservations: [], total: 0, hasMore: false };
          }
        }
      }

      // Filter by date range
      if (input.dateFrom) {
        whereConditions.push(gte(reservation.createdAt, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        const toDate = new Date(input.dateTo);
        toDate.setHours(23, 59, 59, 999);
        whereConditions.push(sql`${reservation.createdAt} <= ${toDate}`);
      }

      const reservations = await ctx.db.query.reservation.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: {
          listing: {
            columns: {
              id: true,
              title: true,
              sellerId: true,
            },
            with: {
              seller: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          buyer: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (reservations, { desc }) => [desc(reservations.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Get total count
      const totalResult =
        whereConditions.length > 0
          ? await ctx.db
              .select({ count: sql<number>`count(*)` })
              .from(reservation)
              .where(and(...whereConditions))
          : await ctx.db.select({ count: sql<number>`count(*)` }).from(reservation);
      const total = Number(totalResult[0]?.count ?? 0);

      return {
        reservations,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Get full reservation details for admin view
  getReservationDetails: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const reservationData = await ctx.db.query.reservation.findFirst({
        where: (reservations, { eq }) => eq(reservations.id, input.reservationId),
        with: {
          listing: {
            with: {
              seller: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  accountStatus: true,
                  verificationBadge: true,
                  sellerRatingAverage: true,
                  sellerRatingCount: true,
                  createdAt: true,
                },
              },
            },
          },
          buyer: {
            columns: {
              id: true,
              name: true,
              email: true,
              phone: true,
              accountStatus: true,
              verificationBadge: true,
              buyerRatingAverage: true,
              buyerRatingCount: true,
              createdAt: true,
            },
          },
          ratings: {
            with: {
              rater: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              rated: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          conversation: {
            with: {
              messages: {
                orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                limit: 10,
                with: {
                  sender: {
                    columns: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!reservationData) {
        throw new Error("Reservation not found");
      }

      return reservationData;
    }),

  // Search users for autocomplete
  searchUsers: protectedProcedure
    .input(
      z.object({
        search: z.string().min(2),
        limit: z.number().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const searchTerm = input.search.trim();

      const users = await ctx.db.query.user.findMany({
        where: (users) =>
          or(
            sql`${users.email} ILIKE ${"%" + searchTerm + "%"}`,
            sql`${users.name} ILIKE ${"%" + searchTerm + "%"}`,
          ),
        columns: {
          id: true,
          name: true,
          email: true,
        },
        limit: input.limit,
      });

      return users;
    }),
});
