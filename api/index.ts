import serverless from "serverless-http";
import app from "../app";
import { connectDB } from "../config/database";

const handler = serverless(app);

// Ensure DB connection is initialized (but don't block on it)
connectDB().catch((err) => {
  console.error("Initial DB connection failed:", err.message);
});

export default async function (req: any, res: any) {
  // Try to connect, but don't fail the request if DB is temporarily unavailable
  // The handler will still process API requests
  connectDB().catch((err) => {
    console.error("DB connection error on request:", err.message);
  });

  return handler(req, res);
}
