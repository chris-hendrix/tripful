import type { FastifyRequest, FastifyReply } from "fastify";
import type { NotificationPreferencesInput } from "@tripful/shared/schemas";

/**
 * Notification Controller
 * Handles notification-related HTTP requests
 */
export const notificationController = {
  /**
   * List notifications endpoint
   * Returns paginated notifications for the authenticated user
   *
   * @route GET /api/notifications
   * @middleware authenticate
   */
  async listNotifications(
    request: FastifyRequest<{
      Querystring: {
        page: number;
        limit: number;
        unreadOnly: boolean;
        tripId?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { notificationService } = request.server;
      const userId = request.user.sub;
      const { page, limit, unreadOnly, tripId } = request.query;

      const { data, meta, unreadCount } =
        await notificationService.getNotifications(userId, {
          page,
          limit,
          unreadOnly,
          ...(tripId != null ? { tripId } : {}),
        });

      return reply.status(200).send({
        success: true,
        notifications: data,
        meta,
        unreadCount,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub },
        "Failed to list notifications",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list notifications",
        },
      });
    }
  },

  /**
   * Get unread count endpoint
   * Returns the count of unread notifications for the authenticated user
   *
   * @route GET /api/notifications/unread-count
   * @middleware authenticate
   */
  async getUnreadCount(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const { notificationService } = request.server;
      const userId = request.user.sub;

      const count = await notificationService.getUnreadCount(userId);

      return reply.status(200).send({
        success: true,
        count,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub },
        "Failed to get unread count",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get unread count",
        },
      });
    }
  },

  /**
   * Mark notification as read endpoint
   * Marks a single notification as read
   *
   * @route PATCH /api/notifications/:notificationId/read
   * @middleware authenticate
   */
  async markAsRead(
    request: FastifyRequest<{
      Params: { notificationId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { notificationService } = request.server;
      const { notificationId } = request.params;
      const userId = request.user.sub;

      await notificationService.markAsRead(notificationId, userId);

      return reply.status(200).send({
        success: true,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub, notificationId: request.params.notificationId },
        "Failed to mark notification as read",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notification as read",
        },
      });
    }
  },

  /**
   * Mark all notifications as read endpoint
   * Marks all notifications as read, optionally scoped to a trip
   *
   * @route PATCH /api/notifications/read-all
   * @middleware authenticate
   */
  async markAllAsRead(
    request: FastifyRequest<{
      Body?: { tripId?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { notificationService } = request.server;
      const userId = request.user.sub;
      const tripId = request.body?.tripId;

      await notificationService.markAllAsRead(userId, tripId);

      return reply.status(200).send({
        success: true,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub },
        "Failed to mark all notifications as read",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark all notifications as read",
        },
      });
    }
  },

  /**
   * List trip notifications endpoint
   * Returns paginated notifications for a specific trip
   *
   * @route GET /api/trips/:tripId/notifications
   * @middleware authenticate
   */
  async listTripNotifications(
    request: FastifyRequest<{
      Params: { tripId: string };
      Querystring: { page: number; limit: number; unreadOnly: boolean };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { notificationService } = request.server;
      const userId = request.user.sub;
      const { tripId } = request.params;
      const { page, limit, unreadOnly } = request.query;

      const { data, meta, unreadCount } =
        await notificationService.getNotifications(userId, {
          page,
          limit,
          unreadOnly,
          tripId,
        });

      return reply.status(200).send({
        success: true,
        notifications: data,
        meta,
        unreadCount,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub, tripId: request.params.tripId },
        "Failed to list trip notifications",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list trip notifications",
        },
      });
    }
  },

  /**
   * Get trip unread count endpoint
   * Returns the count of unread notifications for a specific trip
   *
   * @route GET /api/trips/:tripId/notifications/unread-count
   * @middleware authenticate
   */
  async getTripUnreadCount(
    request: FastifyRequest<{
      Params: { tripId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { notificationService } = request.server;
      const userId = request.user.sub;
      const { tripId } = request.params;

      const count = await notificationService.getTripUnreadCount(userId, tripId);

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
        "Failed to get trip unread count",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get trip unread count",
        },
      });
    }
  },

  /**
   * Get notification preferences endpoint
   * Returns notification preferences for a user and trip
   *
   * @route GET /api/trips/:tripId/notification-preferences
   * @middleware authenticate
   */
  async getPreferences(
    request: FastifyRequest<{
      Params: { tripId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { notificationService } = request.server;
      const userId = request.user.sub;
      const { tripId } = request.params;

      const preferences = await notificationService.getPreferences(
        userId,
        tripId,
      );

      return reply.status(200).send({
        success: true,
        preferences,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub, tripId: request.params.tripId },
        "Failed to get notification preferences",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get notification preferences",
        },
      });
    }
  },

  /**
   * Update notification preferences endpoint
   * Creates or updates notification preferences for a user and trip
   *
   * @route PUT /api/trips/:tripId/notification-preferences
   * @middleware authenticate, requireCompleteProfile
   */
  async updatePreferences(
    request: FastifyRequest<{
      Params: { tripId: string };
      Body: NotificationPreferencesInput;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { notificationService } = request.server;
      const userId = request.user.sub;
      const { tripId } = request.params;
      const body = request.body;

      const preferences = await notificationService.updatePreferences(
        userId,
        tripId,
        body,
      );

      return reply.status(200).send({
        success: true,
        preferences,
      });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error;
      }

      request.log.error(
        { err: error, userId: request.user.sub, tripId: request.params.tripId },
        "Failed to update notification preferences",
      );

      return reply.status(500).send({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update notification preferences",
        },
      });
    }
  },
};
