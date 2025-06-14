import axios from 'axios';
import { AppError } from '../middleware/errorHandler';
import { InsuranceConnectorV2 } from './insurance.connector.v2';
import { ClearinghouseConnector } from './clearinghouse.connector';

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

interface InsuranceProvider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiVersion: string;
  authType: 'oauth' | 'apikey' | 'basic';
}

export class InsuranceConnector {
  private providers: Map<string, InsuranceProvider>;
  private apiClients: Map<string, any>;
  private v2Connector: InsuranceConnectorV2;
  private clearinghouseConnector: ClearinghouseConnector;

  constructor() {
    this.providers = new Map();
    this.apiClients = new Map();
    this.v2Connector = new InsuranceConnectorV2();
    this.clearinghouseConnector = new ClearinghouseConnector();
    this.initializeProviders();
  }

  private initializeProviders() {
    // Top 5 insurance providers configuration
    const providers: InsuranceProvider[] = [
      {
        id: 'bcbs',
        name: 'Blue Cross Blue Shield',
        apiEndpoint: 'https://api.bcbs.com',
        apiVersion: 'v2',
        authType: 'oauth',
      },
      {
        id: 'united',
        name: 'UnitedHealth',
        apiEndpoint: 'https://api.uhc.com',
        apiVersion: 'v1',
        authType: 'apikey',
      },
      {
        id: 'cigna',
        name: 'Cigna',
        apiEndpoint: 'https://api.cigna.com',
        apiVersion: 'v3',
        authType: 'oauth',
      },
      {
        id: 'aetna',
        name: 'Aetna',
        apiEndpoint: 'https://api.aetna.com',
        apiVersion: 'v2',
        authType: 'apikey',
      },
      {
        id: 'humana',
        name: 'Humana',
        apiEndpoint: 'https://api.humana.com',
        apiVersion: 'v1',
        authType: 'basic',
      },
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
      this.apiClients.set(provider.id, this.createApiClient(provider));
    });
  }

  private createApiClient(provider: InsuranceProvider) {
    const client = axios.create({
      baseURL: `${provider.apiEndpoint}/${provider.apiVersion}`,
      timeout: 10000,
      headers: {
        'User-Agent': 'ClearVerify/1.0',
        'Accept': 'application/json',
      },
    });

    // Add authentication based on provider
    client.interceptors.request.use(async (config) => {
      switch (provider.authType) {
        case 'apikey':
          config.headers['X-API-Key'] = process.env[`${provider.id.toUpperCase()}_API_KEY`];
          break;
        case 'oauth':
          const token = await this.getOAuthToken(provider.id);
          config.headers['Authorization'] = `Bearer ${token}`;
          break;
        case 'basic':
          const credentials = Buffer.from(
            `${process.env[`${provider.id.toUpperCase()}_USERNAME`]}:${process.env[`${provider.id.toUpperCase()}_PASSWORD`]}`
          ).toString('base64');
          config.headers['Authorization'] = `Basic ${credentials}`;
          break;
      }
      return config;
    });

    return client;
  }

  async verifyEligibility(request: EligibilityRequest): Promise<any> {
    // Check if we should use clearinghouse (faster for production)
    if (process.env.USE_CLEARINGHOUSE === 'true') {
      try {
        return await this.clearinghouseConnector.verifyEligibility({
          payerId: request.payerId,
          memberId: request.memberId,
          patientFirstName: request.patient.firstName,
          patientLastName: request.patient.lastName,
          patientDOB: request.patient.dob,
          procedureCode: request.procedureCode,
          providerId: process.env.PROVIDER_NPI || 'DEFAULT',
        });
      } catch (error) {
        console.error('Clearinghouse failed, falling back to direct API:', error);
      }
    }

    // Use V2 connector for supported providers
    const v2Providers = ['bcbs_florida', 'bcbs_ca', 'united_optum', 'cigna', 'aetna', 'humana', 'anthem', 'kaiser'];
    if (v2Providers.includes(request.payerId)) {
      return this.v2Connector.verifyEligibility(request);
    }

    // Legacy connector for backward compatibility
    const client = this.apiClients.get(request.payerId);
    
    if (!client) {
      throw new AppError(`Unsupported insurance provider: ${request.payerId}`, 400);
    }

    try {
      // Each provider has different API formats
      const response = await this.callProviderAPI(request.payerId, request);
      return this.normalizeResponse(request.payerId, response);
    } catch (error: any) {
      console.error(`Insurance API error for ${request.payerId}:`, error.message);
      
      // Fallback to web scraping if API fails
      if (this.shouldFallbackToScraping(error)) {
        return this.fallbackToWebScraping(request);
      }
      
      throw new AppError('Unable to verify insurance eligibility', 503);
    }
  }

  private async callProviderAPI(payerId: string, request: EligibilityRequest): Promise<any> {
    const client = this.apiClients.get(payerId);
    
    // Provider-specific endpoint mapping
    const endpoints: Record<string, string> = {
      bcbs: '/eligibility/verify',
      united: '/coverage/check',
      cigna: '/benefits/eligibility',
      aetna: '/member/eligibility',
      humana: '/verify/coverage',
    };

    const endpoint = endpoints[payerId];
    
    // Transform request to provider-specific format
    const providerRequest = this.transformRequest(payerId, request);
    
    const response = await client.post(endpoint, providerRequest);
    return response.data;
  }

  private transformRequest(payerId: string, request: EligibilityRequest): any {
    // Each provider expects different request formats
    const transformers: Record<string, (req: EligibilityRequest) => any> = {
      bcbs: (req) => ({
        memberIdentifier: req.memberId,
        serviceCode: req.procedureCode,
        patientInfo: {
          firstName: req.patient.firstName,
          lastName: req.patient.lastName,
          dateOfBirth: req.patient.dob,
        },
      }),
      united: (req) => ({
        subscriberId: req.memberId,
        cptCode: req.procedureCode,
        member: {
          first: req.patient.firstName,
          last: req.patient.lastName,
          dob: req.patient.dob,
        },
      }),
      // Add other provider transformations...
    };

    const transformer = transformers[payerId];
    return transformer ? transformer(request) : request;
  }

  private normalizeResponse(payerId: string, response: any): any {
    // Normalize different provider responses to standard format
    const normalizers: Record<string, (res: any) => any> = {
      bcbs: (res) => ({
        eligibility: {
          active: res.status === 'ACTIVE',
          effectiveDate: res.coverage.startDate,
          terminationDate: res.coverage.endDate,
        },
        benefits: res.benefits.map((b: any) => ({
          procedureCode: b.code,
          coveragePercentage: b.coveragePercent,
          copay: b.copayAmount,
          averageCost: b.estimatedCost,
        })),
        deductible: {
          annual: res.deductible.yearly,
          remaining: res.deductible.remaining,
        },
        outOfPocketMax: {
          annual: res.oopMax.yearly,
          remaining: res.oopMax.remaining,
        },
      }),
      // Add other provider normalizers...
    };

    const normalizer = normalizers[payerId];
    return normalizer ? normalizer(response) : response;
  }

  private shouldFallbackToScraping(error: any): boolean {
    // Determine if we should try web scraping
    return error.response?.status === 404 || error.code === 'ECONNREFUSED';
  }

  private async fallbackToWebScraping(request: EligibilityRequest): Promise<any> {
    // Implement RPA/web scraping fallback
    console.log('Falling back to web scraping for:', request.payerId);
    
    // This would use Puppeteer or similar to scrape provider portals
    // For now, return mock data
    return {
      eligibility: {
        active: true,
        effectiveDate: '2024-01-01',
      },
      benefits: [{
        procedureCode: request.procedureCode,
        coveragePercentage: 80,
        copay: 50,
        averageCost: 500,
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

  private async getOAuthToken(_providerId: string): Promise<string> {
    // Implement OAuth token management
    // This would cache tokens and refresh as needed
    return 'mock-oauth-token';
  }

  async listSupportedProviders(): Promise<InsuranceProvider[]> {
    return Array.from(this.providers.values());
  }
}