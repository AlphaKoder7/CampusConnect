import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import api from './routes';
import EventModel from './models/Event';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// In-memory mock session (single-user for local dev)
type MockUser = { userId: string; userDetails: string; email?: string; roles: string[] } | null;
let mockUserSession: MockUser = null;

// Simple healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Mock auth login endpoint
app.post('/api/login', (req: Request, res: Response): void => {
  const { username } = req.body || {};
  if (!username) { res.status(400).json({ error: 'username is required' }); return; }
  const user = { userId: `user_${username}`, userDetails: username, email: `${username}@example.com`, roles: ['authenticated'] };
  mockUserSession = user;
  res.status(200).json(user);
});

// Placeholder user endpoint (mimic previous getUser)
app.get('/api/getUser', (_req: Request, res: Response): void => {
  if (mockUserSession) { res.status(200).json(mockUserSession); return; }
  res.status(401).json({ error: 'Not authenticated' });
});

// Events routes (read-only via router, create uses session here)
app.use('/api', api);

// Override/augment POST /api/events here to use server-side session
app.post('/api/events', async (req: Request, res: Response): Promise<void> => {
  if (!mockUserSession) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const { title, description, date, time, location, type, isPrivate, capacity } = req.body || {};
  if (!title || !date || !time || !location) { res.status(400).json({ error: 'Missing required fields' }); return; }

  const now = new Date().toISOString();
  try {
    const event = await EventModel.create({
      title,
      description,
      date,
      time,
      location,
      type,
      isPrivate,
      capacity: capacity !== null && capacity !== undefined && capacity !== '' ? Number(capacity) : null,
      creatorId: mockUserSession.userId,
      creatorName: mockUserSession.userDetails,
      createdAt: now,
      updatedAt: now
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

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


