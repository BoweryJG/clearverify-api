import axios, { AxiosInstance } from 'axios';
import { InsuranceProviderConfig } from './insurance-providers.config';

interface FHIRCoverage {
  resourceType: 'Coverage';
  id?: string;
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  beneficiary: {
    reference: string; // Reference to Patient
  };
  payor: Array<{
    reference: string;
    display?: string;
  }>;
  period?: {
    start: string;
    end?: string;
  };
  class?: Array<{
    type: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
    value: string;
    name?: string;
  }>;
}

interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  identifier?: Array<{
    use?: string;
    type?: {
      coding: Array<{
        system: string;
        code: string;
      }>;
    };
    system?: string;
    value: string;
  }>;
  name: Array<{
    use?: string;
    family: string;
    given: string[];
  }>;
  birthDate: string;
}

export class FHIRClient {
  private clients: Map<string, AxiosInstance> = new Map();
  private tokens: Map<string, { token: string; expiry: number }> = new Map();

  constructor() {
  }

  async getClient(provider: InsuranceProviderConfig): Promise<AxiosInstance> {
    const clientKey = provider.id;
    
    if (!this.clients.has(clientKey)) {
      const client = axios.create({
        baseURL: provider.baseUrl,
        timeout: 30000,
        headers: {
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json',
        },
      });

      // Add auth interceptor
      client.interceptors.request.use(async (config) => {
        const token = await this.getAccessToken(provider);
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      });

      // Add response interceptor for error handling
      client.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response?.status === 401) {
            // Token expired, clear and retry
            this.tokens.delete(clientKey);
            const token = await this.getAccessToken(provider);
            if (token) {
              error.config.headers['Authorization'] = `Bearer ${token}`;
              return axios.request(error.config);
            }
          }
          return Promise.reject(error);
        }
      );

      this.clients.set(clientKey, client);
    }

    return this.clients.get(clientKey)!;
  }

  private async getAccessToken(provider: InsuranceProviderConfig): Promise<string | null> {
    const tokenKey = provider.id;
    const cached = this.tokens.get(tokenKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.token;
    }

    switch (provider.authType) {
      case 'oauth2':
        return this.getOAuth2Token(provider);
      case 'client_credentials':
        return this.getClientCredentialsToken(provider);
      case 'apikey':
        return this.getApiKey(provider);
      default:
        return null;
    }
  }

  private async getOAuth2Token(provider: InsuranceProviderConfig): Promise<string | null> {
    if (!provider.tokenUrl) return null;

    try {
      const clientId = process.env[`${provider.id.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${provider.id.toUpperCase()}_CLIENT_SECRET`];
      
      if (!clientId || !clientSecret) {
        console.error(`Missing OAuth credentials for ${provider.name}`);
        return null;
      }

      const response = await axios.post(
        provider.tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'patient/*.read coverage/*.read'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = response.data;
      
      // Cache token
      this.tokens.set(provider.id, {
        token: access_token,
        expiry: Date.now() + (expires_in * 1000) - 60000, // Expire 1 min early
      });

      return access_token;
    } catch (error) {
      console.error(`OAuth2 token error for ${provider.name}:`, error);
      return null;
    }
  }

  private async getClientCredentialsToken(provider: InsuranceProviderConfig): Promise<string | null> {
    // Similar to OAuth2 but might have different parameters
    return this.getOAuth2Token(provider);
  }

  private getApiKey(provider: InsuranceProviderConfig): string | null {
    return process.env[`${provider.id.toUpperCase()}_API_KEY`] || null;
  }

  async searchPatient(
    provider: InsuranceProviderConfig,
    params: {
      identifier?: string;
      family?: string;
      given?: string;
      birthdate?: string;
    }
  ): Promise<FHIRPatient | null> {
    try {
      const client = await this.getClient(provider);
      const searchParams = new URLSearchParams();
      
      if (params.identifier) searchParams.append('identifier', params.identifier);
      if (params.family) searchParams.append('family', params.family);
      if (params.given) searchParams.append('given', params.given);
      if (params.birthdate) searchParams.append('birthdate', params.birthdate);

      const response = await client.get(`${provider.endpoints.patient}?${searchParams}`);
      
      if (response.data.entry && response.data.entry.length > 0) {
        return response.data.entry[0].resource as FHIRPatient;
      }
      
      return null;
    } catch (error) {
      console.error(`Patient search error for ${provider.name}:`, error);
      return null;
    }
  }

  async getCoverage(
    provider: InsuranceProviderConfig,
    patientId: string
  ): Promise<FHIRCoverage | null> {
    try {
      const client = await this.getClient(provider);
      
      const response = await client.get(
        `${provider.endpoints.eligibility}?beneficiary=Patient/${patientId}&status=active`
      );
      
      if (response.data.entry && response.data.entry.length > 0) {
        return response.data.entry[0].resource as FHIRCoverage;
      }
      
      return null;
    } catch (error) {
      console.error(`Coverage search error for ${provider.name}:`, error);
      return null;
    }
  }

  async checkEligibility(
    provider: InsuranceProviderConfig,
    params: {
      memberId: string;
      firstName: string;
      lastName: string;
      birthDate: string;
      procedureCode?: string;
    }
  ): Promise<any> {
    // First, find the patient
    const patient = await this.searchPatient(provider, {
      identifier: params.memberId,
      family: params.lastName,
      given: params.firstName,
      birthdate: params.birthDate,
    });

    if (!patient || !patient.id) {
      return {
        eligible: false,
        reason: 'Patient not found',
      };
    }

    // Then get their coverage
    const coverage = await this.getCoverage(provider, patient.id);
    
    if (!coverage) {
      return {
        eligible: false,
        reason: 'No active coverage found',
      };
    }

    // For procedure-specific eligibility, we'd need to call additional endpoints
    // This varies significantly by payer
    return {
      eligible: true,
      patient: patient,
      coverage: coverage,
      // Additional benefit details would come from other FHIR resources
    };
  }
}