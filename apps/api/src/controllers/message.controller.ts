import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  CreateMessageInput,
  UpdateMessageInput,
  ToggleReactionInput,
  PinMessageInput,
} from "@tripful/shared/schemas";

/**
 * Message Controller
 * Handles message-related HTTP requests
 */
export const messageController = {
  /**
   * List messages endpoint
   * Returns paginated messages for a trip with threading
   *
   * @route GET /api/trips/:tripId/messages
   * @middleware authenticate
   */
  async listMessages(
    request: FastifyRequest<{
      Params: { tripId: string };
      Querystring: { page: number; limit: number };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { messageService } = request.server;
      const { tripId } = request.params;
      const userId = request.user.sub;
      const { page, limit } = request.query;

      const { data, meta } = await messageService.getMessages(
        tripId,
        userId,
        page,
        limit,
      );

      return reply.status(200).send({
        success: true,
        messages: data,
        meta,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub, tripId: request.params.tripId },
        "Failed to list messages",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list messages",
        },
      });
    }
  },

  /**
   * Get message count endpoint
   * Returns the count of top-level messages for a trip
   *
   * @route GET /api/trips/:tripId/messages/count
   * @middleware authenticate
   */
  async getMessageCount(
    request: FastifyRequest<{
      Params: { tripId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { messageService } = request.server;
      const { tripId } = request.params;

      const count = await messageService.getMessageCount(tripId);

      return reply.status(200).send({
        success: true,
        count,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub, tripId: request.params.tripId },
        "Failed to get message count",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get message count",
        },
      });
    }
  },

  /**
   * Get latest message endpoint
   * Returns the most recent top-level message for a trip
   *
   * @route GET /api/trips/:tripId/messages/latest
   * @middleware authenticate
   */
  async getLatestMessage(
    request: FastifyRequest<{
      Params: { tripId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { messageService } = request.server;
      const { tripId } = request.params;
      const userId = request.user.sub;

      const message = await messageService.getLatestMessage(tripId, userId);

      return reply.status(200).send({
        success: true,
        message,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub, tripId: request.params.tripId },
        "Failed to get latest message",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get latest message",
        },
      });
    }
  },

  /**
   * Create message endpoint
   * Creates a new message or reply for a trip
   *
   * @route POST /api/trips/:tripId/messages
   * @middleware authenticate, requireCompleteProfile
   */
  async createMessage(
    request: FastifyRequest<{
      Params: { tripId: string };
      Body: CreateMessageInput;
    }>,
    reply: FastifyReply,
  ) {
    const { tripId } = request.params;
    const data = request.body;

    try {
      const { messageService } = request.server;
      const userId = request.user.sub;

      const message = await messageService.createMessage(tripId, userId, data);

      return reply.status(201).send({
        success: true,
        message,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub, tripId: request.params.tripId },
        "Failed to create message",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create message",
        },
      });
    }
  },

  /**
   * Edit message endpoint
   * Updates the content of an existing message
   *
   * @route PUT /api/trips/:tripId/messages/:messageId
   * @middleware authenticate, requireCompleteProfile
   */
  async editMessage(
    request: FastifyRequest<{
      Params: { tripId: string; messageId: string };
      Body: UpdateMessageInput;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { messageService } = request.server;
      const { messageId } = request.params;
      const userId = request.user.sub;
      const { content } = request.body;

      const message = await messageService.editMessage(
        messageId,
        userId,
        content,
      );

      return reply.status(200).send({
        success: true,
        message,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        {
          err: error,
          userId: request.user.sub,
          tripId: request.params.tripId,
          messageId: request.params.messageId,
        },
        "Failed to edit message",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to edit message",
        },
      });
    }
  },

  /**
   * Delete message endpoint
   * Soft-deletes a message
   *
   * @route DELETE /api/trips/:tripId/messages/:messageId
   * @middleware authenticate, requireCompleteProfile
   */
  async deleteMessage(
    request: FastifyRequest<{
      Params: { tripId: string; messageId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { messageService } = request.server;
      const { messageId, tripId } = request.params;
      const userId = request.user.sub;

      await messageService.deleteMessage(messageId, userId, tripId);

      return reply.status(200).send({
        success: true,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        {
          err: error,
          userId: request.user.sub,
          tripId: request.params.tripId,
          messageId: request.params.messageId,
        },
        "Failed to delete message",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete message",
        },
      });
    }
  },

  /**
   * Toggle pin endpoint
   * Pins or unpins a message (organizers only)
   *
   * @route PATCH /api/trips/:tripId/messages/:messageId/pin
   * @middleware authenticate, requireCompleteProfile
   */
  async togglePin(
    request: FastifyRequest<{
      Params: { tripId: string; messageId: string };
      Body: PinMessageInput;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { messageService } = request.server;
      const { messageId, tripId } = request.params;
      const userId = request.user.sub;
      const { pinned } = request.body;

      const message = await messageService.togglePin(
        messageId,
        userId,
        tripId,
        pinned,
      );

      return reply.status(200).send({
        success: true,
        message,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        {
          err: error,
          userId: request.user.sub,
          tripId: request.params.tripId,
          messageId: request.params.messageId,
        },
        "Failed to toggle pin",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to toggle pin",
        },
      });
    }
  },

  /**
   * Toggle reaction endpoint
   * Adds or removes a reaction on a message
   *
   * @route POST /api/trips/:tripId/messages/:messageId/reactions
   * @middleware authenticate, requireCompleteProfile
   */
  async toggleReaction(
    request: FastifyRequest<{
      Params: { tripId: string; messageId: string };
      Body: ToggleReactionInput;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { messageService } = request.server;
      const { messageId } = request.params;
      const userId = request.user.sub;
      const { emoji } = request.body;

      const reactions = await messageService.toggleReaction(
        messageId,
        userId,
        emoji,
      );

      return reply.status(200).send({
        success: true,
        reactions,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        {
          err: error,
          userId: request.user.sub,
          tripId: request.params.tripId,
          messageId: request.params.messageId,
        },
        "Failed to toggle reaction",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to toggle reaction",
        },
      });
    }
  },
};
