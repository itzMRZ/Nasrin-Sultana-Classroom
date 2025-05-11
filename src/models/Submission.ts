import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IAssignment } from './Assignment';

export interface ISubmission extends Document {
  assignment: IAssignment['_id'];
  student: IUser['_id'];
  content: string;
  attachments: string[];
  grade: number;
  feedback: string;
  isGraded: boolean;
  isLate: boolean;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema: Schema = new Schema({
  assignment: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String
  },
  attachments: [{
    type: String
  }],
  grade: {
    type: Number
  },
  feedback: {
    type: String
  },
  isGraded: {
    type: Boolean,
    default: false
  },
  isLate: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add a compound index to prevent multiple submissions by the same student for the same assignment
SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

// Pre-save middleware to check if submission is late
SubmissionSchema.pre<ISubmission>('save', async function(next) {
  if (this.isNew || this.isModified('content') || this.isModified('attachments')) {
    try {
      // Set submittedAt to current time when creating or updating submission content
      this.submittedAt = new Date();

      // Check if submission is past due date by comparing with assignment due date
      const Assignment = mongoose.model('Assignment');
      const assignment = await Assignment.findById(this.assignment);
      if (assignment && assignment.dueDate) {
        this.isLate = new Date() > new Date(assignment.dueDate);
      }
    } catch (err) {
      console.error('Error checking if submission is late:', err);
    }
  }
  next();
});

const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);

export default Submission;
