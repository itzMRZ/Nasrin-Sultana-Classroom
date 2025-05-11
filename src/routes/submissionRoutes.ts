import { Router } from 'express';
import * as submissionController from '../controllers/submissionController';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { validateObjectId, validateGradeSubmission } from '../middlewares/validationMiddleware';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files
  }
});

const router = Router();

// Protect all routes with authentication middleware
router.use(isAuthenticated);

// Simple test route to verify routing is working
router.get('/test', (req, res) => {
  res.status(200).send('Submission routes test endpoint is working!');
});

// Create submission for an assignment
router.post('/:assignmentId',
  validateObjectId('assignmentId'),
  upload.array('attachments', 5),
  submissionController.createSubmission
);

// Teacher view all submissions for an assignment
router.get('/:assignmentId/all',
  validateObjectId('assignmentId'),
  submissionController.getSubmissions
);

// Student view their own submission
router.get('/:assignmentId/my',
  validateObjectId('assignmentId'),
  submissionController.getStudentSubmission
);

// View a specific submission (for teacher or student who owns it)
router.get('/view/:submissionId',
  validateObjectId('submissionId'),
  submissionController.viewSubmissionDetails
);

// Grade a submission
router.post('/grade/:submissionId',
  validateObjectId('submissionId'),
  validateGradeSubmission,
  submissionController.gradeSubmission
);

export default router;
