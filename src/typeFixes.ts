// Fix TypeScript type errors
// This script uses our MongoDB helpers from mongooseHelpers.ts to fix type issues

import { Request, Response } from 'express';
import Assignment from './models/Assignment';
import Class from './models/Class';
import Submission from './models/Submission';
import User from './models/User';
import path from 'path';
import fs from 'fs';
import { arrayIncludes, objectIdToString, getDocumentId } from './utils/mongooseHelpers';

// Assignment Controller Functions
export const getAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const classId = req.params.classId;
    const userId = req.session.user.id;

    // Get class details and check permissions
    const classItem = await Class.findById(classId);
    if (!classItem) {
      res.status(404).render('error', {
        title: 'Class Not Found', 
        user: req.session.user,
        message: 'The requested class was not found'
      });
      return;
    }

    // Check if user is authorized for this class
    const isTeacher = objectIdToString(classItem.createdBy) === userId;
    const isStudent = arrayIncludes(classItem.students as any[], userId);

    if (!isTeacher && !isStudent) {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'You are not a member of this class'
      });
      return;
    }

    // Get assignments
    const assignments = await Assignment.find({ class: classId })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

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

// Class Controller Functions
export const getClassDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const classId = req.params.id;
    const userId = req.session.user.id;

    const classItem = await Class.findById(classId)
      .populate('createdBy', 'firstName lastName email')
      .populate('students', 'firstName lastName email');

    if (!classItem) {
      res.status(404).render('error', {
        title: 'Class Not Found',
        user: req.session.user,
        message: 'The requested class was not found'
      });
      return;
    }

    // Check permissions
    const isTeacher = objectIdToString(classItem.createdBy) === userId;
    const isStudent = (classItem.students as any[])
      .some(student => objectIdToString(student) === userId);

    if (!isTeacher && !isStudent) {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'You are not a member of this class'
      });
      return;
    }

    res.render('class/details', {
      title: classItem.name,
      user: req.session.user,
      class: classItem,
      isTeacher
    });
  } catch (error) {
    console.error('Error fetching class details:', error);
    res.status(500).render('error', {
      title: 'Error',
      user: req.session.user,
      message: 'Failed to load class details'
    });
  }
};

// Auth Controller Functions
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;
    
    // Check for existing users
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      res.status(400).render('auth/register', {
        error: 'Username or email already exists',
        user: null
      });
      return;
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'student'
    });

    await user.save();

    // Set session
    req.session.user = {
      id: objectIdToString(user._id),
      username: user.username,
      email: user.email,
      role: user.role
    };

    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).render('auth/register', {
      error: 'An error occurred during registration',
      user: null
    });
  }
};
