import { db } from "@acme/db/client";
import { listingEdit } from "@acme/db/schema-extensions";

/**
 * Track listing edits for audit trail
 */

interface EditTrackingParams {
  listingId: string;
  editorId: string;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Calculate the difference between two objects
 */
function calculateChanges(
  previous: Record<string, any>,
  current: Record<string, any>
): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {};

  // Check for modified or removed fields
  for (const key in previous) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      changes[key] = {
        from: previous[key],
        to: current[key],
      };
    }
  }

  // Check for added fields
  for (const key in current) {
    if (!(key in previous)) {
      changes[key] = {
        from: null,
        to: current[key],
      };
    }
  }

  return changes;
}

/**
 * Track a listing edit
 */
export async function trackListingEdit(params: EditTrackingParams): Promise<void> {
  const changes = calculateChanges(params.previousValues, params.newValues);

  // Only track if there are actual changes
  if (Object.keys(changes).length === 0) {
    return;
  }

  await db.insert(listingEdit).values({
    listingId: params.listingId,
    editorId: params.editorId,
    changes: JSON.stringify(changes),
    previousValues: JSON.stringify(params.previousValues),
    newValues: JSON.stringify(params.newValues),
    reason: params.reason,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Get edit history for a listing
 */
export async function getListingEditHistory(listingId: string, limit = 50) {
  return db.query.listingEdit.findMany({
    where: (edits: any, { eq }: any) => eq(edits.listingId, listingId),
    with: {
      editor: {
        columns: {
          id: true,
          email: true,
          userType: true,
        },
      },
    },
    orderBy: (edits: any, { desc }: any) => [desc(edits.createdAt)],
    limit,
  });
}

/**
 * Get all edits by a user (for admin review)
 */
export async function getUserEditHistory(userId: string, limit = 100) {
  return db.query.listingEdit.findMany({
    where: (edits: any, { eq }: any) => eq(edits.editorId, userId),
    orderBy: (edits: any, { desc }: any) => [desc(edits.createdAt)],
    limit,
  });
}
