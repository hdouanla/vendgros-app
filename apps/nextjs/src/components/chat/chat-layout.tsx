"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Ably from "ably";
import { AblyProvider, ChannelProvider, useChannel } from "ably/react";
import { api } from "~/trpc/react";
import { getStorageUrl } from "~/lib/storage";
import { Paperclip, Send, Smile, ChevronLeft, ChevronRight } from "lucide-react";

const CONVERSATION_CHANNEL_PREFIX = "conversation:";
const ABLY_MESSAGE_EVENT = "message";

interface ChatLayoutProps {
  reservationId: string;
  initialChatId?: string;
}

export function ChatLayout({ reservationId, initialChatId }: ChatLayoutProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId ?? null);
  const [messageText, setMessageText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{ url: string; name: string; type: string; size: number }>>([]);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: session } = api.auth.getSession.useQuery();
  const utils = api.useUtils();

  // Get all chats for the left sidebar
  const { data: chats } = api.chat.getMyChats.useQuery(undefined, {
    enabled: !!session?.user,
    refetchInterval: 30_000,
  });

  // Get or create the selected chat
  const { mutate: getOrCreateChat, data: chat } = api.chat.getOrCreateByReservation.useMutation();

  // Get messages for selected conversation
  const {
    data: messages,
    refetch: refetchMessages,
  } = api.chat.getMessages.useQuery(
    { conversationId: selectedChatId ?? "" },
    {
      enabled: !!selectedChatId,
      refetchInterval: 60_000,
    },
  );

  const { mutate: markAsRead } = api.chat.markAsRead.useMutation();
  const { mutate: sendMessage, isPending: sendingMessage } = api.chat.sendMessage.useMutation({
    onMutate: async (variables) => {
      await utils.chat.getMessages.cancel({ conversationId: variables.conversationId });
      const previousMessages = utils.chat.getMessages.getData({
        conversationId: variables.conversationId,
      });

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
        (old) => (old ? [...old, optimisticMessage] : [optimisticMessage]),
      );

      setMessageText("");
      setAttachedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        utils.chat.getMessages.setData(
          { conversationId: variables.conversationId },
          context.previousMessages,
        );
      }
      setMessageText(variables.content);
    },
    onSettled: (data, error, variables) => {
      void utils.chat.getMessages.invalidate({ conversationId: variables.conversationId });
    },
  });

  // Initialize chat when reservationId changes
  useEffect(() => {
    if (reservationId && session?.user && !chat) {
      getOrCreateChat({ reservationId });
    }
  }, [reservationId, session?.user, chat, getOrCreateChat]);

  // Set selected chat when chat is loaded
  useEffect(() => {
    if (chat?.id && !selectedChatId) {
      setSelectedChatId(chat.id);
    }
  }, [chat?.id, selectedChatId]);

  // Mark as read when chat is selected
  useEffect(() => {
    if (selectedChatId) {
      markAsRead({ conversationId: selectedChatId });
    }
  }, [selectedChatId, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ably client
  const ablyClient = useMemo(() => {
    if (!selectedChatId) return null;
    return new Ably.Realtime({
      authCallback: async (_, callback) => {
        try {
          const token = await utils.chat.getAblyToken.fetch({
            conversationId: selectedChatId,
          });
          callback(null, token);
        } catch (e) {
          callback(e instanceof Error ? e : new Error(String(e)), null);
        }
      },
    });
  }, [selectedChatId, utils]);

  useEffect(() => {
    return () => {
      ablyClient?.close();
    };
  }, [ablyClient]);

  const handleSendMessage = () => {
    if (!messageText.trim() && attachedFiles.length === 0) return;
    if (!selectedChatId || sendingMessage) return;

    sendMessage({
      conversationId: selectedChatId,
      content: messageText.trim() || "📎 File attached",
      attachments: attachedFiles.map((f) => f.url),
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain", "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(`File type not allowed. Allowed: images, PDF, Word, Excel, text files.`);
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/chat-attachment", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setAttachedFiles((prev) => [
        ...prev,
        { url: data.url, name: data.name, type: data.type, size: data.size },
      ]);
    } catch (err) {
      console.error("File upload error:", err);
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const selectedChat = chats?.find((c) => c.id === selectedChatId);
  const isBuyer = selectedChat?.buyerId === session?.user.id;
  const otherUser = isBuyer ? selectedChat?.seller : selectedChat?.buyer;

  // Collect all image URLs from messages for gallery navigation
  const allImages = useMemo(() => {
    if (!messages) return [];
    const imageUrls: string[] = [];
    messages.forEach((message) => {
      if (message.attachments) {
        message.attachments.forEach((url) => {
          if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            imageUrls.push(url);
          }
        });
      }
    });
    return imageUrls;
  }, [messages]);

  const handleImageClick = (imageUrl: string) => {
    const index = allImages.findIndex((url) => url === imageUrl);
    if (index !== -1) {
      setLightboxImageIndex(index);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left Column - Chats List */}
      <div className="w-80 border-r bg-white">
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center border-b px-6">
            <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!chats || chats.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No conversations yet
              </div>
            ) : (
              <div className="divide-y">
                {chats.map((chatItem) => {
                  const isSelected = chatItem.id === selectedChatId;
                  const otherUser = chatItem.buyerId === session.user.id
                    ? chatItem.seller
                    : chatItem.buyer;
                  
                  return (
                    <button
                      key={chatItem.id}
                      onClick={() => setSelectedChatId(chatItem.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                        isSelected ? "bg-gray-100" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                          {chatItem.listing.photos?.[0] ? (
                            <Image
                              src={getStorageUrl(chatItem.listing.photos[0])}
                              alt={chatItem.listing.title}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {otherUser?.name || otherUser?.email || "Unknown"}
                            </p>
                            {chatItem.unreadCount > 0 && (
                              <span className="ml-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-bold text-white">
                                {chatItem.unreadCount > 99 ? "99+" : chatItem.unreadCount}
                              </span>
                            )}
                          </div>
                          {chatItem.lastMessageText && (
                            <p className="mt-1 truncate text-xs text-gray-500">
                              {chatItem.lastMessageSenderId === session.user.id && "You: "}
                              {chatItem.lastMessageText}
                            </p>
                          )}
                          {chatItem.lastMessageAt && (
                            <p className="mt-1 text-xs text-gray-400">
                              {formatChatTime(new Date(chatItem.lastMessageAt))}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Column - Conversation */}
      {selectedChatId && ablyClient && selectedChat ? (
        <AblyProvider client={ablyClient}>
          <ChannelProvider channelName={`${CONVERSATION_CHANNEL_PREFIX}${selectedChatId}`}>
            <AblyMessageSubscriber
              conversationId={selectedChatId}
              onMessage={refetchMessages}
            />
            <div className="flex flex-1 flex-col bg-white">
              {/* Header */}
              <div className="flex h-20 items-center border-b px-6">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                      {selectedChat.listing?.photos?.[0] ? (
                        <Image
                          src={getStorageUrl(selectedChat.listing.photos[0]!)}
                          alt={otherUser?.name || ""}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {otherUser?.name || otherUser?.email || "Unknown User"}
                      </h3>
                      <p className="text-xs text-gray-500">Last seen recently</p>
                    </div>
                  </div>
                  {/* TODO: Add call, video call, and menu actions when needed */}
                  {/* <div className="flex items-center gap-2">
                    <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100">
                      <Phone className="h-5 w-5" />
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100">
                      <Video className="h-5 w-5" />
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div> */}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
                <div className="space-y-3">
                  {messages?.map((message, index) => {
                    const isOwn = message.senderId === session.user.id;
                    const prevMessage = index > 0 ? messages[index - 1] : null;
                    const showAvatar = !isOwn && (!prevMessage || prevMessage.senderId !== message.senderId);
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        {/* Avatar for received messages */}
                        {!isOwn && (
                          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                            {showAvatar ? (
                              selectedChat.listing?.photos?.[0] ? (
                                <Image
                                  src={getStorageUrl(selectedChat.listing.photos[0]!)}
                                  alt={otherUser?.name || ""}
                                  width={32}
                                  height={32}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              )
                            ) : (
                              <div className="h-full w-full" />
                            )}
                          </div>
                        )}
                        
                        <div className={`max-w-[70%] ${isOwn ? "order-2" : "order-1"}`}>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {message.attachments.map((url, idx) => (
                                <FileAttachment
                                  key={idx}
                                  url={url}
                                  onImageClick={() => handleImageClick(url)}
                                />
                              ))}
                            </div>
                          )}
                          {message.content && (
                            <div
                              className={`rounded-lg px-3 py-2 ${
                                isOwn
                                  ? "bg-blue-500 text-white rounded-br-sm"
                                  : "bg-gray-200 text-gray-900 rounded-bl-sm"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {message.content}
                              </p>
                              <p
                                className={`mt-1 text-xs ${
                                  isOwn ? "text-blue-100" : "text-gray-600"
                                }`}
                              >
                                {formatMessageTime(new Date(message.createdAt))}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Spacer for sent messages to align properly */}
                        {isOwn && <div className="h-8 w-8 flex-shrink-0" />}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t bg-white px-6 py-4">
                {attachedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          onClick={() =>
                            setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  />
                  <textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a message..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    style={{ maxHeight: "120px" }}
                  />
                  <button className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && attachedFiles.length === 0) || sendingMessage}
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                      (messageText.trim() || attachedFiles.length > 0) && !sendingMessage
                        ? "bg-gray-800 text-white hover:bg-gray-900"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </ChannelProvider>
        </AblyProvider>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-white">
          <p className="text-gray-500">Select a conversation to start chatting</p>
        </div>
      )}

      {/* Right Column - Profile Panel */}
      {selectedChat && otherUser && (
        <div className="w-80 border-l bg-white">
          <div className="flex h-full flex-col">
            <div className="flex h-20 items-center border-b px-6">
              <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="text-center">
                <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full bg-gray-200">
                  {selectedChat.listing?.photos?.[0] ? (
                    <Image
                      src={getStorageUrl(selectedChat.listing.photos[0]!)}
                      alt={otherUser?.name || ""}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {otherUser.name || otherUser.email || "Unknown User"}
                </h4>
                <p className="mt-1 text-sm text-gray-500">Last seen recently</p>
                {otherUser.email && (
                  <p className="mt-4 text-sm text-gray-600">
                    <span className="font-medium">Email:</span> {otherUser.email}
                  </p>
                )}
                <div className="mt-6">
                  <h5 className="mb-3 text-sm font-semibold text-gray-900">
                    Media, Links and Docs
                  </h5>
                  <div className="grid grid-cols-3 gap-2">
                    {messages
                      ?.filter((m) => m.attachments && m.attachments.length > 0)
                      .slice(0, 6)
                      .map((m, idx) => {
                        const attachmentUrl = m.attachments?.[0];
                        if (!attachmentUrl) return null;
                        const isImage = attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        
                        if (isImage) {
                          return (
                            <button
                              key={idx}
                              onClick={() => handleImageClick(attachmentUrl)}
                              className="aspect-square overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                              <Image
                                src={attachmentUrl}
                                alt="Attachment"
                                width={100}
                                height={100}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          );
                        }
                        
                        return (
                          <a
                            key={idx}
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square overflow-hidden rounded-lg bg-gray-100 hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </a>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Gallery */}
      {lightboxImageIndex !== null && allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          currentIndex={lightboxImageIndex}
          onClose={() => setLightboxImageIndex(null)}
          onNavigate={(newIndex) => setLightboxImageIndex(newIndex)}
        />
      )}
    </div>
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

function FileAttachment({
  url,
  onImageClick,
}: {
  url: string;
  onImageClick?: () => void;
}) {
  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const fileName = url.split("/").pop() || "file";

  if (isImage) {
    return (
      <button
        onClick={onImageClick}
        className="w-full rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity cursor-pointer"
      >
        <Image src={url} alt="Attachment" width={200} height={200} className="h-auto w-full" />
      </button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100">
        <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{fileName}</p>
        <p className="text-xs text-green-600">Click to open</p>
      </div>
    </a>
  );
}

function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const currentImage = images[currentIndex] || "";
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrevious) {
        onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowRight" && hasNext) {
        onNavigate(currentIndex + 1);
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden"; // Prevent background scrolling

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose, hasPrevious, hasNext, currentIndex, onNavigate]);

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrevious) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNext) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 hover:bg-gray-100 shadow-lg transition-colors"
        aria-label="Close lightbox"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous Button */}
      {hasPrevious && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white bg-opacity-90 text-gray-900 hover:bg-opacity-100 shadow-lg transition-all"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next Button */}
      {hasNext && (
        <button
          onClick={handleNext}
          className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white bg-opacity-90 text-gray-900 hover:bg-opacity-100 shadow-lg transition-all"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black bg-opacity-50 px-4 py-2 text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      <div
        className="relative max-h-full max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          key={currentImage} // Force re-render on image change
          src={currentImage}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          width={1200}
          height={1200}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          unoptimized
        />
      </div>
    </div>
  );
}

function formatChatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
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
