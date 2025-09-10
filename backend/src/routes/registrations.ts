import { Router, Request, Response } from 'express';
import RegistrationModel from '../models/Registration';

const router = Router({ mergeParams: true });

// POST /api/events/:eventId/register
router.post('/:eventId/register', async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const { userId, userName } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required (mock auth)' }) as unknown as void;
  const now = new Date().toISOString();
  try {
    const reg = await RegistrationModel.create({ eventId, userId, userName: userName || '', createdAt: now });
    return res.status(201).json(reg) as unknown as void;
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ error: 'Already registered' }) as unknown as void;
    return res.status(500).json({ error: 'Failed to register' }) as unknown as void;
  }
});

// DELETE /api/events/:eventId/register
router.delete('/:eventId/register', async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required (mock auth)' }) as unknown as void;
  await RegistrationModel.deleteOne({ eventId, userId });
  return res.json({ ok: true }) as unknown as void;
});

// GET /api/events/:eventId/registration
router.get('/:eventId/registration', async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const { userId } = req.query as { userId?: string };
  if (!userId) return res.status(400).json({ error: 'userId query required' }) as unknown as void;
  const reg = await RegistrationModel.findOne({ eventId, userId }).lean();
  return res.json({ isRegistered: !!reg }) as unknown as void;
});

// GET /api/events/:eventId/attendees
router.get('/:eventId/attendees', async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const regs = await RegistrationModel.find({ eventId }).lean();
  return res.json(regs.map(r => ({ userId: r.userId, userName: r.userName }))) as unknown as void;
});

export default router;


