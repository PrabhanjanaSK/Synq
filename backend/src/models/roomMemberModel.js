/**
 * RoomMember Model
 *
 * Junction/bridge collection for the many-to-many relationship
 * between Users and Rooms.
 *
 * Child referencing: Each membership is a separate document.
 * Scales indefinitely - can have millions of members across rooms.
 */

import mongoose from "mongoose";

const roomMemberSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: [true, "Room ID is required"],
    index: true, // Fast lookup of room members
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
    index: true, // Fast lookup of user's rooms
  },

  role: {
    type: String,
    enum: ["admin", "member"],
    default: "member",
  },

  // Member-specific settings
  isMuted: {
    type: Boolean,
    default: false,
  },

  isArchived: {
    type: Boolean,
    default: false,
  },

  // Timestamps
  joinedAt: {
    type: Date,
    default: Date.now,
  },

  leftAt: {
    type: Date,
    // null means still a member
  },
});

// Compound indexes for common queries
roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true }); // Prevent duplicate memberships
roomMemberSchema.index({ userId: 1, leftAt: 1 }); // Get user's active rooms

// Instance method: Check if user is still a member
roomMemberSchema.methods.isActive = function () {
  return this.leftAt === null || this.leftAt === undefined;
};

const RoomMember = mongoose.model("RoomMember", roomMemberSchema);

export default RoomMember;
