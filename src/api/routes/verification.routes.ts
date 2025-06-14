import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const controller = new VerificationController();

// Public endpoints (for patients)
router.post('/instant', validateRequest('verifyInsurance'), controller.instantVerification);
router.get('/status/:verificationId', controller.getVerificationStatus);

// Protected endpoints (for providers)
router.use(authenticate);
router.post('/batch', validateRequest('batchVerification'), controller.batchVerification);
router.get('/history', controller.getVerificationHistory);
router.post('/pre-auth', validateRequest('preAuthorization'), controller.initiatePreAuth);

export default router;