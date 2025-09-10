import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import api from './routes';
import EventModel from './models/Event';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import UserModel from './models/User';
import { EmailService } from './services/EmailService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// In-memory mock session (kept for Dev Quick Login)
type MockUser = { userId: string; userDetails: string; email?: string; roles: string[]; role: 'student' | 'faculty' | 'admin' } | null;
let mockUserSession: MockUser = null;

// Simple healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Dev mock login endpoint (kept for fast testing)
app.post('/api/login', (req: Request, res: Response): void => {
  const { username, role } = req.body || {};
  if (!username) { res.status(400).json({ error: 'username is required' }); return; }
  const normalizedRole: 'student' | 'faculty' | 'admin' = role === 'faculty' ? 'faculty' : (role === 'admin' ? 'admin' : 'student');
  const user = { userId: `user_${username}`, userDetails: username, email: `${username}@example.com`, roles: ['authenticated'], role: normalizedRole };
  mockUserSession = user;
  const redirectTo = user.role === 'admin' ? '/admin.html' : '/index.html';
  res.status(200).json({ ...user, redirectTo });
});

// Placeholder user endpoint (mimic previous getUser)
app.get('/api/getUser', (req: Request, res: Response): void => {
  if ((req.session as any)?.user) { res.status(200).json((req.session as any).user); return; }
  if (mockUserSession) { res.status(200).json(mockUserSession); return; }
  res.status(401).json({ error: 'Not authenticated' });
});

// Events routes (read-only via router, create uses session here)
app.use('/api', api);

// Override/augment POST /api/events here to use server-side session
app.post('/api/events', async (req: Request, res: Response): Promise<void> => {
  const sessUser = (req.session as any)?.user;
  const activeUser = sessUser || mockUserSession;
  if (!activeUser) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const { title, description, date, time, location, type, isPrivate, capacity, isOfficial } = req.body || {};
  if (!title || !date || !time || !location) { res.status(400).json({ error: 'Missing required fields' }); return; }

  const now = new Date().toISOString();
  try {
    // Role-based enforcement of official events
    const official = activeUser.role === 'faculty' ? (Boolean(isOfficial) === true) : false;
    const event = await EventModel.create({
      title,
      description,
      date,
      time,
      location,
      type,
      isPrivate,
      capacity: capacity !== null && capacity !== undefined && capacity !== '' ? Number(capacity) : null,
      creatorId: activeUser.userId || activeUser._id || activeUser.id || 'user',
      creatorName: activeUser.userDetails || activeUser.name || '',
      isOfficial: official,
      createdAt: now,
      updatedAt: now
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Admin-only: add user and send invitation email (mocked)
app.post('/api/admin/add-user', async (req: Request, res: Response): Promise<void> => {
  const admin = (req.session as any)?.user;
  if (!admin || admin.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { email, role } = req.body || {};
  if (!email) { res.status(400).json({ error: 'email required' }); return; }
  const normalizedRole: 'student' | 'faculty' = role === 'faculty' ? 'faculty' : 'student';
  try {
    const exists = await UserModel.findOne({ email }).lean();
    if (exists) { res.status(409).json({ error: 'Email already exists' }); return; }
    const tempPass = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(tempPass, 10);
    await UserModel.create({ email, password: hash, role: normalizedRole, createdAt: new Date().toISOString() });
    try {
      console.log('[admin/add-user] Sending invitation email to:', email);
      await EmailService.sendInvitationEmail(email, tempPass);
      console.log('[admin/add-user] Invitation email sent');
    } catch (emailErr) {
      console.error('--- FAILED TO SEND INVITATION EMAIL ---', emailErr);
    }
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add user' });
  }
});

// User: change password
app.post('/api/user/change-password', async (req: Request, res: Response): Promise<void> => {
  const sessUser = (req.session as any)?.user;
  if (!sessUser) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) { res.status(400).json({ error: 'Both current and new passwords required' }); return; }
  try {
    const userDoc = await UserModel.findById(sessUser.userId);
    if (!userDoc) { res.status(404).json({ error: 'User not found' }); return; }
    const ok = await bcrypt.compare(currentPassword, userDoc.password);
    if (!ok) { res.status(400).json({ error: 'Current password incorrect' }); return; }
    userDoc.password = await bcrypt.hash(newPassword, 10);
    await userDoc.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.post('/api/login-account', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body || {};
  if (!email || !password) { res.status(400).json({ error: 'email and password required' }); return; }
  try {
    const userDoc = await UserModel.findOne({ email });
    if (!userDoc) { res.status(401).json({ error: 'Invalid credentials' }); return; }
    const ok = await bcrypt.compare(password, userDoc.password);
    if (!ok) { res.status(401).json({ error: 'Invalid credentials' }); return; }
    (req.session as any).user = { userId: (userDoc as any)._id.toString(), userDetails: email, email, roles: ['authenticated'], role: userDoc.role };
    const redirectTo = userDoc.role === 'admin' ? '/admin.html' : '/index.html';
    res.json({ ok: true, redirectTo });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req: Request, res: Response): void => {
  mockUserSession = null;
  const destroy = (req.session as any)?.destroy as undefined | ((cb: (err?: any) => void) => void);
  if (destroy) {
    destroy((err?: any) => {
      if (err) { res.status(500).json({ error: 'Failed to logout' }); return; }
      res.json({ ok: true });
    });
  } else {
    res.json({ ok: true });
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


