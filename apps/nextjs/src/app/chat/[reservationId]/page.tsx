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

  // Get or create chat for this reservation to get the conversationId
  const { mutate: getOrCreateChat, data: chat, isPending: chatPending } =
    api.chat.getOrCreateByReservation.useMutation();

  // Initialize chat when session is ready
  if (session?.user && !chat && !chatPending) {
    getOrCreateChat({ reservationId });
  }

  if (sessionLoading || chatPending) {
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

  if (!chat) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load chat</p>
          <p className="mt-2 text-sm text-gray-500">
            Chat is only available for confirmed reservations
          </p>
        </div>
      </div>
    );
  }

  return <ChatLayout reservationId={reservationId} initialChatId={chat.id} />;
}
