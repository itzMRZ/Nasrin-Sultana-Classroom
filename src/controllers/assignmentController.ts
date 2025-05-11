import { Request, Response } from 'express';
import Assignment from '../models/Assignment';
import Class, { IClass } from '../models/Class'; // Import IClass
import { IUser } from '../models/User';
import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose'; // Import Types

// Helper to safely convert ObjectId to string
const objectIdToString = (id: any): string | undefined => {
  if (id instanceof Types.ObjectId) {
    return id.toString();
  }
  if (typeof id === 'string') {
    return id;
  }
  if (id && typeof id.toString === 'function') {
    return id.toString();
  }
  return undefined;
};

// Helper to check if an array of ObjectIds (or strings) includes a specific ObjectId (or string)
const arrayIncludes = (arr: (Types.ObjectId | string | IUser)[], value: Types.ObjectId | string): boolean => {
    const valueStr = objectIdToString(value);
    if (!valueStr) return false;
    return arr.some(item => {
        if (typeof item === 'string' || item instanceof Types.ObjectId) {
            return objectIdToString(item) === valueStr;
        }
        // If item is IUser, compare its _id
        if (item && typeof item === 'object' && '_id' in item) {
            return objectIdToString((item as IUser)._id) === valueStr;
        }
        return false;
    });
};


export const getAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = req.params.classId;
    console.log(`Entering getAssignments for classId: ${classId}`);

    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    // Verify the class exists
    const classItem = await Class.findById(classId).populate<{ createdBy: IUser }>('createdBy').lean() as (IClass & { createdBy: IUser }) | null;
    if (!classItem) {
      res.status(404).render('error', {
        title: 'Class Not Found',
        user: req.session.user,
        message: 'The requested class was not found'
      });
      return;
    }
    const userId = req.session.user.id;
    const teacherId = classItem.createdBy?._id ? objectIdToString(classItem.createdBy._id) : undefined;
    const isTeacher = teacherId === userId;
    const isStudent = arrayIncludes(classItem.students as Types.ObjectId[], userId as unknown as Types.ObjectId);


    if (!isTeacher && !isStudent) {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'You are not a member of this class'
      });
      return;
    }

    // Get assignments for this class
    const assignments = await Assignment.find({ class: classId })
      .populate<{ createdBy: IUser }>('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    res.render('assignment/list', {
      title: 'Assignments',
      user: req.session.user,
      class: classItem,
      assignments,
      isTeacher
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).render('error', {
      title: 'Error',
      user: req.session.user,
      message: 'Failed to load assignments'
    });
  }
};

export const getCreateAssignmentPage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const classId = req.params.classId;
    const userId = req.session.user.id;

    // Get class details
    const classItem = await Class.findById(classId).populate<{ createdBy: IUser }>('createdBy').lean() as (IClass & { createdBy: IUser }) | null;

    if (!classItem) {
      res.status(404).render('error', {
        title: 'Class Not Found',
        user: req.session.user,
        message: 'The requested class was not found'
      });
      return;
    }

    // Check if user is the teacher of the class
    const teacherId = classItem.createdBy?._id ? objectIdToString(classItem.createdBy._id) : undefined;
    if (teacherId !== userId) {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'Only the teacher can create assignments'
      });
      return;
    }

    res.render('assignment/create', {
      title: 'Create Assignment',
      user: req.session.user,
      class: classItem
    });
  } catch (error) {
    console.error('Error loading create assignment page:', error);
    res.status(500).render('error', {
      title: 'Error',
      user: req.session.user,
      message: 'Failed to load create assignment page'
    });
  }
};

export const createAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const classId = req.params.classId;
    const userId = req.session.user.id;

    // Get class details
    const classItem = await Class.findById(classId).populate<{ createdBy: IUser }>('createdBy').lean() as (IClass & { createdBy: IUser }) | null;

    if (!classItem) {
      res.status(404).render('error', {
        title: 'Class Not Found',
        user: req.session.user,
        message: 'The requested class was not found'
      });
      return;
    }

    // Check if user is the teacher of the class
    const teacherId = classItem.createdBy?._id ? objectIdToString(classItem.createdBy._id) : undefined;
    if (teacherId !== userId) {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'Only the teacher can create assignments'
      });
      return;
    }

    const { title, description, dueDate, points } = req.body;
    const files = req.files as Express.Multer.File[];

    // Process uploaded files (if any)
    const attachments: string[] = [];
    if (files && files.length > 0) {
      const uploadDir = path.join(__dirname, '../../public/uploads/assignments', classId);
      if (!fs.existsSync(uploadDir)){
          fs.mkdirSync(uploadDir, { recursive: true });
      }
      files.forEach(file => {
        const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, file.buffer);
        attachments.push(`/uploads/assignments/${classId}/${filename}`);
      });
    }

    // Create new assignment
    const assignment = new Assignment({
      title,
      description,
      dueDate,
      points: points ?? 100, // Using nullish coalescing
      attachments,
      class: classId,
      createdBy: userId
    });

    await assignment.save();
    console.log(`Redirecting to /class/${classId} after assignment creation.`); // Updated log for new redirect target
    res.redirect(`/class/${classId}`); // Changed redirect to the class details page
  } catch (error) {
    console.error('Error creating assignment:', error);
    const classId = req.params.classId; // Ensure classId is available for redirect in error case
    req.flash('error_msg', 'Failed to create assignment. Please try again.');
    // Redirect back to the create assignment page or a general error page if classId is not available
    if (classId) {
        res.redirect(`/assignment/create/${classId}`);
    } else {
        // Fallback if classId is somehow lost, though it should be present from req.params
        res.status(500).render('error', {
            title: 'Error',
            user: req.session.user,
            message: 'Failed to create assignment due to an unexpected error.'
        });
    }
  }
};

export const getAssignmentDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const assignmentId = req.params.id;
    const userId = req.session.user.id;

    // Get assignment with class details
    const assignment = await Assignment.findById(assignmentId)
      .populate<{ createdBy: IUser }>('createdBy', 'firstName lastName')
      .populate<{ class: IClass & { createdBy: IUser, students: IUser[] } }>({
          path: 'class',
          populate: { path: 'createdBy students' , select: 'firstName lastName email profileImage username _id'} // Populate teacher and students of the class
      })
      .lean();

    if (!assignment) {
      res.status(404).render('error', {
        title: 'Assignment Not Found',
        user: req.session.user,
        message: 'The requested assignment was not found'
      });
      return;
    }

    const classItem = assignment.class;

    if (!classItem || typeof classItem !== 'object' || !classItem.createdBy || !classItem.students) {
        res.status(500).render('error', {
            title: 'Error',
            user: req.session.user,
            message: 'Failed to load assignment details due to incomplete class data.'
        });
        return;
    }

    const teacherId = classItem.createdBy?._id ? objectIdToString(classItem.createdBy._id) : undefined;
    const isTeacher = teacherId === userId;
    const isStudent = arrayIncludes(classItem.students as IUser[], userId as unknown as Types.ObjectId);
    if (!isTeacher && !isStudent) {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'You are not a member of this class'
      });
      return;
    }

    res.render('assignment/details', {
      title: assignment.title,
      user: req.session.user,
      assignment,
      isTeacher: isTeacher, // Variable named to match what's expected in the template
      isClassTeacher: isTeacher // Keeping this for backward compatibility
    });
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    res.status(500).render('error', {
      title: 'Error',
      user: req.session.user,
      message: 'Failed to load assignment details'
    });
  }
};
