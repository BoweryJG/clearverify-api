# Insurance API Setup Guide

This guide walks you through obtaining real API credentials for each insurance provider.

## Overview

Each insurance company requires:
1. Developer account registration
2. Application submission
3. Sandbox testing
4. Production approval
5. Compliance verification

## Provider-Specific Setup

### 1. Blue Cross Blue Shield (Regional)

BCBS operates regionally, so you'll need separate credentials for each state.

#### Florida Blue
1. Register at: https://developers.floridablue.com
2. Create application
3. Complete developer agreement
4. Test in sandbox
5. Submit production access request
6. Requirements:
   - Business verification
   - HIPAA compliance attestation
   - Security assessment

#### Blue Shield of California
1. Register at: https://developer.blueshieldca.com
2. Similar process to Florida Blue

#### Other BCBS Plans
- Each state has its own developer portal
- Search: "[State] BCBS developer portal"

### 2. UnitedHealth / Optum

1. **Register**: https://developer.optum.com
2. **Important**: Optum uses payer-specific subdomains
   - Example: `rmhp.authz.flex.optum.com` for Rocky Mountain Health Plans
3. **Process**:
   - Complete onboarding questionnaire
   - Specify which UHC plans you need access to
   - Each plan may require separate approval
4. **Testing**:
   - Sandbox has limited data
   - Test with provided test member IDs

### 3. Cigna

1. **Portal**: https://developer.cigna.com
2. **Process**:
   - Register as healthcare partner
   - Submit use case documentation
   - Complete security review
3. **API Types**:
   - Patient Access API (FHIR R4)
   - Provider Data Exchange
   - Payer-to-Payer API

### 4. Aetna (CVS Health)

1. **Portal**: https://developerportal.aetna.com
2. **Requirements**:
   - Business entity verification
   - Intended use case description
   - Monthly volume estimates
3. **Compliance**:
   - Must implement according to CMS guidelines
   - Regular security audits required

### 5. Humana

1. **Portal**: https://developers.humana.com
2. **Fast Track Options**:
   - If you're an existing Humana partner
   - If you use approved clearinghouses
3. **APIs Available**:
   - Eligibility & Benefits
   - Claims Status
   - Prior Authorization

### 6. Anthem

1. **Portal**: https://developerportal.anthem.com
2. **Multi-State Access**:
   - Single application can cover multiple states
   - Specify states in application
3. **Testing Requirements**:
   - Must pass certification tests
   - Demonstrate error handling

### 7. Kaiser Permanente

1. **Portal**: https://developer.kaiserpermanente.org
2. **Regional Restrictions**:
   - Only available in KP service areas
3. **Integration Types**:
   - FHIR for real-time
   - Batch files for bulk operations

## Fast-Track Options

### 1. Use a Clearinghouse

Instead of individual APIs, consider:
- **Change Healthcare**: Access to 1000+ payers
- **Availity**: Major payer network
- **Waystar**: Real-time eligibility

Benefits:
- Single integration point
- Standardized format
- Faster go-to-market

### 2. Partner with Existing Vendors

- **Epic**: If targeting Epic-using health systems
- **Eligible API**: Aggregated payer access
- **PokitDok (now Change Healthcare)**: Established network

## Testing Strategy

### Sandbox Testing

```javascript
// Start with sandbox endpoints
const SANDBOX_CONFIG = {
  bcbs_florida: {
    url: 'https://sandbox-api.floridablue.com',
    testMemberId: 'TEST123456',
    testProvider: 'TESTPROV001'
  },
  cigna: {
    url: 'https://sandbox-api.cigna.com',
    testMemberId: 'CIGNA_TEST_001',
    testDOB: '1980-01-01'
  }
};
```

### Test Scenarios

1. **Valid Member**: Should return active coverage
2. **Invalid Member**: Should return not found
3. **Terminated Coverage**: Should show inactive
4. **Different Procedures**: Test coverage variations

## Compliance Requirements

### HIPAA
- Sign Business Associate Agreements (BAA)
- Implement audit logging
- Encrypt data in transit and at rest

### CMS Interoperability Rules
- Support FHIR R4
- Implement without special effort
- No additional costs to patients

### Security
- OAuth 2.0 implementation
- Certificate-based authentication for some
- IP whitelisting may be required

## Timeline Expectations

- **Developer Registration**: 1-2 days
- **Sandbox Access**: Immediate to 1 week
- **Production Approval**: 2-8 weeks
- **Full Integration**: 3-6 months for all payers

## Cost Considerations

Most payers provide API access free, but:
- High volume may incur costs
- Some require partnership agreements
- Clearinghouses charge per transaction

## Recommended Approach

1. **Phase 1**: Start with one regional BCBS
2. **Phase 2**: Add major nationals (UHC, Cigna, Aetna)
3. **Phase 3**: Expand to remaining payers
4. **Phase 4**: Add clearinghouse for long tail

## Support Contacts

Keep these handy during integration:

- **BCBS**: Each region has dedicated support
- **UnitedHealth**: optum-developer-support@optum.com
- **Cigna**: Via developer portal ticket system
- **Aetna**: developerportal@aetna.com
- **Humana**: Via portal contact form
- **Anthem**: apisupport@anthem.com
- **Kaiser**: kp-apis@kp.org

## Next Steps

1. Create accounts on each developer portal
2. Start with sandbox testing
3. Document your use case clearly
4. Apply for production access
5. Implement error handling and fallbacks

Remember: Each payer has unique requirements. Be patient and persistent!