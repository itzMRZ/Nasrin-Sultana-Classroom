import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFileAttachment {
  path: string;         // URL path to the file
  originalname: string; // Original file name
  mimetype: string;     // MIME type of file
  size: number;         // File size in bytes
}

export interface IPost extends Document {
  classId: Types.ObjectId;
  userId: Types.ObjectId; // Author of the post
  content: string;
  createdAt: Date;
  attachments?: {
    files?: IFileAttachment[];  // Array of file metadata objects
    links?: string[];           // Array of external links
  };
}

const PostSchema: Schema = new Schema({
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },  attachments: {
    files: [{
      path: String,         // URL path to the file
      originalname: String, // Original file name
      mimetype: String,     // MIME type of file
      size: Number          // File size in bytes
    }],
    links: [String],  // Array of external links
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IPost>('Post', PostSchema);
