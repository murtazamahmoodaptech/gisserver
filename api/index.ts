import serverless from "serverless-http";
import app from "../app";
import { connectDB } from "../config/database";

const handler = serverless(app);

export default async function (req: any, res: any) {
  try {
    await connectDB();
  } catch (err) {
    console.error("DB connection failed:", err);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: (err as Error).message,
    });
  }

  return handler(req, res);
}