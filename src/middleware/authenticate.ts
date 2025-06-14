import { Request, Response, NextFunction } from 'express';
import { CryptoService } from '../services/crypto.service';
import { AppError } from './errorHandler';

interface AuthRequest extends Request {
  user?: {
    id: string;
    providerId: string;
    role: string;
  };
}

const cryptoService = new CryptoService();

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = cryptoService.verifyToken(token);
      
      req.user = {
        id: decoded.id,
        providerId: decoded.providerId,
        role: decoded.role,
      };
      
      next();
    } catch (error) {
      throw new AppError('Invalid authentication token', 401);
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    
    next();
  };
};