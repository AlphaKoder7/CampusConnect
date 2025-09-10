import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UserDocument extends Document {
  email: string;
  password: string; // hashed
  role: 'student' | 'faculty' | 'admin';
  createdAt: string;
}

const UserSchema = new Schema<UserDocument>({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty', 'admin'], default: 'student' },
  createdAt: { type: String, required: true }
});

let UserModel: Model<UserDocument>;
try {
  UserModel = mongoose.model<UserDocument>('User');
} catch {
  UserModel = mongoose.model<UserDocument>('User', UserSchema);
}

export default UserModel;



