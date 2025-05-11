import { Router } from 'express';
import * as assignmentController from '../controllers/assignmentController';
import { isAuthenticated } from '../middlewares/authMiddleware';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

// Protect all routes with authentication middleware
router.use(isAuthenticated);

// Get all assignments for a class
router.get('/class/:classId', assignmentController.getAssignments);

// Create assignment
router.get('/create/:classId', assignmentController.getCreateAssignmentPage);
router.post('/create/:classId', upload.array('attachments', 5), assignmentController.createAssignment);

// Assignment details
router.get('/:id', assignmentController.getAssignmentDetails);

export default router;
