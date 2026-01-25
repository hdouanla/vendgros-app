"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export function UserNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { data: session, isLoading } = api.auth.getSession.useQuery();

  const isVerified = session?.user?.emailVerified === true;

  // Get unread chat count
  const { data: unreadCount } = api.chat.getTotalUnreadCount.useQuery(
    undefined,
    {
      enabled: !!session?.user && isVerified,
      refetchInterval: 60000,
    },
  );

  const isActive = (path: string) => {
    // Exact match for paths that have child routes (like /seller has /seller/analytics)
    if (path === "/seller") {
      return pathname === path;
    }
    return pathname === path || pathname?.startsWith(path + "/");
  };

  // Don't render if not logged in or not verified
  if (isLoading || !session?.user || !isVerified) {
    return null;
  }

  const navItems = [
    { href: "/seller", label: t("sellerDashboard") },
    { href: "/reservations", label: t("myReservations") },
    {
      href: "/chat",
      label: t("chats"),
      badge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
    },
    { href: "/seller/analytics", label: t("analytics") },
    { href: "/profile/likes", label: t("liked") },
    { href: "/profile/favorites", label: t("saved") },
  ];

  return (
    <div className="border-b border-green-200 bg-[#FFE9A1]">
      <div className="mx-auto max-w-content px-4">
        <div className="flex items-center gap-1 overflow-x-auto sm:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 whitespace-nowrap px-3 py-4 text-base font-normal transition-colors ${
                isActive(item.href)
                  ? "text-green-600"
                  : "hover:text-green-600"
              }`}
            >
              {item.label}
              {item.badge && (
                <span
                  className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    isActive(item.href)
                      ? "bg-white text-green-600"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
