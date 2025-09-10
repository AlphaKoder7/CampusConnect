import { Router, Request, Response } from 'express';
import EventModel from '../models/Event';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const events = await EventModel.find().sort({ createdAt: -1 }).lean();
  return res.json(events) as unknown as void;
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const event = await EventModel.findById(req.params.id).lean();
  if (!event) return res.status(404).json({ error: 'Event not found' }) as unknown as void;
  return res.json(event) as unknown as void;
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { title, description, date, time, location, type, isPrivate, capacity, creatorId, creatorName } = req.body || {};
  if (!creatorId) return res.status(400).json({ error: 'creatorId required (mock auth)' }) as unknown as void;
  if (!title || !date || !time || !location) return res.status(400).json({ error: 'Missing required fields' }) as unknown as void;

  const now = new Date().toISOString();
  const event = await EventModel.create({
    title,
    description,
    date,
    time,
    location,
    type,
    isPrivate,
    capacity: capacity !== null && capacity !== undefined && capacity !== '' ? Number(capacity) : null,
    creatorId,
    creatorName: creatorName || '',
    createdAt: now,
    updatedAt: now
  });
  return res.status(201).json(event) as unknown as void;
});

export default router;


