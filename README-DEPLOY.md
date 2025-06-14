# 🚀 Deploy ClearVerify to Production

## One-Click Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/BoweryJG/clearverify-api)

## Quick Deploy Steps:

1. **Click the Deploy button above**
2. **Connect your GitHub account** (if not already connected)
3. **Review the blueprint** - it will create:
   - ClearVerify API service
   - Redis cache instance
4. **Click "Create New Resources"**
5. **Wait ~5 minutes for deployment**

## Post-Deploy Configuration:

### 1. Get Your API URL
After deployment, your API will be at:
```
https://clearverify-api-[random].onrender.com
```

### 2. Add Insurance Credentials
Go to your Render dashboard → ClearVerify API → Environment:

**For Quick Start (Clearinghouse):**
```
USE_CLEARINGHOUSE=true
CLEARINGHOUSE_PROVIDER=change_healthcare
CLEARINGHOUSE_URL=https://api.changehealthcare.com
CLEARINGHOUSE_USERNAME=your-username
CLEARINGHOUSE_PASSWORD=your-password
```

**For Direct APIs:**
```
BCBS_FLORIDA_CLIENT_ID=your-client-id
BCBS_FLORIDA_CLIENT_SECRET=your-secret
# Add other insurers...
```

### 3. Test Your Deployment
```bash
curl https://your-api-url.onrender.com/health
```

### 4. Update Your Frontend
In your Netlify frontend, update the API URL:
```javascript
const CLEARVERIFY_API = 'https://clearverify-api-[random].onrender.com';
```

## 🎉 You're Live!

Your insurance verification API is now running in production. 

Next steps:
1. Add real insurance credentials
2. Update your dental apps to use the API
3. Monitor usage in Render dashboard

Need help? Check the logs in Render dashboard.