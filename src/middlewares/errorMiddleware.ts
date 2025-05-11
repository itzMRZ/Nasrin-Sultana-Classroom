// src/middlewares/errorMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  logger.warn(`404 Not Found: ${req.originalUrl}`, {
    method: req.method,
    ip: req.ip,
    headers: req.headers
  });
  res.status(404);
  next(error);
};

/**
 * Custom error interface with status code
 */
interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (
  err: ErrorWithStatusCode,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set the status code (default to 500 if not specified)
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  // Log the error
  logger.error(`Error: ${err.message}`, {
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body
  });

  // Return error response
  if (process.env.NODE_ENV === 'production') {
    // In production, don't expose the stack trace
    if (statusCode === 404) {
      res.render('404', {
        title: '404 - Page Not Found',
        user: req.session.user
      });
    } else {
      res.render('error', {
        title: 'Error',
        user: req.session.user,
        message: err.message || 'An unexpected error occurred'
      });
    }
  } else {
    // In development, include more details
    res.render('error', {
      title: 'Error',
      user: req.session.user,
      message: err.message || 'An unexpected error occurred',
      stack: err.stack,
      status: statusCode
    });
  }
};
