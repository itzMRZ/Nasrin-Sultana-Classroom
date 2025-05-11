import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

/**
 * Middleware to validate MongoDB ObjectId parameters
 * @param paramName The name of the parameter to validate
 */
export const validateObjectId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const paramValue = req.params[paramName];

    if (!paramValue) {
      console.error(`Missing ${paramName} parameter`);
      return res.status(400).render('400', {
        title: 'Bad Request',
        user: req.session.user,
        message: `Missing required parameter: ${paramName}`,
        page: 'error'
      });
    }

    if (!Types.ObjectId.isValid(paramValue)) {
      console.error(`Invalid ${paramName} format: ${paramValue}`);
      return res.status(400).render('400', {
        title: 'Bad Request',
        user: req.session.user,
        message: `Invalid ${paramName} format`,
        page: 'error'
      });
    }

    next();
  };
};

/**
 * Middleware to validate grade submission data
 */
export const validateGradeSubmission = (req: Request, res: Response, next: NextFunction) => {
  const { grade, feedback } = req.body;
  const errors = [];

  if (grade === undefined || grade === '') {
    errors.push('Grade is required');
  } else {
    const parsedGrade = parseFloat(grade);
    if (isNaN(parsedGrade) || parsedGrade < 0) {
      errors.push('Grade must be a positive number');
    }
  }

  if (errors.length > 0) {
    req.flash('error_msg', errors.join(', '));
    return res.redirect(`/submission/view/${req.params.submissionId}`);
  }

  next();
};
