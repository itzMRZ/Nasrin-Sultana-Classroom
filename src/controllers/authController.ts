import { Request, Response } from 'express';
import User from '../models/User';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      res.status(400).render('auth/register', {
        title: 'Register',
        error: 'Username or email already exists',
        user: null
      });
      return;
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role ?? 'student'
    });

    await user.save();

    // Store user in session
    req.session.user = {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role
    };

    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).render('auth/register', {
      title: 'Register',
      error: 'An error occurred during registration',
      user: null
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists
    if (!user) {
      res.status(401).render('auth/login', {
        error: 'Invalid email or password',
        user: null
      });
      return;
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).render('auth/login', {
        error: 'Invalid email or password',
        user: null
      });
      return;
    }

    // Store user in session
    req.session.user = {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role
    };

    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('auth/login', {
      error: 'An error occurred during login',
      user: null
    });
  }
};

export const logout = (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login');
  });
};

export const getRegisterPage = (req: Request, res: Response): void => {
  if (req.session.user) {
    res.redirect('/');
    return;
  }
  res.render('auth/register', {
    title: 'Register',
    user: null,
    error: null
  });
};

export const getLoginPage = (req: Request, res: Response): void => {
  if (req.session.user) {
    res.redirect('/');
    return;
  }
  res.render('auth/login', {
    title: 'Login',
    user: null,
    error: null
  });
};
