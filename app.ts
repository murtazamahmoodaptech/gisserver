import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors';
import { connectDB } from './config/database';

// Import route handlers
import authHandler from './handlers/auth';
import appointmentsHandler from './handlers/appointments';
import contactHandler from './handlers/contact';
import couponsHandler from './handlers/coupons';
import usersHandler from './handlers/users';
import feedbackHandler from './handlers/feedback'
const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Routes
app.post('/api/auth/login', async (req: Request, res: Response) => {
  await authHandler(
    { ...req, query: { action: 'login' } } as any,
    res as any
  );
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  await authHandler(
    { ...req, query: { action: 'register' } } as any,
    res as any
  );
});

app.get('/api/appointments', async (req: Request, res: Response) => {
  await appointmentsHandler(req as any, res as any);
});

app.post('/api/appointments', async (req: Request, res: Response) => {
  await appointmentsHandler(req as any, res as any);
});

app.put('/api/appointments/:id', async (req: Request, res: Response) => {
  await appointmentsHandler(
    { ...req, query: { id: req.params.id } } as any,
    res as any
  );
});

app.delete('/api/appointments/:id', async (req: Request, res: Response) => {
  await appointmentsHandler(
    { ...req, query: { id: req.params.id } } as any,
    res as any
  );
});


// Users routes
app.get('/api/users', async (req: Request, res: Response) => {
  await usersHandler(req as any, res as any);
});

app.post('/api/users', async (req: Request, res: Response) => {
  await usersHandler(req as any, res as any);
});

app.put('/api/users', async (req: Request, res: Response) => {
  await usersHandler(req as any, res as any);
});

app.delete('/api/users', async (req: Request, res: Response) => {
  await usersHandler(req as any, res as any);
});


app.post('/api/contact', async (req: Request, res: Response) => {
  await contactHandler(req as any, res as any);
});

app.get('/api/contact', async (req: Request, res: Response) => {
  await contactHandler(req as any, res as any);
});

app.put('/api/contact', async (req: Request, res: Response) => {
  await contactHandler(req as any, res as any);
});

app.delete('/api/contact', async (req: Request, res: Response) => {
  await contactHandler(req as any, res as any);
});

// Feedback routes
app.get('/api/feedback', async (req: Request, res: Response) => {
  await feedbackHandler(req as any, res as any);
});

app.post('/api/feedback', async (req: Request, res: Response) => {
  await feedbackHandler(req as any, res as any);
});

app.put('/api/feedback', async (req: Request, res: Response) => {
  await feedbackHandler(req as any, res as any);
});

app.delete('/api/feedback', async (req: Request, res: Response) => {
  await feedbackHandler(req as any, res as any);
});

// Coupons routes
app.get('/api/coupons', async (req: Request, res: Response) => {
  await couponsHandler(req as any, res as any);
});

app.post('/api/coupons', async (req: Request, res: Response) => {
  await couponsHandler(req as any, res as any);
});

app.put('/api/coupons', async (req: Request, res: Response) => {
  await couponsHandler(req as any, res as any);
});

app.delete('/api/coupons', async (req: Request, res: Response) => {
  await couponsHandler(req as any, res as any);
});

// Error handling
app.use(
  (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error('Error:', err);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:
        process.env.NODE_ENV === 'development'
          ? err.message
          : undefined,
    });
  }
);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

export default app;
