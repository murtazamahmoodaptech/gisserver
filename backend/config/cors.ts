import type { CorsOptions } from 'cors';
const allowedOrigins = [
  'http://localhost:5173', // Vite default
  'http://localhost:5174', // Vite alternative
  'http://localhost:8080', // Vite running on 8080
  'http://localhost:8081', // Vite alternative
  'http://localhost:3000', // Backend port (for cross-origin requests)
  'http://localhost:5000', // Alternative local port
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://192.168.1.215:8080', // Local network
];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
