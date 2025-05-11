// filepath: c:\Users\meher\Desktop\Classroom-master\ClassroomTS\src\controllers\simpleViewController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Class from '../models/Class';

// A completely separate controller that focuses on simplicity and reliability
export const getSimpleClassView = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check authentication
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const classId = req.params.id;
    const userId = req.session.user.id;

    console.log('Simple view controller looking up class:', classId);

    // Validate ID format to avoid DB errors
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400).render('error', {
        title: 'Invalid ID',
        user: req.session.user,
        message: 'The class ID is not valid'
      });
      return;
    }

    // Find the class and populate needed fields
    const classData = await Class.findById(classId)
      .populate('createdBy', 'firstName lastName email')
      .populate('students', 'firstName lastName email')
      .lean();

    if (!classData) {
      res.status(404).render('error', {
        title: 'Class Not Found',
        user: req.session.user,
        message: 'The requested class was not found'
      });
      return;
    }    // Defensive conversion to simple data structure with explicit type checks and conversions
    const simpleClass = {
      id: classData && classData._id ? String(classData._id) : '',
      name: classData && typeof classData.name === 'string' ? classData.name : 'Class',
      subject: classData && typeof classData.subject === 'string' ? classData.subject : 'No Subject',
      section: classData && typeof classData.section === 'string' ? classData.section : 'No Section',
      room: classData && classData.room ? String(classData.room) : '',
      inviteCode: String(classData.inviteCode || ''),
      teacher: {
        id: classData.createdBy && classData.createdBy._id ? String(classData.createdBy._id) : '',
        name: classData.createdBy ?
          `${classData.createdBy.firstName || ''} ${classData.createdBy.lastName || ''}`.trim() :
          'Unknown Teacher'
      },
      studentCount: Array.isArray(classData.students) ? classData.students.length : 0
    };

    // Check if user is teacher or student    // Ultra-defensive way to check if user is authorized (teacher or student)
    let isTeacher = false;
    let isStudent = false;

    try {
      // Check if user is teacher - with multiple safety checks
      if (classData &&
          classData.createdBy &&
          typeof classData.createdBy === 'object' &&
          classData.createdBy._id) {

        const teacherId = String(classData.createdBy._id);
        isTeacher = teacherId === userId;
        console.log('Teacher check:', { teacherId, userId, isTeacher });
      }

      // Check if user is student - with multiple safety checks
      if (classData &&
          Array.isArray(classData.students) &&
          classData.students.length > 0) {

        isStudent = classData.students.some(student => {
          return student &&
                typeof student === 'object' &&
                student._id &&
                String(student._id) === userId;
        });
        console.log('Student check result:', isStudent);
      }
    } catch (err) {
      console.error('Error checking user role:', err);
    }

    if (!isTeacher && !isStudent) {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'You are not authorized to view this class'
      });
      return;
    }

    // Render with a simple view and explicit data
    res.render('class/simple', {
      title: simpleClass.name,
      user: req.session.user,
      classData: simpleClass,
      isTeacher: isTeacher,
      debugData: process.env.NODE_ENV === 'development' ? JSON.stringify(simpleClass) : null
    });

  } catch (error) {
    console.error('Error in simple view controller:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      user: req.session.user || null,
      message: 'An unexpected error occurred'
    });
  }
};
