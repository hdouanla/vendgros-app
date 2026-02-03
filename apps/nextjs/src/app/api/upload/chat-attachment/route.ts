import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { auth } from "~/auth/server";

// Allowed file types for chat attachments
const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  // Documents
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  // Text
  "text/plain",
  "text/csv",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Create S3 client
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

// Get storage environment
function getStorageEnv(): string {
  return process.env.DO_SPACES_ENV || process.env.VERCEL_ENV || "development";
}

// Sanitize filename for use in HTTP headers (remove invalid characters)
function sanitizeFilenameForHeader(filename: string): string {
  // Remove or replace characters that are invalid in HTTP headers
  // Keep only alphanumeric, spaces, dots, dashes, underscores, and parentheses
  return filename
    .replace(/[^\w\s.\-()]/g, '_') // Replace invalid chars with underscore
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 255); // Limit length
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}. Allowed types: images, PDF, Word, Excel, text files.` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // Generate unique key for the file
    const fileExtension = file.name.split('.').pop() || 'bin';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const storageEnv = getStorageEnv();
    const key = `vendgros/${storageEnv}/chat-attachments/${session.user.id}/${uniqueFileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename for metadata (HTTP headers don't allow certain characters)
    const sanitizedFilename = sanitizeFilenameForHeader(file.name);

    // Create S3 client and upload
    const s3Client = createS3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ACL: "public-read",
      Metadata: {
        originalName: sanitizedFilename,
        uploadedBy: session.user.id,
      },
    });

    await s3Client.send(command);

    // Return file info
    return NextResponse.json({
      path: key,
      url: `${process.env.NEXT_PUBLIC_STORAGE_URL}/${key}`,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Chat attachment upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
