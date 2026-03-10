import app from "../app";
import { connectDB } from "../config/database";

// Ensure DB connection is initialized (but don't block on it)
connectDB().catch((err) => {
  console.error("Initial DB connection failed:", err.message);
});

export default app;
