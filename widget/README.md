# 🏥 ClearVerify Widget

Embeddable insurance verification widget for dental practice websites.

## 🚀 Quick Start

### 1. Add to Your Website

```html
<!-- Container -->
<div id="clearverify-widget"></div>

<!-- Script -->
<script src="https://clearverify-api.onrender.com/widget/clearverify-widget.js"></script>
```

### 2. Customization (Optional)

```javascript
const widget = new ClearVerifyWidget({
    containerId: 'clearverify-widget',
    theme: 'modern', // or 'dark'
    practiceId: 'your-practice-id',
    onComplete: (result) => {
        if (result.success) {
            // Patient verified successfully
            console.log('Coverage:', result.data);
            
            // Show booking calendar, update records, etc.
        }
    }
});
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `containerId` | string | `'clearverify-widget'` | HTML element ID for the widget |
| `theme` | string | `'modern'` | Theme: `'modern'` or `'dark'` |
| `apiUrl` | string | Auto-detected | Custom API endpoint |
| `practiceId` | string | `null` | Your practice identifier |
| `onComplete` | function | No-op | Callback when verification completes |

## 🎨 Themes

### Modern Theme (Default)
Clean, professional design with blue accents.

### Dark Theme
```javascript
new ClearVerifyWidget({
    theme: 'dark'
});
```

## 📱 Responsive Design

The widget automatically adapts to:
- Desktop computers
- Tablets
- Mobile phones

## 🔒 Security & Privacy

- **Zero-Knowledge Architecture**: Patient data is never stored
- **HIPAA Compliant**: All data encrypted in transit
- **Ephemeral Processing**: Verification data deleted after use
- **No Tracking**: Widget doesn't use cookies or analytics

## 🏥 Supported Insurance Providers

- Blue Cross Blue Shield (all regions)
- Cigna
- UnitedHealthcare / Optum
- Aetna
- Humana
- Anthem
- Kaiser Permanente
- Delta Dental
- MetLife

## 📊 Verification Results

The widget returns detailed coverage information:

```javascript
{
    success: true,
    data: {
        eligibility: {
            active: true,
            effectiveDate: "2024-01-01"
        },
        benefits: [{
            procedureCode: "D0120",
            coveragePercentage: 100,
            copay: 0,
            averageCost: 95
        }],
        deductible: {
            annual: 2000,
            remaining: 1500
        },
        outOfPocketMax: {
            annual: 6000,
            remaining: 5000
        }
    }
}
```

## 🎯 Best Practices

### Placement Recommendations

1. **Appointment Booking Page** - Before patients schedule
2. **Patient Portal** - Self-service verification
3. **Treatment Planning** - During consultation
4. **Homepage** - Prominent call-to-action

### Implementation Tips

```html
<!-- Good: Clear call-to-action -->
<section class="insurance-verification">
    <h2>Check Your Insurance Coverage</h2>
    <p>Verify your benefits before your appointment</p>
    <div id="clearverify-widget"></div>
</section>

<!-- Better: Integrated with booking flow -->
<div class="booking-process">
    <div class="step active">
        <h3>Step 1: Verify Insurance</h3>
        <div id="clearverify-widget"></div>
    </div>
    <div class="step">
        <h3>Step 2: Select Appointment</h3>
        <!-- Booking calendar -->
    </div>
</div>
```

### Handling Results

```javascript
new ClearVerifyWidget({
    onComplete: (result) => {
        if (result.success) {
            // Success actions
            showBookingCalendar();
            updatePatientRecord(result.data);
            trackConversion('insurance_verified');
            
            // Show cost breakdown
            displayCostEstimate(result.data.benefits[0]);
            
        } else {
            // Error handling
            console.error('Verification failed:', result.error);
            
            // Fallback options
            showManualVerificationForm();
            offerPhoneVerification();
        }
    }
});
```

## 🔧 Custom Styling

Override default styles by targeting CSS classes:

```css
/* Custom theme */
.cv-widget {
    border-radius: 20px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.cv-widget .cv-header h3 {
    color: #your-brand-color;
}

.cv-btn {
    background: #your-brand-color;
}

/* Hide specific elements */
.cv-privacy-notice {
    display: none;
}
```

## 📞 Support

For integration help:
- Check the example.html file for a complete implementation
- Review the API documentation at `/docs`
- Contact support for custom implementations

## 🚀 Advanced Integration

### WordPress

```php
// Add to functions.php
function add_clearverify_widget() {
    wp_enqueue_script(
        'clearverify-widget',
        'https://clearverify-api.onrender.com/widget/clearverify-widget.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'add_clearverify_widget');

// Shortcode
function clearverify_shortcode($atts) {
    $atts = shortcode_atts(array(
        'practice_id' => '',
        'theme' => 'modern'
    ), $atts);
    
    return '<div id="clearverify-widget"></div>
            <script>
                new ClearVerifyWidget({
                    practiceId: "' . $atts['practice_id'] . '",
                    theme: "' . $atts['theme'] . '"
                });
            </script>';
}
add_shortcode('clearverify', 'clearverify_shortcode');
```

### React Integration

```jsx
import { useEffect, useRef } from 'react';

function InsuranceVerification({ practiceId, onComplete }) {
    const widgetRef = useRef();
    
    useEffect(() => {
        // Load script
        const script = document.createElement('script');
        script.src = 'https://clearverify-api.onrender.com/widget/clearverify-widget.js';
        script.onload = () => {
            new window.ClearVerifyWidget({
                containerId: 'clearverify-widget',
                practiceId,
                onComplete
            });
        };
        document.head.appendChild(script);
        
        return () => {
            document.head.removeChild(script);
        };
    }, [practiceId, onComplete]);
    
    return <div id="clearverify-widget" ref={widgetRef}></div>;
}
```