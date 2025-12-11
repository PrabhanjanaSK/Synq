/**
 * User Controller
 * Handles user-related HTTP requests.
 */
import User from "../models/userModel.js";

import { catchAsync } from "../utils/catchAsync.js";
import { sendFail, sendSuccess } from "./factory.js";
/**
 * Create a test user (Phase 1 only - no auth)
 * POST /api/users
 * Body: { username: "alice", email: "alice@test.com", password: "test1234" }
 */
export const createUser = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return sendFail(res, 400, "Please provide username, email, and password");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password, // TODO: hash in Phase 3
  });

  user.password = undefined;

  return sendSuccess(res, 201, {
    data: {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        photo: user.photo,
        createdAt: user.createdAt,
      },
    },
  });
});

/**
 * Get all users (for testing - find who to chat with)
 * GET /api/users
 */
export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find()
    .select("username email photo isOnline lastSeen")
    .sort({ username: 1 });

  return sendSuccess(res, 200, {
    results: users.length,
    data: { users },
  });
});

/**
 * Get a specific user
 * GET /api/users/:username
 */
export const getUser = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  const user = await User.findOne({
    username: username.toLowerCase(),
  }).select("username email photo isOnline lastSeen createdAt");

  if (!user) {
    return sendFail(res, 404, "User not found");
  }

  return sendSuccess(res, 200, {
    data: { user },
  });
});
