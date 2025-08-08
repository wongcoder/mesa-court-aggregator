#!/bin/bash

# Mesa Court Aggregator - Raspberry Pi Setup Script
# Run this script on your Raspberry Pi to set up the application

set -e  # Exit on any error

echo "🥧 Mesa Court Aggregator - Raspberry Pi Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    print_warning "This doesn't appear to be a Raspberry Pi, but continuing anyway..."
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Run as the pi user."
    exit 1
fi

print_status "Starting setup process..."

# 1. Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# 2. Check Node.js version
print_status "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 16 ]; then
        print_success "Node.js $(node --version) is already installed and compatible"
    else
        print_warning "Node.js version is too old, updating..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
        print_success "Node.js updated to $(node --version)"
    fi
else
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js $(node --version) installed"
fi

# 3. Install dependencies
print_status "Installing application dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_error "package.json not found. Make sure you're in the correct directory."
    exit 1
fi

# 4. Create environment file
print_status "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f "sample.env" ]; then
        cp sample.env .env
        print_success "Environment file created from sample.env"
        print_warning "Please edit .env file to configure your settings"
    else
        print_error "sample.env not found"
        exit 1
    fi
else
    print_success "Environment file already exists"
fi

# 5. Create data directory
print_status "Creating data directory..."
mkdir -p data
chmod 755 data
print_success "Data directory created"

# 6. Test the application
print_status "Testing the application..."
npm start &
SERVER_PID=$!
sleep 5

# Test health endpoint
if curl -s http://localhost:3000/health > /dev/null; then
    print_success "Application is running correctly"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
else
    print_error "Application failed to start properly"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    exit 1
fi

# 7. Install PM2 (optional)
print_status "Would you like to install PM2 for process management? (y/n)"
read -r INSTALL_PM2
if [[ $INSTALL_PM2 =~ ^[Yy]$ ]]; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
    
    # Start with PM2
    pm2 start server.js --name "court-aggregator"
    pm2 save
    
    print_success "PM2 installed and application started"
    print_status "To enable PM2 startup on boot, run: pm2 startup"
    print_status "Then follow the instructions provided by the command"
else
    print_status "Skipping PM2 installation"
fi

# 8. Setup firewall (optional)
print_status "Would you like to configure the firewall? (y/n)"
read -r SETUP_FIREWALL
if [[ $SETUP_FIREWALL =~ ^[Yy]$ ]]; then
    print_status "Setting up firewall..."
    sudo apt install -y ufw
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 3000
    sudo ufw --force enable
    print_success "Firewall configured"
else
    print_status "Skipping firewall setup"
fi

# 9. Get network information
print_status "Getting network information..."
PI_IP=$(hostname -I | awk '{print $1}')
print_success "Setup completed successfully!"

echo ""
echo "🎉 Mesa Court Aggregator is ready!"
echo "=================================="
echo ""
echo "📍 Local access: http://localhost:3000"
echo "🌐 Network access: http://$PI_IP:3000"
echo ""
echo "🔧 Useful commands:"
if command -v pm2 &> /dev/null; then
    echo "  Start:   pm2 start court-aggregator"
    echo "  Stop:    pm2 stop court-aggregator"
    echo "  Restart: pm2 restart court-aggregator"
    echo "  Logs:    pm2 logs court-aggregator"
    echo "  Status:  pm2 status"
else
    echo "  Start:   npm start"
    echo "  Test:    curl http://localhost:3000/health"
fi
echo ""
echo "📖 For detailed documentation, see RASPBERRY_PI_SETUP.md"
echo ""
print_success "Setup complete! 🚀"