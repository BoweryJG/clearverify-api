import { InsuranceConnector } from '../integrations/insurance.connector';
import { CryptoService } from './crypto.service';
import { CacheService } from './cache.service';
import { v4 as uuidv4 } from 'uuid';

interface VerificationRequest {
  containerId: string;
  patientInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    memberId?: string;
  };
  insuranceInfo: {
    payerId: string;
    planId?: string;
    groupNumber?: string;
  };
  procedureCode: string;
  providerId?: string;
}

interface VerificationResult {
  verificationId: string;
  status: 'completed' | 'failed' | 'pending';
  coverage: {
    isProcedureCovered: boolean;
    coveragePercentage: number;
    deductible: {
      annual: number;
      remaining: number;
    };
    outOfPocketMax: {
      annual: number;
      remaining: number;
    };
    copay: number;
    estimatedPatientCost: number;
  };
  eligibility: {
    isActive: boolean;
    effectiveDate: string;
    terminationDate?: string;
  };
  signedBy: string;
}

export class VerificationService {
  private insuranceConnector: InsuranceConnector;
  private cryptoService: CryptoService;
  private cacheService: CacheService;

  constructor() {
    this.insuranceConnector = new InsuranceConnector();
    this.cryptoService = new CryptoService();
    this.cacheService = new CacheService();
  }

  async verifyInsurance(request: VerificationRequest): Promise<VerificationResult> {
    const verificationId = uuidv4();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult) {
      return {
        ...cachedResult,
        verificationId,
      } as VerificationResult;
    }

    try {
      // Connect to insurance provider API
      const insurerResponse = await this.insuranceConnector.verifyEligibility({
        payerId: request.insuranceInfo.payerId,
        memberId: request.patientInfo.memberId || '',
        procedureCode: request.procedureCode,
        patient: {
          firstName: request.patientInfo.firstName,
          lastName: request.patientInfo.lastName,
          dob: request.patientInfo.dateOfBirth,
        },
      });

      // Process and calculate costs
      const coverage = this.calculateCoverage(insurerResponse, request.procedureCode);
      
      // Create result
      const result: VerificationResult = {
        verificationId,
        status: 'completed',
        coverage,
        eligibility: {
          isActive: insurerResponse.eligibility.active,
          effectiveDate: insurerResponse.eligibility.effectiveDate,
          terminationDate: insurerResponse.eligibility.terminationDate,
        },
        signedBy: await this.cryptoService.signData({
          verificationId,
          timestamp: new Date().toISOString(),
          payerId: request.insuranceInfo.payerId,
        }),
      };

      // Cache result for 1 hour
      await this.cacheService.set(cacheKey, result, 3600);

      return result;
    } catch (error) {
      console.error('Verification failed:', error);
      
      return {
        verificationId,
        status: 'failed',
        coverage: {
          isProcedureCovered: false,
          coveragePercentage: 0,
          deductible: { annual: 0, remaining: 0 },
          outOfPocketMax: { annual: 0, remaining: 0 },
          copay: 0,
          estimatedPatientCost: 0,
        },
        eligibility: {
          isActive: false,
          effectiveDate: '',
        },
        signedBy: 'verification-failed',
      };
    }
  }

  private calculateCoverage(insurerData: any, procedureCode: string): VerificationResult['coverage'] {
    // Extract coverage details from insurer response
    const procedureCoverage = insurerData.benefits.find(
      (b: any) => b.procedureCode === procedureCode
    );

    if (!procedureCoverage) {
      return {
        isProcedureCovered: false,
        coveragePercentage: 0,
        deductible: {
          annual: insurerData.deductible.annual || 0,
          remaining: insurerData.deductible.remaining || 0,
        },
        outOfPocketMax: {
          annual: insurerData.outOfPocketMax.annual || 0,
          remaining: insurerData.outOfPocketMax.remaining || 0,
        },
        copay: 0,
        estimatedPatientCost: 0,
      };
    }

    // Calculate patient responsibility
    const procedureCost = procedureCoverage.averageCost || 0;
    const coveragePercent = procedureCoverage.coveragePercentage || 80;
    const deductibleRemaining = insurerData.deductible.remaining || 0;
    
    let patientCost = 0;
    
    // Apply deductible first
    if (deductibleRemaining > 0) {
      const deductiblePortion = Math.min(deductibleRemaining, procedureCost);
      patientCost += deductiblePortion;
    }
    
    // Apply coinsurance to remaining amount
    const afterDeductible = Math.max(0, procedureCost - deductibleRemaining);
    const coinsurance = afterDeductible * (1 - coveragePercent / 100);
    patientCost += coinsurance;
    
    // Add copay if applicable
    const copay = procedureCoverage.copay || 0;
    patientCost += copay;
    
    // Cap at out-of-pocket maximum
    const oopRemaining = insurerData.outOfPocketMax.remaining || Infinity;
    patientCost = Math.min(patientCost, oopRemaining);

    return {
      isProcedureCovered: true,
      coveragePercentage: coveragePercent,
      deductible: {
        annual: insurerData.deductible.annual || 0,
        remaining: insurerData.deductible.remaining || 0,
      },
      outOfPocketMax: {
        annual: insurerData.outOfPocketMax.annual || 0,
        remaining: insurerData.outOfPocketMax.remaining || 0,
      },
      copay,
      estimatedPatientCost: Math.round(patientCost * 100) / 100,
    };
  }

  private generateCacheKey(request: VerificationRequest): string {
    return `verify:${request.insuranceInfo.payerId}:${request.patientInfo.memberId}:${request.procedureCode}`;
  }

  async getStatus(verificationId: string): Promise<any> {
    // Implementation for retrieving verification status
    return this.cacheService.get(`status:${verificationId}`);
  }

  async getHistory(params: any): Promise<any> {
    // Implementation for retrieving verification history
    // This would typically query a database
    return {
      total: 0,
      page: params.page,
      limit: params.limit,
      results: [],
    };
  }

  async startPreAuthorization(_params: any): Promise<any> {
    // Implementation for initiating pre-authorization
    return {
      id: uuidv4(),
      status: 'pending',
      estimatedProcessingTime: '24-48 hours',
      trackingUrl: `https://clearverify.com/track/${uuidv4()}`,
    };
  }

  async logVerification(_params: any): Promise<void> {
    // HIPAA-compliant audit logging
    console.log('Audit log:', {
      verificationId: _params.verificationId,
      timestamp: _params.timestamp,
      success: _params.success,
      // No PHI logged
    });
  }
}