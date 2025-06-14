#!/bin/bash

echo "🏥 ClearVerify Insurance API Setup"
echo "================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
fi

echo "This script will help you set up real insurance API credentials."
echo ""
echo "You have 3 options:"
echo "1. Direct Insurance APIs (requires registration with each insurer)"
echo "2. Clearinghouse Integration (faster setup, broader coverage)"
echo "3. Hybrid Approach (use both for redundancy)"
echo ""

read -p "Which option would you like to use? (1/2/3): " option

case $option in
    1)
        echo ""
        echo "📝 Direct Insurance API Setup"
        echo "----------------------------"
        echo ""
        echo "You'll need to register at these developer portals:"
        echo ""
        echo "1. Blue Cross Blue Shield (by region):"
        echo "   - Florida Blue: https://developers.floridablue.com"
        echo "   - Blue Shield CA: https://developer.blueshieldca.com"
        echo "   - Search '[Your State] BCBS developer portal'"
        echo ""
        echo "2. UnitedHealth/Optum: https://developer.optum.com"
        echo "3. Cigna: https://developer.cigna.com"
        echo "4. Aetna: https://developerportal.aetna.com"
        echo "5. Humana: https://developers.humana.com"
        echo "6. Anthem: https://developerportal.anthem.com"
        echo "7. Kaiser: https://developer.kaiserpermanente.org"
        echo ""
        echo "After registering, add your credentials to .env:"
        echo ""
        echo "BCBS_FLORIDA_CLIENT_ID=your-client-id"
        echo "BCBS_FLORIDA_CLIENT_SECRET=your-client-secret"
        echo "# ... and so on for each provider"
        echo ""
        ;;
    
    2)
        echo ""
        echo "🚀 Clearinghouse Setup (Recommended for Quick Start)"
        echo "---------------------------------------------------"
        echo ""
        echo "Choose a clearinghouse provider:"
        echo "1. Change Healthcare (1000+ payers)"
        echo "2. Availity (major payer network)"
        echo "3. Waystar (real-time eligibility)"
        echo ""
        read -p "Select clearinghouse (1/2/3): " ch_option
        
        case $ch_option in
            1)
                echo ""
                echo "Change Healthcare Setup:"
                echo "1. Register at: https://developers.changehealthcare.com"
                echo "2. Request Medical Network API access"
                echo "3. Add to .env:"
                echo "   USE_CLEARINGHOUSE=true"
                echo "   CLEARINGHOUSE_PROVIDER=change_healthcare"
                echo "   CLEARINGHOUSE_URL=https://api.changehealthcare.com"
                echo "   CLEARINGHOUSE_USERNAME=your-username"
                echo "   CLEARINGHOUSE_PASSWORD=your-password"
                ;;
            2)
                echo ""
                echo "Availity Setup:"
                echo "1. Register at: https://www.availity.com"
                echo "2. Request API access"
                echo "3. Add credentials to .env"
                ;;
            3)
                echo ""
                echo "Waystar Setup:"
                echo "1. Register at: https://www.waystar.com"
                echo "2. Request API access"
                echo "3. Add credentials to .env"
                ;;
        esac
        ;;
    
    3)
        echo ""
        echo "🔄 Hybrid Approach"
        echo "-------------------"
        echo ""
        echo "Start with clearinghouse for immediate coverage,"
        echo "then gradually add direct APIs for better rates and control."
        echo ""
        ;;
esac

echo ""
echo "📋 Next Steps:"
echo "1. Complete registration with chosen provider(s)"
echo "2. Update .env with your credentials"
echo "3. Test with: npm run test:integration"
echo "4. Start development: npm run dev"
echo ""
echo "Need help? Check INSURANCE_API_SETUP.md for detailed instructions."
echo ""