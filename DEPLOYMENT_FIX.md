# Askerbot Deployment Fix

## Problem Identified
The deployment was showing "No functions deployed" because the `netlify.toml` configuration file was in the `config/` directory instead of the root directory where Netlify expects it.

## Root Cause
- ✅ Function code (`netlify/functions/chat.js`) is correct and working
- ✅ FAQ responses work perfectly (tested locally)
- ✅ API integration works perfectly (tested locally)
- ❌ `netlify.toml` was in wrong location (`config/netlify.toml` instead of root)
- ❌ Missing environment variables in Netlify dashboard

## Fixes Applied

### 1. Moved netlify.toml to Root Directory
```bash
cp config/netlify.toml netlify.toml
git add netlify.toml
git commit -m "Move netlify.toml to root directory for proper function deployment"
```

### 2. Required Environment Variables
You need to set these in your Netlify site dashboard:

1. Go to your Netlify site dashboard
2. Navigate to Site settings > Environment variables
3. Add: `OPENAI_API_KEY` = `your_openai_api_key_here`

### 3. Deployment Steps
1. Push the changes to trigger a new deployment:
   ```bash
   git push origin main
   ```

2. Monitor the deployment in Netlify dashboard
3. The deploy summary should now show "1 function deployed" instead of "No functions deployed"

## Verification
After deployment, test the chatbot:
- FAQ responses should work immediately (OBOS Akademi, A-laget, etc.)
- API calls should work with proper OpenAI integration
- Error message "Fikk ikke kontakt med Askerbot" should be resolved

## Files Modified
- ✅ `netlify.toml` - moved to root directory
- ✅ `netlify/functions/chat.js` - already correct
- ✅ `index.html` - already correct

## Local Testing Confirmed
- ✅ Function syntax is valid
- ✅ FAQ responses work perfectly
- ✅ API integration works with OpenAI
- ✅ CORS headers are properly configured
- ✅ Error handling is robust

The issue was purely a deployment configuration problem, not a code problem.
