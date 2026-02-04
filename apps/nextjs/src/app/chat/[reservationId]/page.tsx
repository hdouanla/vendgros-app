"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ChatLayout } from "~/components/chat/chat-layout";

export default function ChatDetailPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = use(params);
  const router = useRouter();

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent(`/chat/${reservationId}`));
    return null;
  }

  // Let ChatLayout handle chat initialization - it already does this in useEffect
  return <ChatLayout reservationId={reservationId} />;
}
