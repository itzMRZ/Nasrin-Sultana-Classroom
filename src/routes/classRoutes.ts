import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as classController from '../controllers/classController';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { debugFileUploads } from '../middlewares/debugMiddleware';
import fs from 'fs';
import logger from '../utils/logger';

const router = Router();

// Create uploads directory for stream files if it doesn't exist
const streamUploadsDir = path.join(__dirname, '../../public/uploads/stream');
if (!fs.existsSync(streamUploadsDir)) {
  fs.mkdirSync(streamUploadsDir, { recursive: true });
}

// Configure multer storage for class stream attachments
const streamStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the directory exists
    if (!fs.existsSync(streamUploadsDir)) {
      logger.info(`Creating stream uploads directory: ${streamUploadsDir}`);
      try {
        fs.mkdirSync(streamUploadsDir, { recursive: true });
      } catch (err) {
        logger.error(`Failed to create directory: ${streamUploadsDir}`, err);
      }
    }
    cb(null, streamUploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with uuid
    // Clean the original filename to prevent issues
    const cleanFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${uuidv4()}_${cleanFilename}`;
    logger.info(`Generated filename for upload: ${uniqueFilename}`);
    cb(null, uniqueFilename);
  },
});

// Define file filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow common document, image, and media file types
  const allowedFileTypes = [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    // Media
    '.mp4', '.mp3', '.wav',
    // Code & archives
    '.zip', '.rar', '.7z'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported'));
  }
};

// Create multer upload instance
const streamUpload = multer({
  storage: streamStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 5 // Max 5 files per upload
  },
  fileFilter: fileFilter
});

// Protect all routes with authentication middleware
router.use(isAuthenticated);

// Class listing
router.get('/', classController.getClasses);

// Create class routes
router.get('/create', classController.getCreateClassPage);
router.post('/create', classController.createClass);

// Join class routes
router.get('/join', classController.getJoinClassPage);
router.post('/join', classController.joinClass);

// Class details
router.get('/:id', classController.getClassDetails);

// People in a class
router.get('/:id/people', classController.getPeoplePage);

// Post announcement in class stream
router.post('/:id/announcement', debugFileUploads, streamUpload.array('attachments', 5), classController.createPostInStream);

// Add comment to a post
router.post('/:id/post/:postId/comment', classController.addCommentToPost);

export default router;
