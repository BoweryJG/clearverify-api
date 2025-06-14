import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';

const router = Router();

// All provider endpoints require authentication
router.use(authenticate);

// Get provider profile
router.get('/profile', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      providerId: (req as any).user.providerId,
      // Additional provider details
    },
  });
});

// Update provider settings
router.put('/settings', authorize('provider', 'admin'), (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Settings updated',
  });
});

// Get provider statistics
router.get('/stats', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalVerifications: 0,
      successRate: 0,
      averageResponseTime: 0,
    },
  });
});

export default router;