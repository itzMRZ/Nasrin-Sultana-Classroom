import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IClass extends Document {
  name: string;
  section: string;
  subject: string;
  room: string;
  inviteCode: string;
  createdBy: IUser['_id'];
  students: IUser['_id'][];
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  room: {
    type: String,
    trim: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Generate a random invite code before saving
ClassSchema.pre<IClass>('save', async function(next) {
  if (!this.isModified('inviteCode')) {
    // Only generate a code if it doesn't already exist
    if (!this.inviteCode) {
      this.inviteCode = generateInviteCode();
    }
    return next();
  }
  next();
});

// Helper function to generate a random invite code
function generateInviteCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const Class = mongoose.model<IClass>('Class', ClassSchema);

export default Class;
