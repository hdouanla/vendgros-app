"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function ChatPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  const { data: messages, isLoading: messagesLoading } =
    api.messaging.getMessages.useQuery({
      conversationId,
      limit: 100,
    });

  const { data: conversations } = api.messaging.getConversations.useQuery();
  const currentConversation = conversations?.find((c) => c.id === conversationId);

  const sendMessage = api.messaging.sendMessage.useMutation({
    onSuccess: () => {
      void utils.messaging.getMessages.invalidate({ conversationId });
      void utils.messaging.getConversations.invalidate();
      setMessageText("");
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

  // Poll for new messages (simple real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      void utils.messaging.getMessages.invalidate({ conversationId });
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [conversationId, utils]);

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

  if (messagesLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-4xl flex-col px-4 py-4">
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
                  src={currentConversation.listing.photos[0]}
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
}
