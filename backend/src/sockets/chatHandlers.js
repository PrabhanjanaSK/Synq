/**
 * Chat Event Handlers for Socket.io
 *
 * Handles real-time chat events:
 * - join_room: User joins a conversation
 * - send_message: User sends a message
 * - typing: User is typing indicator
 * - disconnect: User disconnects
 *
 * Each handler is a pure function called from index.js
 */

import Message from "../models/messageModel.js";
import RoomMember from "../models/roomMemberModel.js";
import Room from "../models/roomModel.js";
import User from "../models/userModel.js";
import { isUserInRoom } from "../utils/room.js";

/**
 * Handle user joining a room
 *
 * Client emits: socket.emit('join_room', { roomId, userId })
 *
 * @param {Socket} socket - Socket.io socket instance
 * @param {Object} data - Event data { roomId, userId }
 */
export const handleJoinRoom = async (socket, data) => {
  try {
    const { roomId, userId } = data;
    console.log(`User ${userId} attempting to join room: ${roomId}`);

    // Find the room by roomId string
    const room = await Room.findOne({ roomId });
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Verify user is a member of this room
    const isMember = await isUserInRoom(room._id, userId);
    if (!isMember) {
      socket.emit("error", { message: "You are not a member of this room" });
      return;
    }

    // Join the Socket.io room
    socket.join(roomId);

    // Store user info in socket for later use
    socket.currentRoom = roomId;

    console.log(`✅ User ${userId} joined room: ${roomId}`);

    // Notify user they've joined successfully
    socket.emit("joined_room", {
      roomId,
      message: `Successfully joined ${roomId}`,
    });

    // Optional: Notify other room members that someone joined
    socket.to(roomId).emit("user_joined", {
      userId,
      roomId,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error in join_room:", error);
    socket.emit("error", {
      message: "Failed to join room",
      error: error.message,
    });
  }
};

/**
 * Handle sending a message
 *
 * Client emits: socket.emit('send_message', { roomId, userId, text })
 *
 * Flow:
 * 1. Validate input
 * 2. Check room exists and user is a member
 * 3. Save message to MongoDB
 * 4. Update room's lastMessage cache
 * 5. Increment unreadCount for all OTHER members
 * 6. Broadcast to all users in the room
 *
 * @param {Object} io - Socket.io server instance
 * @param {Socket} socket - Socket.io socket instance
 * @param {Object} data - Event data { roomId, userId, text }
 */
export const handleSendMessage = async (io, socket, data) => {
  try {
    const { roomId, userId, text } = data;
    console.log(`Message from ${userId} in ${roomId}: "${text}"`);

    // Validate input
    if (!roomId || !userId || !text || text.trim() === "") {
      socket.emit("error", { message: "Invalid message data" });
      return;
    }

    // Find the room
    const room = await Room.findOne({ roomId });
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Verify user is a member
    const isMember = await isUserInRoom(room._id, userId);
    if (!isMember) {
      socket.emit("error", { message: "You are not a member of this room" });
      return;
    }

    // Save message to database
    const message = await Message.create({
      senderId: userId,
      roomId: roomId,
      text: text.trim(),
      status: "Sent",
    });

    // Populate sender info for the response
    await message.populate("senderId", "username photo");

    // Update room's last message cache
    await Room.findByIdAndUpdate(room._id, {
      lastMessage: text.trim().substring(0, 100),
      lastMessageAt: new Date(),
    });

    await RoomMember.incrementUnreadForOthers(room._id, userId);

    console.log(`Message saved with ID: ${message._id}`);
    console.log(`✅ Updated unread counts for other members in ${roomId}`);

    // Broadcast message to ALL users in the room (including sender)
    io.to(roomId).emit("receive_message", {
      _id: message._id,
      senderId: message.senderId,
      roomId: message.roomId,
      text: message.text,
      status: message.status,
      createdAt: message.createdAt,
    });

    console.log(`📤 Message broadcast to room: ${roomId}`);
  } catch (error) {
    console.error("Error in send_message:", error);
    socket.emit("error", {
      message: "Failed to send message",
      error: error.message,
    });
  }
};

/**
 * Handle typing indicator
 *
 * Client emits: socket.emit('typing', { roomId, userId, isTyping: true })
 *
 * @param {Socket} socket - Socket.io socket instance
 * @param {Object} data - Event data { roomId, userId, isTyping }
 */
export const handleTyping = async (socket, data) => {
  try {
    const { roomId, userId, isTyping } = data;

    if (!roomId || !userId) return;

    // Broadcast typing status to other users in the room (not sender)
    socket.to(roomId).emit("user_typing", {
      userId,
      roomId,
      isTyping,
    });
  } catch (error) {
    console.error("Error in typing:", error);
  }
};

// Handle message delivered event
export const handleMessageDelivered = async (io, socket, data) => {
  try {
    const { messageId, roomId } = data;

    if (!messageId) {
      socket.emit("error", { message: "Message ID is required" });
      return;
    }

    // Update message status to Delivered
    const message = await Message.markAsDelivered(messageId);

    console.log(`✅ Message ${messageId} marked as Delivered`);

    // Broadcast status update to everyone in the room
    io.to(roomId).emit("message_status_update", {
      messageId: message._id,
      status: "Delivered",
      deliveredAt: message.deliveredAt,
    });
  } catch (error) {
    console.error("Error in message_delivered:", error);
    socket.emit("error", { message: error.message });
  }
};

// Handle message read event (single message)
export const handleMessageRead = async (io, socket, data) => {
  try {
    const { messageId, messageIds, roomId } = data;

    // Support both single message and multiple messages
    const ids = messageIds || [messageId];

    if (!ids || ids.length === 0) {
      socket.emit("error", { message: "Message ID(s) required" });
      return;
    }

    // Update message(s) status to Read
    await Message.markAsRead(ids);

    console.log(`✅ ${ids.length} message(s) marked as Read`);

    // Broadcast status update to everyone in the room
    io.to(roomId).emit("message_status_update", {
      messageIds: ids,
      status: "Read",
      readAt: new Date(),
    });
  } catch (error) {
    console.error("Error in message_read:", error);
    socket.emit("error", { message: error.message });
  }
};

// Handle marking entire room as read (when user opens chat)
export const handleMarkRoomRead = async (io, socket, data) => {
  try {
    const { roomId, userId } = data;

    if (!roomId || !userId) {
      socket.emit("error", { message: "Room ID and User ID required" });
      return;
    }

    // Mark all messages in room as read
    const result = await Message.markRoomAsRead(roomId, userId);

    // Also reset unread count (reuse existing method)
    await RoomMember.markAsRead(roomId, userId);

    console.log(
      `✅ ${result.modifiedCount} messages in ${roomId} marked as Read by ${userId}`
    );

    // Broadcast to room
    if (result.messageIds.length > 0) {
      io.to(roomId).emit("message_status_update", {
        messageIds: result.messageIds,
        status: "Read",
        readAt: new Date(),
      });
    }

    // Notify the user that their unread count is reset
    socket.emit("unread_reset", {
      roomId,
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Error in mark_room_read:", error);
    socket.emit("error", { message: error.message });
  }
};

/**
 * Handle user disconnect
 *
 * Automatically called when socket disconnects.
 * Update user's online status and notify others.
 *
 * @param {Object} io - Socket.io server instance
 * @param {Socket} socket - Socket.io socket instance
 */
export const handleDisconnect = async (io, socket) => {
  try {
    const userId = socket.userId;

    if (userId) {
      // Update user's online status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      console.log(`User ${userId} disconnected and marked offline`);

      // Broadcast to ALL that user went offline (not just current room)
      io.emit("user_offline", {
        userId,
        lastSeen: new Date(),
      });
    }
  } catch (error) {
    console.error("Error in disconnect:", error);
  }
};
