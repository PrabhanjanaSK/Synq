/**
 * Room Controller
 *
 * Handles HTTP requests for room operations.
 */

import RoomMember from "../models/roomMemberModel.js";
import Room from "../models/roomModel.js";
import User from "../models/userModel.js";

import { catchAsync } from "../utils/catchAsync.js";
import {
  createGroupRoom,
  findOrCreateDMRoom,
  getRoomMembers,
} from "../utils/room.js";
import { sendFail, sendSuccess } from "./factory.js";

/**
 * Create or get a DM room
 *
 * POST /api/rooms/dm
 * Body: { otherUsername: "bob", userId, username }
 */
export const createOrGetDM = catchAsync(async (req, res, next) => {
  const { otherUsername } = req.body;
  // const { userId, username } = req.user; // From auth middleware
  // Phase 1: For testing, accept userId and username from body
  const { userId, username } = req.body;

  if (!otherUsername) {
    return sendFail(res, 400, "Please provide otherUsername");
  }

  // Find the other user
  const otherUser = await User.findOne({
    username: otherUsername.toLowerCase(),
  });

  if (!otherUser) {
    return sendFail(res, 404, "User not found");
  }

  // Can't DM yourself
  if (otherUser._id.toString() === userId) {
    return sendFail(res, 400, "Cannot create DM with yourself");
  }

  // Find or create the DM room
  const room = await findOrCreateDMRoom(
    userId,
    otherUser._id,
    username,
    otherUsername
  );

  return sendSuccess(res, 200, {
    data: { room },
  });
});

/**
 * Create a group room
 *
 * POST /api/rooms/group
 * Body: { name: "Project Team", memberUsernames: ["alice", "bob", "charlie"], userId }
 */
export const createGroup = catchAsync(async (req, res, next) => {
  const { name, memberUsernames } = req.body;
  // const { userId } = req.user; // From auth middleware
  // Phase 1: For testing, accept userId from body
  const { userId } = req.body;

  if (!name || !memberUsernames || memberUsernames.length < 2) {
    return sendFail(res, 400, "Group name and at least 2 members required");
  }

  // Find all member users
  const members = await User.find({
    username: { $in: memberUsernames.map((u) => u.toLowerCase()) },
  });

  if (members.length !== memberUsernames.length) {
    return sendFail(res, 404, "Some users not found");
  }

  // Add creator to members if not already included
  const memberIds = members.map((m) => m._id);
  if (!memberIds.some((id) => id.toString() === userId)) {
    memberIds.push(userId);
  }

  // Create the group
  const room = await createGroupRoom(name, userId, memberIds);

  return sendSuccess(res, 201, {
    data: { room },
  });
});

/**
 * Get members of a room
 *
 * GET /api/rooms/:roomId/members
 */
export const getRoomMembersController = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;

  // Find room by roomId string
  const room = await Room.findOne({ roomId });

  if (!room) {
    return sendFail(res, 404, "Room not found");
  }

  // Get members using utility function
  const members = await getRoomMembers(room._id);

  return sendSuccess(res, 200, {
    results: members.length,
    data: { members },
  });
});

/**
 * Add members to group (admin-only)
 *
 * POST /api/rooms/:roomId/members
 * Body: { userId: "<adminId>", usernames: ["charlie", "dave"] }
 */
export const addGroupMembers = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  const { userId, usernames } = req.body;

  if (!userId || !Array.isArray(usernames) || usernames.length === 0) {
    return sendFail(res, 400, "userId and usernames array are required");
  }

  // Find the room by roomId string
  const room = await Room.findOne({ roomId, type: "group" });

  if (!room) {
    return sendFail(res, 404, "Group not found");
  }

  // Check that requester is an admin in this room
  const adminMembership = await RoomMember.findOne({
    roomId: room._id,
    userId,
    role: "admin",
    leftAt: null,
  });

  if (!adminMembership) {
    return sendFail(res, 403, "Only admins can add members to this group");
  }

  // Find users by username
  const lowerUsernames = usernames.map((u) => u.toLowerCase());
  const users = await User.find({ username: { $in: lowerUsernames } });

  if (users.length !== usernames.length) {
    return sendFail(res, 404, "Some users not found");
  }

  // For each user, create or reactivate RoomMember
  let created = 0;
  let reactivated = 0;

  for (const user of users) {
    const existing = await RoomMember.findOne({
      roomId: room._id,
      userId: user._id,
    });

    if (existing) {
      // If previously left, reactivate
      if (existing.leftAt !== null && existing.leftAt !== undefined) {
        existing.leftAt = null;
        existing.joinedAt = new Date();
        await existing.save();
        reactivated += 1;
      }
      // If already active (leftAt null), do nothing
    } else {
      // No membership at all → create new
      await RoomMember.create({
        roomId: room._id,
        userId: user._id,
        role: "member",
      });
      created += 1;
    }
  }

  return sendSuccess(res, 200, {
    addedCount: created,
    reactivatedCount: reactivated,
  });
});

/**
 * Remove member from group (admin-only)
 *
 * DELETE /api/rooms/:roomId/members
 * Body: { userId: "<adminId>", username: "charlie" }
 */
export const removeGroupMember = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  const { userId, username } = req.body;

  if (!userId || !username) {
    return sendFail(res, 400, "userId and username are required");
  }

  const room = await Room.findOne({ roomId, type: "group" });

  if (!room) {
    return sendFail(res, 404, "Group not found");
  }

  // Check admin
  const adminMembership = await RoomMember.findOne({
    roomId: room._id,
    userId,
    role: "admin",
    leftAt: null,
  });

  if (!adminMembership) {
    return sendFail(res, 403, "Only admins can remove members");
  }

  const userToRemove = await User.findOne({
    username: username.toLowerCase(),
  });

  if (!userToRemove) {
    return sendFail(res, 404, "User not found");
  }

  // Cannot remove yourself using this endpoint (use leaveGroup instead)
  if (userToRemove._id.toString() === userId) {
    return sendFail(res, 400, "Use leave endpoint to leave the group yourself");
  }

  // Soft-remove membership by setting leftAt
  const membership = await RoomMember.findOneAndUpdate(
    {
      roomId: room._id,
      userId: userToRemove._id,
      leftAt: null,
    },
    { leftAt: new Date() },
    { new: true }
  );

  if (!membership) {
    return sendFail(res, 404, "User is not an active member of this group");
  }

  return sendSuccess(res, 200, {
    message: `Removed ${username} from group`,
  });
});

/**
 * Leave group (any member can leave)
 *
 * POST /api/rooms/:roomId/leave
 * Body: { userId: "<memberId>" }
 */
export const leaveGroup = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return sendFail(res, 400, "userId is required");
  }

  // Find group room
  const room = await Room.findOne({ roomId, type: "group" });

  if (!room) {
    return sendFail(res, 404, "Group not found");
  }

  // Find membership
  const membership = await RoomMember.findOne({
    roomId: room._id,
    userId,
    leftAt: null,
  });

  if (!membership) {
    return sendFail(res, 404, "You are not an active member of this group");
  }

  const isAdminLeaving = membership.role === "admin";

  // Mark this member as left
  membership.leftAt = new Date();
  await membership.save();

  // If admin is leaving, ensure there remains (at least) one admin
  if (isAdminLeaving) {
    const otherAdmins = await RoomMember.find({
      roomId: room._id,
      role: "admin",
      leftAt: null,
    });

    if (otherAdmins.length === 0) {
      // No active admins left → promote the oldest member to admin
      const oldestMember = await RoomMember.findOne({
        roomId: room._id,
        leftAt: null,
      }).sort({ joinedAt: 1 });

      if (oldestMember) {
        oldestMember.role = "admin";
        await oldestMember.save();
      }
    }
  }

  return sendSuccess(res, 200, {
    message: "Left group successfully",
  });
});
