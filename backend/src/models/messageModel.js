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
});

// Compound index for efficient room message queries (sorted by time)
messageSchema.index({ roomId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
