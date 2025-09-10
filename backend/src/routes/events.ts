import { Router, Request, Response } from 'express';
import EventModel from '../models/Event';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const sessUser = (req.session as any)?.user;
  if (!sessUser) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const creatorId = sessUser.userId;
  const events = await EventModel.find({ creatorId }).sort({ createdAt: -1 }).lean();
  return res.json(events) as unknown as void;
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const event = await EventModel.findById(req.params.id).lean();
  if (!event) return res.status(404).json({ error: 'Event not found' }) as unknown as void;
  return res.json(event) as unknown as void;
});

export default router;


