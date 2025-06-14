# ClearVerify Integration Guide

## Integration with Your Dental Projects

### 1. Dental Implant Simulator Integration

Add this to your simulator at the point where users see pricing:

```javascript
// In your implant cost calculation component
import { ClearVerifyWidget } from '@clearverify/widget';

function ImplantCostCalculator({ procedureCode, estimatedCost }) {
  return (
    <div>
      <h3>Estimated Cost: ${estimatedCost}</h3>
      
      <ClearVerifyWidget
        procedureCode={procedureCode}
        onVerificationComplete={(result) => {
          // Update UI with patient's actual cost
          setPatientCost(result.estimatedPatientCost);
          setCoverageDetails(result.coverage);
        }}
      />
    </div>
  );
}
```

### 2. New Smile Guide Integration

Add verification buttons to each procedure page:

```javascript
// In your procedure detail pages
function ProcedureDetail({ procedure }) {
  const handleVerifyInsurance = async () => {
    const response = await fetch('https://api.clearverify.com/api/v1/verification/instant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CLEARVERIFY_API_KEY
      },
      body: JSON.stringify({
        procedureCode: procedure.code,
        // Patient fills in their info via modal
      })
    });
    
    const result = await response.json();
    // Show coverage details to patient
  };
  
  return (
    <div>
      <h2>{procedure.name}</h2>
      <p>Average Cost: ${procedure.averageCost}</p>
      <button onClick={handleVerifyInsurance}>
        Check My Insurance Coverage
      </button>
    </div>
  );
}
```

### 3. CRM Integration

Add verification status to patient records:

```javascript
// In your patient management system
async function addVerificationToPatient(patientId, verificationData) {
  // Store verification results
  await db.patients.update(patientId, {
    lastVerification: {
      date: new Date(),
      verificationId: verificationData.verificationId,
      coverage: verificationData.coverage,
      eligibility: verificationData.eligibility
    }
  });
}

// Show verification status in patient view
function PatientProfile({ patient }) {
  return (
    <div>
      <h3>Insurance Verification Status</h3>
      {patient.lastVerification ? (
        <div>
          ✓ Verified on {patient.lastVerification.date}
          Coverage: {patient.lastVerification.coverage.coveragePercentage}%
        </div>
      ) : (
        <button onClick={() => verifyInsurance(patient)}>
          Verify Insurance
        </button>
      )}
    </div>
  );
}
```

## API Integration Examples

### Direct API Call (Server-Side)

```javascript
const axios = require('axios');

async function verifyPatientInsurance(patientData, procedureCode) {
  try {
    const response = await axios.post(
      'https://api.clearverify.com/api/v1/verification/instant',
      {
        patientInfo: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          dateOfBirth: patientData.dob,
          memberId: patientData.insuranceId
        },
        insuranceInfo: {
          payerId: patientData.insuranceProvider
        },
        procedureCode: procedureCode,
        providerId: 'your-provider-id'
      },
      {
        headers: {
          'X-API-Key': process.env.CLEARVERIFY_API_KEY
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  }
}
```

### Embed Widget (Client-Side)

```html
<!-- Add to your HTML -->
<script src="https://api.clearverify.com/widget/v1/embed.js"></script>
<script>
  ClearVerify.init({
    apiKey: 'your-public-api-key',
    providerId: 'your-provider-id',
    procedureCodes: [
      { code: 'D6010', description: 'Implant placement' },
      { code: 'D6065', description: 'Implant crown' }
    ],
    onSuccess: function(result) {
      // Update your UI with verification results
      updatePatientCostEstimate(result);
    }
  });
</script>
```

## Revenue Opportunities

### 1. Free for Your Practices
- Your dental practices use it free
- Increases conversion rates by removing cost uncertainty
- Reduces staff time on phone verifications

### 2. SaaS for Other Practices
Offer to other dental practices:
- Basic: $99/month (100 verifications)
- Pro: $299/month (500 verifications)
- Enterprise: $499/month (unlimited)

### 3. Insurance Company Revenue
Once you hit scale (10k+ monthly verifications):
- Charge insurers $0.50-$2.00 per verification
- They save 75% vs manual call centers
- Win-win: they save money, you make money

## Next Steps

1. **Test Integration**
   ```bash
   # Start the API
   npm run dev
   
   # Test with curl
   curl -X POST http://localhost:3000/api/v1/verification/instant \
     -H "Content-Type: application/json" \
     -d '{
       "patientInfo": {
         "firstName": "John",
         "lastName": "Doe",
         "dateOfBirth": "1980-01-01",
         "memberId": "123456"
       },
       "insuranceInfo": {
         "payerId": "bcbs"
       },
       "procedureCode": "D6010"
     }'
   ```

2. **Deploy to Production**
   - Set up on AWS/GCP with HIPAA compliance
   - Configure real insurance API credentials
   - Set up monitoring and analytics

3. **Launch Strategy**
   - Week 1-2: Integrate with your dental tools
   - Week 3-4: Test with real patients
   - Month 2: Open to other practices
   - Month 3: Approach insurance companies

This positions you as the technology layer between patients, providers, and insurers - a massive market opportunity!