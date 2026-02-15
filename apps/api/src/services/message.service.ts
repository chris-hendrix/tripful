import { messages, messageReactions, users, trips } from "@/db/schema/index.js";
import { eq, and, isNull, count, desc, sql } from "drizzle-orm";
import type { CreateMessageInput } from "@tripful/shared/schemas";
import type { AppDatabase } from "@/types/index.js";
import type { IPermissionsService } from "./permissions.service.js";
import {
  MessageNotFoundError,
  MemberMutedError,
  MessageLimitExceededError,
  InvalidReplyTargetError,
  PermissionDeniedError,
  TripNotFoundError,
  TripLockedError,
} from "../errors.js";

/**
 * Internal result types for message service responses.
 * These use Date objects (not strings) as returned by Drizzle.
 */
interface MessageAuthorResult {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
}

interface ReactionSummaryResult {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface MessageResult {
  id: string;
  tripId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  isPinned: boolean;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: MessageAuthorResult;
  reactions: ReactionSummaryResult[];
}

interface MessageWithRepliesResult extends MessageResult {
  replies: MessageResult[];
  replyCount: number;
}

/**
 * Message Service Interface
 * Defines the contract for message management operations
 */
export interface IMessageService {
  getMessages(
    tripId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: MessageWithRepliesResult[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
  getMessageCount(tripId: string): Promise<number>;
  getLatestMessage(
    tripId: string,
    userId: string,
  ): Promise<MessageResult | null>;
  createMessage(
    tripId: string,
    authorId: string,
    data: CreateMessageInput,
  ): Promise<MessageResult>;
  editMessage(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<MessageResult>;
  deleteMessage(
    messageId: string,
    userId: string,
    tripId: string,
  ): Promise<void>;
  togglePin(
    messageId: string,
    userId: string,
    tripId: string,
    pinned: boolean,
  ): Promise<MessageResult>;
  toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionSummaryResult[]>;
}

/**
 * Message Service Implementation
 * Handles message creation, editing, deletion, pinning, and reactions
 */
export class MessageService implements IMessageService {
  constructor(
    private db: AppDatabase,
    private permissionsService: IPermissionsService,
  ) {}

  /**
   * Gets paginated top-level messages for a trip with replies and reactions
   */
  async getMessages(
    tripId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: MessageWithRepliesResult[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const canView = await this.permissionsService.canViewMessages(
      userId,
      tripId,
    );
    if (!canView) {
      throw new PermissionDeniedError(
        "Permission denied: only going members can view messages",
      );
    }

    // Count total top-level non-deleted messages
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(messages)
      .where(
        and(
          eq(messages.tripId, tripId),
          isNull(messages.parentId),
          isNull(messages.deletedAt),
        ),
      );
    const total = totalResult?.value ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    // Query top-level messages with author info
    const topLevelRows = await this.db
      .select({
        message: messages,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorProfilePhotoUrl: users.profilePhotoUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.authorId, users.id))
      .where(and(eq(messages.tripId, tripId), isNull(messages.parentId)))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    // Build results with reactions and replies
    const data: MessageWithRepliesResult[] = [];

    for (const row of topLevelRows) {
      const reactions = await this.getReactionSummaries(row.message.id, userId);

      // Get reply count (non-deleted)
      const [replyCountResult] = await this.db
        .select({ value: count() })
        .from(messages)
        .where(
          and(
            eq(messages.parentId, row.message.id),
            isNull(messages.deletedAt),
          ),
        );
      const replyCount = replyCountResult?.value ?? 0;

      // Get 2 most recent replies with author info
      const replyRows = await this.db
        .select({
          message: messages,
          authorId: users.id,
          authorDisplayName: users.displayName,
          authorProfilePhotoUrl: users.profilePhotoUrl,
        })
        .from(messages)
        .leftJoin(users, eq(messages.authorId, users.id))
        .where(
          and(
            eq(messages.parentId, row.message.id),
            isNull(messages.deletedAt),
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(2);

      const replies: MessageResult[] = [];
      for (const replyRow of replyRows) {
        const replyReactions = await this.getReactionSummaries(
          replyRow.message.id,
          userId,
        );
        replies.push(
          this.buildMessageResult(replyRow.message, replyRow, replyReactions),
        );
      }

      data.push({
        ...this.buildMessageResult(row.message, row, reactions),
        replies,
        replyCount,
      });
    }

    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }

  /**
   * Gets the count of non-deleted top-level messages for a trip
   */
  async getMessageCount(tripId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(messages)
      .where(
        and(
          eq(messages.tripId, tripId),
          isNull(messages.parentId),
          isNull(messages.deletedAt),
        ),
      );
    return result?.value ?? 0;
  }

  /**
   * Gets the most recent non-deleted top-level message with author and reactions
   */
  async getLatestMessage(
    tripId: string,
    userId: string,
  ): Promise<MessageResult | null> {
    const rows = await this.db
      .select({
        message: messages,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorProfilePhotoUrl: users.profilePhotoUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.authorId, users.id))
      .where(
        and(
          eq(messages.tripId, tripId),
          isNull(messages.parentId),
          isNull(messages.deletedAt),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0]!;
    const reactions = await this.getReactionSummaries(row.message.id, userId);
    return this.buildMessageResult(row.message, row, reactions);
  }

  /**
   * Creates a new message (top-level or reply)
   */
  async createMessage(
    tripId: string,
    authorId: string,
    data: CreateMessageInput,
  ): Promise<MessageResult> {
    // Verify trip exists
    const tripExists = await this.db
      .select({ id: trips.id })
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);
    if (tripExists.length === 0) {
      throw new TripNotFoundError();
    }

    // Check canViewFullTrip (going member)
    const canView = await this.permissionsService.canViewMessages(
      authorId,
      tripId,
    );
    if (!canView) {
      throw new PermissionDeniedError(
        "Permission denied: only going members can post messages",
      );
    }

    // Check trip not locked
    const isLocked = await this.permissionsService.isTripLocked(tripId);
    if (isLocked) {
      throw new TripLockedError();
    }

    // Check not muted
    const isMuted = await this.permissionsService.isMemberMuted(
      tripId,
      authorId,
    );
    if (isMuted) {
      throw new MemberMutedError();
    }

    // Handle reply validation
    if (data.parentId) {
      const [parentMessage] = await this.db
        .select({
          id: messages.id,
          tripId: messages.tripId,
          parentId: messages.parentId,
          deletedAt: messages.deletedAt,
        })
        .from(messages)
        .where(eq(messages.id, data.parentId))
        .limit(1);

      if (!parentMessage || parentMessage.deletedAt !== null) {
        throw new InvalidReplyTargetError();
      }

      if (parentMessage.tripId !== tripId) {
        throw new InvalidReplyTargetError();
      }

      // Only allow replies to top-level messages (no nested replies)
      if (parentMessage.parentId !== null) {
        throw new InvalidReplyTargetError();
      }
    } else {
      // Top-level message: check count limit
      const [messageCount] = await this.db
        .select({ value: count() })
        .from(messages)
        .where(
          and(
            eq(messages.tripId, tripId),
            isNull(messages.parentId),
            isNull(messages.deletedAt),
          ),
        );
      if ((messageCount?.value ?? 0) >= 100) {
        throw new MessageLimitExceededError();
      }
    }

    // Insert the message
    const [newMessage] = await this.db
      .insert(messages)
      .values({
        tripId,
        authorId,
        parentId: data.parentId ?? null,
        content: data.content,
      })
      .returning();

    if (!newMessage) {
      throw new Error("Failed to create message");
    }

    // Get author info
    const [author] = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        profilePhotoUrl: users.profilePhotoUrl,
      })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);

    return {
      id: newMessage.id,
      tripId: newMessage.tripId,
      authorId: newMessage.authorId,
      parentId: newMessage.parentId,
      content: newMessage.content,
      isPinned: newMessage.isPinned,
      editedAt: newMessage.editedAt,
      deletedAt: newMessage.deletedAt,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
      author: {
        id: author?.id ?? authorId,
        displayName: author?.displayName ?? "",
        profilePhotoUrl: author?.profilePhotoUrl ?? null,
      },
      reactions: [],
    };
  }

  /**
   * Edits the content of a message
   * Only the author can edit, and the trip must not be locked
   */
  async editMessage(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<MessageResult> {
    // Find non-deleted message
    const messageRow = await this.getMessageWithAuthor(messageId);
    if (!messageRow || messageRow.message.deletedAt !== null) {
      throw new MessageNotFoundError();
    }

    // Check trip not locked
    const isLocked = await this.permissionsService.isTripLocked(
      messageRow.message.tripId,
    );
    if (isLocked) {
      throw new TripLockedError();
    }

    // Check author matches
    if (messageRow.message.authorId !== userId) {
      throw new PermissionDeniedError(
        "Permission denied: only the message author can edit",
      );
    }

    // Check not muted
    const isMuted = await this.permissionsService.isMemberMuted(
      messageRow.message.tripId,
      userId,
    );
    if (isMuted) {
      throw new MemberMutedError();
    }

    // Update content and set editedAt
    const now = new Date();
    const [updatedMessage] = await this.db
      .update(messages)
      .set({
        content,
        editedAt: now,
        updatedAt: now,
      })
      .where(eq(messages.id, messageId))
      .returning();

    if (!updatedMessage) {
      throw new MessageNotFoundError();
    }

    const reactions = await this.getReactionSummaries(messageId, userId);

    return this.buildMessageResult(updatedMessage, messageRow, reactions);
  }

  /**
   * Soft-deletes a message
   * Author or organizer can delete
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    _tripId: string,
  ): Promise<void> {
    // Find non-deleted message
    const [messageRow] = await this.db
      .select({
        id: messages.id,
        tripId: messages.tripId,
        authorId: messages.authorId,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
      .limit(1);

    if (!messageRow) {
      throw new MessageNotFoundError();
    }

    // Check trip not locked
    const isLocked = await this.permissionsService.isTripLocked(
      messageRow.tripId,
    );
    if (isLocked) {
      throw new TripLockedError();
    }

    // Check author OR organizer
    const isAuthor = messageRow.authorId === userId;
    const isOrganizer = await this.permissionsService.isOrganizer(
      userId,
      messageRow.tripId,
    );
    if (!isAuthor && !isOrganizer) {
      throw new PermissionDeniedError(
        "Permission denied: only the message author or trip organizers can delete messages",
      );
    }

    // Soft delete
    const now = new Date();
    await this.db
      .update(messages)
      .set({
        deletedAt: now,
        deletedBy: userId,
        updatedAt: now,
      })
      .where(eq(messages.id, messageId));
  }

  /**
   * Toggles pin status for a top-level message
   * Only organizers can pin/unpin
   */
  async togglePin(
    messageId: string,
    userId: string,
    _tripId: string,
    pinned: boolean,
  ): Promise<MessageResult> {
    // Find non-deleted message
    const messageRow = await this.getMessageWithAuthor(messageId);
    if (!messageRow || messageRow.message.deletedAt !== null) {
      throw new MessageNotFoundError();
    }

    // Must be top-level
    if (messageRow.message.parentId !== null) {
      throw new InvalidReplyTargetError();
    }

    // Check trip not locked
    const isLocked = await this.permissionsService.isTripLocked(
      messageRow.message.tripId,
    );
    if (isLocked) {
      throw new TripLockedError();
    }

    // Check isOrganizer
    const isOrganizer = await this.permissionsService.isOrganizer(
      userId,
      messageRow.message.tripId,
    );
    if (!isOrganizer) {
      throw new PermissionDeniedError(
        "Permission denied: only organizers can pin messages",
      );
    }

    // Update pin status
    const [updatedMessage] = await this.db
      .update(messages)
      .set({
        isPinned: pinned,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    if (!updatedMessage) {
      throw new MessageNotFoundError();
    }

    const reactions = await this.getReactionSummaries(messageId, userId);

    return this.buildMessageResult(updatedMessage, messageRow, reactions);
  }

  /**
   * Toggles a reaction on a message
   * If the user already has the reaction, remove it; otherwise add it
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionSummaryResult[]> {
    // Find non-deleted message
    const [messageRow] = await this.db
      .select({
        id: messages.id,
        tripId: messages.tripId,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
      .limit(1);

    if (!messageRow) {
      throw new MessageNotFoundError();
    }

    // Check trip not locked
    const isLocked = await this.permissionsService.isTripLocked(
      messageRow.tripId,
    );
    if (isLocked) {
      throw new TripLockedError();
    }

    // Check canViewMessages (going member)
    const canView = await this.permissionsService.canViewMessages(
      userId,
      messageRow.tripId,
    );
    if (!canView) {
      throw new PermissionDeniedError(
        "Permission denied: only going members can react to messages",
      );
    }

    // Check if reaction already exists
    const [existingReaction] = await this.db
      .select({ id: messageReactions.id })
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji),
        ),
      )
      .limit(1);

    if (existingReaction) {
      // Remove the reaction
      await this.db
        .delete(messageReactions)
        .where(eq(messageReactions.id, existingReaction.id));
    } else {
      // Add the reaction
      await this.db.insert(messageReactions).values({
        messageId,
        userId,
        emoji,
      });
    }

    // Return updated reaction summaries
    return this.getReactionSummaries(messageId, userId);
  }

  /**
   * Gets a single message with author info
   */
  private async getMessageWithAuthor(messageId: string) {
    const rows = await this.db
      .select({
        message: messages,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorProfilePhotoUrl: users.profilePhotoUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.authorId, users.id))
      .where(eq(messages.id, messageId))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Gets reaction summaries for a message, grouped by emoji with count
   * and whether the current user has reacted
   */
  private async getReactionSummaries(
    messageId: string,
    userId: string,
  ): Promise<ReactionSummaryResult[]> {
    const reactionRows = await this.db
      .select({
        emoji: messageReactions.emoji,
        count: count(),
        reacted: sql<boolean>`bool_or(${messageReactions.userId} = ${userId})`,
      })
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId))
      .groupBy(messageReactions.emoji);

    return reactionRows.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      reacted: r.reacted ?? false,
    }));
  }

  /**
   * Builds a MessageResult from a message row and author info
   */
  private buildMessageResult(
    messageRow: typeof messages.$inferSelect,
    authorRow: {
      authorId: string | null;
      authorDisplayName: string | null;
      authorProfilePhotoUrl: string | null;
    },
    reactions: ReactionSummaryResult[],
  ): MessageResult {
    // Soft-deleted messages return as placeholders with empty content and no reactions
    if (messageRow.deletedAt) {
      return {
        id: messageRow.id,
        tripId: messageRow.tripId,
        authorId: messageRow.authorId,
        parentId: messageRow.parentId,
        content: "",
        isPinned: messageRow.isPinned,
        editedAt: messageRow.editedAt,
        deletedAt: messageRow.deletedAt,
        createdAt: messageRow.createdAt,
        updatedAt: messageRow.updatedAt,
        author: {
          id: authorRow.authorId ?? messageRow.authorId,
          displayName: authorRow.authorDisplayName ?? "Unknown",
          profilePhotoUrl: authorRow.authorProfilePhotoUrl ?? null,
        },
        reactions: [],
      };
    }

    return {
      id: messageRow.id,
      tripId: messageRow.tripId,
      authorId: messageRow.authorId,
      parentId: messageRow.parentId,
      content: messageRow.content,
      isPinned: messageRow.isPinned,
      editedAt: messageRow.editedAt,
      deletedAt: messageRow.deletedAt,
      createdAt: messageRow.createdAt,
      updatedAt: messageRow.updatedAt,
      author: {
        id: authorRow.authorId ?? messageRow.authorId,
        displayName: authorRow.authorDisplayName ?? "",
        profilePhotoUrl: authorRow.authorProfilePhotoUrl ?? null,
      },
      reactions,
    };
  }
}
