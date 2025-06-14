import axios, { AxiosInstance } from 'axios';
import { AppError } from '../middleware/errorHandler';

interface EligibleRequest {
  payerId: string;
  memberId: string;
  procedureCode: string;
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
  };
}

interface EligibleResponse {
  success: boolean;
  data: {
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
  };
}

export class EligibleConnector {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ELIGIBLE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('ELIGIBLE_API_KEY not found. Using demo mode.');
    }

    this.client = axios.create({
      baseURL: 'https://gds.eligibleapi.com/v1.5',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  async verifyEligibility(request: EligibleRequest): Promise<EligibleResponse> {
    if (!this.apiKey) {
      return this.getMockResponse(request);
    }

    try {
      // Map our request to Eligible.com format
      const eligibleRequest = {
        service_types: ['30'], // General health benefits
        member: {
          first_name: request.patient.firstName,
          last_name: request.patient.lastName,
          dob: request.patient.dob,
          id: request.memberId
        },
        provider: {
          npi: '1234567890', // Would come from practice settings
          first_name: 'Practice',
          last_name: 'Provider'
        },
        trading_partner_id: this.mapPayerToTradingPartner(request.payerId)
      };

      const response = await this.client.post('/coverage.json', eligibleRequest);
      
      return this.transformEligibleResponse(response.data, request.procedureCode);
    } catch (error: any) {
      console.error('Eligible API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new AppError('Invalid API credentials', 401);
      }
      
      if (error.response?.status === 402) {
        throw new AppError('Insufficient API credits', 402);
      }
      
      // Fallback to mock data if API fails
      console.log('Falling back to demo data due to API error');
      return this.getMockResponse(request);
    }
  }

  private mapPayerToTradingPartner(payerId: string): string {
    // Map our internal payer IDs to Eligible.com trading partner IDs
    const mapping: Record<string, string> = {
      'bcbs_florida': 'florida_blue',
      'bcbs_california': 'blue_shield_ca',
      'cigna': 'cigna',
      'united_optum': 'united_healthcare',
      'aetna': 'aetna',
      'humana': 'humana',
      'anthem': 'anthem',
      'kaiser': 'kaiser',
      'delta_dental': 'delta_dental',
      'metlife': 'metlife'
    };

    return mapping[payerId] || 'unknown';
  }

  private transformEligibleResponse(eligibleData: any, procedureCode: string): EligibleResponse {
    const coverage = eligibleData.coverage || {};
    const subscriber = coverage.subscriber || {};
    const benefits = coverage.benefits || [];

    // Extract eligibility status
    const isActive = coverage.eligibility?.status === 'active' || 
                     coverage.eligibility?.status === '1' ||
                     subscriber.eligibility?.status === 'active';

    // Find procedure-specific benefits
    const procedureBenefit = this.findProcedureBenefit(benefits, procedureCode);
    
    // Extract deductible information
    const deductibleInfo = this.extractDeductible(benefits);
    const oopInfo = this.extractOutOfPocketMax(benefits);

    return {
      success: true,
      data: {
        eligibility: {
          active: isActive,
          effectiveDate: coverage.eligibility?.dates?.effective || 
                        subscriber.eligibility?.dates?.effective || 
                        new Date().toISOString().split('T')[0],
          terminationDate: coverage.eligibility?.dates?.termination ||
                          subscriber.eligibility?.dates?.termination
        },
        benefits: [{
          procedureCode,
          coveragePercentage: procedureBenefit.coveragePercentage,
          copay: procedureBenefit.copay,
          averageCost: this.getProcedureAverageCost(procedureCode)
        }],
        deductible: deductibleInfo,
        outOfPocketMax: oopInfo
      }
    };
  }

  private findProcedureBenefit(benefits: any[], procedureCode: string): any {
    // Look for procedure-specific benefits in Eligible response
    const dentalBenefit = benefits.find(b => 
      b.service_type === '2' || // Dental care
      b.service_type === 'dental' ||
      b.procedure_code === procedureCode
    );

    if (dentalBenefit) {
      return {
        coveragePercentage: this.parseCoveragePercentage(dentalBenefit),
        copay: this.parseCopay(dentalBenefit)
      };
    }

    // Fallback to procedure defaults
    return this.getDefaultProcedureBenefit(procedureCode);
  }

  private parseCoveragePercentage(benefit: any): number {
    // Parse coverage percentage from various Eligible formats
    if (benefit.insurance_type_code === 'HM') return 100; // HMO typically 100%
    if (benefit.coinsurance_percent) return 100 - parseFloat(benefit.coinsurance_percent);
    if (benefit.coverage_level) {
      const level = benefit.coverage_level.toLowerCase();
      if (level.includes('100')) return 100;
      if (level.includes('80')) return 80;
      if (level.includes('50')) return 50;
    }
    
    // Default based on procedure category
    return this.getDefaultProcedureBenefit('').coveragePercentage;
  }

  private parseCopay(benefit: any): number {
    if (benefit.copayment) return parseFloat(benefit.copayment.amount || '0');
    if (benefit.copay) return parseFloat(benefit.copay);
    return 0;
  }

  private extractDeductible(benefits: any[]): { annual: number; remaining: number } {
    const deductibleBenefit = benefits.find(b => 
      b.deductible || b.benefit_amount?.period === 'year'
    );

    if (deductibleBenefit?.deductible) {
      return {
        annual: parseFloat(deductibleBenefit.deductible.amount || '0'),
        remaining: parseFloat(deductibleBenefit.deductible.remaining || deductibleBenefit.deductible.amount || '0')
      };
    }

    return { annual: 1500, remaining: 1200 }; // Reasonable defaults
  }

  private extractOutOfPocketMax(benefits: any[]): { annual: number; remaining: number } {
    const oopBenefit = benefits.find(b => 
      b.out_of_pocket || b.stop_loss || b.benefit_amount?.qualifier === 'out_of_pocket'
    );

    if (oopBenefit?.out_of_pocket) {
      return {
        annual: parseFloat(oopBenefit.out_of_pocket.amount || '0'),
        remaining: parseFloat(oopBenefit.out_of_pocket.remaining || oopBenefit.out_of_pocket.amount || '0')
      };
    }

    return { annual: 6000, remaining: 5000 }; // Reasonable defaults
  }

  private getDefaultProcedureBenefit(procedureCode: string): any {
    // Dental procedure coverage defaults
    const dentalDefaults: Record<string, any> = {
      'D0120': { coveragePercentage: 100, copay: 0 }, // Preventive
      'D0210': { coveragePercentage: 100, copay: 0 }, // Preventive
      'D2391': { coveragePercentage: 80, copay: 0 },  // Basic
      'D6010': { coveragePercentage: 50, copay: 0 },  // Major
      'D6065': { coveragePercentage: 50, copay: 0 },  // Major
      'D7210': { coveragePercentage: 80, copay: 0 },  // Basic
      'D2740': { coveragePercentage: 50, copay: 0 },  // Major
      'D5110': { coveragePercentage: 50, copay: 0 }   // Major
    };
    
    return dentalDefaults[procedureCode] || { coveragePercentage: 80, copay: 25 };
  }

  private getProcedureAverageCost(procedureCode: string): number {
    const costs: Record<string, number> = {
      'D0120': 95,    // Periodic oral evaluation
      'D0210': 150,   // Complete X-rays
      'D2391': 225,   // Composite filling
      'D6010': 3500,  // Implant placement
      'D6065': 2200,  // Implant crown
      'D7210': 180,   // Simple extraction
      'D2740': 1200,  // Crown
      'D5110': 2500   // Complete denture
    };
    
    return costs[procedureCode] || 500;
  }

  private getMockResponse(request: EligibleRequest): EligibleResponse {
    const procedureBenefit = this.getDefaultProcedureBenefit(request.procedureCode);
    
    return {
      success: true,
      data: {
        eligibility: {
          active: true,
          effectiveDate: '2024-01-01'
        },
        benefits: [{
          procedureCode: request.procedureCode,
          coveragePercentage: procedureBenefit.coveragePercentage,
          copay: procedureBenefit.copay,
          averageCost: this.getProcedureAverageCost(request.procedureCode)
        }],
        deductible: {
          annual: 1500,
          remaining: 1200
        },
        outOfPocketMax: {
          annual: 6000,
          remaining: 5000
        }
      }
    };
  }

  async getSupportedPayers(): Promise<any[]> {
    if (!this.apiKey) {
      return this.getMockPayers();
    }

    try {
      const response = await this.client.get('/payers.json');
      return response.data.payers || [];
    } catch (error) {
      console.error('Error fetching payers:', error);
      return this.getMockPayers();
    }
  }

  private getMockPayers(): any[] {
    return [
      { id: 'bcbs_florida', name: 'Florida Blue', supported: true },
      { id: 'cigna', name: 'Cigna', supported: true },
      { id: 'united_optum', name: 'UnitedHealthcare', supported: true },
      { id: 'aetna', name: 'Aetna', supported: true },
      { id: 'humana', name: 'Humana', supported: true }
    ];
  }
}