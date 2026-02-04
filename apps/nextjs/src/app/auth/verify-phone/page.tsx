import { redirect } from "next/navigation";
import { getSession } from "~/auth/server";
import { db } from "@acme/db/client";
import { VerifyPhoneClient } from "./verify-phone-client";

// Disable caching to always check fresh session data
export const dynamic = "force-dynamic";

export default async function VerifyPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;

  // Redirect to signin if not logged in
  if (!session?.user) {
    const redirectParam = params.redirect
      ? `&redirect=${encodeURIComponent(params.redirect)}`
      : "";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/auth/verify-phone")}${redirectParam}`);
  }

  // Get user's phone info from database
  const user = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
    columns: { phone: true, phoneVerified: true },
  });

  // Redirect to destination if phone exists AND is verified
  if (user?.phone && user?.phoneVerified) {
    redirect(params.redirect ?? "/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <VerifyPhoneClient
          userPhone={user?.phone ?? null}
          redirectUrl={params.redirect}
        />
      </div>
    </div>
  );
}
