import { z } from "zod/v4";
import { eq, sql, and } from "@acme/db";

import { user, listing, reservation } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  /**
   * Get current authenticated user's profile
   */
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await ctx.db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
        accountStatus: true,
        languagePreference: true,
        verificationBadge: true,
        ratingAverage: true,
        ratingCount: true,
        buyerRatingAverage: true,
        buyerRatingCount: true,
        sellerRatingAverage: true,
        sellerRatingCount: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    return currentUser;
  }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        phone: z
          .string()
          .regex(/^\+?1?\d{10,11}$/, "Invalid phone number format")
          .optional()
          .nullable(),
        languagePreference: z.enum(["en", "fr", "es"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get current user to check if phone actually changed
      const currentUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id),
        columns: {
          phone: true,
        },
      });

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) {
        updateData.name = input.name;
      }

      if (input.phone !== undefined) {
        updateData.phone = input.phone;
        // Only reset phone verification if phone actually changed
        if (input.phone && input.phone !== currentUser?.phone) {
          updateData.phoneVerified = false;
        }
      }

      if (input.languagePreference !== undefined) {
        updateData.languagePreference = input.languagePreference;
      }

      const [updatedUser] = await ctx.db
        .update(user)
        .set(updateData)
        .where(eq(user.id, ctx.session.user.id))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          languagePreference: user.languagePreference,
          updatedAt: user.updatedAt,
        });

      if (!updatedUser) {
        throw new Error("Failed to update profile");
      }

      return {
        success: true,
        user: updatedUser,
      };
    }),

  /**
   * Delete the current user's account
   */
  deleteAccount: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id),
        columns: { email: true },
      });

      if (!currentUser || currentUser.email !== input.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email does not match your account email.",
        });
      }

      await ctx.db.delete(user).where(eq(user.id, ctx.session.user.id));

      return { success: true };
    }),

  /**
   * Get buyer statistics for current user
   */
  getBuyerStats: protectedProcedure.query(async ({ ctx }) => {
    // Get total orders (reservations as buyer)
    const totalOrdersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation)
      .where(eq(reservation.buyerId, ctx.session.user.id));

    const totalOrders = Number(totalOrdersResult[0]?.count ?? 0);

    // Get completed orders
    const completedOrdersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation)
      .where(
        and(
          eq(reservation.buyerId, ctx.session.user.id),
          eq(reservation.status, "COMPLETED"),
        ),
      );

    const completedOrders = Number(completedOrdersResult[0]?.count ?? 0);

    // Get pending orders
    const pendingOrdersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation)
      .where(
        and(
          eq(reservation.buyerId, ctx.session.user.id),
          eq(reservation.status, "PENDING"),
        ),
      );

    const pendingOrders = Number(pendingOrdersResult[0]?.count ?? 0);

    // Get confirmed orders (paid, awaiting pickup)
    const confirmedOrdersResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation)
      .where(
        and(
          eq(reservation.buyerId, ctx.session.user.id),
          eq(reservation.status, "CONFIRMED"),
        ),
      );

    const confirmedOrders = Number(confirmedOrdersResult[0]?.count ?? 0);

    // Get total spent
    const totalSpentResult = await ctx.db
      .select({ total: sql<number>`COALESCE(SUM(total_price), 0)` })
      .from(reservation)
      .where(
        and(
          eq(reservation.buyerId, ctx.session.user.id),
          eq(reservation.status, "COMPLETED"),
        ),
      );

    const totalSpent = Number(totalSpentResult[0]?.total ?? 0);

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      confirmedOrders,
      totalSpent,
    };
  }),

  /**
   * Get seller statistics for current user
   */
  getSellerStats: protectedProcedure.query(async ({ ctx }) => {
    // Get total listings
    const totalListingsResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .where(eq(listing.sellerId, ctx.session.user.id));

    const totalListings = Number(totalListingsResult[0]?.count ?? 0);

    // Get active listings (published and available)
    const activeListingsResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listing)
      .where(
        and(
          eq(listing.sellerId, ctx.session.user.id),
          eq(listing.status, "PUBLISHED"),
          eq(listing.isActive, true),
        ),
      );

    const activeListings = Number(activeListingsResult[0]?.count ?? 0);

    // Get total sales (completed reservations for my listings)
    const totalSalesResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation)
      .innerJoin(listing, eq(reservation.listingId, listing.id))
      .where(
        and(
          eq(listing.sellerId, ctx.session.user.id),
          eq(reservation.status, "COMPLETED"),
        ),
      );

    const totalSales = Number(totalSalesResult[0]?.count ?? 0);

    // Get pending sales (confirmed, awaiting pickup)
    const pendingSalesResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation)
      .innerJoin(listing, eq(reservation.listingId, listing.id))
      .where(
        and(
          eq(listing.sellerId, ctx.session.user.id),
          eq(reservation.status, "CONFIRMED"),
        ),
      );

    const pendingSales = Number(pendingSalesResult[0]?.count ?? 0);

    // Get total revenue
    const totalRevenueResult = await ctx.db
      .select({ total: sql<number>`COALESCE(SUM(reservation.total_price), 0)` })
      .from(reservation)
      .innerJoin(listing, eq(reservation.listingId, listing.id))
      .where(
        and(
          eq(listing.sellerId, ctx.session.user.id),
          eq(reservation.status, "COMPLETED"),
        ),
      );

    const totalRevenue = Number(totalRevenueResult[0]?.total ?? 0);

    // Get total views across all listings
    const totalViewsResult = await ctx.db
      .select({ total: sql<number>`COALESCE(SUM(view_count), 0)` })
      .from(listing)
      .where(eq(listing.sellerId, ctx.session.user.id));

    const totalViews = Number(totalViewsResult[0]?.total ?? 0);

    return {
      totalListings,
      activeListings,
      totalSales,
      pendingSales,
      totalRevenue,
      totalViews,
    };
  }),
});
