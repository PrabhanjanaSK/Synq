/**
 * Room Routes
 * REST API endpoints for rooms.
 */
import express from "express";
import {
  addGroupMembers,
  createGroup,
  createOrGetDM,
  getRoomMembersController,
  leaveGroup,
  removeGroupMember,
} from "../controllers/roomController.js";

const router = express.Router();

router.post("/dm", createOrGetDM);

router.post("/group", createGroup);

router
  .route("/:roomId/members")
  .get(getRoomMembersController)
  .post(addGroupMembers)
  .delete(removeGroupMember);

router.post("/:roomId/leave", leaveGroup);

export default router;
