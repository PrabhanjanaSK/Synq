/**
 * User Routes
 * REST API endpoints for users.
 */
import express from "express";
import {
  createUser,
  getAllUsers,
  getUser,
} from "../controllers/userController.js";

const router = express.Router();

router
  .route("/")
  .post(createUser) // POST /api/users
  .get(getAllUsers); // GET /api/users

router.route("/:username").get(getUser); // GET /api/users/:username

export default router;
