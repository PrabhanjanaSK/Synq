/**
 * Room Utilities
 *
 * Helper functions for room operations:
 * - Generate deterministic room IDs for DMs
 * - Find or create rooms
 * - Room validation
 */

import RoomMember from "../models/roomMemberModel.js";
import Room from "../models/roomModel.js";

/**
 * Generate a deterministic room ID for a DM between two users
 *
 * Always returns the same ID regardless of parameter order:
 * getRoomId(alice, bob) === getRoomId(bob, alice)
 *
 * @param {String} username1 - First user's username
 * @param {String} username2 - Second user's username
 * @returns {String} - Room ID in format "room:user1_user2"
 *
 * @example
 * getRoomId('alice', 'bob') // "room:alice_bob"
 * getRoomId('bob', 'alice') // "room:alice_bob" (same!)
 */
export const getRoomId = (username1, username2) => {
  // Sort usernames alphabetically to ensure consistency
  const sortedUsers = [username1.toLowerCase(), username2.toLowerCase()].sort();
  return `room:${sortedUsers[0]}_${sortedUsers[1]}`;
};

/**
 * Find an existing room by room ID
 *
 * @param {String} roomId - The room ID to search for
 * @returns {Promise<Room|null>} - Room document or null if not found
 */
export const findRoomById = async (roomId) => {
  try {
    const room = await Room.findOne({ roomId });
    return room;
  } catch (error) {
    console.error("Error finding room:", error);
    throw error;
  }
};

/**
 * Find or create a DM room between two users
 *
 * If room exists: Returns existing room
 * If room doesn't exist: Creates room + 2 RoomMember entries
 *
 * @param {ObjectId} user1Id - First user's MongoDB _id
 * @param {ObjectId} user2Id - Second user's MongoDB _id
 * @param {String} username1 - First user's username
 * @param {String} username2 - Second user's username
 * @returns {Promise<Room>} - The room document
 */
export const findOrCreateDMRoom = async (
  user1Id,
  user2Id,
  username1,
  username2
) => {
  try {
    // Generate deterministic room ID
    const roomId = getRoomId(username1, username2);

    // Check if room already exists
    let room = await findRoomById(roomId);

    if (room) {
      console.log(`Found existing DM room: ${roomId}`);
      return room;
    }

    // Room doesn't exist - create it
    console.log(`Creating new DM room: ${roomId}`);

    room = await Room.create({
      roomId,
      type: "dm",
      createdBy: user1Id, // First user is creator
    });

    // Add both users as members
    await RoomMember.create([
      {
        roomId: room._id,
        userId: user1Id,
        role: "member",
      },
      {
        roomId: room._id,
        userId: user2Id,
        role: "member",
      },
    ]);

    console.log(`DM room created with 2 members: ${roomId}`);
    return room;
  } catch (error) {
    console.error("Error in findOrCreateDMRoom:", error);
    throw error;
  }
};

/**
 * Create a new group chat room
 *
 * @param {String} groupName - Name of the group
 * @param {ObjectId} creatorId - User creating the group
 * @param {Array<ObjectId>} memberIds - Array of user IDs to add (including creator)
 * @returns {Promise<Room>} - The created room
 */
export const createGroupRoom = async (groupName, creatorId, memberIds) => {
  try {
    // Generate unique room ID for group
    const timestamp = Date.now();
    const roomId = `room:group_${timestamp}`;

    console.log(`Creating group room: ${roomId}`);

    // Create room
    const room = await Room.create({
      roomId,
      type: "group",
      name: groupName,
      createdBy: creatorId,
    });

    // Add all members
    const memberDocs = memberIds.map((userId) => ({
      roomId: room._id,
      userId,
      // Creator gets admin role, others get member role
      role: userId.toString() === creatorId.toString() ? "admin" : "member",
    }));

    await RoomMember.create(memberDocs);

    console.log(`Group room created with ${memberIds.length} members`);
    return room;
  } catch (error) {
    console.error("Error creating group room:", error);
    throw error;
  }
};

/**
 * Check if a user is a member of a room
 *
 * @param {ObjectId} roomId - Room's MongoDB _id
 * @param {ObjectId} userId - User's MongoDB _id
 * @returns {Promise<Boolean>} - true if user is active member
 */
export const isUserInRoom = async (roomId, userId) => {
  try {
    const membership = await RoomMember.findOne({
      roomId,
      userId,
      leftAt: null, // Only active memberships
    });

    return !!membership; // Convert to boolean
  } catch (error) {
    console.error("Error checking room membership:", error);
    throw error;
  }
};

/**
 * Get all members of a room
 *
 * @param {ObjectId} roomId - Room's MongoDB _id
 * @returns {Promise<Array>} - Array of user objects
 */
export const getRoomMembers = async (roomId) => {
  try {
    const members = await RoomMember.find({
      roomId,
      leftAt: null, // Only active members
    }).populate("userId", "username photo isOnline lastSeen");

    return members.map((m) => m.userId); // Return just the user objects
  } catch (error) {
    console.error("Error getting room members:", error);
    throw error;
  }
};
