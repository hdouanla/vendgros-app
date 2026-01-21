"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "~/trpc/react";

export function UserNav() {
  const pathname = usePathname();
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
    return pathname === path || pathname?.startsWith(path + "/");
  };

  // Don't render if not logged in or not verified
  if (isLoading || !session?.user || !isVerified) {
    return null;
  }

  const navItems = [
    { href: "/seller", label: "Seller Dashboard" },
    { href: "/reservations", label: "My Reservations" },
    {
      href: "/chat",
      label: "Chats",
      badge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
    },
    { href: "/seller/analytics", label: "Analytics" },
  ];

  return (
    <div className="border-b border-green-200 bg-green-100">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="flex h-10 items-center justify-center gap-1 overflow-x-auto sm:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-md font-medium transition-colors ${
                isActive(item.href)
                  ? "border-b-2 border-green-600 text-green-600"
                  : "hover:bg-green-100"
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
