/**
 * Synq Server Entry Point
 *
 * Main server file that initializes:
 * - Express HTTP server
 * - Socket.io for real-time communication
 * - MongoDB connection
 * - CORS for frontend communication
 */

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./src/config/db.js";

import messageRoutes from "./src/routes/messageRoutes.js";
import roomRoutes from "./src/routes/roomRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";

import { initializeSocketHandlers } from "./src/sockets/index.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server (needed for Socket.io)
const httpServer = createServer(app);

// Initialize Socket.io with CORS settings
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// ============================================
// Middleware Setup
// ============================================

// Enable CORS for all routes
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies (for form data)
app.use(express.urlencoded({ extended: true }));

// ============================================
// Database Connection
// ============================================

connectDB();

// ============================================
// REST API Routes
// ============================================

app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

// ============================================
// Socket.io Real-time Event Handlers
// ============================================

initializeSocketHandlers(io);

// ============================================
// Global Error Handler
// ============================================

// This must have 4 parameters for Express to treat it as error middleware.
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR 💥:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    message,
    // In real production you would hide stack; for learning it's useful.
    error: err.stack,
  });
});

// Serve Socket.io client library
app.use("/socket.io", express.static("node_modules/socket.io/client-dist"));

// ============================================
// Start Server
// ============================================

httpServer.listen(PORT, () => {
  console.log("==========================================");
  console.log(`Synq Server running on http://localhost:${PORT}`);
  console.log(`Socket.io ready for real-time connections`);
  console.log(`Started at: ${new Date().toLocaleString()}`);
  console.log("==========================================");
});
