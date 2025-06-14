import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  
  const key = req.ip || 'unknown';
  const now = Date.now();
  
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
  } else {
    store[key].count++;
  }
  
  if (store[key].count > maxRequests) {
    res.status(429).json({
      error: {
        message: 'Too many requests',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      },
    });
    return;
  }
  
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - store[key].count).toString());
  res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());
  
  next();
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000);