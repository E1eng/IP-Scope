#!/bin/bash

# IPScope Deployment Script
echo "🚀 Starting IPScope deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy Backend
echo "📦 Deploying backend..."
cd server
vercel --prod
BACKEND_URL=$(vercel ls | grep "ip-asset-search-server" | head -1 | awk '{print $2}')
echo "✅ Backend deployed at: $BACKEND_URL"

# Deploy Frontend
echo "📦 Deploying frontend..."
cd ../client
vercel --prod
FRONTEND_URL=$(vercel ls | grep "ip-asset-search-client" | head -1 | awk '{print $2}')
echo "✅ Frontend deployed at: $FRONTEND_URL"

echo "🎉 Deployment complete!"
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo ""
echo "Don't forget to:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Update VITE_API_URL in frontend environment variables"
echo "3. Test the deployment"
