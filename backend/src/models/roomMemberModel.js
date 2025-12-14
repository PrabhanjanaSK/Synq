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

  unreadCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  lastReadAt: {
    type: Date,
    default: Date.now,
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

roomMemberSchema.statics.incrementUnreadForOthers = async function (
  roomId,
  senderId
) {
  return await this.updateMany(
    {
      roomId: roomId,
      userId: { $ne: new mongoose.Types.ObjectId(senderId) },
      leftAt: null,
    },
    {
      $inc: { unreadCount: 1 },
    }
  );
};

roomMemberSchema.statics.markAsRead = async function (roomIdString, userId) {
  // Find the room by its string roomId
  const room = await mongoose.model("Room").findOne({ roomId: roomIdString });

  if (!room) {
    throw new Error("Room not found");
  }

  const member = await this.findOneAndUpdate(
    {
      roomId: room._id, // Use the ObjectId
      userId: new mongoose.Types.ObjectId(userId),
      leftAt: null,
    },
    {
      unreadCount: 0,
      lastReadAt: new Date(),
    },
    { new: true }
  );

  if (!member) {
    throw new Error("You are not a member of this room");
  }

  return member;
};

roomMemberSchema.statics.getUserConversations = async function (userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return await this.aggregate([
    {
      $match: {
        userId: userObjectId,
        leftAt: null,
      },
    },

    {
      $lookup: {
        from: "rooms",
        localField: "roomId",
        foreignField: "_id",
        as: "room",
      },
    },
    { $unwind: "$room" },

    {
      $lookup: {
        from: "roommembers",
        localField: "roomId",
        foreignField: "roomId",
        as: "allMembers",
      },
    },

    // ✅ FIXED: Handle missing leftAt fields
    {
      $addFields: {
        otherMembers: {
          $filter: {
            input: "$allMembers",
            as: "member",
            cond: {
              $and: [
                { $ne: ["$$member.userId", userObjectId] },
                // Check leftAt is null OR doesn't exist (undefined)
                {
                  $or: [
                    { $eq: ["$$member.leftAt", null] },
                    { $eq: [{ $ifNull: ["$$member.leftAt", null] }, null] },
                  ],
                },
              ],
            },
          },
        },
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "otherMembers.userId",
        foreignField: "_id",
        as: "participantUsers",
      },
    },

    {
      $addFields: {
        participants: {
          $map: {
            input: "$participantUsers",
            as: "user",
            in: {
              username: "$$user.username",
              photo: "$$user.photo",
              isOnline: "$$user.isOnline",
            },
          },
        },
      },
    },

    {
      $project: {
        _id: 0,
        roomId: "$room.roomId",
        type: "$room.type",
        name: "$room.name",
        lastMessage: "$room.lastMessage",
        lastMessageAt: "$room.lastMessageAt",
        unreadCount: 1,
        participants: 1,
      },
    },

    { $sort: { lastMessageAt: -1 } },
  ]);
};

const RoomMember = mongoose.model("RoomMember", roomMemberSchema);

export default RoomMember;
