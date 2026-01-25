import { z } from "zod/v4";
import { eq, inArray, desc } from "@acme/db";

import { listing, bulkImport } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { geocodeAddress } from "../services/geocoding";

interface ListingImportRow {
  title: string;
  description: string;
  category: string;
  pricePerPiece: number;
  quantityTotal: number;
  pickupAddress: string;
  pickupInstructions?: string;
  maxPerBuyer?: number;
  photos?: string[]; // Array of photo URLs
}

interface ImportResult {
  success: boolean;
  listingId?: string;
  rowNumber: number;
  error?: string;
  warnings?: string[];
}

export const bulkImportRouter = createTRPCRouter({
  /**
   * Validate CSV data before import
   */
  validateImportData: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            category: z.string(),
            pricePerPiece: z.number(),
            quantityTotal: z.number(),
            pickupAddress: z.string(),
            pickupInstructions: z.string().optional(),
            maxPerBuyer: z.number().optional(),
            photos: z.array(z.string().url()).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const validationResults: ImportResult[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i]!;
        const warnings: string[] = [];

        // Validate title length
        if (row.title.length < 10) {
          validationResults.push({
            success: false,
            rowNumber: i + 1,
            error: "Title must be at least 10 characters",
          });
          continue;
        }

        if (row.title.length > 200) {
          validationResults.push({
            success: false,
            rowNumber: i + 1,
            error: "Title must be at most 200 characters",
          });
          continue;
        }

        // Validate description length
        if (row.description.length < 50) {
          validationResults.push({
            success: false,
            rowNumber: i + 1,
            error: "Description must be at least 50 characters",
          });
          continue;
        }

        if (row.description.length > 5000) {
          validationResults.push({
            success: false,
            rowNumber: i + 1,
            error: "Description must be at most 5000 characters",
          });
          continue;
        }

        // Validate price
        if (row.pricePerPiece <= 0) {
          validationResults.push({
            success: false,
            rowNumber: i + 1,
            error: "Price must be greater than 0",
          });
          continue;
        }

        // Validate quantity
        if (row.quantityTotal <= 0) {
          validationResults.push({
            success: false,
            rowNumber: i + 1,
            error: "Quantity must be greater than 0",
          });
          continue;
        }

        // Warnings
        if (!row.photos || row.photos.length === 0) {
          warnings.push("No photos provided");
        }

        if (row.photos && row.photos.length > 10) {
          warnings.push("Maximum 10 photos allowed");
        }

        // Row is valid
        validationResults.push({
          success: true,
          rowNumber: i + 1,
          warnings: warnings.length > 0 ? warnings : undefined,
        });
      }

      const validRows = validationResults.filter((r) => r.success).length;
      const invalidRows = validationResults.filter((r) => !r.success).length;

      return {
        validRows,
        invalidRows,
        totalRows: input.rows.length,
        results: validationResults,
      };
    }),

  /**
   * Import listings in bulk from CSV data
   */
  importListings: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            title: z.string().min(10).max(200),
            description: z.string().min(50).max(5000),
            category: z.string(),
            pricePerPiece: z.number().positive(),
            quantityTotal: z.number().int().positive(),
            pickupAddress: z.string(),
            pickupInstructions: z.string().optional(),
            maxPerBuyer: z.number().int().positive().optional(),
            photos: z.array(z.string().url()).max(10).optional(),
          }),
        ),
        publishImmediately: z.boolean().default(false),
        fileName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create bulk import record
      const [importRecord] = await ctx.db
        .insert(bulkImport)
        .values({
          userId: ctx.session.user.id,
          fileName: input.fileName,
          totalRows: input.rows.length,
          publishImmediately: input.publishImmediately,
          status: "PROCESSING",
          startedAt: new Date(),
        })
        .returning();

      const importResults: ImportResult[] = [];

      try {
        // Process each row
        for (let i = 0; i < input.rows.length; i++) {
          const row = input.rows[i]!;

          try {
            // Geocode address
            const geocodeResult = await geocodeAddress(row.pickupAddress, "CA");
            const latitude = geocodeResult.latitude;
            const longitude = geocodeResult.longitude;

            // Create listing
            const [newListing] = await ctx.db
              .insert(listing)
              .values({
                sellerId: ctx.session.user.id,
                title: row.title,
                description: row.description,
                category: row.category,
                photos: row.photos ?? [],
                pricePerPiece: row.pricePerPiece,
                quantityTotal: row.quantityTotal,
                quantityAvailable: row.quantityTotal,
                maxPerBuyer: row.maxPerBuyer,
                pickupAddress: row.pickupAddress,
                pickupInstructions: row.pickupInstructions,
                latitude,
                longitude,
                location: `POINT(${longitude} ${latitude})`,
                status: input.publishImmediately ? "PUBLISHED" : "DRAFT",
                publishedAt: input.publishImmediately ? new Date() : null,
              })
              .returning();

            importResults.push({
              success: true,
              listingId: newListing!.id,
              rowNumber: i + 1,
            });
          } catch (error: any) {
            importResults.push({
              success: false,
              rowNumber: i + 1,
              error: error.message ?? "Unknown error occurred",
            });
          }
        }

        const successCount = importResults.filter((r) => r.success).length;
        const failureCount = importResults.filter((r) => !r.success).length;

        // Determine final status
        let finalStatus: "COMPLETED" | "FAILED" | "PARTIAL" = "COMPLETED";
        if (failureCount === input.rows.length) {
          finalStatus = "FAILED";
        } else if (failureCount > 0) {
          finalStatus = "PARTIAL";
        }

        // Update import record
        await ctx.db
          .update(bulkImport)
          .set({
            successCount,
            failureCount,
            status: finalStatus,
            results: JSON.stringify(importResults),
            completedAt: new Date(),
          })
          .where(eq(bulkImport.id, importRecord!.id));

        return {
          importId: importRecord!.id,
          success: successCount,
          failed: failureCount,
          total: input.rows.length,
          results: importResults,
        };
      } catch (error: any) {
        // Update import record with error
        await ctx.db
          .update(bulkImport)
          .set({
            status: "FAILED",
            errorMessage: error.message ?? "Unknown error occurred",
            completedAt: new Date(),
          })
          .where(eq(bulkImport.id, importRecord!.id));

        throw error;
      }
    }),

  /**
   * Get bulk import history for current user
   */
  getImportHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const imports = await ctx.db.query.bulkImport.findMany({
        where: (imports, { eq }) => eq(imports.userId, ctx.session.user.id),
        orderBy: (imports, { desc }) => [desc(imports.createdAt)],
        limit: input.limit,
      });

      // Parse results JSON for each import
      return imports.map((imp) => ({
        ...imp,
        results: imp.results ? JSON.parse(imp.results) : [],
      }));
    }),

  /**
   * Get details of a specific bulk import
   */
  getImportDetails: protectedProcedure
    .input(
      z.object({
        importId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const importRecord = await ctx.db.query.bulkImport.findFirst({
        where: (imports, { and, eq }) =>
          and(
            eq(imports.id, input.importId),
            eq(imports.userId, ctx.session.user.id),
          ),
      });

      if (!importRecord) {
        throw new Error("Import not found");
      }

      return {
        ...importRecord,
        results: importRecord.results ? JSON.parse(importRecord.results) : [],
      };
    }),

  /**
   * Generate CSV template for bulk import
   */
  getImportTemplate: protectedProcedure.query(async () => {
    const template = {
      headers: [
        "title",
        "description",
        "category",
        "pricePerPiece",
        "quantityTotal",
        "pickupAddress",
        "pickupInstructions",
        "maxPerBuyer",
        "photos",
      ],
      exampleRows: [
        {
          title: "Bulk Office Chairs - Premium Ergonomic",
          description:
            "High-quality ergonomic office chairs, perfect for startups or home offices. Adjustable height, lumbar support, breathable mesh back. Selling in bulk as we're upgrading our office furniture.",
          category: "furniture",
          pricePerPiece: 45.0,
          quantityTotal: 50,
          pickupAddress: "123 Business St, Toronto, ON M5H 2N2",
          pickupInstructions: "Pickup at loading dock, Monday-Friday 9am-5pm",
          maxPerBuyer: 10,
          photos:
            "https://example.com/photo1.jpg,https://example.com/photo2.jpg",
        },
        {
          title: "Fresh Organic Tomatoes - Farm Direct",
          description:
            "Freshly harvested organic tomatoes from our farm. Perfect for restaurants or farmers markets. Grade A quality, various sizes available. Must pick up within 2 days of harvest.",
          category: "produce",
          pricePerPiece: 2.5,
          quantityTotal: 200,
          pickupAddress: "456 Farm Road, Markham, ON L3R 5B9",
          pickupInstructions: "Pickup at farmstand, call ahead",
          maxPerBuyer: 50,
          photos: "https://example.com/tomatoes.jpg",
        },
      ],
      notes: [
        "Title: 10-200 characters",
        "Description: 50-5000 characters",
        "Price: Must be positive number",
        "Quantity: Must be positive integer",
        "Photos: Comma-separated URLs (max 10)",
        "CSV file size limit: 5MB",
        "Max rows per import: 1000",
      ],
    };

    return template;
  }),

  /**
   * Bulk update listings (admin feature)
   */
  bulkUpdateListings: protectedProcedure
    .input(
      z.object({
        listingIds: z.array(z.string()).min(1).max(100),
        updates: z.object({
          status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
          pricePerPiece: z.number().positive().optional(),
          quantityAvailable: z.number().int().min(0).optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all listings belong to the user
      const listings = await ctx.db.query.listing.findMany({
        where: (listings, { and, eq, inArray }) =>
          and(
            inArray(listings.id, input.listingIds),
            eq(listings.sellerId, ctx.session.user.id),
          ),
      });

      if (listings.length !== input.listingIds.length) {
        throw new Error(
          "Some listings not found or you don't have permission to update them",
        );
      }

      // Perform bulk update
      const updateData: any = {};
      if (input.updates.status) updateData.status = input.updates.status;
      if (input.updates.pricePerPiece)
        updateData.pricePerPiece = input.updates.pricePerPiece;
      if (input.updates.quantityAvailable)
        updateData.quantityAvailable = input.updates.quantityAvailable;

      const updated = await ctx.db
        .update(listing)
        .set(updateData)
        .where(inArray(listing.id, input.listingIds))
        .returning();

      return {
        success: true,
        updatedCount: updated.length,
        listings: updated,
      };
    }),
});
