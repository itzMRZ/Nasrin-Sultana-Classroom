import express from 'express';
import * as userController from '../controllers/userController';
import { isAuthenticated } from '../middlewares/authMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/profiles');
    // Create the directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    if (req.session && req.session.user) {
      cb(null, `${req.session.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    } else {
      // Fallback filename or error if user is not available in session
      // This case should ideally be prevented by isAuthenticated middleware
      cb(new Error('User not found in session for filename generation'), '');
    }
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      // Pass an error to multer's callback
      cb(new Error('Error: Images Only!'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

// @route   GET /profile
// @desc    Display current user's profile
// @access  Private
router.get('/', isAuthenticated, (req, res, next) => {
  console.log('Route handler: GET /profile');
  userController.renderProfile(req, res);
});

// @route   GET /profile/edit
// @desc    Show form to edit current user's profile
// @access  Private
router.get('/edit', isAuthenticated, userController.renderEditProfileForm);

// @route   POST /profile/edit
// @desc    Update current user's profile
// @access  Private
router.post('/edit', isAuthenticated, upload.single('profileImage'), userController.updateProfile);

// @route   GET /profile/:userId
// @desc    Display a specific user's profile
// @access  Private (or Public, depending on requirements - currently Private)
router.get('/:userId', isAuthenticated, userController.renderUserProfileById);

export default router;
