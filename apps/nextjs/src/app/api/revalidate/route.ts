/**
 * On-Demand Revalidation API
 *
 * Triggers cache revalidation for CMS pages.
 * Call this when WordPress content changes to immediately update the app.
 *
 * Usage:
 *   POST /api/revalidate
 *   Body: { "secret": "your-secret", "slug": "fees" }
 *   Or:   { "secret": "your-secret", "all": true }
 *
 * Can be called from:
 * - WordPress webhook on post update
 * - Manual curl request
 * - Admin dashboard
 */

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { CMS_SLUGS } from "~/lib/cms";

// Secret token for authorization (set in environment variables)
const CMS_REVALIDATE_SECRET = process.env.CMS_REVALIDATE_SECRET;

interface RevalidateRequest {
  secret: string;
  slug?: string;
  all?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RevalidateRequest;

    // Validate secret
    if (!CMS_REVALIDATE_SECRET) {
      return NextResponse.json(
        { error: "CMS_REVALIDATE_SECRET not configured" },
        { status: 500 }
      );
    }

    if (body.secret !== CMS_REVALIDATE_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const revalidatedPaths: string[] = [];

    if (body.all) {
      // Revalidate all CMS pages
      for (const slug of CMS_SLUGS) {
        const path = `/${slug}`;
        revalidatePath(path);
        revalidatedPaths.push(path);
      }
    } else if (body.slug) {
      // Revalidate specific page
      if (!CMS_SLUGS.includes(body.slug as (typeof CMS_SLUGS)[number])) {
        return NextResponse.json(
          { error: `Invalid slug: ${body.slug}`, validSlugs: CMS_SLUGS },
          { status: 400 }
        );
      }

      const path = `/${body.slug}`;
      revalidatePath(path);
      revalidatedPaths.push(path);
    } else {
      return NextResponse.json(
        { error: "Provide either 'slug' or 'all: true'" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      revalidated: revalidatedPaths,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// Also support GET for easy testing (requires secret in query)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");
  const all = searchParams.get("all") === "true";

  if (!secret) {
    return NextResponse.json(
      {
        error: "Missing secret parameter",
        usage: {
          single: "/api/revalidate?secret=YOUR_SECRET&slug=fees",
          all: "/api/revalidate?secret=YOUR_SECRET&all=true",
        },
      },
      { status: 400 }
    );
  }

  // Reuse POST logic
  const mockRequest = {
    json: async () => ({ secret, slug, all }),
  } as NextRequest;

  return POST(mockRequest);
}
