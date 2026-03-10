import serverless from "serverless-http";
import app from "../app";
import { connectDB } from "../config/database";

let connected = false;

async function init() {
  if (!connected) {
    await connectDB();
    connected = true;
  }
}

export default async function handler(req: any, res: any) {
  await init();
  return serverless(app)(req, res);
}