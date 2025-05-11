// src/types/express.d.ts

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      email: string;
      role: string;
      // Add other user properties you store in the session
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      flash(type: string, message?: any): any;
      user?: any; // If you are using Passport.js and it attaches user here
    }
  }
}

// This export is necessary to make it a module, even if it's empty.
export {};
