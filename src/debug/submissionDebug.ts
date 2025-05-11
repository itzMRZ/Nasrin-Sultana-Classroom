/**
 * This file provides utility functions to debug submission-related issues.
 * Run using: ts-node --transpile-only src/debug/submissionDebug.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import models - using dynamic import to avoid circular dependencies
const importModels = async () => {
  const Submission = (await import('../models/Submission')).default;
  const Assignment = (await import('../models/Assignment')).default;
  const User = (await import('../models/User')).default;
  const Class = (await import('../models/Class')).default;
  return { Submission, Assignment, User, Class };
};

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/classroom';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

// Debug function: List all submissions with their paths
const listSubmissions = async () => {
  const { Submission, Assignment, User } = await importModels();

  try {
    const submissions = await Submission.find()
      .populate('assignment')
      .populate('student', 'firstName lastName email')
      .lean();

    console.log('\n=== All Submissions ===');
    console.log(`Total submissions: ${submissions.length}\n`);

    submissions.forEach(sub => {
      console.log(`ID: ${sub._id}`);
      console.log(`Student: ${sub.student?.firstName} ${sub.student?.lastName}`);
      console.log(`Assignment: ${sub.assignment?.title || 'Unknown'}`);
      console.log(`Grade: ${sub.isGraded ? `${sub.grade}/points` : 'Not graded'}`);
      console.log(`View URL: /submission/view/${sub._id}`);
      console.log(`Grade URL: /submission/grade/${sub._id}`);
      console.log(`Is Late: ${sub.isLate ? 'Yes' : 'No'}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error listing submissions:', error);
  }
};

// Debug function: Check for route conflicts
const checkRoutePatterns = () => {
  const submissionRoutes = [
    { method: 'GET', path: '/submission/test', handler: 'testRoute' },
    { method: 'POST', path: '/submission/:assignmentId', handler: 'createSubmission' },
    { method: 'GET', path: '/submission/:assignmentId/all', handler: 'getSubmissions' },
    { method: 'GET', path: '/submission/:assignmentId/my', handler: 'getStudentSubmission' },
    { method: 'GET', path: '/submission/view/:submissionId', handler: 'viewSubmissionDetails' },
    { method: 'POST', path: '/submission/grade/:submissionId', handler: 'gradeSubmission' }
  ];

  console.log('\n=== Route Pattern Analysis ===');

  // Check for potential conflicts
  const paramRoutes = submissionRoutes.filter(r => r.path.includes(':'));
  const staticSegments = submissionRoutes.map(r => {
    const segments = r.path.split('/').filter(Boolean);
    return segments.filter(s => !s.startsWith(':'));
  });

  // Look for routes where one might be mistaken for another
  console.log('Potential route conflicts:');
  let conflicts = false;

  for (let i = 0; i < paramRoutes.length; i++) {
    for (let j = i + 1; j < paramRoutes.length; j++) {
      const route1 = paramRoutes[i];
      const route2 = paramRoutes[j];

      // Basic segment count check
      const segs1 = route1.path.split('/').filter(Boolean);
      const segs2 = route2.path.split('/').filter(Boolean);

      if (segs1.length === segs2.length && route1.method === route2.method) {
        // Same method, same number of segments - potential conflict
        const staticSegs1 = segs1.filter(s => !s.startsWith(':'));
        const staticSegs2 = segs2.filter(s => !s.startsWith(':'));
        const paramSegs1 = segs1.filter(s => s.startsWith(':'));
        const paramSegs2 = segs2.filter(s => s.startsWith(':'));

        const similarStatic = staticSegs1.some(s => staticSegs2.includes(s));
        const sameParamCount = paramSegs1.length === paramSegs2.length;

        if (similarStatic && sameParamCount) {
          console.log(`⚠️  ${route1.method} ${route1.path} (${route1.handler}) might conflict with`);
          console.log(`   ${route2.method} ${route2.path} (${route2.handler})`);
          conflicts = true;
        }
      }
    }
  }

  if (!conflicts) {
    console.log('✅ No obvious route conflicts detected');
  }

  // Print route parameter usage
  console.log('\nRoute parameters:');
  const params = new Set();
  paramRoutes.forEach(r => {
    const segments = r.path.split('/');
    segments.forEach(s => {
      if (s.startsWith(':')) {
        params.add(s);
      }
    });
  });

  params.forEach(p => {
    console.log(`- ${p}`);
  });
};

// Main debug function
const runDebug = async () => {
  console.log('=== Submission System Debug ===');

  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    console.log('Aborting debug due to database connection failure.');
    return;
  }

  // Check routes for conflicts
  checkRoutePatterns();

  // List all submissions
  await listSubmissions();

  // Exit
  console.log('\nDebug completed. Exiting...');
  process.exit(0);
};

// Run the debug
runDebug().catch(err => {
  console.error('Debug failed:', err);
  process.exit(1);
});
