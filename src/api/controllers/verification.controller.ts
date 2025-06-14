import { Request, Response, NextFunction } from 'express';
import { VerificationService } from '../../services/verification.service';
import { ContainerService } from '../../services/container.service';
import { AppError } from '../../middleware/errorHandler';

export class VerificationController {
  private verificationService: VerificationService;
  private containerService: ContainerService;

  constructor() {
    this.verificationService = new VerificationService();
    this.containerService = new ContainerService();
  }

  instantVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        patientInfo,
        insuranceInfo,
        procedureCode,
        providerId,
      } = req.body;

      // Create ephemeral container for processing
      const containerId = await this.containerService.createVerificationContainer();

      try {
        // Process verification in isolated container
        const result = await this.verificationService.verifyInsurance({
          containerId,
          patientInfo,
          insuranceInfo,
          procedureCode,
          providerId,
        });

        // Send results
        res.json({
          success: true,
          data: {
            verificationId: result.verificationId,
            status: result.status,
            coverage: {
              isProcedureCovered: result.coverage.isProcedureCovered,
              coveragePercentage: result.coverage.coveragePercentage,
              deductible: {
                annual: result.coverage.deductible.annual,
                remaining: result.coverage.deductible.remaining,
              },
              outOfPocketMax: {
                annual: result.coverage.outOfPocketMax.annual,
                remaining: result.coverage.outOfPocketMax.remaining,
              },
              copay: result.coverage.copay,
              estimatedPatientCost: result.coverage.estimatedPatientCost,
            },
            eligibility: result.eligibility,
            timestamp: new Date().toISOString(),
            signedBy: result.signedBy, // Cryptographic signature from insurer
          },
        });

        // Log for HIPAA compliance (without PHI)
        await this.verificationService.logVerification({
          verificationId: result.verificationId,
          timestamp: new Date(),
          success: true,
        });

      } finally {
        // Always destroy container after use
        await this.containerService.destroyContainer(containerId);
      }

    } catch (error) {
      next(error);
    }
  };

  getVerificationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { verificationId } = req.params;
      
      const status = await this.verificationService.getStatus(verificationId);
      
      if (!status) {
        throw new AppError('Verification not found', 404);
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  };

  batchVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { verifications } = req.body;
      
      // Process multiple verifications in parallel
      const results = await Promise.all(
        verifications.map(async (verification: any) => {
          const containerId = await this.containerService.createVerificationContainer();
          
          try {
            return await this.verificationService.verifyInsurance({
              containerId,
              ...verification,
            });
          } finally {
            await this.containerService.destroyContainer(containerId);
          }
        })
      );

      res.json({
        success: true,
        data: {
          totalProcessed: results.length,
          successful: results.filter(r => r.status === 'completed').length,
          failed: results.filter(r => r.status === 'failed').length,
          results,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getVerificationHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { providerId } = (req as any).user;
      const { page = 1, limit = 20 } = req.query;

      const history = await this.verificationService.getHistory({
        providerId,
        page: Number(page),
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  initiatePreAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { verificationId, additionalInfo } = req.body;

      const preAuth = await this.verificationService.startPreAuthorization({
        verificationId,
        additionalInfo,
      });

      res.json({
        success: true,
        data: {
          preAuthId: preAuth.id,
          status: preAuth.status,
          estimatedProcessingTime: preAuth.estimatedProcessingTime,
          trackingUrl: preAuth.trackingUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}