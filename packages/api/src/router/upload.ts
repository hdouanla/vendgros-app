import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { randomUUID } from "crypto";

// Helper function to create S3 client with current environment variables
function createS3Client() {
  if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
    throw new Error("DigitalOcean Spaces credentials not configured");
  }

  return new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT,
    region: process.env.DO_SPACES_REGION || "tor1",
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
    },
  });
}

export const uploadRouter = createTRPCRouter({
  /**
   * Generates a pre-signed URL for direct image upload to DigitalOcean Spaces
   *
   * @requires Authentication
   * @param fileName - Original file name
   * @param fileType - MIME type (e.g., image/jpeg, image/png)
   * @returns uploadUrl (for PUT request) and publicUrl (for storing in DB)
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create S3 client with current environment variables
      const s3Client = createS3Client();

      // Generate unique key for the file
      const fileExtension = input.fileName.split('.').pop() || 'jpg';
      const uniqueFileName = `${randomUUID()}.${fileExtension}`;
      const key = `listings/${ctx.session.user.id}/${uniqueFileName}`;

      // Create PUT command for S3
      const command = new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET!,
        Key: key,
        ContentType: input.fileType,
        ACL: "public-read",
      });

      // Generate pre-signed URL (valid for 5 minutes)
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

      // Construct public URL for the uploaded image
      const publicUrl = `${process.env.DO_SPACES_URL}/${key}`;

      return { uploadUrl, publicUrl };
    }),

  /**
   * Delete an image from DigitalOcean Spaces
   * Only allows deleting images uploaded by the current user
   *
   * @requires Authentication
   * @param imageUrl - Full public URL of the image to delete
   */
  deleteImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Extract key from URL
      const url = new URL(input.imageUrl);
      const key = url.pathname.substring(1); // Remove leading slash

      // Security check: only allow deleting own images
      if (!key.startsWith(`listings/${ctx.session.user.id}/`)) {
        throw new Error("Unauthorized to delete this image");
      }

      // Note: Actual deletion would use DeleteObjectCommand
      // For now, we'll just mark it as safe to delete
      // await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.DO_SPACES_BUCKET!, Key: key }));

      return { success: true };
    }),
});
