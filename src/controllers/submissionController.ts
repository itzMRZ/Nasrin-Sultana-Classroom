import { Request, Response } from 'express';
import Submission, { ISubmission } from '../models/Submission';
import Assignment, { IAssignment } from '../models/Assignment';
import Class, { IClass } from '../models/Class';
import User, { IUser } from '../models/User';
import { Types } from 'mongoose';
// File upload utility will be dynamically imported where needed

/**
 * Helper function to handle errors consistently across controller methods
 * @param error The error that occurred
 * @param res Express response object
 * @param message Custom message for the user
 * @param req Express request object (optional)
 */
const handleControllerError = (error: any, res: Response, message: string, req?: Request): void => {
  console.error(`Error in submission controller: ${message}`, error);

  if (req?.flash) {
    req.flash('error_msg', message);
  }

  res.status(500).render('500', {
    title: 'Server Error',
    user: req?.session?.user || null,
    message: message,
    page: 'error'
  });
};

// Test route to confirm routing is working
export const testRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).send({
      message: 'Test route is working!',
      params: req.params,
      query: req.query,
      user: req.session.user ? { id: req.session.user.id } : null
    });
  } catch (error) {
    handleControllerError(error, res, 'Test route failed');
  }
};

export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const assignmentId = req.params.assignmentId;
    const userId = req.session.user.id;

    const assignment = await Assignment.findById(assignmentId).populate<{ class: IClass }>('class');

    if (!assignment) {
      res.status(404).render('404', {
        title: 'Assignment Not Found',
        user: req.session.user,
        message: 'The requested assignment was not found',
        page: 'error'
      });
      return;
    }

    const classItem = assignment.class;
    if (!classItem.students.includes(userId as unknown as Types.ObjectId)) {
      res.status(403).render('403', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'You are not enrolled in this class',
        page: 'error'
      });
      return;
    }
    const { content } = req.body;
    const files = req.files as Express.Multer.File[];

    // Use the utility function to save uploaded files
    const attachments: string[] = [];
    try {
      if (files && files.length > 0) {
        const savedFiles = await import('../utils/fileUpload').then(
          module => module.saveUploadedFiles(files)
        );
        attachments.push(...savedFiles);
      }
    } catch (error) {
      console.error('Error saving uploaded files:', error);
      req.flash('error_msg', 'There was a problem uploading your files. Please try again.');
      res.redirect(`/assignment/${assignmentId}`);
      return;
    }

    let submission = await Submission.findOne({
      assignment: assignmentId,
      student: userId
    });

    if (submission) {
      submission.content = content;
      if (attachments.length > 0) {
        submission.attachments = [...submission.attachments, ...attachments];
      }
      await submission.save();
    } else {
      submission = new Submission({
        assignment: assignmentId,
        student: userId,
        content,
        attachments
      });
      await submission.save();
    }

    res.redirect(`/assignment/${assignmentId}`);
  } catch (error) {
    handleControllerError(error, res, 'Failed to create submission', req);
  }
};

export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const assignmentId = req.params.assignmentId;
    const userId = req.session.user.id;

    const assignment = await Assignment.findById(assignmentId)
      .populate<{ class: IClass & { students: IUser[] } }>({
        path: 'class',
        populate: {
          path: 'students',
          select: 'firstName lastName email'
        }
      });

    if (!assignment) {
      res.status(404).render('404', {
        title: 'Assignment Not Found',
        user: req.session.user,
        message: 'The requested assignment was not found',
        page: 'error'
      });
      return;
    }

    const classItem = assignment.class;
    if ((classItem.createdBy as Types.ObjectId).toString() !== userId) {
      res.status(403).render('403', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'Only the teacher can view all submissions',
        page: 'error'
      });
      return;
    }

    const submissions = await Submission.find({ assignment: assignmentId })
      .populate<{ student: Pick<IUser, 'firstName' | 'lastName' | 'email'> } >('student', 'firstName lastName email');

    res.render('submission/list', {
      title: 'Submissions',
      user: req.session.user,
      assignment,
      submissions,
      class: classItem,
      page: 'submission-list'
    });
  } catch (error) {
    handleControllerError(error, res, 'Failed to load submissions', req);
  }
};

export const gradeSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`Entering gradeSubmission with params:`, req.params);
    console.log(`Grade submission body:`, req.body);

    if (!req.session.user) {
      console.log('No user in session, redirecting to login');
      res.redirect('/auth/login');
      return;
    }

    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const userId = req.session.user.id;

    console.log(`Processing grade for submission ID: ${submissionId} by user ID: ${userId}`);
    console.log(`Grade: ${grade}, Feedback length: ${feedback ? feedback.length : 0}`);

    const submission = await Submission.findById(submissionId)
      .populate<{ assignment: IAssignment & { class: IClass } }>({
        path: 'assignment',
        populate: {
          path: 'class'
        }
      });

    if (!submission) {
      console.log(`Submission not found with ID: ${submissionId}`);
      res.status(404).render('404', {
        title: 'Submission Not Found',
        user: req.session.user,
        message: 'The requested submission was not found',
        page: 'error'
      });
      return;
    }

    const populatedAssignment = submission.assignment;
    if (!populatedAssignment) {
        console.log('Assignment data not found in submission');
        res.status(404).render('404', { title: 'Error', user: req.session.user, message: 'Assignment data not found for this submission.', page: 'error'});
        return;
    }
    const classItem = populatedAssignment.class;
    if (!classItem) {
        console.log('Class data not found in submission');
        res.status(404).render('404', { title: 'Error', user: req.session.user, message: 'Class data not found for this submission.', page: 'error'});
        return;
    }

    if ((classItem.createdBy as Types.ObjectId).toString() !== userId) {
      console.log('Access denied: User is not the teacher');
      res.status(403).render('403', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'Only the teacher can grade submissions',
        page: 'error'
      });
      return;
    }
    // Validate grade is within range
    const assignmentPoints = populatedAssignment.points || 100;
    const parsedGrade = parseFloat(grade);

    if (isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > assignmentPoints) {
      console.log(`Invalid grade value: ${grade}. Must be between 0 and ${assignmentPoints}`);
      req.flash('error_msg', `Grade must be between 0 and ${assignmentPoints} points`);
      res.redirect(`/submission/view/${submissionId}`);
      return;
    }

    submission.grade = parsedGrade;
    submission.feedback = feedback;
    submission.isGraded = true;
    await submission.save();
    console.log(`Grade saved successfully. Redirecting to finish page`);
    // Instead of redirecting to the list, show a success page
    res.render('submission/finish', {
      title: 'Grade Submitted',
      user: req.session.user,
      message: 'The submission has been graded successfully!',
      submission,
      assignment: populatedAssignment,
      student: submission.student,
      assignmentId: (populatedAssignment._id as Types.ObjectId).toString(),
      page: 'submission-finish'
    });
  } catch (error) {
    handleControllerError(error, res, 'Failed to grade submission', req);
  }
};

export const getStudentSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const assignmentId = req.params.assignmentId;
    const userId = req.session.user.id;

    const assignment = await Assignment.findById(assignmentId).populate<{ class: IClass }>('class');
    if (!assignment) {
      res.status(404).render('404', {
        title: 'Assignment Not Found',
        user: req.session.user,
        message: 'The requested assignment was not found',
        page: 'error'
      });
      return;
    }

    const submission = await Submission.findOne({
      assignment: assignmentId,
      student: userId
    }).populate<{ student: IUser }>('student', 'firstName lastName email profileImage');

    const populatedStudent = submission ? submission.student : null;
    const classItem = assignment.class;

    res.render('submission/details', {
      title: submission ? 'My Submission' : 'Submit to Assignment',
      user: req.session.user,
      assignment,
      submission,
      student: populatedStudent,
      isTeacher: false,
      class: classItem,
      page: 'submission-details' // Corrected: page is a string literal
    });
  } catch (error) {
    handleControllerError(error, res, 'Failed to load your submission', req);
  }
};

export const viewSubmissionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`Entering viewSubmissionDetails with params:`, req.params);

    if (!req.session.user) {
      console.log('No user in session, redirecting to login');
      res.redirect('/auth/login');
      return;
    }

    const { submissionId } = req.params;
    const userId = req.session.user.id;
    console.log(`Processing submission ID: ${submissionId} for user ID: ${userId}`);

    const submission = await Submission.findById(submissionId)
      .populate<{ assignment: IAssignment & { class: IClass }; student: IUser }>([
        {
            path: 'assignment',
            populate: {
                path: 'class'
            }
        },
        {
            path: 'student', select: 'firstName lastName email profileImage'
        }
      ]);

    console.log(`Submission found:`, submission ? 'Yes' : 'No');

    if (!submission) {
      console.log(`Submission not found with ID: ${submissionId}`);
      res.status(404).render('404', {
        title: 'Submission Not Found',
        user: req.session.user,
        message: 'The requested submission was not found',
        page: 'error'
      });
      return;
    }

    const typedSubmission = submission as ISubmission & {
        assignment: IAssignment & { class: IClass };
        student: IUser;
    };

    const populatedAssignment = typedSubmission.assignment;
    if (!populatedAssignment) {
        console.log('Assignment data not found in submission');
        res.status(404).render('404', { title: 'Error', user: req.session.user, message: 'Assignment data not found for this submission.', page: 'error'});
        return;
    }
    const populatedStudent = typedSubmission.student;
    if (!populatedStudent) {
        console.log('Student data not found in submission');
        res.status(404).render('404', { title: 'Error', user: req.session.user, message: 'Student data not found for this submission.', page: 'error'});
        return;
    }
    const classItem = populatedAssignment.class;
     if (!classItem) {
        console.log('Class data not found in submission');
        res.status(404).render('404', { title: 'Error', user: req.session.user, message: 'Class data not found for this submission.', page: 'error'});
        return;
    }

    const isStudentOwner = (populatedStudent._id as Types.ObjectId).toString() === userId;
    const isClassTeacher = (classItem.createdBy as Types.ObjectId).toString() === userId;
    console.log(`Access check: isStudentOwner=${isStudentOwner}, isClassTeacher=${isClassTeacher}`);

    if (!isStudentOwner && !isClassTeacher) {
      console.log('Access denied: User is neither the student nor the teacher');
      res.status(403).render('403', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'You are not authorized to view this submission',
        page: 'error'
      });
      return;
    }

    console.log('Rendering submission/details view');
    res.render('submission/details', {
      title: 'Submission Details',
      user: req.session.user,
      submission: typedSubmission,
      assignment: populatedAssignment,
      class: classItem,
      student: populatedStudent,
      isTeacher: isClassTeacher,
      page: 'submission-details'
    });

  } catch (error) {
    handleControllerError(error, res, 'Failed to load submission details', req);
  }
};
