/**
 * ClearVerify Insurance Verification Widget
 * Embeddable widget for dental practice websites
 */

class ClearVerifyWidget {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'https://clearverify-api.onrender.com';
    this.containerId = config.containerId || 'clearverify-widget';
    this.theme = config.theme || 'modern';
    this.onComplete = config.onComplete || (() => {});
    this.practiceId = config.practiceId || null;
    
    this.init();
  }

  init() {
    this.createWidget();
    this.attachStyles();
    this.bindEvents();
  }

  createWidget() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`ClearVerify: Container with ID "${this.containerId}" not found`);
      return;
    }

    container.innerHTML = `
      <div class="cv-widget ${this.theme}">
        <div class="cv-header">
          <h3>🏥 Verify Your Insurance</h3>
          <p>Check your coverage before your appointment</p>
        </div>
        
        <form class="cv-form" id="cv-verification-form">
          <div class="cv-step cv-step-1 active">
            <h4>Insurance Information</h4>
            
            <div class="cv-field">
              <label for="cv-insurer">Insurance Company</label>
              <select id="cv-insurer" required>
                <option value="">Select your insurance...</option>
                <option value="bcbs_florida">Blue Cross Blue Shield Florida</option>
                <option value="bcbs_california">Blue Shield California</option>
                <option value="cigna">Cigna</option>
                <option value="united_optum">UnitedHealthcare / Optum</option>
                <option value="aetna">Aetna</option>
                <option value="humana">Humana</option>
                <option value="anthem">Anthem</option>
                <option value="kaiser">Kaiser Permanente</option>
                <option value="delta_dental">Delta Dental</option>
                <option value="metlife">MetLife</option>
              </select>
            </div>

            <div class="cv-field">
              <label for="cv-member-id">Member ID</label>
              <input type="text" id="cv-member-id" placeholder="Your member ID" required>
            </div>

            <div class="cv-field">
              <label for="cv-procedure">Procedure</label>
              <select id="cv-procedure" required>
                <option value="">What do you need done?</option>
                <option value="D0120">Routine Cleaning</option>
                <option value="D0210">Complete X-rays</option>
                <option value="D2391">Tooth Filling</option>
                <option value="D6010">Dental Implant</option>
                <option value="D6065">Implant Crown</option>
                <option value="D7210">Tooth Extraction</option>
                <option value="D2740">Crown</option>
                <option value="D5110">Complete Denture</option>
              </select>
            </div>

            <button type="button" class="cv-btn cv-btn-next" onclick="clearverifyWidget.nextStep()">
              Next Step →
            </button>
          </div>

          <div class="cv-step cv-step-2">
            <h4>Personal Information</h4>
            
            <div class="cv-field-row">
              <div class="cv-field">
                <label for="cv-first-name">First Name</label>
                <input type="text" id="cv-first-name" required>
              </div>
              <div class="cv-field">
                <label for="cv-last-name">Last Name</label>
                <input type="text" id="cv-last-name" required>
              </div>
            </div>

            <div class="cv-field">
              <label for="cv-dob">Date of Birth</label>
              <input type="date" id="cv-dob" required>
            </div>

            <div class="cv-privacy-notice">
              <p>🔒 Your information is encrypted and never stored. We only verify your coverage.</p>
            </div>

            <div class="cv-button-row">
              <button type="button" class="cv-btn cv-btn-back" onclick="clearverifyWidget.prevStep()">
                ← Back
              </button>
              <button type="submit" class="cv-btn cv-btn-verify">
                🔍 Verify Coverage
              </button>
            </div>
          </div>
        </form>

        <div class="cv-results" id="cv-results" style="display: none;">
          <div class="cv-loading" id="cv-loading">
            <div class="cv-spinner"></div>
            <p>Verifying your insurance...</p>
          </div>
          
          <div class="cv-success" id="cv-success" style="display: none;">
            <h4>✅ Coverage Verified!</h4>
            <div class="cv-coverage-details"></div>
            <button type="button" class="cv-btn" onclick="clearverifyWidget.reset()">
              Verify Another
            </button>
          </div>

          <div class="cv-error" id="cv-error" style="display: none;">
            <h4>❌ Verification Failed</h4>
            <p class="cv-error-message"></p>
            <button type="button" class="cv-btn" onclick="clearverifyWidget.reset()">
              Try Again
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachStyles() {
    if (document.getElementById('cv-widget-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'cv-widget-styles';
    styles.textContent = `
      .cv-widget {
        max-width: 500px;
        margin: 20px auto;
        padding: 24px;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .cv-header {
        text-align: center;
        margin-bottom: 24px;
      }

      .cv-header h3 {
        margin: 0 0 8px 0;
        color: #2563eb;
        font-size: 24px;
      }

      .cv-header p {
        margin: 0;
        color: #64748b;
        font-size: 14px;
      }

      .cv-step {
        display: none;
      }

      .cv-step.active {
        display: block;
      }

      .cv-step h4 {
        margin: 0 0 20px 0;
        color: #1e293b;
        font-size: 18px;
      }

      .cv-field {
        margin-bottom: 16px;
      }

      .cv-field-row {
        display: flex;
        gap: 12px;
      }

      .cv-field-row .cv-field {
        flex: 1;
      }

      .cv-field label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #374151;
        font-size: 14px;
      }

      .cv-field input,
      .cv-field select {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 16px;
        box-sizing: border-box;
      }

      .cv-field input:focus,
      .cv-field select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }

      .cv-privacy-notice {
        background: #f0f9ff;
        padding: 12px;
        border-radius: 8px;
        margin: 16px 0;
      }

      .cv-privacy-notice p {
        margin: 0;
        font-size: 13px;
        color: #0369a1;
      }

      .cv-btn {
        background: #2563eb;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }

      .cv-btn:hover {
        background: #1d4ed8;
      }

      .cv-btn-back {
        background: #6b7280;
      }

      .cv-btn-back:hover {
        background: #4b5563;
      }

      .cv-button-row {
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }

      .cv-results {
        text-align: center;
      }

      .cv-loading {
        padding: 40px 20px;
      }

      .cv-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e5e7eb;
        border-left: 4px solid #2563eb;
        border-radius: 50%;
        animation: cv-spin 1s linear infinite;
        margin: 0 auto 16px auto;
      }

      @keyframes cv-spin {
        to { transform: rotate(360deg); }
      }

      .cv-success {
        padding: 20px;
        background: #f0fdf4;
        border-radius: 8px;
        margin-top: 20px;
      }

      .cv-success h4 {
        color: #16a34a;
        margin: 0 0 16px 0;
      }

      .cv-coverage-details {
        text-align: left;
        background: white;
        padding: 16px;
        border-radius: 8px;
        margin: 16px 0;
      }

      .cv-coverage-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
      }

      .cv-coverage-item:last-child {
        border-bottom: none;
      }

      .cv-error {
        padding: 20px;
        background: #fef2f2;
        border-radius: 8px;
        margin-top: 20px;
      }

      .cv-error h4 {
        color: #dc2626;
        margin: 0 0 12px 0;
      }

      .cv-error-message {
        color: #7f1d1d;
        margin: 0 0 16px 0;
      }

      /* Dark theme */
      .cv-widget.dark {
        background: #1f2937;
        border-color: #374151;
        color: white;
      }

      .cv-widget.dark .cv-header h3 {
        color: #60a5fa;
      }

      .cv-widget.dark .cv-field input,
      .cv-widget.dark .cv-field select {
        background: #374151;
        border-color: #4b5563;
        color: white;
      }
    `;

    document.head.appendChild(styles);
  }

  bindEvents() {
    const form = document.getElementById('cv-verification-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.verifyInsurance();
      });
    }
  }

  nextStep() {
    const step1 = document.querySelector('.cv-step-1');
    const step2 = document.querySelector('.cv-step-2');
    
    if (this.validateStep1()) {
      step1.classList.remove('active');
      step2.classList.add('active');
    }
  }

  prevStep() {
    const step1 = document.querySelector('.cv-step-1');
    const step2 = document.querySelector('.cv-step-2');
    
    step2.classList.remove('active');
    step1.classList.add('active');
  }

  validateStep1() {
    const insurer = document.getElementById('cv-insurer').value;
    const memberId = document.getElementById('cv-member-id').value;
    const procedure = document.getElementById('cv-procedure').value;

    if (!insurer || !memberId || !procedure) {
      alert('Please fill in all fields');
      return false;
    }

    return true;
  }

  async verifyInsurance() {
    const formData = this.getFormData();
    
    if (!this.validateForm(formData)) return;

    this.showResults();
    this.showLoading();

    try {
      const response = await fetch(`${this.apiUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payerId: formData.insurer,
          memberId: formData.memberId,
          procedureCode: formData.procedure,
          patient: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            dob: formData.dob
          },
          practiceId: this.practiceId
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.showSuccess(result.data);
      } else {
        this.showError(result.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      this.showError('Unable to verify insurance. Please try again.');
    }
  }

  getFormData() {
    return {
      insurer: document.getElementById('cv-insurer').value,
      memberId: document.getElementById('cv-member-id').value,
      procedure: document.getElementById('cv-procedure').value,
      firstName: document.getElementById('cv-first-name').value,
      lastName: document.getElementById('cv-last-name').value,
      dob: document.getElementById('cv-dob').value
    };
  }

  validateForm(data) {
    const required = ['insurer', 'memberId', 'procedure', 'firstName', 'lastName', 'dob'];
    
    for (const field of required) {
      if (!data[field]) {
        alert(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    return true;
  }

  showResults() {
    document.querySelector('.cv-form').style.display = 'none';
    document.getElementById('cv-results').style.display = 'block';
  }

  showLoading() {
    document.getElementById('cv-loading').style.display = 'block';
    document.getElementById('cv-success').style.display = 'none';
    document.getElementById('cv-error').style.display = 'none';
  }

  showSuccess(data) {
    document.getElementById('cv-loading').style.display = 'none';
    document.getElementById('cv-error').style.display = 'none';
    
    const successDiv = document.getElementById('cv-success');
    const detailsDiv = successDiv.querySelector('.cv-coverage-details');
    
    const procedure = data.benefits?.[0];
    const patientCost = procedure ? Math.round(procedure.averageCost * (1 - procedure.coveragePercentage / 100) + procedure.copay) : 0;
    
    detailsDiv.innerHTML = `
      <div class="cv-coverage-item">
        <span>Coverage:</span>
        <strong>${procedure?.coveragePercentage || 0}%</strong>
      </div>
      <div class="cv-coverage-item">
        <span>Estimated Cost:</span>
        <strong>$${procedure?.averageCost || 0}</strong>
      </div>
      <div class="cv-coverage-item">
        <span>Your Cost:</span>
        <strong>$${patientCost}</strong>
      </div>
      <div class="cv-coverage-item">
        <span>Deductible Remaining:</span>
        <strong>$${data.deductible?.remaining || 0}</strong>
      </div>
    `;
    
    successDiv.style.display = 'block';
    
    this.onComplete({
      success: true,
      data: data
    });
  }

  showError(message) {
    document.getElementById('cv-loading').style.display = 'none';
    document.getElementById('cv-success').style.display = 'none';
    
    const errorDiv = document.getElementById('cv-error');
    errorDiv.querySelector('.cv-error-message').textContent = message;
    errorDiv.style.display = 'block';
    
    this.onComplete({
      success: false,
      error: message
    });
  }

  reset() {
    document.querySelector('.cv-form').style.display = 'block';
    document.getElementById('cv-results').style.display = 'none';
    
    // Reset to step 1
    document.querySelector('.cv-step-2').classList.remove('active');
    document.querySelector('.cv-step-1').classList.add('active');
    
    // Clear form
    document.getElementById('cv-verification-form').reset();
  }
}

// Auto-initialize if container exists
window.clearverifyWidget = null;

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('clearverify-widget')) {
    window.clearverifyWidget = new ClearVerifyWidget();
  }
});

// Export for manual initialization
window.ClearVerifyWidget = ClearVerifyWidget;