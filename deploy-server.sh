#!/bin/bash
echo "🚀 Deploying Yelp Ads Dashboard to Server 72.60.66.164"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Create .env files
print_status "Creating environment files..."

# Backend .env
cat > backend/.env << 'EOF'
SECRET_KEY=django-insecure-change-this-in-production-12345
DEBUG=False
ALLOWED_HOSTS=72.60.66.164,localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
YELP_API_KEY=your_yelp_api_key_here
YELP_API_SECRET=your_yelp_api_secret_here
YELP_FUSION_TOKEN=your_yelp_fusion_token_here
LOG_LEVEL=INFO
EOF

# Frontend .env
cat > frontend/.env << 'EOF'
VITE_BACKEND_URL=http://72.60.66.164:8000
VITE_API_BASE_URL=http://72.60.66.164:8000/api
EOF

print_status "Environment files created successfully!"

# Step 2: Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    print_status "Backend dependencies installed successfully!"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Step 3: Run Django migrations
print_status "Running Django migrations..."
python manage.py migrate
if [ $? -eq 0 ]; then
    print_status "Migrations completed successfully!"
else
    print_error "Failed to run migrations"
    exit 1
fi

# Step 4: Install frontend dependencies
print_status "Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -eq 0 ]; then
    print_status "Frontend dependencies installed successfully!"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Step 5: Build frontend
print_status "Building frontend for production..."
npm run build
if [ $? -eq 0 ]; then
    print_status "Frontend built successfully!"
else
    print_error "Failed to build frontend"
    exit 1
fi

# Step 6: Create startup scripts
print_status "Creating startup scripts..."

# Backend startup script
cat > ../start-backend.sh << 'EOF'
#!/bin/bash
cd backend
echo "Starting Django backend on 0.0.0.0:8000..."
python manage.py runserver 0.0.0.0:8000
EOF

# Frontend startup script
cat > ../start-frontend.sh << 'EOF'
#!/bin/bash
cd frontend
echo "Starting frontend preview on 0.0.0.0:8080..."
npm run preview -- --host 0.0.0.0 --port 8080
EOF

# Make scripts executable
chmod +x ../start-backend.sh
chmod +x ../start-frontend.sh

print_status "Startup scripts created!"

# Step 7: Create Nginx configuration (optional)
print_status "Creating Nginx configuration template..."
cat > ../nginx.conf.template << 'EOF'
server {
    listen 80;
    server_name 72.60.66.164;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
        root /path/to/your/project/frontend/dist;
        
        # Add CORS headers
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Add CORS headers
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

cd ..

print_status "✅ Deployment preparation completed!"
echo
print_warning "Next steps:"
echo "1. Update your Yelp API credentials in backend/.env"
echo "2. Run: ./start-backend.sh (in one terminal)"
echo "3. Run: ./start-frontend.sh (in another terminal)"
echo "4. Or set up Nginx using nginx.conf.template"
echo
print_status "URLs:"
echo "   Frontend: http://72.60.66.164:8080"
echo "   Backend:  http://72.60.66.164:8000"
echo "   API:      http://72.60.66.164:8000/api"
echo
print_warning "Don't forget to:"
echo "   - Replace Yelp API credentials in backend/.env"
echo "   - Open firewall ports 8000 and 8080"
echo "   - Consider using a process manager like PM2 or systemd"
