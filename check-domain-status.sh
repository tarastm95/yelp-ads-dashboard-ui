#!/bin/bash

# Check domain status for ads.digitizeit.net
echo "🔍 Checking domain status for ads.digitizeit.net"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "==========================================="
echo "🌐 DNS and Network Checks"
echo "==========================================="

# Check DNS resolution
print_info "Checking DNS resolution..."
if nslookup ads.digitizeit.net | grep -q "72.60.66.164"; then
    print_check 0 "DNS correctly points to 72.60.66.164"
else
    print_check 1 "DNS not pointing to 72.60.66.164"
    print_warning "Make sure A record is set: ads.digitizeit.net -> 72.60.66.164"
fi

echo "==========================================="
echo "🐳 Docker Container Status"
echo "==========================================="

# Check if Docker is running
print_info "Checking Docker status..."
if systemctl is-active --quiet docker; then
    print_check 0 "Docker service is running"
else
    print_check 1 "Docker service is not running"
fi

# Check containers
print_info "Checking containers..."
if docker ps | grep -q "yelp-ads-dashboard"; then
    print_check 0 "Yelp containers are running"
    echo "📊 Container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(frontend|backend|db)"
else
    print_check 1 "Yelp containers not found"
    print_warning "Run: docker-compose -f docker-compose.prod.yml up -d"
fi

echo "==========================================="
echo "🌐 Nginx Status"
echo "==========================================="

# Check Nginx
print_info "Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    print_check 0 "Nginx is running"
else
    print_check 1 "Nginx is not running"
fi

# Check Nginx config
print_info "Checking Nginx configuration..."
if [ -f "/etc/nginx/sites-enabled/ads.digitizeit.net" ]; then
    print_check 0 "Domain configuration exists"
    if sudo nginx -t &>/dev/null; then
        print_check 0 "Nginx configuration is valid"
    else
        print_check 1 "Nginx configuration has errors"
    fi
else
    print_check 1 "Domain configuration not found"
    print_warning "Run: sudo cp nginx-ads.digitizeit.net.conf /etc/nginx/sites-available/ads.digitizeit.net"
fi

echo "==========================================="
echo "🔌 Port Availability"
echo "==========================================="

# Check ports
print_info "Checking port availability..."

if ss -tlnp | grep -q ":8000"; then
    print_check 0 "Port 8000 (backend) is in use"
else
    print_check 1 "Port 8000 (backend) is not in use"
fi

if ss -tlnp | grep -q ":8080"; then
    print_check 0 "Port 8080 (frontend) is in use"
else
    print_check 1 "Port 8080 (frontend) is not in use"
fi

if ss -tlnp | grep -q ":80"; then
    print_check 0 "Port 80 (HTTP) is in use"
else
    print_check 1 "Port 80 (HTTP) is not in use"
fi

if ss -tlnp | grep -q ":443"; then
    print_check 0 "Port 443 (HTTPS) is in use"
    HTTPS_AVAILABLE=true
else
    print_warning "Port 443 (HTTPS) is not in use - SSL not configured"
    HTTPS_AVAILABLE=false
fi

echo "==========================================="
echo "🧪 Endpoint Testing"
echo "==========================================="

print_info "Testing local endpoints..."

# Test backend locally
if curl -s -I http://127.0.0.1:8000/admin/ | head -1 | grep -q -E "(200|301|302)"; then
    print_check 0 "Backend (localhost:8000) is responding"
else
    print_check 1 "Backend (localhost:8000) is not responding"
fi

# Test frontend locally
if curl -s -I http://127.0.0.1:8080 | head -1 | grep -q "200"; then
    print_check 0 "Frontend (localhost:8080) is responding"
else
    print_check 1 "Frontend (localhost:8080) is not responding"
fi

print_info "Testing domain endpoints..."

# Test HTTP domain
if curl -s -I http://ads.digitizeit.net | head -1 | grep -q -E "(200|301|302)"; then
    print_check 0 "HTTP domain (ads.digitizeit.net) is responding"
    HTTP_RESPONSE=$(curl -s -I http://ads.digitizeit.net | head -1)
    echo "   Response: $HTTP_RESPONSE"
else
    print_check 1 "HTTP domain (ads.digitizeit.net) is not responding"
fi

# Test HTTPS domain (if available)
if [ "$HTTPS_AVAILABLE" = true ]; then
    if curl -s -I https://ads.digitizeit.net | head -1 | grep -q "200"; then
        print_check 0 "HTTPS domain (ads.digitizeit.net) is responding"
        HTTPS_RESPONSE=$(curl -s -I https://ads.digitizeit.net | head -1)
        echo "   Response: $HTTPS_RESPONSE"
    else
        print_check 1 "HTTPS domain (ads.digitizeit.net) is not responding"
    fi
fi

# Test API
if curl -s -I http://ads.digitizeit.net/api/ | head -1 | grep -q -E "(200|404|405)"; then
    print_check 0 "API endpoint (/api/) is accessible"
else
    print_check 1 "API endpoint (/api/) is not accessible"
fi

echo "==========================================="
echo "🔒 SSL Certificate Status"
echo "==========================================="

if command -v certbot &> /dev/null; then
    print_info "Checking SSL certificates..."
    if sudo certbot certificates 2>/dev/null | grep -q "ads.digitizeit.net"; then
        print_check 0 "SSL certificate exists for ads.digitizeit.net"
        echo "📋 Certificate details:"
        sudo certbot certificates 2>/dev/null | grep -A 5 "ads.digitizeit.net" || true
    else
        print_warning "No SSL certificate found"
        print_info "Run: sudo ./setup-ssl.sh to setup SSL"
    fi
else
    print_warning "Certbot not installed"
fi

echo "==========================================="
echo "📊 Summary"
echo "==========================================="

echo "🌐 Access URLs:"
echo "   • HTTP:  http://ads.digitizeit.net"
if [ "$HTTPS_AVAILABLE" = true ]; then
    echo "   • HTTPS: https://ads.digitizeit.net"
fi
echo "   • API:   http://ads.digitizeit.net/api"
echo "   • Admin: http://ads.digitizeit.net/admin"

echo ""
echo "🛠 Useful commands:"
echo "   • View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   • Restart:   docker-compose -f docker-compose.prod.yml restart"
echo "   • Stop:      docker-compose -f docker-compose.prod.yml down"

if [ "$HTTPS_AVAILABLE" = false ]; then
    echo ""
    print_warning "To enable HTTPS, run: sudo ./setup-ssl.sh"
fi

echo ""
echo "🎉 Check completed!"
