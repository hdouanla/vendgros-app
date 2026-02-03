"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Ably from "ably";
import { AblyProvider, ChannelProvider, useChannel } from "ably/react";
import { api } from "~/trpc/react";
import { getStorageUrl } from "~/lib/storage";

const CONVERSATION_CHANNEL_PREFIX = "conversation:";
const ABLY_MESSAGE_EVENT = "message";

export default function ChatDetailPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = use(params);
  const router = useRouter();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();

  // Get or create chat for this reservation
  const { mutate: getOrCreateChat, data: chat, isPending: chatPending } =
    api.chat.getOrCreateByReservation.useMutation();

  // Get messages for the conversation
  const utils = api.useUtils();
  const {
    data: messages,
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = api.chat.getMessages.useQuery(
    { conversationId: chat?.id ?? "" },
    {
      enabled: !!chat?.id,
      refetchInterval: 60_000, // Fallback poll when Ably is used for real-time
    },
  );

  // Mark as read mutation
  const { mutate: markAsRead } = api.chat.markAsRead.useMutation();

  // Send message mutation with optimistic updates
  const { mutate: sendMessage, isPending: sendingMessage } = api.chat.sendMessage.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.chat.getMessages.cancel({ conversationId: variables.conversationId });

      // Snapshot previous messages
      const previousMessages = utils.chat.getMessages.getData({
        conversationId: variables.conversationId,
      });

      // Optimistically add the new message
      const optimisticMessage = {
        id: `optimistic-${Date.now()}`,
        conversationId: variables.conversationId,
        senderId: session?.user.id ?? "",
        content: variables.content,
        attachments: variables.attachments ?? [],
        createdAt: new Date(),
        isEncrypted: false,
        sender: {
          id: session?.user.id ?? "",
          name: session?.user.name ?? "",
          email: session?.user.email ?? "",
        },
      };

      utils.chat.getMessages.setData(
        { conversationId: variables.conversationId },
        (old) => {
          if (!old) return [optimisticMessage];
          return [...old, optimisticMessage];
        },
      );

      // Clear input immediately for instant feedback
      setMessageText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        utils.chat.getMessages.setData(
          { conversationId: variables.conversationId },
          context.previousMessages,
        );
      }
      // Restore message text on error
      setMessageText(variables.content);
    },
    onSettled: (data, error, variables) => {
      // Refetch to sync with server (Ably should handle this, but this ensures consistency)
      void utils.chat.getMessages.invalidate({ conversationId: variables.conversationId });
    },
  });

  // Initialize chat when session is ready
  useEffect(() => {
    if (session?.user && !chat && !chatPending) {
      getOrCreateChat({ reservationId });
    }
  }, [session?.user, chat, chatPending, reservationId, getOrCreateChat]);

  // Mark as read when chat is opened
  useEffect(() => {
    if (chat?.id) {
      markAsRead({ conversationId: chat.id });
    }
  }, [chat?.id, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ably client: create only when we have a conversation (hooks must run unconditionally)
  const ablyClient = useMemo(() => {
    if (!chat?.id) return null;
    return new Ably.Realtime({
      authCallback: async (_, callback) => {
        try {
          const token = await utils.chat.getAblyToken.fetch({
            conversationId: chat.id,
          });
          callback(null, token);
        } catch (e) {
          callback(e instanceof Error ? e : new Error(String(e)), null);
        }
      },
    });
  }, [chat?.id, utils]);

  useEffect(() => {
    return () => {
      ablyClient?.close();
    };
  }, [ablyClient]);

  // Handle sending message
  const handleSendMessage = () => {
    if (!messageText.trim() || !chat?.id || sendingMessage) return;
    sendMessage({
      conversationId: chat.id,
      content: messageText.trim(),
    });
  };

  // Handle Enter key (send on Enter, new line on Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

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
          <Link
            href="/chat"
            className="mt-4 inline-block text-green-600 hover:text-green-700"
          >
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  const isBuyer = chat.buyerId === session.user.id;
  const otherUser = isBuyer ? chat.seller : chat.buyer;

  const channelName = `${CONVERSATION_CHANNEL_PREFIX}${chat.id}`;
  return (
    <AblyProvider client={ablyClient!}>
      <ChannelProvider channelName={channelName}>
        <AblyMessageSubscriber
          conversationId={chat.id}
          onMessage={refetchMessages}
        />
        <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Link
              href="/chat"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            >
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>

            {/* Listing Photo */}
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {chat.listing.photos?.[0] ? (
                <Image
                  src={getStorageUrl(chat.listing.photos[0])}
                  alt={chat.listing.title}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Chat Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">
                {otherUser?.name || otherUser?.email || "Unknown User"}
              </p>
              <p className="truncate text-sm text-gray-500">
                {chat.listing.title}
              </p>
            </div>

            {/* Order Info & Actions */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  chat.reservation?.status === "CONFIRMED"
                    ? "bg-green-100 text-green-800"
                    : chat.reservation?.status === "COMPLETED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                #{chat.reservation?.verificationCode}
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-2 flex gap-3 text-sm">
            <Link
              href={`/reservations/${reservationId}`}
              className="text-green-600 hover:text-green-700"
            >
              View Reservation
            </Link>
            <Link
              href={`/listings/${chat.listing.id}`}
              className="text-green-600 hover:text-green-700"
            >
              View Listing
            </Link>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {messagesLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">Loading messages...</p>
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="py-12 text-center">
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
              <p className="text-gray-600">No messages yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Start the conversation by sending a message
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isOwnMessage = message.senderId === session.user.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-green-600 text-white"
                          : "bg-white text-gray-900 shadow"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {message.content}
                      </p>
                      <p
                        className={`mt-1 text-right text-xs ${
                          isOwnMessage ? "text-green-100" : "text-gray-400"
                        }`}
                      >
                        {formatMessageTime(new Date(message.createdAt))}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-4 py-3">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sendingMessage}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                messageText.trim() && !sendingMessage
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {sendingMessage ? (
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
      </ChannelProvider>
    </AblyProvider>
  );
}

function AblyMessageSubscriber({
  conversationId,
  onMessage,
}: {
  conversationId: string;
  onMessage: () => void;
}) {
  const channelName = `${CONVERSATION_CHANNEL_PREFIX}${conversationId}`;
  useChannel(channelName, ABLY_MESSAGE_EVENT, () => {
    void onMessage();
  });
  return null;
}

function formatMessageTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
