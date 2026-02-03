import { z } from "zod/v4";
import { and, desc, eq, or } from "@acme/db";

import { conversation, listing, message, user } from "@acme/db/schema";

import { createConversationTokenRequest, publishNewMessage } from "../lib/ably";
import { sendMessageNotification } from "../lib/notifications";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const messagingRouter = createTRPCRouter({
  /**
   * Get or create a conversation for a listing between buyer and seller
   */
  getOrCreateConversation: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get listing to identify seller
      const listingData = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!listingData) {
        throw new Error("Listing not found");
      }

      const buyerId = ctx.session.user.id;
      const sellerId = listingData.sellerId;

      // Don't allow seller to message themselves
      if (buyerId === sellerId) {
        throw new Error("Cannot message yourself");
      }

      // Check if conversation already exists
      const existingConversation = await ctx.db.query.conversation.findFirst({
        where: (conversations, { and, eq }) =>
          and(
            eq(conversations.listingId, input.listingId),
            eq(conversations.buyerId, buyerId),
            eq(conversations.sellerId, sellerId),
          ),
        with: {
          listing: {
            columns: {
              title: true,
              photos: true,
            },
          },
          buyer: {
            columns: {
              id: true,
              email: true,
            },
          },
          seller: {
            columns: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation
      const [newConversation] = await ctx.db
        .insert(conversation)
        .values({
          listingId: input.listingId,
          buyerId,
          sellerId,
        })
        .returning();

      // Fetch with relations
      const conversationWithRelations = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, newConversation!.id),
        with: {
          listing: {
            columns: {
              title: true,
              photos: true,
            },
          },
          buyer: {
            columns: {
              id: true,
              email: true,
            },
          },
          seller: {
            columns: {
              id: true,
              email: true,
            },
          },
        },
      });

      return conversationWithRelations;
    }),

  /**
   * Get all conversations for the current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const conversations = await ctx.db.query.conversation.findMany({
      where: (conversations, { or, eq }) =>
        or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)),
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
            email: true,
          },
        },
        seller: {
          columns: {
            id: true,
            email: true,
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

        let unreadCount = 0;
        if (lastReadAt) {
          const unreadMessages = await ctx.db.query.message.findMany({
            where: (messages, { and, eq, gt }) =>
              and(
                eq(messages.conversationId, conv.id),
                gt(messages.createdAt, lastReadAt),
                eq(messages.senderId, isBuyer ? conv.sellerId : conv.buyerId),
              ),
          });
          unreadCount = unreadMessages.length;
        } else {
          // Never read, count all messages from other party
          const allMessages = await ctx.db.query.message.findMany({
            where: (messages, { and, eq }) =>
              and(
                eq(messages.conversationId, conv.id),
                eq(messages.senderId, isBuyer ? conv.sellerId : conv.buyerId),
              ),
          });
          unreadCount = allMessages.length;
        }

        return {
          ...conv,
          unreadCount,
          otherUser: isBuyer ? conv.seller : conv.buyer,
        };
      }),
    );

    return conversationsWithUnread;
  }),

  /**
   * Get messages in a conversation
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
   * Get Ably token request for real-time subscription to this conversation.
   * Only allowed for participants. Requires ABLY_API_KEY to be set.
   */
  getAblyToken: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conv = await ctx.db.query.conversation.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, input.conversationId),
      });

      if (!conv) {
        throw new Error("Conversation not found");
      }

      if (conv.buyerId !== ctx.session.user.id && conv.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      return createConversationTokenRequest(input.conversationId, ctx.session.user.id);
    }),

  /**
   * Send a message
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
        },
      });

      if (!conv) {
        throw new Error("Conversation not found");
      }

      if (conv.buyerId !== ctx.session.user.id && conv.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      // Create message
      const [newMessage] = await ctx.db
        .insert(message)
        .values({
          conversationId: input.conversationId,
          senderId: ctx.session.user.id,
          content: input.content,
          attachments: input.attachments ?? [],
          isEncrypted: false, // TODO: Add encryption
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

      await publishNewMessage(input.conversationId, {
        messageId: newMessage.id,
        conversationId: input.conversationId,
        senderId: ctx.session.user.id,
        content: newMessage.content,
        createdAt: newMessage.createdAt.toISOString(),
        attachments: newMessage.attachments ?? undefined,
      });

      return newMessage;
    }),

  /**
   * Mark conversation as read (updates last read timestamp)
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      const isBuyer = conv.buyerId === ctx.session.user.id;
      const now = new Date();

      await ctx.db
        .update(conversation)
        .set(
          isBuyer
            ? { buyerLastReadAt: now }
            : { sellerLastReadAt: now },
        )
        .where(eq(conversation.id, input.conversationId));

      return { success: true };
    }),

  /**
   * Poll for new messages (simple real-time solution)
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

      // Get messages after lastMessageId
      let newMessages: Awaited<ReturnType<typeof ctx.db.query.message.findMany>>;
      if (input.lastMessageId) {
        const lastMessageId = input.lastMessageId; // Capture for type narrowing
        const lastMessage = await ctx.db.query.message.findFirst({
          where: (messages, { eq }) => eq(messages.id, lastMessageId),
        });

        if (lastMessage) {
          newMessages = await ctx.db.query.message.findMany({
            where: (messages, { and, eq, gt }) =>
              and(
                eq(messages.conversationId, input.conversationId),
                gt(messages.createdAt, lastMessage.createdAt),
              ),
            with: {
              sender: {
                columns: {
                  id: true,
                  email: true,
                },
              },
            },
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          });
        } else {
          newMessages = [];
        }
      } else {
        // No last message, get latest messages
        newMessages = await ctx.db.query.message.findMany({
          where: (messages, { eq }) => eq(messages.conversationId, input.conversationId),
          with: {
            sender: {
              columns: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: (messages, { desc }) => [desc(messages.createdAt)],
          limit: 10,
        });
        newMessages = newMessages.reverse();
      }

      return newMessages;
    }),

  /**
   * Delete a conversation (soft delete - hides for user)
   */
  deleteConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      // For now, actually delete. In production, implement soft delete.
      await ctx.db
        .delete(conversation)
        .where(eq(conversation.id, input.conversationId));

      return { success: true };
    }),
});
