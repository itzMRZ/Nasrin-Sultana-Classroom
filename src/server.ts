import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import expressLayouts from 'express-ejs-layouts';
import flash from 'connect-flash';

// Import custom type declarations - ensure this path is correct if you move express.d.ts
// TypeScript declaration files (.d.ts) are only used at compile time and don't need to be imported at runtime
// Routes
import authRoutes from './routes/authRoutes';
import classRoutes from './routes/classRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import submissionRoutes from './routes/submissionRoutes';
import userRoutes from './routes/userRoutes';

// Utils
import { createUploadsDirectory } from './utils/fileSystem';
import logger from './utils/logger';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorMiddleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/classroom')
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
  });

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('trust proxy', 1); // Trust first proxy for secure cookies on Render

app.use(session({
  secret: process.env.SESSION_SECRET ?? 'super_secret_key_for_session_that_is_very_long_and_secure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true, // Recommended for security
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
  }
}));

// Flash middleware - Initialized after session middleware
app.use(flash());

// Global variables for views (flash messages, user session)
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error'); // For general errors (e.g., from Passport)
  res.locals.user = req.session.user ?? null;
  res.locals.currentPath = req.path;
  next();
});

// Set security headers
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self'; media-src 'self' data:;"
  );

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'same-origin');

  next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Simple request logger middleware
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Create uploads directory if it doesn't exist
createUploadsDirectory();

// Add request logging for easier debugging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/class', classRoutes);
app.use('/assignment', assignmentRoutes);
app.use('/submission', submissionRoutes);
app.use('/profile', userRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Classroom Management System',
  });
});

// Test MongoDB connection status
app.get('/dbstatus', (req, res) => {
  const status = mongoose.connection.readyState; // 0: disconnected, 1: connected, etc.
  res.json({ connected: status === 1, status });
});

// Shields.io badge endpoint for DB status
app.get('/dbstatus-badge', async (req, res) => {
  try {
    // Fetch local /dbstatus endpoint
    const fetch = (await import('node-fetch')).default;
    const url = `${req.protocol}://${req.get('host')}/dbstatus`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.connected === true && data.status === 1) {
      res.json({
        schemaVersion: 1,
        label: 'db',
        message: 'connected',
        color: 'green'
      });
    } else {
      res.json({
        schemaVersion: 1,
        label: 'db',
        message: 'disconnected',
        color: 'red'
      });
    }
  } catch (err) {
    res.json({
      schemaVersion: 1,
      label: 'db',
      message: 'error',
      color: 'red'
    });
  }
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
