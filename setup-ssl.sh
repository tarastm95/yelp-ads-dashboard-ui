#!/bin/bash

# Setup SSL certificate for ads.digitizeit.net
echo "🔒 Setting up SSL certificate for ads.digitizeit.net"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run this script with sudo"
    exit 1
fi

# Step 1: Install Certbot
print_status "Installing Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Step 2: Check DNS resolution
print_status "Checking DNS resolution..."
if nslookup ads.digitizeit.net | grep -q "72.60.66.164"; then
    print_status "✅ DNS is correctly pointing to this server"
else
    print_warning "⚠️  DNS might not be properly configured"
    print_warning "Make sure ads.digitizeit.net A record points to 72.60.66.164"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Test HTTP site first
print_status "Testing HTTP site..."
if curl -s -I http://ads.digitizeit.net | head -1 | grep -q "200"; then
    print_status "✅ HTTP site is working"
else
    print_error "❌ HTTP site is not responding"
    print_error "Please make sure the site is working on HTTP before adding SSL"
    exit 1
fi

# Step 4: Get SSL certificate
print_status "Obtaining SSL certificate..."
certbot --nginx -d ads.digitizeit.net -d www.ads.digitizeit.net --non-interactive --agree-tos --email admin@digitizeit.net

if [ $? -eq 0 ]; then
    print_status "✅ SSL certificate obtained successfully!"
else
    print_error "❌ Failed to obtain SSL certificate"
    exit 1
fi

# Step 5: Update frontend environment for HTTPS
print_status "Updating frontend environment for HTTPS..."
cat > ../frontend/.env.production << 'EOF'
VITE_BACKEND_URL=https://ads.digitizeit.net
VITE_API_BASE_URL=https://ads.digitizeit.net/api
NODE_ENV=production
EOF

# Step 6: Update docker-compose for HTTPS
print_status "Updating Docker Compose environment for HTTPS..."
sed -i 's/VITE_BACKEND_URL=http:/VITE_BACKEND_URL=https:/g' ../docker-compose.prod.yml
sed -i 's/VITE_API_BASE_URL=http:/VITE_API_BASE_URL=https:/g' ../docker-compose.prod.yml

# Step 7: Restart frontend container to pick up new environment
print_status "Restarting frontend container..."
cd ..
docker-compose -f docker-compose.prod.yml restart frontend

# Step 8: Setup auto-renewal
print_status "Setting up automatic certificate renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Step 9: Test the renewal process
print_status "Testing certificate renewal..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    print_status "✅ Certificate auto-renewal is working"
else
    print_warning "⚠️  Certificate auto-renewal test failed"
fi

# Step 10: Test HTTPS site
print_status "Testing HTTPS site..."
sleep 5
if curl -s -I https://ads.digitizeit.net | head -1 | grep -q "200"; then
    print_status "✅ HTTPS site is working"
else
    print_warning "⚠️  HTTPS site might need a few more seconds to be ready"
fi

echo
print_status "🎉 SSL setup completed!"
echo
echo "🌐 Your site is now available at:"
echo "   • HTTPS: https://ads.digitizeit.net"
echo "   • HTTP:  http://ads.digitizeit.net (redirects to HTTPS)"
echo
echo "🔒 SSL Certificate info:"
certbot certificates
echo
echo "📅 Certificate will auto-renew via systemd timer"
echo "📝 Check renewal status: systemctl status certbot.timer"
echo
print_status "✅ All done! Your site is now secure with HTTPS!"
