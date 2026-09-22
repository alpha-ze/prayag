import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

export interface AuthRequest extends Request {
  user?: User;
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: User): string => {
  const payload = {
    userId: user.id,
    email: user.email || '',
    username: user.username,
    role: user.role,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    
    // In a real app, you might want to fetch the full user from the database
    // For now, we'll use the token payload
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username || decoded.email.split('@')[0],
      role: decoded.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  next();
};

export const requireParticipant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.role !== 'participant') {
    return res.status(403).json({ success: false, error: 'Participant access required' });
  }

  next();
};

// Optional authentication - adds user to request if token is valid, but doesn't reject if not
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username || decoded.email.split('@')[0],
        role: decoded.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch (error) {
    // Ignore token errors for optional auth
    console.log('Optional auth failed:', error.message);
  }
  
  next();
};