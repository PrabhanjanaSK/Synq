import mongoose from "mongoose";
import validator from "validator";

/**
 * User Model
 *
 * Complete user schema for Synq chat application.
 * Data modeled now, authentication logic implemented in Phase 3.
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please provide a username"],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [20, "Username cannot exceed 20 characters"],
  },

  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },

  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false, // Never return password in queries
  },

  photo: {
    type: String,
    default: "default.jpg",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  lastSeen: {
    type: Date,
    default: Date.now,
  },

  isOnline: {
    type: Boolean,
    default: false,
  },
  // Auth-related fields for Phase 3
  passwordChangedAt: Date,

  passwordResetToken: String,

  passwordResetExpires: Date,

  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// TODO Phase 3: Add pre-save middleware for password hashing
// TODO Phase 3: Add instance methods for password comparison, token generation

const User = mongoose.model("User", userSchema);

export default User;
