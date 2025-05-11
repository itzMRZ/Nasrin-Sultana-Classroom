// filepath: c:\Users\meher\Desktop\Classroom-master\ClassroomTS\src\controllers\directViewController.ts
import { Request, Response } from 'express';
import Class from '../models/Class';

// Export the types from models to ensure our type definitions are accurate
import { IClass, IUser } from '../types';

// This controller takes a completely different approach by:
// 1. Explicitly converting MongoDB objects to plain objects
// 2. Creating a simple JS object with only what's needed
// 3. Using a simplified template
export const viewClassById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const classId = req.params.id;
    const userId = req.session.user.id;

    console.log('Looking up class with ID:', classId);

    // Get the class from the database
    const classData = await Class.findById(classId)
      .populate('createdBy', 'firstName lastName email')
      .populate('students', 'firstName lastName email')
      .lean();

    if (!classData) {
      console.log('Class not found');
      res.status(404).send('Class not found');
      return;
    }

    // Convert MongoDB ObjectId to string
    const classInfo = {
      id: classData._id.toString(),
      name: classData.name || 'Untitled Class',
      subject: classData.subject || '',
      section: classData.section || '',
      room: classData.room || '',
      inviteCode: classData.inviteCode || '',
      teacherName: classData.createdBy && typeof classData.createdBy === 'object'
        ? `${classData.createdBy.firstName || ''} ${classData.createdBy.lastName || ''}`.trim()
        : 'Unknown Teacher',
      teacherId: classData.createdBy && typeof classData.createdBy === 'object' && classData.createdBy._id
        ? classData.createdBy._id.toString()
        : '',
      studentCount: Array.isArray(classData.students) ? classData.students.length : 0
    };

    // Check if user is authorized (teacher or student)
    const isTeacher = classData.createdBy &&
      classData.createdBy._id &&
      classData.createdBy._id.toString() === userId;

    const isStudent = Array.isArray(classData.students) &&
      classData.students.some(s => s && s._id && s._id.toString() === userId);

    if (!isTeacher && !isStudent) {
      console.log('User not authorized to view this class');
      res.status(403).send('You are not authorized to view this class');
      return;
    }

    console.log('Rendering simple class view with data:', JSON.stringify(classInfo));

    // Use a completely separate template with no complex data access
    res.render('class/simple-view', {
      title: classInfo.name,
      class: classInfo,
      role: isTeacher ? 'teacher' : 'student',
      user: req.session.user,
      // Include raw data for debugging
      rawData: JSON.stringify(classInfo)
    });
  } catch (error) {
    console.error('Error in direct class view controller:', error);
    res.status(500).send('An error occurred. Please try again later.');
  }
};
