/**
 * Message Controller
 *
 * Handles HTTP requests for message operations.
 * Fat models, thin controllers - most logic is in models/utils.
 */

import Message from "../models/messageModel.js";

import { catchAsync } from "../utils/catchAsync.js";
import { sendSuccess } from "./factory.js";

/**
 * Get message history for a room
 *
 * GET /api/messages/:roomId?limit=50
 */
export const getMessages = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  // TODO Phase 3: Add auth middleware and uncomment authorization check
  // const { userId } = req.user;
  // const isMember = await isUserInRoom(roomId, userId);
  // if (!isMember) {
  //   return res.status(403).json({
  //     status: 'fail',
  //     message: 'You are not a member of this room',
  //   });
  // }

  const messages = await Message.find({ roomId })
    .populate("senderId", "username photo")
    .sort({ createdAt: -1 })
    .limit(limit);

  return sendSuccess(res, 200, {
    results: messages.length,
    data: {
      messages: messages.reverse(),
    },
  });
});

/**
 * Get all rooms for the current user
 *
 * GET /api/messages/rooms
 *
 * Returns conversation list with room info and last message.
 */
export const getUserRooms = catchAsync(async (req, res, next) => {
  const { userId } = req.user; // From auth middleware (Phase 3)

  // TODO: Implement this using RoomMember model
  // For now, return placeholder
  return sendSuccess(res, 200, {
    data: {
      rooms: [],
    },
  });
});
