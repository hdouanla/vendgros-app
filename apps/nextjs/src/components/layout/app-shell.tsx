"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { Toaster } from "@acme/ui/toast";

import { FooterWrapper } from "~/components/layout/footer-wrapper";
import { Navbar } from "~/components/layout/navbar";
import { UserNav } from "~/components/layout/user-nav";
import { ImpersonationBanner } from "~/components/admin/impersonation-banner";

// Check for maintenance mode cookie
function getMaintenanceCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("vg_maintenance_active=true");
}

function subscribeToNothing(callback: () => void) {
  // No subscription needed, cookie doesn't change during session
  return () => {};
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Use useSyncExternalStore to safely read cookie on client
  const isMaintenanceMode = useSyncExternalStore(
    subscribeToNothing,
    getMaintenanceCookie,
    () => false // Server always returns false
  );

  // Hide navbar/footer on offline page or when in maintenance mode
  const hideChrome = pathname?.startsWith("/offline") || isMaintenanceMode;

  if (hideChrome) {
    return <main>{children}</main>;
  }

  return (
    <>
      <ImpersonationBanner />
      <Navbar />
      <UserNav />
      <main>{children}</main>
      <FooterWrapper />
      <Toaster />
    </>
  );
}
