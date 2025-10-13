#!/bin/bash

# Start Yelp Ads Dashboard with domain ads.digitizeit.net
echo "🚀 Starting Yelp Ads Dashboard with domain: ads.digitizeit.net"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Step 1: Create environment files
print_step "1. Creating environment files..."

# Copy config files to proper .env names
cp config-prod.env .env.prod 2>/dev/null || cat > .env.prod << 'EOF'
SECRET_KEY=django-insecure-change-this-in-production-12345
DEBUG=False
ALLOWED_HOSTS=ads.digitizeit.net,www.ads.digitizeit.net,72.60.66.164,localhost,127.0.0.1
DATABASE_URL=postgresql://yelpadmin:yelpadmin@db:5432/yelp
YELP_API_KEY=your_yelp_api_key_here
YELP_API_SECRET=your_yelp_api_secret_here
YELP_FUSION_TOKEN=your_yelp_fusion_token_here
LOG_LEVEL=INFO
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https
SECURE_SSL_REDIRECT=False
USE_TZ=True
EOF

# Frontend env
cat > frontend/.env.production << 'EOF'
VITE_BACKEND_URL=http://ads.digitizeit.net
VITE_API_BASE_URL=http://ads.digitizeit.net/api
NODE_ENV=production
EOF

print_status "Environment files created!"

# Step 2: Stop any running containers
print_step "2. Stopping existing containers..."
docker-compose down

# Step 3: Setup Nginx configuration
print_step "3. Setting up Nginx configuration..."
if [ -f "nginx-ads.digitizeit.net.conf" ]; then
    sudo cp nginx-ads.digitizeit.net.conf /etc/nginx/sites-available/ads.digitizeit.net
    sudo ln -sf /etc/nginx/sites-available/ads.digitizeit.net /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    if sudo nginx -t; then
        sudo systemctl reload nginx
        print_status "Nginx configuration updated successfully!"
    else
        print_error "Nginx configuration test failed!"
        exit 1
    fi
else
    print_warning "Nginx config file not found, skipping Nginx setup"
fi

# Step 4: Start Docker containers
print_step "4. Starting Docker containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for containers to start
sleep 10

# Step 5: Check container status
print_step "5. Checking container status..."
docker-compose -f docker-compose.prod.yml ps

# Step 6: Test endpoints
print_step "6. Testing endpoints..."
echo "🧪 Testing backend (localhost:8000)..."
if curl -s -I http://127.0.0.1:8000/admin/ | head -1 | grep -q "200\|301\|302"; then
    print_status "✅ Backend is responding"
else
    print_warning "⚠️  Backend might not be ready yet"
fi

echo "🧪 Testing frontend (localhost:8080)..."
if curl -s -I http://127.0.0.1:8080 | head -1 | grep -q "200"; then
    print_status "✅ Frontend is responding"
else
    print_warning "⚠️  Frontend might not be ready yet"
fi

echo "🧪 Testing domain (ads.digitizeit.net)..."
if curl -s -I http://ads.digitizeit.net | head -1 | grep -q "200"; then
    print_status "✅ Domain is working"
else
    print_warning "⚠️  Domain might not be ready yet or DNS not propagated"
fi

# Step 7: Show results
echo
print_status "🎉 Deployment completed!"
echo
echo "📊 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo
echo "🌐 Access URLs:"
echo "   • Domain:    http://ads.digitizeit.net"
echo "   • Frontend:  http://127.0.0.1:8080"
echo "   • Backend:   http://127.0.0.1:8000"
echo "   • Admin:     http://ads.digitizeit.net/admin"
echo "   • API:       http://ads.digitizeit.net/api"
echo
echo "📋 Next steps:"
echo "   1. Update your Yelp API credentials in .env.prod"
echo "   2. Test the application: http://ads.digitizeit.net"
echo "   3. Setup SSL: sudo certbot --nginx -d ads.digitizeit.net"
echo
echo "📝 Useful commands:"
echo "   • View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   • Stop:      docker-compose -f docker-compose.prod.yml down"
echo "   • Restart:   docker-compose -f docker-compose.prod.yml restart"
echo
print_warning "⚠️  Don't forget to:"
echo "   - Point ads.digitizeit.net DNS A record to 72.60.66.164"
echo "   - Update Yelp API keys in .env.prod"
echo "   - Setup SSL certificate for HTTPS"
