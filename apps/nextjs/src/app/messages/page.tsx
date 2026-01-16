"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function MessagesPage() {
  const t = useTranslations();
  const router = useRouter();

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: conversations, isLoading: conversationsLoading } = api.messaging.getConversations.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    }
  );

  if (sessionLoading || conversationsLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/messages"));
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-2 text-sm text-gray-600">
          {conversations?.length ?? 0} conversations
        </p>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="space-y-4">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Listing Image */}
                {conv.listing.photos && conv.listing.photos[0] && (
                  <img
                    src={conv.listing.photos[0]}
                    alt={conv.listing.title}
                    className="h-16 w-16 rounded object-cover"
                  />
                )}

                {/* Conversation Info */}
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">
                      {conv.listing.title}
                    </h2>
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-medium text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">
                    With: {conv.otherUser.email}
                  </p>

                  {conv.lastMessageText && (
                    <p className="mt-2 text-sm text-gray-500">
                      {conv.lastMessageText}
                    </p>
                  )}

                  {conv.lastMessageAt && (
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(conv.lastMessageAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-700">No conversations yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Start a conversation with a seller by clicking "Contact Seller" on a
            listing
          </p>
        </div>
      )}
    </div>
  );
}
