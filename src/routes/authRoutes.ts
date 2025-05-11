import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

// Register routes
router.get('/register', authController.getRegisterPage);
router.post('/register', authController.register);

// Login routes
router.get('/login', authController.getLoginPage);
router.post('/login', authController.login);

// Logout route
router.get('/logout', authController.logout);

export default router;
