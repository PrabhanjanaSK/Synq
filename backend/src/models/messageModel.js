import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Message must have a sender"],
  },

  roomId: {
    type: String,
    required: [true, "Message must belong to a room"],
    index: true, // Index for fast room-based queries
  },

  text: {
    type: String,
    required: [true, "Message cannot be empty"],
    trim: true,
    maxlength: [500, "Message cannot exceed 500 characters"],
  },

  status: {
    type: String,
    enum: ["Sent", "Delivered", "Read"],
    default: "Sent",
  },

  isEdited: {
    type: Boolean,
    default: false,
  },

  editedAt: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },

  deliveredAt: {
    type: Date,
  },

  readAt: {
    type: Date,
  },
});

// Compound index for efficient room message queries (sorted by time)
messageSchema.index({ roomId: 1, createdAt: -1 });

messageSchema.statics.getPaginatedMessages = async function (
  roomIdString,
  options = {}
) {
  const { limit = 30, before } = options;

  // Enforce max limit
  const actualLimit = Math.min(limit, 75);

  // Find the room by string roomId
  const room = await mongoose.model("Room").findOne({ roomId: roomIdString });
  if (!room) {
    throw new Error("Room not found");
  }

  // Build query
  const query = { roomId: roomIdString };

  // If 'before' timestamp provided, only get messages before that time
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  // Get messages (actualLimit + 1 to check if there are more)
  const messages = await this.find(query)
    .sort({ createdAt: -1 }) // Newest first
    .limit(actualLimit + 1)
    .populate("senderId", "username photo isOnline");

  // Check if there are more messages
  const hasMore = messages.length > actualLimit;

  // Remove the extra message if we got one
  const actualMessages = hasMore ? messages.slice(0, actualLimit) : messages;

  // Get the oldest message time for next pagination
  const oldestMessageTime =
    actualMessages.length > 0
      ? actualMessages[actualMessages.length - 1].createdAt
      : null;

  return {
    messages: actualMessages,
    hasMore,
    oldestMessageTime,
    count: actualMessages.length,
  };
};

// Mark message as delivered
messageSchema.statics.markAsDelivered = async function (messageId) {
  const message = await this.findByIdAndUpdate(
    messageId,
    {
      status: "Delivered",
      deliveredAt: new Date(), // Optional: track when it was delivered
    },
    { new: true }
  ).populate("senderId", "username photo");

  if (!message) {
    throw new Error("Message not found");
  }

  return message;
};

// Mark message(s) as read
messageSchema.statics.markAsRead = async function (messageIds) {
  // messageIds can be a single ID or array of IDs
  const ids = Array.isArray(messageIds) ? messageIds : [messageIds];

  const result = await this.updateMany(
    {
      _id: { $in: ids },
      status: { $ne: "Read" }, // Only update if not already read
    },
    {
      status: "Read",
      readAt: new Date(),
    }
  );

  return result;
};

// Mark all messages in a room as read for a specific user
messageSchema.statics.markRoomAsRead = async function (roomId, userId) {
  // Find all unread messages in this room that were NOT sent by this user
  const result = await this.updateMany(
    {
      roomId: roomId,
      senderId: { $ne: userId },
      status: { $ne: "Read" },
    },
    {
      status: "Read",
      readAt: new Date(),
    }
  );

  // Get the updated message IDs for broadcasting
  const updatedMessages = await this.find({
    roomId: roomId,
    senderId: { $ne: userId },
    status: "Read",
    readAt: { $gte: new Date(Date.now() - 1000) }, // Messages read in last second
  }).select("_id");

  return {
    modifiedCount: result.modifiedCount,
    messageIds: updatedMessages.map((m) => m._id),
  };
};

const Message = mongoose.model("Message", messageSchema);

export default Message;
