// ClearVerify Embeddable Widget
// Add this script to any webpage to enable insurance verification

(function() {
  'use strict';

  const CLEARVERIFY_API = 'https://api.clearverify.com';
  const WIDGET_VERSION = '1.0.0';

  class ClearVerifyWidget {
    constructor(config) {
      this.config = {
        apiKey: config.apiKey || '',
        providerId: config.providerId || '',
        theme: config.theme || 'light',
        position: config.position || 'bottom-right',
        procedureCodes: config.procedureCodes || [],
        onSuccess: config.onSuccess || function() {},
        onError: config.onError || function() {},
        ...config
      };

      this.init();
    }

    init() {
      this.injectStyles();
      this.createWidget();
      this.attachEventListeners();
    }

    injectStyles() {
      const styles = `
        .cv-widget-container {
          position: fixed;
          ${this.config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
          ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .cv-widget-button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
        }

        .cv-widget-button:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }

        .cv-widget-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 10000;
          align-items: center;
          justify-content: center;
        }

        .cv-widget-modal.active {
          display: flex;
        }

        .cv-widget-content {
          background: white;
          border-radius: 12px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .cv-widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .cv-widget-title {
          font-size: 24px;
          font-weight: 600;
          color: #111827;
        }

        .cv-widget-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
        }

        .cv-widget-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cv-widget-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cv-widget-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .cv-widget-input {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .cv-widget-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .cv-widget-submit {
          background: #2563eb;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 16px;
          transition: background 0.2s;
        }

        .cv-widget-submit:hover {
          background: #1d4ed8;
        }

        .cv-widget-submit:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .cv-widget-result {
          display: none;
          background: #f3f4f6;
          border-radius: 8px;
          padding: 24px;
          margin-top: 24px;
        }

        .cv-widget-result.active {
          display: block;
        }

        .cv-widget-coverage {
          font-size: 18px;
          font-weight: 600;
          color: #059669;
          margin-bottom: 16px;
        }

        .cv-widget-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cv-widget-detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .cv-widget-detail-label {
          color: #6b7280;
        }

        .cv-widget-detail-value {
          font-weight: 500;
          color: #111827;
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    createWidget() {
      const container = document.createElement('div');
      container.className = 'cv-widget-container';
      container.innerHTML = `
        <button class="cv-widget-button" id="cv-widget-trigger">
          Check Insurance Coverage
        </button>

        <div class="cv-widget-modal" id="cv-widget-modal">
          <div class="cv-widget-content">
            <div class="cv-widget-header">
              <h2 class="cv-widget-title">Insurance Verification</h2>
              <button class="cv-widget-close" id="cv-widget-close">&times;</button>
            </div>

            <form class="cv-widget-form" id="cv-widget-form">
              <div class="cv-widget-field">
                <label class="cv-widget-label">First Name</label>
                <input type="text" class="cv-widget-input" name="firstName" required>
              </div>

              <div class="cv-widget-field">
                <label class="cv-widget-label">Last Name</label>
                <input type="text" class="cv-widget-input" name="lastName" required>
              </div>

              <div class="cv-widget-field">
                <label class="cv-widget-label">Date of Birth</label>
                <input type="date" class="cv-widget-input" name="dateOfBirth" required>
              </div>

              <div class="cv-widget-field">
                <label class="cv-widget-label">Member ID</label>
                <input type="text" class="cv-widget-input" name="memberId">
              </div>

              <div class="cv-widget-field">
                <label class="cv-widget-label">Insurance Provider</label>
                <select class="cv-widget-input" name="payerId" required>
                  <option value="">Select Provider</option>
                  <option value="bcbs">Blue Cross Blue Shield</option>
                  <option value="united">UnitedHealth</option>
                  <option value="cigna">Cigna</option>
                  <option value="aetna">Aetna</option>
                  <option value="humana">Humana</option>
                </select>
              </div>

              <div class="cv-widget-field">
                <label class="cv-widget-label">Procedure</label>
                <select class="cv-widget-input" name="procedureCode" required>
                  <option value="">Select Procedure</option>
                  ${this.config.procedureCodes.map(p => 
                    `<option value="${p.code}">${p.description}</option>`
                  ).join('')}
                </select>
              </div>

              <button type="submit" class="cv-widget-submit">
                Verify Coverage
              </button>
            </form>

            <div class="cv-widget-result" id="cv-widget-result">
              <div class="cv-widget-coverage" id="cv-coverage-status"></div>
              <div class="cv-widget-details" id="cv-coverage-details"></div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);
    }

    attachEventListeners() {
      const trigger = document.getElementById('cv-widget-trigger');
      const modal = document.getElementById('cv-widget-modal');
      const close = document.getElementById('cv-widget-close');
      const form = document.getElementById('cv-widget-form');

      trigger.addEventListener('click', () => {
        modal.classList.add('active');
      });

      close.addEventListener('click', () => {
        modal.classList.remove('active');
        this.resetForm();
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          this.resetForm();
        }
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit(new FormData(form));
      });
    }

    async handleSubmit(formData) {
      const submitBtn = document.querySelector('.cv-widget-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';

      try {
        const data = {
          patientInfo: {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            dateOfBirth: formData.get('dateOfBirth'),
            memberId: formData.get('memberId')
          },
          insuranceInfo: {
            payerId: formData.get('payerId')
          },
          procedureCode: formData.get('procedureCode'),
          providerId: this.config.providerId
        };

        const response = await fetch(`${CLEARVERIFY_API}/api/v1/verification/instant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
          this.displayResult(result.data);
          this.config.onSuccess(result.data);
        } else {
          throw new Error(result.error || 'Verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        this.config.onError(error);
        alert('Unable to verify insurance. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Coverage';
      }
    }

    displayResult(data) {
      const resultDiv = document.getElementById('cv-widget-result');
      const statusDiv = document.getElementById('cv-coverage-status');
      const detailsDiv = document.getElementById('cv-coverage-details');

      if (data.coverage.isProcedureCovered) {
        statusDiv.textContent = '✓ Procedure is covered';
        statusDiv.style.color = '#059669';
      } else {
        statusDiv.textContent = '✗ Procedure is not covered';
        statusDiv.style.color = '#dc2626';
      }

      detailsDiv.innerHTML = `
        <div class="cv-widget-detail-row">
          <span class="cv-widget-detail-label">Coverage:</span>
          <span class="cv-widget-detail-value">${data.coverage.coveragePercentage}%</span>
        </div>
        <div class="cv-widget-detail-row">
          <span class="cv-widget-detail-label">Deductible Remaining:</span>
          <span class="cv-widget-detail-value">$${data.coverage.deductible.remaining.toFixed(2)}</span>
        </div>
        <div class="cv-widget-detail-row">
          <span class="cv-widget-detail-label">Estimated Patient Cost:</span>
          <span class="cv-widget-detail-value" style="font-size: 18px; color: #2563eb;">
            $${data.coverage.estimatedPatientCost.toFixed(2)}
          </span>
        </div>
      `;

      resultDiv.classList.add('active');
    }

    resetForm() {
      document.getElementById('cv-widget-form').reset();
      document.getElementById('cv-widget-result').classList.remove('active');
    }
  }

  // Global initialization function
  window.ClearVerify = {
    init: function(config) {
      return new ClearVerifyWidget(config);
    },
    version: WIDGET_VERSION
  };
})();