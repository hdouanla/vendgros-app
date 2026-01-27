"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "~/trpc/react";
import { getStorageUrl } from "~/lib/storage";

export default function ChatListPage() {
  const router = useRouter();

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: chats, isLoading: chatsLoading } = api.chat.getMyChats.useQuery(undefined, {
    enabled: !!session?.user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=/chat");
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-2 text-sm text-gray-600">
          Chat with buyers and sellers about your orders
        </p>
      </div>

      {chatsLoading ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">Loading chats...</p>
        </div>
      ) : !chats || chats.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-gray-600">No conversations yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Chats will appear here after you complete a payment for a reservation
          </p>
          <Link
            href="/reservations"
            className="mt-4 inline-block text-green-600 hover:text-green-700"
          >
            View my reservations
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <ul className="divide-y divide-gray-200">
            {chats.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/chat/${chat.reservation?.id}`}
                  className="block hover:bg-gray-50"
                >
                  <div className="flex items-center px-4 py-4 sm:px-6">
                    {/* Listing Photo */}
                    <div className="mr-4 h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {chat.listing.photos?.[0] ? (
                        <Image
                          src={getStorageUrl(chat.listing.photos[0])}
                          alt={chat.listing.title}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg
                            className="h-6 w-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {chat.otherUser?.name || chat.otherUser?.email || "Unknown User"}
                        </p>
                        <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                          {/* Status Badge */}
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              chat.reservation?.status === "CONFIRMED"
                                ? "bg-green-100 text-green-800"
                                : chat.reservation?.status === "COMPLETED"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {chat.reservation?.status}
                          </span>
                          {/* Unread Badge */}
                          {chat.unreadCount > 0 && (
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-bold text-white">
                              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-600">
                        {chat.listing.title}
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>Order #{chat.reservation?.verificationCode}</span>
                        {chat.lastMessageAt && (
                          <>
                            <span>·</span>
                            <span>
                              {formatRelativeTime(new Date(chat.lastMessageAt))}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Last Message Preview */}
                      {chat.lastMessageText && (
                        <p className="mt-1 truncate text-sm text-gray-500">
                          {chat.lastMessageSenderId === session.user.id && (
                            <span className="text-gray-400">You: </span>
                          )}
                          {chat.lastMessageText}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="ml-4 flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
