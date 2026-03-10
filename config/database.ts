import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: 'luxe-detail',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connected');
        return mongoose;
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err);
        cached.promise = null; // reset so next request retries
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}