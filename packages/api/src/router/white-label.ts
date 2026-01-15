import { z } from "zod/v4";
import { and, eq, desc } from "drizzle-orm";

import { tenant, user } from "@acme/db/schema-extensions";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// Middleware to check if user is admin
async function requireAdmin(ctx: any) {
  const currentUser = await ctx.db.query.user.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, ctx.session.user.id),
  });

  if (!currentUser || currentUser.userType !== "ADMIN") {
    throw new Error("Admin access required");
  }
}

export const whiteLabelRouter = createTRPCRouter({
  /**
   * Create a new tenant (admin only)
   */
  createTenant: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
        domain: z.string().optional(),
        logoUrl: z.string().url().optional(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        country: z.enum(["CA", "US", "GB", "MX", "EU"]).default("CA"),
        currency: z.enum(["CAD", "USD", "EUR", "GBP", "MXN"]).default("CAD"),
        locale: z.string().default("en"),
        timezone: z.string().default("America/Toronto"),
        plan: z.enum(["free", "basic", "pro", "enterprise"]).default("free"),
        features: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const [newTenant] = await ctx.db
        .insert(tenant)
        .values({
          name: input.name,
          slug: input.slug,
          domain: input.domain,
          logoUrl: input.logoUrl,
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          country: input.country,
          currency: input.currency,
          locale: input.locale,
          timezone: input.timezone,
          plan: input.plan,
          features: input.features ?? [],
        })
        .returning();

      return {
        success: true,
        tenant: newTenant,
        message: `Tenant "${input.name}" created successfully`,
      };
    }),

  /**
   * List all tenants (admin only)
   */
  listTenants: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx);

    const tenants = await ctx.db.query.tenant.findMany({
      orderBy: (tenants, { desc }) => [desc(tenants.createdAt)],
    });

    return tenants;
  }),

  /**
   * Get tenant by ID (admin only)
   */
  getTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const tenantData = await ctx.db.query.tenant.findFirst({
        where: (tenants, { eq }) => eq(tenants.id, input.tenantId),
      });

      if (!tenantData) {
        throw new Error("Tenant not found");
      }

      return tenantData;
    }),

  /**
   * Get tenant by slug (public - for subdomain resolution)
   */
  getTenantBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantData = await ctx.db.query.tenant.findFirst({
        where: (tenants, { eq }) => eq(tenants.slug, input.slug),
      });

      if (!tenantData) {
        throw new Error("Tenant not found");
      }

      // Only return public information
      return {
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        logoUrl: tenantData.logoUrl,
        primaryColor: tenantData.primaryColor,
        secondaryColor: tenantData.secondaryColor,
        isActive: tenantData.isActive,
      };
    }),

  /**
   * Get tenant by domain (public - for custom domain resolution)
   */
  getTenantByDomain: publicProcedure
    .input(
      z.object({
        domain: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantData = await ctx.db.query.tenant.findFirst({
        where: (tenants, { eq }) => eq(tenants.domain, input.domain),
      });

      if (!tenantData) {
        throw new Error("Tenant not found");
      }

      // Only return public information
      return {
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        logoUrl: tenantData.logoUrl,
        primaryColor: tenantData.primaryColor,
        secondaryColor: tenantData.secondaryColor,
        isActive: tenantData.isActive,
      };
    }),

  /**
   * Update tenant (admin only)
   */
  updateTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        name: z.string().min(1).max(100).optional(),
        domain: z.string().optional(),
        logoUrl: z.string().url().optional(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        country: z.enum(["CA", "US", "GB", "MX", "EU"]).optional(),
        currency: z.enum(["CAD", "USD", "EUR", "GBP", "MXN"]).optional(),
        locale: z.string().optional(),
        timezone: z.string().optional(),
        isActive: z.boolean().optional(),
        plan: z.enum(["free", "basic", "pro", "enterprise"]).optional(),
        monthlyFee: z.number().min(0).optional(),
        features: z.array(z.string()).optional(),
        config: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.domain !== undefined) updates.domain = input.domain;
      if (input.logoUrl !== undefined) updates.logoUrl = input.logoUrl;
      if (input.primaryColor !== undefined) updates.primaryColor = input.primaryColor;
      if (input.secondaryColor !== undefined)
        updates.secondaryColor = input.secondaryColor;
      if (input.country !== undefined) updates.country = input.country;
      if (input.currency !== undefined) updates.currency = input.currency;
      if (input.locale !== undefined) updates.locale = input.locale;
      if (input.timezone !== undefined) updates.timezone = input.timezone;
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.plan !== undefined) updates.plan = input.plan;
      if (input.monthlyFee !== undefined) updates.monthlyFee = input.monthlyFee;
      if (input.features !== undefined) updates.features = input.features;
      if (input.config !== undefined) updates.config = input.config;

      const [updated] = await ctx.db
        .update(tenant)
        .set(updates)
        .where(eq(tenant.id, input.tenantId))
        .returning();

      return {
        success: true,
        tenant: updated,
      };
    }),

  /**
   * Delete tenant (admin only)
   */
  deleteTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      // Check if tenant has users
      const tenantUsers = await ctx.db.query.user.findMany({
        where: (users, { eq }) => eq(users.tenantId, input.tenantId),
        limit: 1,
      });

      if (tenantUsers.length > 0) {
        throw new Error(
          "Cannot delete tenant with active users. Please migrate or delete users first.",
        );
      }

      await ctx.db.delete(tenant).where(eq(tenant.id, input.tenantId));

      return {
        success: true,
        message: "Tenant deleted successfully",
      };
    }),

  /**
   * Get tenant statistics (admin only)
   */
  getTenantStats: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      // Count users
      const tenantUsers = await ctx.db.query.user.findMany({
        where: (users, { eq }) => eq(users.tenantId, input.tenantId),
      });

      // Count active sellers
      const sellers = tenantUsers.filter((u: any) =>
        ["SELLER_INDIVIDUAL", "SELLER_MERCHANT"].includes(u.userType),
      );

      // Count buyers
      const buyers = tenantUsers.filter((u: any) => u.userType === "BUYER");

      return {
        totalUsers: tenantUsers.length,
        sellers: sellers.length,
        buyers: buyers.length,
        activeSellers: sellers.filter((s: any) => s.accountStatus === "ACTIVE").length,
        activeBuyers: buyers.filter((b: any) => b.accountStatus === "ACTIVE").length,
      };
    }),

  /**
   * Get available features for white-label configuration
   */
  getAvailableFeatures: protectedProcedure.query(async () => {
    return {
      features: [
        {
          id: "custom_branding",
          name: "Custom Branding",
          description: "Use custom logo and colors",
          plans: ["basic", "pro", "enterprise"],
        },
        {
          id: "custom_domain",
          name: "Custom Domain",
          description: "Use your own domain name",
          plans: ["pro", "enterprise"],
        },
        {
          id: "api_access",
          name: "API Access",
          description: "Access to REST API and webhooks",
          plans: ["pro", "enterprise"],
        },
        {
          id: "advanced_analytics",
          name: "Advanced Analytics",
          description: "Detailed analytics and reporting",
          plans: ["pro", "enterprise"],
        },
        {
          id: "priority_support",
          name: "Priority Support",
          description: "24/7 priority customer support",
          plans: ["enterprise"],
        },
        {
          id: "white_label_mobile",
          name: "White-label Mobile Apps",
          description: "Custom branded mobile applications",
          plans: ["enterprise"],
        },
      ],
    };
  }),
});
