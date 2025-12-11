/**
 * Database Configuration
 *
 * Handles MongoDB connection using Mongoose.
 * Uses connection string from environment variables for security.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables from .env file
dotenv.config();

/**
 * Connect to MongoDB Atlas
 *
 * @returns {Promise<void>}
 * @throws {Error} If connection fails, exits process with code 1
 */
const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB using the URI from .env
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with failure code if DB connection fails
    process.exit(1);
  }
};

export default connectDB;
