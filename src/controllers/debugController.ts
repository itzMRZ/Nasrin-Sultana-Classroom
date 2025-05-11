// filepath: c:\Users\meher\Desktop\Classroom-master\ClassroomTS\src\controllers\debugController.ts
import { Request, Response } from 'express';

// Simple debug route to test template rendering with known values
export const testClassDetails = (req: Request, res: Response): void => {
  // Create a simple mock class object with all required fields
  const mockClass = {
    _id: '123456789012345678901234',
    name: 'Test Class',
    subject: 'Test Subject',
    section: 'A1',
    room: '101',
    inviteCode: 'ABC123',
    createdBy: {
      _id: '123456789012345678901235',
      firstName: 'Test',
      lastName: 'Teacher',
      email: 'teacher@example.com'
    },
    students: [],
    assignments: []
  };

  // Log what we're about to send
  console.log('Debug controller sending mock class:', JSON.stringify(mockClass));

  // Set data both ways to be safe
  res.locals.classItem = mockClass;
    // Render with direct data object - use the simplified version
  res.render('class/details-new', {
    title: 'Debug - ' + mockClass.name,
    classItem: mockClass,
    isTeacher: true,
    user: req.session.user || null
  });
};
