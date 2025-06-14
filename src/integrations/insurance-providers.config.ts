export interface InsuranceProviderConfig {
  id: string;
  name: string;
  type: 'national' | 'regional';
  authType: 'oauth2' | 'apikey' | 'client_credentials';
  baseUrl: string;
  authUrl?: string;
  tokenUrl?: string;
  fhirVersion?: string;
  sandboxAvailable: boolean;
  productionRequirements: string[];
  endpoints: {
    eligibility?: string;
    coverage?: string;
    patient?: string;
    memberSearch?: string;
  };
}

export const INSURANCE_PROVIDERS: Record<string, InsuranceProviderConfig> = {
  // Blue Cross Blue Shield (Multiple Regional Entities)
  bcbs_florida: {
    id: 'bcbs_florida',
    name: 'Florida Blue',
    type: 'regional',
    authType: 'oauth2',
    baseUrl: 'https://api.floridablue.com',
    authUrl: 'https://api.floridablue.com/oauth/authorize',
    tokenUrl: 'https://api.floridablue.com/oauth/token',
    fhirVersion: 'R4',
    sandboxAvailable: true,
    productionRequirements: [
      'Developer portal registration',
      'Application review',
      'Production attestation',
      'Security assessment'
    ],
    endpoints: {
      eligibility: '/fhir/R4/Coverage',
      patient: '/fhir/R4/Patient',
      memberSearch: '/fhir/R4/Patient/$match'
    }
  },
  
  bcbs_ca: {
    id: 'bcbs_ca',
    name: 'Blue Shield of California',
    type: 'regional',
    authType: 'oauth2',
    baseUrl: 'https://api.blueshieldca.com',
    authUrl: 'https://api.blueshieldca.com/oauth/authorize',
    tokenUrl: 'https://api.blueshieldca.com/oauth/token',
    fhirVersion: 'R4',
    sandboxAvailable: true,
    productionRequirements: [
      'Developer account',
      'Sandbox testing completion',
      'Production access request'
    ],
    endpoints: {
      eligibility: '/fhir/R4/Coverage',
      patient: '/fhir/R4/Patient'
    }
  },

  // UnitedHealth Group / Optum
  united_optum: {
    id: 'united_optum',
    name: 'UnitedHealth Optum',
    type: 'national',
    authType: 'oauth2',
    baseUrl: 'https://api.{payer}.optum.com',
    authUrl: 'https://{payer}.authz.flex.optum.com/oauth/authorize',
    tokenUrl: 'https://{payer}.authz.flex.optum.com/oauth/token',
    fhirVersion: 'R4',
    sandboxAvailable: true,
    productionRequirements: [
      'Optum Developer Portal registration',
      'Complete onboarding process',
      'Production API key',
      'Payer-specific subdomain configuration'
    ],
    endpoints: {
      eligibility: '/eligibility/v1/check',
      coverage: '/fhir/R4/Coverage',
      patient: '/fhir/R4/Patient'
    }
  },

  // Cigna
  cigna: {
    id: 'cigna',
    name: 'Cigna Healthcare',
    type: 'national',
    authType: 'oauth2',
    baseUrl: 'https://api.cigna.com',
    authUrl: 'https://api.cigna.com/oauth/authorize',
    tokenUrl: 'https://api.cigna.com/oauth/token',
    fhirVersion: 'R4',
    sandboxAvailable: true,
    productionRequirements: [
      'Cigna Developer Portal registration',
      'Sandbox testing',
      'Production access approval'
    ],
    endpoints: {
      eligibility: '/fhir/R4/Coverage',
      patient: '/fhir/R4/Patient',
      coverage: '/fhir/R4/Coverage/$eligibility'
    }
  },

  // Aetna (CVS Health)
  aetna: {
    id: 'aetna',
    name: 'Aetna',
    type: 'national',
    authType: 'oauth2',
    baseUrl: 'https://api.aetna.com',
    authUrl: 'https://api.aetna.com/oauth2/authorize',
    tokenUrl: 'https://api.aetna.com/oauth2/token',
    fhirVersion: 'R4',
    sandboxAvailable: true,
    productionRequirements: [
      'Developer portal registration',
      'Application submission',
      'Security review',
      'Production credentials'
    ],
    endpoints: {
      eligibility: '/fhir/R4/Coverage',
      patient: '/fhir/R4/Patient',
      coverage: '/fhir/R4/ExplanationOfBenefit'
    }
  },

  // Humana
  humana: {
    id: 'humana',
    name: 'Humana',
    type: 'national',
    authType: 'oauth2',
    baseUrl: 'https://api.humana.com',
    authUrl: 'https://api.humana.com/oauth2/authorize',
    tokenUrl: 'https://api.humana.com/oauth2/token',
    fhirVersion: 'R4',
    sandboxAvailable: true,
    productionRequirements: [
      'Developer registration',
      'App registration',
      'Compliance review'
    ],
    endpoints: {
      eligibility: '/fhir/R4/Coverage',
      patient: '/fhir/R4/Patient'
    }
  },

  // Anthem
  anthem: {
    id: 'anthem',
    name: 'Anthem Blue Cross',
    type: 'national',
    authType: 'oauth2',
    baseUrl: 'https://api.anthem.com',
    authUrl: 'https://api.anthem.com/oauth2/authorize',
    tokenUrl: 'https://api.anthem.com/oauth2/token',
    fhirVersion: 'R4',
    sandboxAvailable: true,
    productionRequirements: [
      'Developer portal access',
      'Application registration',
      'Production approval'
    ],
    endpoints: {
      eligibility: '/fhir/R4/Coverage',
      patient: '/fhir/R4/Patient'
    }
  },

  // Kaiser Permanente
  kaiser: {
    id: 'kaiser',
    name: 'Kaiser Permanente',
    type: 'regional',
    authType: 'oauth2',
    baseUrl: 'https://api.kaiserpermanente.org',
    authUrl: 'https://api.kaiserpermanente.org/oauth2/authorize',
    tokenUrl: 'https://api.kaiserpermanente.org/oauth2/token',
    fhirVersion: 'R4',
    sandboxAvailable: true,
    productionRequirements: [
      'Developer account',
      'API access request',
      'Compliance verification'
    ],
    endpoints: {
      eligibility: '/fhir/R4/Coverage',
      patient: '/fhir/R4/Patient'
    }
  }
};

// Helper to get all provider IDs
export const getProviderIds = (): string[] => Object.keys(INSURANCE_PROVIDERS);

// Helper to get provider by ID
export const getProvider = (id: string): InsuranceProviderConfig | undefined => 
  INSURANCE_PROVIDERS[id];

// Helper to get providers by type
export const getProvidersByType = (type: 'national' | 'regional'): InsuranceProviderConfig[] =>
  Object.values(INSURANCE_PROVIDERS).filter(p => p.type === type);