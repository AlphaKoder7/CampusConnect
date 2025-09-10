import mongoose, { Schema, Document, Model } from 'mongoose';

export interface EventDocument extends Document {
  title: string;
  description: string;
  date: string; // ISO date string yyyy-mm-dd
  time: string; // HH:mm
  location: string;
  type?: string;
  isPrivate?: boolean;
  capacity?: number | null;
  creatorId: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

const EventSchema = new Schema<EventDocument>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, default: 'other' },
  isPrivate: { type: Boolean, default: false },
  capacity: { type: Number, default: null },
  creatorId: { type: String, required: true },
  creatorName: { type: String, default: '' },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

let EventModel: Model<EventDocument>;
try {
  EventModel = mongoose.model<EventDocument>('Event');
} catch {
  EventModel = mongoose.model<EventDocument>('Event', EventSchema);
}

export default EventModel;


