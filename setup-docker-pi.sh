#!/bin/bash

# Mesa Court Aggregator - Docker Setup for Raspberry Pi
# This script installs Docker Engine (not Desktop) and sets up the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🐳 Mesa Court Aggregator - Docker Setup for Raspberry Pi"
echo "======================================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Run as the pi user."
    exit 1
fi

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    print_success "Docker is already installed: $(docker --version)"
    
    # Check if user is in docker group
    if groups $USER | grep -q docker; then
        print_success "User is in docker group"
    else
        print_warning "Adding user to docker group..."
        sudo usermod -aG docker $USER
        print_warning "Please log out and back in, then run this script again"
        exit 0
    fi
else
    print_status "Installing Docker Engine..."
    
    # Remove any old Docker installations
    sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Update package index
    sudo apt-get update
    
    # Install dependencies
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Use Docker's convenience script (recommended for Pi)
    print_status "Downloading and running Docker installation script..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    print_success "Docker installed successfully"
    print_warning "Please log out and back in, then run this script again to continue setup"
    exit 0
fi

# Test Docker
print_status "Testing Docker installation..."
if docker run --rm hello-world > /dev/null 2>&1; then
    print_success "Docker is working correctly"
else
    print_error "Docker test failed. Please check the installation."
    exit 1
fi

# Check for docker-compose
if docker compose version > /dev/null 2>&1; then
    print_success "Docker Compose is available"
elif command -v docker-compose &> /dev/null; then
    print_success "Docker Compose (standalone) is available"
else
    print_status "Installing Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
    print_success "Docker Compose installed"
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ] || [ ! -f "Dockerfile" ]; then
    print_error "docker-compose.yml or Dockerfile not found. Make sure you're in the correct directory."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f "sample.env" ]; then
        cp sample.env .env
        print_success "Created .env file from sample.env"
        print_warning "Please edit .env file to configure your settings"
    else
        print_error "sample.env not found"
        exit 1
    fi
else
    print_success "Environment file already exists"
fi

# Create necessary directories
print_status "Creating data and logs directories..."
mkdir -p data logs
chmod 755 data logs
print_success "Directories created"

# Stop any existing containers
print_status "Stopping any existing containers..."
docker compose down 2>/dev/null || true

# Build and start the application
print_status "Building and starting the application..."
docker compose up -d --build

# Wait for the application to start
print_status "Waiting for application to start..."
sleep 10

# Test the application
if curl -s http://localhost:3000/health > /dev/null; then
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
    print_success "Application is running: $HEALTH_RESPONSE"
else
    print_error "Application failed to start properly"
    print_status "Checking logs..."
    docker compose logs
    exit 1
fi

# Get network information
PI_IP=$(hostname -I | awk '{print $1}')

print_success "Setup completed successfully!"

echo ""
echo "🎉 Mesa Court Aggregator is running with Docker!"
echo "==============================================="
echo ""
echo "📍 Local access: http://localhost:3000"
echo "🌐 Network access: http://$PI_IP:3000"
echo ""
echo "🐳 Docker commands:"
echo "  Status:  docker compose ps"
echo "  Logs:    docker compose logs -f"
echo "  Stop:    docker compose down"
echo "  Start:   docker compose up -d"
echo "  Rebuild: docker compose up -d --build"
echo ""
echo "🔍 Health check: curl http://localhost:3000/health"
echo "📊 Detailed health: curl http://localhost:3000/api/health"
echo ""
echo "📖 For detailed documentation, see DOCKER_PI_SETUP.md"
echo ""
print_success "Your application is ready! 🚀"