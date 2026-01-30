import crypto from "crypto";

/**
 * Impersonation utility functions for admin user impersonation
 *
 * Uses signed JWT-like tokens stored in HTTP-only cookies for security
 */

const COOKIE_NAME = "vg_impersonation";
const TOKEN_EXPIRY_HOURS = 1; // 1 hour expiry

// Get secret key from environment (falls back to AUTH_SECRET)
function getSecretKey(): string {
  const secret = process.env.IMPERSONATION_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("IMPERSONATION_SECRET or AUTH_SECRET must be set");
  }
  return secret;
}

/**
 * Impersonation token payload
 */
export interface ImpersonationPayload {
  adminId: string;
  adminEmail: string;
  adminName: string;
  impersonatedUserId: string;
  impersonatedUserEmail: string;
  impersonatedUserName: string;
  logId: string; // Reference to impersonation_log entry
  iat: number; // Issued at timestamp
  exp: number; // Expiry timestamp
}

/**
 * Create a signed impersonation token
 */
function createToken(payload: Omit<ImpersonationPayload, "iat" | "exp">): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: ImpersonationPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_HOURS * 60 * 60,
  };

  // Base64 encode the payload
  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url"
  );

  // Create HMAC signature
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode an impersonation token
 */
function verifyToken(token: string): ImpersonationPayload | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", getSecretKey())
      .update(payloadBase64)
      .digest("base64url");

    if (signature !== expectedSignature) {
      console.warn("Impersonation token signature mismatch");
      return null;
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8")
    ) as ImpersonationPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.warn("Impersonation token expired");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Failed to verify impersonation token:", error);
    return null;
  }
}

/**
 * Impersonation state returned to the client
 */
export interface ImpersonationState {
  isImpersonating: boolean;
  originalAdmin: {
    id: string;
    email: string;
    name: string;
  } | null;
  impersonatedUser: {
    id: string;
    email: string;
    name: string;
  } | null;
  logId: string | null;
}

/**
 * Get impersonation state from request headers (cookie)
 */
export function getImpersonationState(headers: Headers): ImpersonationState {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) {
    return {
      isImpersonating: false,
      originalAdmin: null,
      impersonatedUser: null,
      logId: null,
    };
  }

  // Parse cookies
  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    },
    {} as Record<string, string>
  );

  const token = cookies[COOKIE_NAME];
  if (!token) {
    return {
      isImpersonating: false,
      originalAdmin: null,
      impersonatedUser: null,
      logId: null,
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      isImpersonating: false,
      originalAdmin: null,
      impersonatedUser: null,
      logId: null,
    };
  }

  return {
    isImpersonating: true,
    originalAdmin: {
      id: payload.adminId,
      email: payload.adminEmail,
      name: payload.adminName,
    },
    impersonatedUser: {
      id: payload.impersonatedUserId,
      email: payload.impersonatedUserEmail,
      name: payload.impersonatedUserName,
    },
    logId: payload.logId,
  };
}

/**
 * Create impersonation cookie value
 */
export function createImpersonationCookie(params: {
  adminId: string;
  adminEmail: string;
  adminName: string;
  impersonatedUserId: string;
  impersonatedUserEmail: string;
  impersonatedUserName: string;
  logId: string;
}): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    maxAge: number;
  };
} {
  const token = createToken(params);

  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_EXPIRY_HOURS * 60 * 60, // 1 hour in seconds
    },
  };
}

/**
 * Create cookie clearing value (to end impersonation)
 */
export function clearImpersonationCookie(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    maxAge: number;
  };
} {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Immediate expiry
    },
  };
}

export const IMPERSONATION_COOKIE_NAME = COOKIE_NAME;
