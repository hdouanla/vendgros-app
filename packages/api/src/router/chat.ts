import { z } from "zod/v4";
import { and, desc, eq, gt, or, sql } from "@acme/db";

import { conversation, listing, message, reservation, user } from "@acme/db/schema";

import { sendMessageNotification } from "../lib/notifications";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Valid reservation statuses for chat access
const CHAT_ALLOWED_STATUSES = ["CONFIRMED", "COMPLETED"] as const;

export const chatRouter = createTRPCRouter({
  /**
   * Get or create a conversation for a reservation
   * Only allowed when reservation is CONFIRMED or COMPLETED
   */
  getOrCreateByReservation: protectedProcedure
    .input(
      z.object({
        reservationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get reservation with listing info
      const reservationData = await ctx.db.query.reservation.findFirst({
        where: (reservations, { eq }) => eq(reservations.id, input.reservationId),
        with: {
          listing: {
            columns: {
              id: true,
              sellerId: true,
              title: true,
              photos: true,
            },
          },
        },
      });

      if (!reservationData) {
        throw new Error("Reservation not found");
      }

      const userId = ctx.session.user.id;
      const buyerId = reservationData.buyerId;
      const sellerId = reservationData.listing.sellerId;

      // Verify user is buyer or seller
      if (userId !== buyerId && userId !== sellerId) {
        throw new Error("Not authorized");
      }

      // Verify reservation status allows chat
      if (!CHAT_ALLOWED_STATUSES.includes(reservationData.status as typeof CHAT_ALLOWED_STATUSES[number])) {
        throw new Error("Chat is only available after payment is confirmed");
      }

      // Check if conversation already exists for this reservation
      const existingConversation = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.reservationId, input.reservationId),
        with: {
          listing: {
            columns: {
              id: true,
              title: true,
              photos: true,
            },
          },
          buyer: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          seller: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          reservation: {
            columns: {
              id: true,
              verificationCode: true,
              status: true,
              quantityReserved: true,
              totalPrice: true,
            },
          },
        },
      });

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation tied to this reservation
      const [newConversation] = await ctx.db
        .insert(conversation)
        .values({
          listingId: reservationData.listingId,
          buyerId,
          sellerId,
          reservationId: input.reservationId,
        })
        .returning();

      // Fetch with relations
      const conversationWithRelations = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, newConversation!.id),
        with: {
          listing: {
            columns: {
              id: true,
              title: true,
              photos: true,
            },
          },
          buyer: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          seller: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          reservation: {
            columns: {
              id: true,
              verificationCode: true,
              status: true,
              quantityReserved: true,
              totalPrice: true,
            },
          },
        },
      });

      return conversationWithRelations;
    }),

  /**
   * Get chat by reservation ID
   */
  getChatByReservation: protectedProcedure
    .input(
      z.object({
        reservationId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conv = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.reservationId, input.reservationId),
        with: {
          listing: {
            columns: {
              id: true,
              title: true,
              photos: true,
            },
          },
          buyer: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          seller: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          reservation: {
            columns: {
              id: true,
              verificationCode: true,
              status: true,
              quantityReserved: true,
              totalPrice: true,
            },
          },
        },
      });

      if (!conv) {
        return null;
      }

      // Verify access
      if (conv.buyerId !== ctx.session.user.id && conv.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      return conv;
    }),

  /**
   * Get all user's reservation chats with unread counts
   */
  getMyChats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get conversations that have a reservationId (reservation-based chats)
    const conversations = await ctx.db.query.conversation.findMany({
      where: (conversations, { and, or, eq, isNotNull }) =>
        and(
          or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)),
          isNotNull(conversations.reservationId),
        ),
      with: {
        listing: {
          columns: {
            id: true,
            title: true,
            photos: true,
          },
        },
        buyer: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        seller: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        reservation: {
          columns: {
            id: true,
            verificationCode: true,
            status: true,
            quantityReserved: true,
            totalPrice: true,
          },
        },
      },
      orderBy: (conversations, { desc }) => [desc(conversations.lastMessageAt)],
    });

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const isBuyer = conv.buyerId === userId;
        const lastReadAt = isBuyer ? conv.buyerLastReadAt : conv.sellerLastReadAt;
        const otherPartyId = isBuyer ? conv.sellerId : conv.buyerId;

        let unreadCount = 0;
        if (lastReadAt) {
          const unreadMessages = await ctx.db.query.message.findMany({
            where: (messages, { and, eq, gt }) =>
              and(
                eq(messages.conversationId, conv.id),
                gt(messages.createdAt, lastReadAt),
                eq(messages.senderId, otherPartyId),
              ),
          });
          unreadCount = unreadMessages.length;
        } else if (conv.lastMessageAt) {
          // Never read, count all messages from other party
          const allMessages = await ctx.db.query.message.findMany({
            where: (messages, { and, eq }) =>
              and(
                eq(messages.conversationId, conv.id),
                eq(messages.senderId, otherPartyId),
              ),
          });
          unreadCount = allMessages.length;
        }

        return {
          ...conv,
          unreadCount,
          otherUser: isBuyer ? conv.seller : conv.buyer,
          isBuyer,
        };
      }),
    );

    return conversationsWithUnread;
  }),

  /**
   * Get paginated messages for a conversation
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user is part of this conversation
      const conv = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, input.conversationId),
        with: {
          reservation: {
            columns: {
              status: true,
            },
          },
        },
      });

      if (!conv) {
        throw new Error("Conversation not found");
      }

      if (conv.buyerId !== ctx.session.user.id && conv.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      const messages = await ctx.db.query.message.findMany({
        where: (messages, { eq }) => eq(messages.conversationId, input.conversationId),
        with: {
          sender: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return messages.reverse(); // Return in chronological order
    }),

  /**
   * Send a message (validates access + reservation status)
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(5000),
        attachments: z.array(z.string().url()).max(5).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is part of this conversation
      const conv = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, input.conversationId),
        with: {
          listing: true,
          buyer: true,
          seller: true,
          reservation: {
            columns: {
              status: true,
            },
          },
        },
      });

      if (!conv) {
        throw new Error("Conversation not found");
      }

      if (conv.buyerId !== ctx.session.user.id && conv.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      // Verify reservation status if this is a reservation-based chat
      if (conv.reservation && !CHAT_ALLOWED_STATUSES.includes(conv.reservation.status as typeof CHAT_ALLOWED_STATUSES[number])) {
        throw new Error("Chat is only available for confirmed or completed orders");
      }

      // Create message
      const [newMessage] = await ctx.db
        .insert(message)
        .values({
          conversationId: input.conversationId,
          senderId: ctx.session.user.id,
          content: input.content,
          attachments: input.attachments ?? [],
          isEncrypted: false,
        })
        .returning();

      // Update conversation last message
      await ctx.db
        .update(conversation)
        .set({
          lastMessageAt: new Date(),
          lastMessageText: input.content.substring(0, 100),
          lastMessageSenderId: ctx.session.user.id,
        })
        .where(eq(conversation.id, input.conversationId));

      // Send notification to recipient
      const recipient = conv.buyerId === ctx.session.user.id ? conv.seller : conv.buyer;

      await sendMessageNotification({
        recipientEmail: recipient.email!,
        recipientPhone: recipient.phone ?? undefined,
        senderEmail: ctx.session.user.email!,
        listingTitle: conv.listing.title,
        messagePreview: input.content.substring(0, 50),
      }).catch((err) => console.error("Failed to send message notification:", err));

      return newMessage;
    }),

  /**
   * Mark conversation as read
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conv = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, input.conversationId),
      });

      if (!conv) {
        throw new Error("Conversation not found");
      }

      if (conv.buyerId !== ctx.session.user.id && conv.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      const isBuyer = conv.buyerId === ctx.session.user.id;
      const now = new Date();

      await ctx.db
        .update(conversation)
        .set(isBuyer ? { buyerLastReadAt: now } : { sellerLastReadAt: now })
        .where(eq(conversation.id, input.conversationId));

      return { success: true };
    }),

  /**
   * Get total unread count for navbar badge
   */
  getTotalUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get all conversations where user is buyer or seller and has reservation
    const conversations = await ctx.db.query.conversation.findMany({
      where: (conversations, { and, or, eq, isNotNull }) =>
        and(
          or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)),
          isNotNull(conversations.reservationId),
        ),
      columns: {
        id: true,
        buyerId: true,
        sellerId: true,
        buyerLastReadAt: true,
        sellerLastReadAt: true,
      },
    });

    let totalUnread = 0;

    for (const conv of conversations) {
      const isBuyer = conv.buyerId === userId;
      const lastReadAt = isBuyer ? conv.buyerLastReadAt : conv.sellerLastReadAt;
      const otherPartyId = isBuyer ? conv.sellerId : conv.buyerId;

      if (lastReadAt) {
        const unreadMessages = await ctx.db.query.message.findMany({
          where: (messages, { and, eq, gt }) =>
            and(
              eq(messages.conversationId, conv.id),
              gt(messages.createdAt, lastReadAt),
              eq(messages.senderId, otherPartyId),
            ),
          columns: { id: true },
        });
        totalUnread += unreadMessages.length;
      } else {
        // Never read, count all messages from other party
        const allMessages = await ctx.db.query.message.findMany({
          where: (messages, { and, eq }) =>
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.senderId, otherPartyId),
            ),
          columns: { id: true },
        });
        totalUnread += allMessages.length;
      }
    }

    return totalUnread;
  }),

  /**
   * Poll for new messages in a conversation
   */
  pollNewMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        lastMessageId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user is part of this conversation
      const conv = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, input.conversationId),
      });

      if (!conv) {
        throw new Error("Conversation not found");
      }

      if (conv.buyerId !== ctx.session.user.id && conv.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      if (!input.lastMessageId) {
        return [];
      }

      const lastMessage = await ctx.db.query.message.findFirst({
        where: (messages, { eq }) => eq(messages.id, input.lastMessageId!),
      });

      if (!lastMessage) {
        return [];
      }

      const newMessages = await ctx.db.query.message.findMany({
        where: (messages, { and, eq, gt }) =>
          and(
            eq(messages.conversationId, input.conversationId),
            gt(messages.createdAt, lastMessage.createdAt),
          ),
        with: {
          sender: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

      return newMessages;
    }),
});
