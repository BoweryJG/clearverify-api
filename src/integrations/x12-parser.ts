// X12 EDI Parser for Healthcare Eligibility (270/271)
// This handles legacy insurance systems that use EDI standards

export class X12Parser {
  // Build 270 Eligibility Inquiry
  build270(params: {
    payerId: string;
    memberId: string;
    patient: {
      firstName: string;
      lastName: string;
      dob: string;
    };
    procedureCode: string;
  }): string {
    const controlNumber = this.generateControlNumber();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const time = new Date().toTimeString().slice(0, 5).replace(':', '');
    
    const segments = [
      // Interchange Control Header
      `ISA*00*          *00*          *ZZ*CLEARVERIFY    *ZZ*${params.payerId.padEnd(15)}*${date.slice(2)}*${time}*U*00501*${controlNumber}*0*P*:~`,
      
      // Functional Group Header
      `GS*HS*CLEARVERIFY*${params.payerId}*${date}*${time}*1*X*005010X279A1~`,
      
      // Transaction Set Header
      `ST*270*0001*005010X279A1~`,
      
      // Beginning of Hierarchical Transaction
      `BHT*0022*13*${controlNumber}*${date}*${time}~`,
      
      // Information Source Level
      `HL*1**20*1~`,
      `NM1*PR*2*${params.payerId}*****PI*${params.payerId}~`,
      
      // Information Receiver Level
      `HL*2*1*21*1~`,
      `NM1*1P*2*CLEARVERIFY*****XX*1234567890~`,
      
      // Subscriber Level
      `HL*3*2*22*0~`,
      `TRN*1*${controlNumber}*CLEARVERIFY~`,
      `NM1*IL*1*${params.patient.lastName}*${params.patient.firstName}****MI*${params.memberId}~`,
      `DMG*D8*${params.patient.dob.replace(/-/g, '')}~`,
      
      // Eligibility or Benefit Inquiry
      `EQ*30~`, // Health Benefit Plan Coverage
      
      // Service Type Code for specific procedure
      this.mapProcedureToServiceType(params.procedureCode),
      
      // Transaction Set Trailer
      `SE*13*0001~`,
      
      // Functional Group Trailer
      `GE*1*1~`,
      
      // Interchange Control Trailer
      `IEA*1*${controlNumber}~`
    ];
    
    return segments.join('');
  }

  // Parse 271 Eligibility Response
  parse271(ediString: string): any {
    const segments = ediString.split('~');
    const result: any = {
      eligibility: {
        active: false,
        effectiveDate: '',
        terminationDate: undefined,
      },
      benefits: [],
      deductible: {
        annual: 0,
        remaining: 0,
      },
      outOfPocketMax: {
        annual: 0,
        remaining: 0,
      },
    };
    
    segments.forEach(segment => {
      const elements = segment.split('*');
      const segmentId = elements[0];
      
      switch (segmentId) {
        case 'NM1':
          // Name segments - extract patient/payer info
          if (elements[1] === 'IL') {
            // Insured/Subscriber
            result.subscriberName = `${elements[3]} ${elements[4]}`;
          }
          break;
          
        case 'DTP':
          // Date/Time Period
          if (elements[1] === '291') {
            // Plan Begin
            result.eligibility.effectiveDate = this.parseX12Date(elements[3]);
          } else if (elements[1] === '292') {
            // Plan End
            result.eligibility.terminationDate = this.parseX12Date(elements[3]);
          }
          break;
          
        case 'EB':
          // Eligibility or Benefit Information
          this.parseEBSegment(elements, result);
          break;
          
        case 'MSG':
          // Message Text
          result.message = elements.slice(1).join(' ');
          break;
      }
    });
    
    // Set active status based on dates
    const now = new Date();
    const effectiveDate = new Date(result.eligibility.effectiveDate);
    const terminationDate = result.eligibility.terminationDate 
      ? new Date(result.eligibility.terminationDate) 
      : new Date('2099-12-31');
    
    result.eligibility.active = now >= effectiveDate && now <= terminationDate;
    
    return result;
  }

  private parseEBSegment(elements: string[], result: any): void {
    const benefitCode = elements[1];
    const serviceType = elements[3];
    const benefitAmount = elements[5];
    
    switch (benefitCode) {
      case '1': // Active Coverage
        result.eligibility.active = true;
        break;
        
      case 'C': // Deductible
        if (elements[7] === 'IND') { // Individual
          result.deductible.annual = parseFloat(benefitAmount) || 0;
        }
        break;
        
      case 'G': // Out of Pocket Maximum
        if (elements[7] === 'IND') {
          result.outOfPocketMax.annual = parseFloat(benefitAmount) || 0;
        }
        break;
        
      case 'F': // Copayment
        result.copay = parseFloat(benefitAmount) || 0;
        break;
        
      case 'A': // Coinsurance
        const percentage = 100 - (parseFloat(benefitAmount) || 20);
        result.coveragePercentage = percentage;
        break;
    }
    
    // Add to benefits array if it's a specific service
    if (serviceType && benefitCode === 'A') {
      result.benefits.push({
        serviceType,
        coveragePercentage: 100 - (parseFloat(benefitAmount) || 20),
        copay: 0,
      });
    }
  }

  private parseX12Date(dateString: string): string {
    if (dateString.length === 8) {
      // CCYYMMDD format
      return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
    }
    return dateString;
  }

  private mapProcedureToServiceType(procedureCode: string): string {
    // Map dental procedures to X12 service type codes
    const serviceTypes: Record<string, string> = {
      'D0120': 'EQ*23~', // Diagnostic Dental
      'D0210': 'EQ*23~', // Diagnostic Dental
      'D2391': 'EQ*25~', // Restorative Dental
      'D6010': 'EQ*26~', // Endodontics
      'D6065': 'EQ*27~', // Prosthodontics
    };
    
    return serviceTypes[procedureCode] || 'EQ*35~'; // Dental Care
  }

  private generateControlNumber(): string {
    return Date.now().toString().slice(-9);
  }

  // Validate X12 message structure
  validateX12(ediString: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!ediString.startsWith('ISA')) {
      errors.push('Missing ISA header');
    }
    
    if (!ediString.endsWith('~')) {
      errors.push('Message must end with segment terminator (~)');
    }
    
    const segments = ediString.split('~');
    const isaCount = segments.filter(s => s.startsWith('ISA')).length;
    const ieaCount = segments.filter(s => s.startsWith('IEA')).length;
    
    if (isaCount !== ieaCount) {
      errors.push('ISA/IEA count mismatch');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}