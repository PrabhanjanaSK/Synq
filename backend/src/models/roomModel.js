/**
 * Room Model
 *
 * Represents a conversation (DM or group chat).
 * Uses child referencing via RoomMember collection for participants.
 * This approach scales indefinitely and allows member-specific metadata.
 */

import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  type: {
    type: String,
    enum: ["dm", "group"],
    default: "dm",
  },

  name: {
    type: String,
  },

  // Cache for conversation list UI performance
  lastMessage: {
    type: String,
    default: "",
  },

  lastMessageAt: {
    type: Date,
    default: Date.now,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: function () {
      return this.type === "group"; // Required for groups only
    },
  },
});

// Index for sorting rooms by recent activity
roomSchema.index({ lastMessageAt: -1 });

const Room = mongoose.model("Room", roomSchema);

export default Room;
