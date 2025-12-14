/**
 * Message Routes
 * REST API endpoints for messages.
 */
import express from "express";

import {
  getMessages,
  getUserRooms,
  markAsRead,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/rooms", getUserRooms);

router.route("/:roomId").get(getMessages);

router.route("/:roomId/read").post(markAsRead);

export default router;
