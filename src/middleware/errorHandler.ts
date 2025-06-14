import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error details (in production, use proper logging service)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }
  
  // HIPAA compliance: Don't expose sensitive information
  const response = {
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred processing your request' 
        : message,
      statusCode,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'N/A',
    }
  };
  
  res.status(statusCode).json(response);
};

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}