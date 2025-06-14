import { Router, Request, Response } from 'express';
import { InsuranceConnector } from '../../integrations/insurance.connector';

const router = Router();
const insuranceConnector = new InsuranceConnector();

// Get list of supported insurance providers
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = await insuranceConnector.listSupportedProviders();
    
    res.json({
      success: true,
      data: providers.map(p => ({
        id: p.id,
        name: p.name,
        supported: true,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch providers',
    });
  }
});

// Get procedure codes
router.get('/procedures', (_req: Request, res: Response) => {
  // This would typically query a database of CPT codes
  res.json({
    success: true,
    data: [
      { code: 'D0120', description: 'Periodic oral evaluation' },
      { code: 'D0210', description: 'Complete series of radiographic images' },
      { code: 'D2391', description: 'Resin-based composite - one surface, posterior' },
      { code: 'D6010', description: 'Surgical placement of implant body' },
      { code: 'D6065', description: 'Implant supported porcelain/ceramic crown' },
      // Add more procedure codes
    ],
  });
});

// Search procedure codes
router.get('/procedures/search', (req: Request, res: Response) => {
  const { q } = req.query;
  
  // Mock search implementation - would filter by q
  console.log('Search query:', q);
  res.json({
    success: true,
    data: [],
  });
});

export default router;