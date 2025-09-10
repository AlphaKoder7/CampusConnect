import { Router } from 'express';
import eventsRouter from './events';
import registrationsRouter from './registrations';

const api = Router();

api.use('/events', eventsRouter);
api.use('/events', registrationsRouter);

export default api;


