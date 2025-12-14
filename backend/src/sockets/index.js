/**
 * Socket.io Event Registration
 *
 * Registers all socket event handlers when a client connects.
 */

import RoomMember from "../models/roomMemberModel.js";
import Room from "../models/roomModel.js";
import User from "../models/userModel.js";

import {
  handleDisconnect,
  handleJoinRoom,
  handleMarkRoomRead,
  handleMessageDelivered,
  handleMessageRead,
  handleSendMessage,
  handleTyping,
} from "./chatHandlers.js";

export const initializeSocketHandlers = (io) => {
  io.on("connection", async (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    const { userId } = socket.handshake.query;

    if (!userId) {
      console.warn("⚠️ Socket connected without userId");
      socket.emit("error", { message: "userId is required" });
      socket.disconnect();
      return;
    }

    socket.userId = userId;

    try {
      // 1) Mark user as online
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      console.log(`✅ User ${userId} is now online`);

      // 2) Join personal room
      socket.join(userId);

      // 3) Auto-join all active rooms for this user
      const memberships = await RoomMember.find({
        userId,
        leftAt: null,
      }).select("roomId"); // roomId is ObjectId of Room

      if (memberships.length > 0) {
        const roomObjectIds = memberships.map((m) => m.roomId);

        const rooms = await Room.find({ _id: { $in: roomObjectIds } }).select(
          "roomId"
        );

        const roomNames = rooms.map((r) => r.roomId); // e.g. "room:alice_bob"

        if (roomNames.length > 0) {
          socket.join(roomNames);
          console.log(`🛋️  User ${userId} auto-joined rooms:`, roomNames);
        }
      }

      // 4) Broadcast to others that this user came online
      socket.broadcast.emit("user_online", { userId });

      // 5) Send current online users list to this connecting user
      const onlineUsers = await User.find({ isOnline: true }).select(
        "_id username isOnline lastSeen"
      );

      socket.emit("online_users_list", { users: onlineUsers });
    } catch (error) {
      console.error("Error setting user online:", error);
      socket.emit("error", { message: "Failed to initialize connection" });
    }

    // Register chat event handlers using your current style
    socket.on("join_room", (data) => handleJoinRoom(socket, data));
    socket.on("send_message", (data) => handleSendMessage(io, socket, data));
    socket.on("typing", (data) => handleTyping(socket, data));
    socket.on("message_delivered", (data) =>
      handleMessageDelivered(io, socket, data)
    );
    socket.on("message_read", (data) => handleMessageRead(io, socket, data));
    socket.on("mark_room_read", (data) => handleMarkRoomRead(io, socket, data));
    socket.on("disconnect", () => handleDisconnect(io, socket));
  });
};
