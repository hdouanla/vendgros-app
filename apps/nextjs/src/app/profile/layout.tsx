import { redirect } from "next/navigation";
import { getSession } from "~/auth/server";

// Profile pages should not be prerendered since they require authentication
export const dynamic = 'force-dynamic';

export default async function ProfileLayout({
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

  return children;
}
