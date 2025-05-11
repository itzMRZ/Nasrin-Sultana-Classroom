import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

export const isTeacher = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session && req.session.user && req.session.user.role === 'teacher') {
    return next();
  }
  res.status(403).render('error', {
    title: 'Access Denied',
    user: req.session.user || null,
    message: 'Only teachers can access this resource'
  });
};

export const isStudent = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session && req.session.user && req.session.user.role === 'student') {
    return next();
  }
  res.status(403).render('error', {
    title: 'Access Denied',
    user: req.session.user || null,
    message: 'Only students can access this resource'
  });
};
