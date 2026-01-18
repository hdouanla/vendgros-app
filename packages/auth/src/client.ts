import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

// Client-side auth utilities - only use in browser context
const getBaseURL = () => {
  // Check if we're in a browser environment
  if (typeof globalThis !== "undefined") {
    const win = (globalThis as any).window;
    if (win?.location?.origin) {
      return win.location.origin;
    }
  }
  return "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
