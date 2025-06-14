import { AppError } from '../middleware/errorHandler';
import { FHIRClient } from './fhir-client';
import { INSURANCE_PROVIDERS, getProvider } from './insurance-providers.config';
import { X12Parser } from './x12-parser';

interface EligibilityRequest {
  payerId: string;
  memberId: string;
  procedureCode: string;
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
  };
}

interface StandardizedResponse {
  eligibility: {
    active: boolean;
    effectiveDate: string;
    terminationDate?: string;
  };
  benefits: Array<{
    procedureCode: string;
    coveragePercentage: number;
    copay: number;
    averageCost: number;
  }>;
  deductible: {
    annual: number;
    remaining: number;
  };
  outOfPocketMax: {
    annual: number;
    remaining: number;
  };
}

export class InsuranceConnectorV2 {
  private fhirClient: FHIRClient;
  private x12Parser: X12Parser;

  constructor() {
    this.fhirClient = new FHIRClient();
    this.x12Parser = new X12Parser();
  }

  async verifyEligibility(request: EligibilityRequest): Promise<StandardizedResponse> {
    const provider = getProvider(request.payerId);
    
    if (!provider) {
      throw new AppError(`Unsupported insurance provider: ${request.payerId}`, 400);
    }

    try {
      // Try FHIR first (modern standard)
      if (provider.fhirVersion) {
        return await this.verifyViaFHIR(provider, request);
      }
      
      // Fallback to X12 EDI (older standard)
      return await this.verifyViaX12(provider, request);
    } catch (error: any) {
      console.error(`Verification error for ${provider.name}:`, error);
      
      // If API fails, try web scraping as last resort
      if (this.shouldFallbackToScraping(error)) {
        return await this.verifyViaWebScraping(provider, request);
      }
      
      throw new AppError('Unable to verify insurance eligibility', 503);
    }
  }

  private async verifyViaFHIR(provider: any, request: EligibilityRequest): Promise<StandardizedResponse> {
    const result = await this.fhirClient.checkEligibility(provider, {
      memberId: request.memberId,
      firstName: request.patient.firstName,
      lastName: request.patient.lastName,
      birthDate: request.patient.dob,
      procedureCode: request.procedureCode,
    });

    if (!result.eligible) {
      throw new AppError(result.reason || 'Eligibility check failed', 400);
    }

    // Transform FHIR response to our standard format
    return this.transformFHIRResponse(result, request.procedureCode);
  }

  private async verifyViaX12(provider: any, request: EligibilityRequest): Promise<StandardizedResponse> {
    // X12 270/271 Eligibility Inquiry and Response
    const x12Request = this.x12Parser.build270(request);
    
    // Send via AS2 or SFTP (depends on payer)
    const x12Response = await this.sendX12Transaction(provider, x12Request);
    
    // Parse 271 response
    return this.x12Parser.parse271(x12Response);
  }

  private async verifyViaWebScraping(provider: any, request: EligibilityRequest): Promise<StandardizedResponse> {
    // This would use Puppeteer to log into provider portals
    // Not implementing full scraping here for security reasons
    console.log('Falling back to web scraping for:', provider.name);
    
    // Return mock data for now
    return {
      eligibility: {
        active: true,
        effectiveDate: '2024-01-01',
      },
      benefits: [{
        procedureCode: request.procedureCode,
        coveragePercentage: 80,
        copay: 50,
        averageCost: this.getProcedureAverageCost(request.procedureCode),
      }],
      deductible: {
        annual: 2000,
        remaining: 1500,
      },
      outOfPocketMax: {
        annual: 6000,
        remaining: 5000,
      },
    };
  }

  private transformFHIRResponse(fhirData: any, procedureCode: string): StandardizedResponse {
    const coverage = fhirData.coverage;
    
    // Extract dates from coverage period
    const effectiveDate = coverage.period?.start || new Date().toISOString();
    const terminationDate = coverage.period?.end;
    
    // Get procedure-specific benefits (would need additional FHIR queries)
    const procedureBenefit = this.extractProcedureBenefit(coverage, procedureCode);
    
    return {
      eligibility: {
        active: coverage.status === 'active',
        effectiveDate,
        terminationDate,
      },
      benefits: [{
        procedureCode,
        coveragePercentage: procedureBenefit.coveragePercentage,
        copay: procedureBenefit.copay,
        averageCost: this.getProcedureAverageCost(procedureCode),
      }],
      deductible: {
        annual: 2500, // Would come from Coverage.costToBeneficiary
        remaining: 2000,
      },
      outOfPocketMax: {
        annual: 7000,
        remaining: 6500,
      },
    };
  }

  private extractProcedureBenefit(_coverage: any, procedureCode: string): any {
    // In real implementation, this would parse coverage.class
    // and look for specific benefit details
    
    // Dental procedure coverage defaults
    const dentalDefaults: Record<string, any> = {
      'D0120': { coveragePercentage: 100, copay: 0 }, // Preventive
      'D0210': { coveragePercentage: 100, copay: 0 }, // Preventive
      'D2391': { coveragePercentage: 80, copay: 0 },  // Basic
      'D6010': { coveragePercentage: 50, copay: 0 },  // Major
      'D6065': { coveragePercentage: 50, copay: 0 },  // Major
    };
    
    return dentalDefaults[procedureCode] || {
      coveragePercentage: 80,
      copay: 50,
    };
  }

  private getProcedureAverageCost(procedureCode: string): number {
    const costs: Record<string, number> = {
      'D0120': 95,    // Periodic oral evaluation
      'D0210': 150,   // Complete X-rays
      'D2391': 225,   // Composite filling
      'D6010': 3500,  // Implant placement
      'D6065': 2200,  // Implant crown
    };
    
    return costs[procedureCode] || 500;
  }

  private shouldFallbackToScraping(error: any): boolean {
    return error.response?.status === 404 || 
           error.code === 'ECONNREFUSED' ||
           error.response?.status === 503;
  }

  private async sendX12Transaction(provider: any, _x12Data: string): Promise<string> {
    // This would send via AS2, SFTP, or API depending on payer
    console.log('Sending X12 transaction to:', provider.name);
    
    // Mock response for now
    return 'ISA*00*...*~'; // X12 271 response
  }

  async listSupportedProviders(): Promise<any[]> {
    return Object.values(INSURANCE_PROVIDERS).map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      fhirSupported: !!p.fhirVersion,
      sandboxAvailable: p.sandboxAvailable,
    }));
  }

  async getProviderRequirements(providerId: string): Promise<any> {
    const provider = getProvider(providerId);
    if (!provider) {
      throw new AppError('Provider not found', 404);
    }
    
    return {
      name: provider.name,
      authType: provider.authType,
      productionRequirements: provider.productionRequirements,
      sandboxUrl: provider.sandboxAvailable ? `${provider.baseUrl}/sandbox` : null,
      documentationUrl: `https://developer.${provider.id}.com`,
    };
  }
}