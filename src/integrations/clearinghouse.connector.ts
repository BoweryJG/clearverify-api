import axios, { AxiosInstance } from 'axios';
import { AppError } from '../middleware/errorHandler';
import { XMLParser } from 'fast-xml-parser';

interface ClearinghouseConfig {
  provider: 'change_healthcare' | 'availity' | 'waystar' | 'zirmed';
  endpoint: string;
  username: string;
  password: string;
  submitterId: string;
}

export class ClearinghouseConnector {
  private client: AxiosInstance;
  private config: ClearinghouseConfig;
  private xmlParser: XMLParser;

  constructor() {
    this.config = {
      provider: (process.env.CLEARINGHOUSE_PROVIDER as any) || 'change_healthcare',
      endpoint: process.env.CLEARINGHOUSE_URL || '',
      username: process.env.CLEARINGHOUSE_USERNAME || '',
      password: process.env.CLEARINGHOUSE_PASSWORD || '',
      submitterId: process.env.CLEARINGHOUSE_SUBMITTER_ID || '',
    };

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
    });


    this.client = axios.create({
      baseURL: this.config.endpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/xml',
      },
      auth: {
        username: this.config.username,
        password: this.config.password,
      },
    });
  }

  async verifyEligibility(params: {
    payerId: string;
    memberId: string;
    patientFirstName: string;
    patientLastName: string;
    patientDOB: string;
    procedureCode?: string;
    providerId: string;
  }): Promise<any> {
    switch (this.config.provider) {
      case 'change_healthcare':
        return this.verifyViaChangeHealthcare(params);
      case 'availity':
        return this.verifyViaAvailty(params);
      case 'waystar':
        return this.verifyViaWaystar(params);
      default:
        throw new AppError('Unsupported clearinghouse provider', 400);
    }
  }

  private async verifyViaChangeHealthcare(params: any): Promise<any> {
    // Change Healthcare uses their Medical Network API
    const request = {
      controlNumber: this.generateControlNumber(),
      tradingPartnerServiceId: params.payerId,
      provider: {
        organizationName: 'ClearVerify',
        npi: params.providerId,
      },
      subscriber: {
        memberId: params.memberId,
        firstName: params.patientFirstName,
        lastName: params.patientLastName,
        birthDate: params.patientDOB,
      },
      encounter: {
        serviceTypeCodes: this.mapProcedureToServiceType(params.procedureCode),
      },
    };

    try {
      const response = await this.client.post('/medicalnetwork/eligibility/v3', request, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.transformChangeHealthcareResponse(response.data);
    } catch (error: any) {
      console.error('Change Healthcare error:', error.response?.data);
      throw new AppError('Eligibility verification failed', 503);
    }
  }

  private async verifyViaAvailty(params: any): Promise<any> {
    // Availity uses SOAP/XML format
    const soapEnvelope = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Header>
          <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <wsse:UsernameToken>
              <wsse:Username>${this.config.username}</wsse:Username>
              <wsse:Password>${this.config.password}</wsse:Password>
            </wsse:UsernameToken>
          </wsse:Security>
        </soap:Header>
        <soap:Body>
          <RealTimeTransaction xmlns="http://availity.com/rtx">
            <PayerID>${params.payerId}</PayerID>
            <ProviderID>${params.providerId}</ProviderID>
            <PatientFirstName>${params.patientFirstName}</PatientFirstName>
            <PatientLastName>${params.patientLastName}</PatientLastName>
            <PatientDOB>${params.patientDOB}</PatientDOB>
            <MemberID>${params.memberId}</MemberID>
            <ServiceType>${this.mapProcedureToServiceType(params.procedureCode)}</ServiceType>
          </RealTimeTransaction>
        </soap:Body>
      </soap:Envelope>
    `;

    try {
      const response = await this.client.post('/rtx/eligibility', soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml',
          'SOAPAction': 'http://availity.com/rtx/RealTimeTransaction',
        },
      });

      const parsed = this.xmlParser.parse(response.data);
      return this.transformAvailityResponse(parsed);
    } catch (error) {
      console.error('Availity error:', error);
      throw new AppError('Eligibility verification failed', 503);
    }
  }

  private async verifyViaWaystar(params: any): Promise<any> {
    // Waystar uses RESTful JSON API
    const request = {
      transaction: {
        controlNumber: this.generateControlNumber(),
        submitterId: this.config.submitterId,
        receiverId: params.payerId,
        transactionType: '270', // Eligibility Inquiry
      },
      provider: {
        npi: params.providerId,
        taxonomy: '1223G0001X', // General Dentist
      },
      subscriber: {
        memberNumber: params.memberId,
        firstName: params.patientFirstName,
        lastName: params.patientLastName,
        dateOfBirth: params.patientDOB,
      },
      benefitInquiry: {
        serviceTypes: [this.mapProcedureToServiceType(params.procedureCode)],
        dateOfService: new Date().toISOString().split('T')[0],
      },
    };

    try {
      const response = await this.client.post('/api/v1/eligibility', request, {
        headers: {
          'X-API-Key': process.env.WAYSTAR_API_KEY || '',
        },
      });

      return this.transformWaystarResponse(response.data);
    } catch (error) {
      console.error('Waystar error:', error);
      throw new AppError('Eligibility verification failed', 503);
    }
  }

  private transformChangeHealthcareResponse(data: any): any {
    // Transform Change Healthcare response to our standard format
    const planInfo = data.planInformation?.[0] || {};
    const benefits = data.benefitsInformation || [];

    return {
      eligibility: {
        active: planInfo.status === 'Active',
        effectiveDate: planInfo.eligibilityBeginDate,
        terminationDate: planInfo.eligibilityEndDate,
      },
      benefits: benefits.map((benefit: any) => ({
        procedureCode: benefit.procedureCode,
        coveragePercentage: benefit.coveragePercentage || 80,
        copay: benefit.copayAmount || 0,
        averageCost: benefit.allowedAmount || 0,
      })),
      deductible: {
        annual: this.extractAmount(benefits, 'Deductible', 'Annual'),
        remaining: this.extractAmount(benefits, 'Deductible', 'Remaining'),
      },
      outOfPocketMax: {
        annual: this.extractAmount(benefits, 'Out of Pocket Maximum', 'Annual'),
        remaining: this.extractAmount(benefits, 'Out of Pocket Maximum', 'Remaining'),
      },
    };
  }

  private transformAvailityResponse(parsed: any): any {
    // Extract from SOAP response
    const eligibility = parsed['soap:Envelope']['soap:Body']['EligibilityResponse'];
    
    return {
      eligibility: {
        active: eligibility.Status === 'Active',
        effectiveDate: eligibility.EffectiveDate,
        terminationDate: eligibility.TerminationDate,
      },
      benefits: [{
        procedureCode: eligibility.ServiceType,
        coveragePercentage: parseFloat(eligibility.CoveragePercent) || 80,
        copay: parseFloat(eligibility.Copay) || 0,
        averageCost: 0,
      }],
      deductible: {
        annual: parseFloat(eligibility.AnnualDeductible) || 0,
        remaining: parseFloat(eligibility.RemainingDeductible) || 0,
      },
      outOfPocketMax: {
        annual: parseFloat(eligibility.AnnualOOPMax) || 0,
        remaining: parseFloat(eligibility.RemainingOOPMax) || 0,
      },
    };
  }

  private transformWaystarResponse(data: any): any {
    const eligibility = data.eligibilityResponse;
    
    return {
      eligibility: {
        active: eligibility.subscriberEligibility === 'Eligible',
        effectiveDate: eligibility.coverageEffectiveDate,
        terminationDate: eligibility.coverageTerminationDate,
      },
      benefits: eligibility.benefits.map((benefit: any) => ({
        procedureCode: benefit.serviceType,
        coveragePercentage: benefit.coverageLevel || 80,
        copay: benefit.copaymentAmount || 0,
        averageCost: benefit.allowedAmount || 0,
      })),
      deductible: {
        annual: eligibility.deductible?.annualAmount || 0,
        remaining: eligibility.deductible?.remainingAmount || 0,
      },
      outOfPocketMax: {
        annual: eligibility.outOfPocketMaximum?.annualAmount || 0,
        remaining: eligibility.outOfPocketMaximum?.remainingAmount || 0,
      },
    };
  }

  private extractAmount(benefits: any[], type: string, period: string): number {
    const benefit = benefits.find((b: any) => 
      b.name === type && b.coverageLevelCode === 'IND' && b.timePeriodQualifier === period
    );
    return benefit ? parseFloat(benefit.benefitAmount) : 0;
  }

  private mapProcedureToServiceType(procedureCode?: string): string {
    if (!procedureCode) return '35'; // General Dental
    
    // Map dental procedures to service type codes
    const serviceTypes: Record<string, string> = {
      'D0120': '23', // Diagnostic Dental
      'D0210': '23', // Diagnostic Dental  
      'D2391': '25', // Restorative Dental
      'D6010': '26', // Endodontics/Oral Surgery
      'D6065': '27', // Prosthodontics
    };
    
    return serviceTypes[procedureCode] || '35';
  }

  private generateControlNumber(): string {
    return `CLV${Date.now().toString().slice(-9)}`;
  }

  async getSupportedPayers(): Promise<any[]> {
    // Each clearinghouse supports different payers
    const payerLists: Record<string, any[]> = {
      change_healthcare: [
        { id: 'BCBS', name: 'Blue Cross Blue Shield (All Regions)', supported: true },
        { id: 'UHC', name: 'UnitedHealthcare', supported: true },
        { id: 'CIGNA', name: 'Cigna', supported: true },
        { id: 'AETNA', name: 'Aetna', supported: true },
        { id: 'HUMANA', name: 'Humana', supported: true },
        // 1000+ more payers...
      ],
      availity: [
        // Similar list with Availity-specific payer IDs
      ],
      waystar: [
        // Waystar payer network
      ],
      zirmed: [
        // Zirmed payer network
      ],
    };

    return payerLists[this.config.provider] || [];
  }
}