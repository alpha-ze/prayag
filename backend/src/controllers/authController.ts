import { Request, Response } from 'express';
import { AuthService } from '@/services/authService';
import { registerSchema, loginSchema, loginByNameSchema } from '@/utils/validation';
import { generateToken } from '@/utils/auth';
import { ApiResponse } from '@/types';
import jwt from 'jsonwebtoken';

const authService = new AuthService();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Fixed admin identity — always the same UUID so admin never appears in leaderboard
const ADMIN_USER_ID = '00000000-0000-0000-0000-admin0000001';
const ADMIN_PIN = process.env.ADMIN_PIN || 'admin1234';   // set ADMIN_PIN in .env to override
const nameRegistry = new Map<string, string>();

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);
      
      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          token: result.token,
        },
        message: 'User registered successfully',
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
      
      res.status(400).json(response);
    }
  }

  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);
      
      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          token: result.token,
        },
        message: 'Login successful',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
      
      res.status(401).json(response);
    }
  }

  // ── Name-only login ────────────────────────────────────────────────────────
  // Players just type their name — no email or password needed.
  // Returns the same userId for the same name so leaderboard entries persist.
  async loginByName(req: Request, res: Response) {
    try {
      const { username } = loginByNameSchema.parse(req.body);

      const key = username.toLowerCase();

      // Reuse existing userId if the name was seen before this session
      let userId = nameRegistry.get(key);
      if (!userId) {
        userId = generateUUID();
        nameRegistry.set(key, userId);
      }

      const user = {
        id: userId,
        email: `${key.replace(/\s+/g, '_')}@player.local`,
        username,
        role: 'participant' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`✅ Name login: "${username}" → userId ${userId}`);

      const response: ApiResponse = {
        success: true,
        data: { user, token },
        message: `Welcome, ${username}!`,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Name login error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
      res.status(400).json(response);
    }
  }

  // ── Admin PIN login ────────────────────────────────────────────────────────
  async loginAdmin(req: Request, res: Response) {
    try {
      const { pin } = req.body;

      if (!pin || pin !== ADMIN_PIN) {
        return res.status(401).json({ success: false, error: 'Invalid admin PIN' });
      }

      const adminUser = {
        id: ADMIN_USER_ID,
        email: 'admin@promptx.internal',
        username: 'Admin',
        role: 'admin' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwt.sign(
        { userId: adminUser.id, email: adminUser.email, username: adminUser.username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      console.log('🔐 Admin login successful');

      res.status(200).json({
        success: true,
        data: { user: adminUser, token },
        message: 'Admin login successful',
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  }

  async logout(req: Request, res: Response) {    try {
      // In a JWT setup, logout is typically handled client-side
      // For session-based auth, you would destroy the session here
      
      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Logout error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Logout failed',
      };
      
      res.status(500).json(response);
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { user },
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Get profile error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get profile',
      };
      
      res.status(500).json(response);
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const updates = req.body;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const updatedUser = await authService.updateUser(user.id, updates);
      
      const response: ApiResponse = {
        success: true,
        data: { user: updatedUser },
        message: 'Profile updated successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Update profile error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      };
      
      res.status(400).json(response);
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { currentPassword, newPassword } = req.body;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
        });
      }

      await authService.changePassword(user.id, currentPassword, newPassword);
      
      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Change password error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change password',
      };
      
      res.status(400).json(response);
    }
  }
}