import mongoose, { Schema, Document, Model } from 'mongoose';

export interface RegistrationDocument extends Document {
  eventId: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

const RegistrationSchema = new Schema<RegistrationDocument>({
  eventId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, default: '' },
  createdAt: { type: String, required: true }
});

RegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

let RegistrationModel: Model<RegistrationDocument>;
try {
  RegistrationModel = mongoose.model<RegistrationDocument>('Registration');
} catch {
  RegistrationModel = mongoose.model<RegistrationDocument>('Registration', RegistrationSchema);
}

export default RegistrationModel;


