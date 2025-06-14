import { Router } from 'express';
import verificationRoutes from './verification.routes';
import providerRoutes from './provider.routes';
import insuranceRoutes from './insurance.routes';

const router = Router();

// API documentation
router.get('/', (_req, res) => {
  res.json({
    message: 'ClearVerify API v1',
    endpoints: {
      verification: '/api/v1/verification',
      providers: '/api/v1/providers',
      insurance: '/api/v1/insurance',
      health: '/health',
    },
    documentation: 'https://docs.clearverify.com',
  });
});

// Mount routes
router.use('/verification', verificationRoutes);
router.use('/providers', providerRoutes);
router.use('/insurance', insuranceRoutes);

export default router;