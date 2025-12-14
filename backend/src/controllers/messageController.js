/**
 * Message Controller
 *
 * Handles HTTP requests for message operations.
 * Fat models, thin controllers - most logic is in models/utils.
 */

import Message from "../models/messageModel.js";
import RoomMember from "../models/roomMemberModel.js";

import { catchAsync } from "../utils/catchAsync.js";
import { sendSuccess } from "./factory.js";

/**
 * Get message history for a room
 *
 * GET /api/messages/:roomId?limit=50
 */
export const getMessages = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { limit, before } = req.query;

  // Convert limit to number if provided
  const options = {
    limit: limit ? parseInt(limit, 10) : 30,
    before: before || null,
  };

  // Validate limit
  if (isNaN(options.limit) || options.limit < 1) {
    return sendFail(res, 400, "Invalid limit parameter");
  }

  // Validate before timestamp if provided
  if (before && isNaN(Date.parse(before))) {
    return sendFail(res, 400, "Invalid before timestamp");
  }

  const result = await Message.getPaginatedMessages(roomId, options);

  sendSuccess(res, 200, {
    message: "Messages retrieved successfully",
    data: result,
  });
});

/**
 * Get all rooms for the current user
 *
 * GET /api/messages/rooms
 *
 * Returns conversation list with room info and last message.
 */
export const getUserRooms = catchAsync(async (req, res) => {
  const { userId } = req.query; // Later from JWT: req.user.id

  if (!userId) {
    return sendFail(res, 400, "User ID is required");
  }

  const conversations = await RoomMember.getUserConversations(userId);

  sendSuccess(res, 200, {
    message: "Conversations retrieved successfully",
    data: { conversations },
  });
});

export const markAsRead = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body; // Later: req.user.id from JWT

  const member = await RoomMember.markAsRead(roomId, userId);

  sendSuccess(res, 200, {
    message: "Messages marked as read",
    data: { unreadCount: member.unreadCount, lastReadAt: member.lastReadAt },
  });
});
