import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "~/auth/server";
import { db } from "@acme/db/client";
import { user } from "@acme/db/schema";
import { eq } from "@acme/db";

// Admin pages should not be prerendered since they require authentication
export const dynamic = 'force-dynamic';

async function AdminSidebar({ currentPath }: { currentPath?: string }) {
  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/moderation", label: "Moderation Queue", icon: "📝" },
    { href: "/admin/listings", label: "All Listings", icon: "📦" },
    { href: "/admin/reservations", label: "Reservations", icon: "🎫" },
    { href: "/admin/moderation-ai", label: "AI Moderation", icon: "🤖" },
    { href: "/admin/users", label: "User Management", icon: "👥" },
    { href: "/admin/trust-safety", label: "Trust & Safety", icon: "🛡️" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white">
      <div className="p-6">
        <h2 className="text-xl font-bold text-green-400">Vendgros Admin</h2>
        <p className="text-xs text-gray-400 mt-1">Management Dashboard</p>
      </div>

      <nav className="px-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentPath === item.href
                    ? "bg-green-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
        >
          <span>←</span>
          <span>Back to App</span>
        </Link>
      </div>
    </aside>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Redirect to signin if not authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  // Redirect to verification if email not verified
  if (!session.user.emailVerified) {
    redirect("/auth/verify-email");
  }

  // Check if user is admin
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!currentUser || !currentUser.isAdmin) {
    redirect("/?error=unauthorized");
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
