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
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      maxIdleTimeMS: 45000,
      retryWrites: true,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('[MongoDB] Connected successfully');
        return mongoose;
      })
      .catch((err) => {
        console.error('[MongoDB] Connection error:', err.message);
        cached.promise = null; // reset so next request retries
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
