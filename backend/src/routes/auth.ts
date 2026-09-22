import express from 'express';
import { AuthController } from '@/controllers/authController';
import { authenticateToken } from '@/utils/auth';

const router = express.Router();
const authController = new AuthController();

// Public routes
router.post('/register',   authController.register.bind(authController));
router.post('/login',      authController.login.bind(authController));
router.post('/login-name', authController.loginByName.bind(authController));
router.post('/login-admin', authController.loginAdmin.bind(authController));
router.post('/logout',     authController.logout.bind(authController));

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));
router.put('/profile', authenticateToken, authController.updateProfile.bind(authController));
router.post('/change-password', authenticateToken, authController.changePassword.bind(authController));

export default router;