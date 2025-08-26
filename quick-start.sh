#!/bin/bash

# Quick Start Script для сервера 72.60.66.164
echo "🚀 Quick Start - Yelp Ads Dashboard"

# Check if deploy script exists
if [ ! -f "deploy-server.sh" ]; then
    echo "❌ deploy-server.sh not found. Run this from project root."
    exit 1
fi

# Run deployment
echo "📦 Running deployment..."
chmod +x deploy-server.sh
./deploy-server.sh

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🔧 Next steps:"
echo "1. Update Yelp API keys in backend/.env"
echo "2. Start the services:"
echo "   Terminal 1: ./start-backend.sh"
echo "   Terminal 2: ./start-frontend.sh"
echo ""
echo "🌐 URLs will be available at:"
echo "   Frontend: http://72.60.66.164:8080"
echo "   Backend:  http://72.60.66.164:8000"
echo ""

# Check if user wants to edit .env
read -p "Do you want to edit backend/.env now? (y/N): " edit_env
if [[ $edit_env =~ ^[Yy]$ ]]; then
    if command -v nano &> /dev/null; then
        nano backend/.env
    elif command -v vim &> /dev/null; then
        vim backend/.env
    else
        echo "Please edit backend/.env manually"
    fi
fi

echo "Ready to start! 🎉"
