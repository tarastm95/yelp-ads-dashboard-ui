# Makefile for Yelp Ads Dashboard with domain setup

.PHONY: help setup start stop restart logs status check ssl clean

help: ## Show this help message
	@echo "🚀 Yelp Ads Dashboard - Domain Setup Commands"
	@echo "============================================="
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: ## Setup project with domain ads.digitizeit.net
	@echo "🔧 Setting up domain configuration..."
	@chmod +x start-with-domain.sh
	@./start-with-domain.sh

start: ## Start all containers
	@echo "🚀 Starting containers..."
	@docker-compose -f docker-compose.prod.yml up -d

stop: ## Stop all containers
	@echo "🛑 Stopping containers..."
	@docker-compose -f docker-compose.prod.yml down

restart: ## Restart all containers
	@echo "🔄 Restarting containers..."
	@docker-compose -f docker-compose.prod.yml restart

build: ## Rebuild and start containers
	@echo "🔨 Building and starting containers..."
	@docker-compose -f docker-compose.prod.yml up -d --build

logs: ## Show container logs
	@echo "📋 Showing logs..."
	@docker-compose -f docker-compose.prod.yml logs -f

status: ## Show container status
	@echo "📊 Container status:"
	@docker-compose -f docker-compose.prod.yml ps

check: ## Check domain and service status
	@echo "🔍 Checking domain status..."
	@chmod +x check-domain-status.sh
	@./check-domain-status.sh

ssl: ## Setup SSL certificate
	@echo "🔒 Setting up SSL..."
	@sudo chmod +x setup-ssl.sh
	@sudo ./setup-ssl.sh

clean: ## Clean up containers and volumes
	@echo "🧹 Cleaning up..."
	@docker-compose -f docker-compose.prod.yml down -v
	@docker system prune -f

dev: ## Start development version
	@echo "🛠 Starting development version..."
	@docker-compose up -d

# Backend specific commands
backend-logs: ## Show backend logs only
	@docker-compose -f docker-compose.prod.yml logs -f backend

backend-shell: ## Open backend shell
	@docker-compose -f docker-compose.prod.yml exec backend bash

backend-restart: ## Restart backend only
	@docker-compose -f docker-compose.prod.yml restart backend

# Frontend specific commands  
frontend-logs: ## Show frontend logs only
	@docker-compose -f docker-compose.prod.yml logs -f frontend

frontend-restart: ## Restart frontend only
	@docker-compose -f docker-compose.prod.yml restart frontend

# Database commands
db-logs: ## Show database logs
	@docker-compose -f docker-compose.prod.yml logs -f db

db-shell: ## Open database shell
	@docker-compose -f docker-compose.prod.yml exec db psql -U yelpadmin -d yelp

# Nginx commands
nginx-test: ## Test nginx configuration
	@sudo nginx -t

nginx-reload: ## Reload nginx configuration
	@sudo systemctl reload nginx

nginx-logs: ## Show nginx logs
	@sudo tail -f /var/log/nginx/ads.digitizeit.net.error.log

# Quick access URLs
urls: ## Show access URLs
	@echo "🌐 Access URLs:"
	@echo "   • Domain:   http://ads.digitizeit.net"
	@echo "   • HTTPS:    https://ads.digitizeit.net (if SSL enabled)"
	@echo "   • API:      http://ads.digitizeit.net/api"
	@echo "   • Admin:    http://ads.digitizeit.net/admin"
	@echo "   • Frontend: http://127.0.0.1:8080"
	@echo "   • Backend:  http://127.0.0.1:8000"
