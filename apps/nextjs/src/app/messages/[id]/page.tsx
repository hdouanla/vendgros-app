"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Ably from "ably";
import { AblyProvider, useChannel } from "ably/react";
import { api } from "~/trpc/react";
import { getStorageUrl } from "~/lib/storage";

const CONVERSATION_CHANNEL_PREFIX = "conversation:";
const ABLY_MESSAGE_EVENT = "message";

export default function ChatPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();
  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: messages, isLoading: messagesLoading } =
    api.messaging.getMessages.useQuery({
      conversationId,
      limit: 100,
    }, {
      enabled: !!session?.user && !!conversationId,
      refetchInterval: 60_000,
    });

  const { data: conversations } = api.messaging.getConversations.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    }
  );
  const currentConversation = conversations?.find((c) => c.id === conversationId);

  if (sessionLoading || messagesLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent(`/messages/${conversationId}`));
    return null;
  }

  const sendMessage = api.messaging.sendMessage.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.messaging.getMessages.cancel({ conversationId: variables.conversationId });

      // Snapshot previous messages
      const previousMessages = utils.messaging.getMessages.getData({
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
          email: session?.user.email ?? "",
        },
      };

      utils.messaging.getMessages.setData(
        { conversationId: variables.conversationId },
        (old) => {
          if (!old) return [optimisticMessage];
          return [...old, optimisticMessage];
        },
      );

      // Clear input immediately for instant feedback
      setMessageText("");

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        utils.messaging.getMessages.setData(
          { conversationId: variables.conversationId },
          context.previousMessages,
        );
      }
      // Restore message text on error
      setMessageText(variables.content);
    },
    onSettled: (data, error, variables) => {
      // Refetch to sync with server (Ably should handle this, but this ensures consistency)
      void utils.messaging.getMessages.invalidate({ conversationId: variables.conversationId });
      void utils.messaging.getConversations.invalidate();
    },
  });

  const markAsRead = api.messaging.markAsRead.useMutation();

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate({ conversationId });
    }
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time via Ably when conversation is loaded; no polling interval (refetchInterval used as fallback)

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    await sendMessage.mutateAsync({
      conversationId,
      content: messageText.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const ablyClient = useMemo(() => {
    if (!conversationId) return null;
    return new Ably.Realtime({
      authCallback: async (_, callback) => {
        try {
          const token = await utils.messaging.getAblyToken.fetch({
            conversationId,
          });
          callback(null, token);
        } catch (e) {
          callback(e instanceof Error ? e : new Error(String(e)), null);
        }
      },
    });
  }, [conversationId, utils]);

  useEffect(() => {
    return () => {
      ablyClient?.close();
    };
  }, [ablyClient]);

  if (messagesLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  const content = (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-4xl flex-col px-4 py-4">
      {ablyClient && (
        <AblyMessageSubscriber
          conversationId={conversationId}
          onMessage={() => void utils.messaging.getMessages.invalidate({ conversationId })}
        />
      )}
      {/* Header */}
      <div className="mb-4 flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>

        {currentConversation && (
          <>
            {currentConversation.listing.photos &&
              currentConversation.listing.photos[0] && (
                <img
                  src={getStorageUrl(currentConversation.listing.photos[0])}
                  alt={currentConversation.listing.title}
                  className="h-12 w-12 rounded object-cover"
                />
              )}
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">
                {currentConversation.listing.title}
              </h2>
              <p className="text-sm text-gray-600">
                Chat with: {currentConversation.otherUser.email}
              </p>
            </div>
            <Link
              href={`/listings/${currentConversation.listing.id}`}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              View Listing
            </Link>
          </>
        )}
      </div>

      {/* Messages Container */}
      <div className="mb-4 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
        {messages && messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwnMessage = msg.senderId === currentConversation?.buyerId
                || msg.senderId === currentConversation?.sellerId;
              const isSentByCurrentUser = msg.senderId === currentConversation?.buyerId
                ? currentConversation.buyerId === currentConversation.buyerId
                : currentConversation?.sellerId === currentConversation?.sellerId;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isSentByCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isSentByCurrentUser
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {msg.attachments.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Attachment ${idx + 1}`}
                            className="h-24 w-24 rounded object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <p
                      className={`mt-1 text-xs ${isSentByCurrentUser ? "text-green-100" : "text-gray-500"}`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={3}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={!messageText.trim() || sendMessage.isPending}
          className="h-full rounded-lg bg-green-600 px-6 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {sendMessage.isPending ? "Sending..." : "Send"}
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );

  if (ablyClient) {
    return <AblyProvider client={ablyClient}>{content}</AblyProvider>;
  }
  return content;
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
