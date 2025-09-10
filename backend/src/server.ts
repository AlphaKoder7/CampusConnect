import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import api from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Simple healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Mock auth login endpoint
app.post('/api/login', (req: Request, res: Response) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username is required' });
  // Return a simple mock user
  return res.json({ userId: `user_${username}`, userDetails: username, roles: ['authenticated'] });
});

// Placeholder user endpoint (mimic previous getUser)
app.get('/api/getUser', (_req: Request, res: Response) => {
  return res.status(401).json({ error: 'Not authenticated' });
});

// API routes
app.use('/api', api);

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusconnect';
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });


