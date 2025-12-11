/**
 * Message Routes
 * REST API endpoints for messages.
 */
import express from "express";

import { getMessages, getUserRooms } from "../controllers/messageController.js";

const router = express.Router();

router.get("/rooms", getUserRooms);

router.route("/:roomId").get(getMessages);

export default router;
