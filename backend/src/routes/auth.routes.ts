import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/index.js';

const router = Router();

// Public routes
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/register', authenticate, authorize('ADMIN'), authController.register);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, authController.changePassword);

// 2FA routes
router.post('/2fa/setup', authenticate, authorize('ADMIN', 'DIRECTOR'), authController.setup2FA);
router.post('/2fa/verify', authenticate, authController.verify2FA);
router.post('/2fa/disable', authenticate, authController.disable2FA);

export default router;
