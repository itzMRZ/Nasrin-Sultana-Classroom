import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IClass } from './Class';

export interface IAssignment extends Document {
  title: string;
  description: string;
  dueDate: Date;
  points: number;
  attachments: string[];
  class: IClass['_id'];
  createdBy: IUser['_id'];
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  points: {
    type: Number,
    required: true,
    default: 100
  },
  attachments: [{
    type: String
  }],
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export default Assignment;
