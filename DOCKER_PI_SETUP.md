# Docker Deployment on Raspberry Pi (Without Docker Desktop)

## Why Docker Instead of PM2?

Your application is **designed for Docker** with:
- Multi-process management via **supervisord** (handles both Node.js app and cloudflared tunnel)
- Proper containerization with security (non-root user)
- Health checks built into the container
- Volume mounts for data persistence

PM2 would only manage the Node.js process, not the cloudflared tunnel or provide the containerized environment.

## Installing Docker Engine on Raspberry Pi

Docker Desktop is not needed - you just need Docker Engine:

### 1. Install Docker Engine
```bash
# Remove any old Docker installations
sudo apt-get remove docker docker-engine docker.io containerd runc

# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker
```

### 2. Verify Installation
```bash
# Check Docker version
docker --version

# Test Docker (should work without sudo)
docker run hello-world

# Check if Docker Compose is available
docker compose version
```

## Running Your Application

### Option 1: Using docker-compose (Recommended)
```bash
# Navigate to your project directory
cd /path/to/court-aggregator

# Make sure .env file exists
cp sample.env .env
# Edit .env as needed

# Build and start the application
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop the application
docker compose down
```

### Option 2: Using Docker Commands Directly
```bash
# Build the image
docker build -t mesa-court-aggregator .

# Run the container
docker run -d \
  --name mesa-court-aggregator \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  mesa-court-aggregator

# Check status
docker ps

# View logs
docker logs -f mesa-court-aggregator

# Stop and remove
docker stop mesa-court-aggregator
docker rm mesa-court-aggregator
```

## Why This Approach is Better

### 1. **Supervisord manages multiple processes:**
- Node.js application (main service)
- Cloudflared tunnel (if configured)
- Automatic restarts and health monitoring

### 2. **Container benefits:**
- Isolated environment
- Consistent deployment
- Easy updates and rollbacks
- Built-in health checks

### 3. **Production ready:**
- Non-root user for security
- Proper signal handling
- Resource management
- Log management

## Monitoring and Management

### Check Application Status
```bash
# Container status
docker ps

# Application health
curl http://localhost:3000/health

# Detailed health (includes supervisord status)
curl http://localhost:3000/api/health

# Container logs
docker logs mesa-court-aggregator

# Execute commands inside container
docker exec -it mesa-court-aggregator sh
```

### Inside Container Monitoring
```bash
# Check supervisord status
docker exec mesa-court-aggregator supervisorctl status

# Check individual service logs
docker exec mesa-court-aggregator supervisorctl tail nodejs
docker exec mesa-court-aggregator supervisorctl tail cloudflared
```

### Updates and Maintenance
```bash
# Pull latest code (if using git)
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build

# Or with direct Docker commands
docker stop mesa-court-aggregator
docker rm mesa-court-aggregator
docker build -t mesa-court-aggregator .
docker run -d --name mesa-court-aggregator [... same options as before]
```

## Auto-start on Boot

### Using Docker's restart policy (already configured)
The `--restart unless-stopped` policy ensures the container starts automatically on boot.

### Using systemd (alternative)
Create a systemd service for docker-compose:

```bash
sudo nano /etc/systemd/system/court-aggregator.service
```

```ini
[Unit]
Description=Mesa Court Aggregator
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/pi/court-aggregator
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable court-aggregator
sudo systemctl start court-aggregator
```

## Quick Setup Script

Here's a complete setup script for Docker on Pi:

```bash
#!/bin/bash
# Save as setup-docker-pi.sh

set -e

echo "🐳 Setting up Mesa Court Aggregator with Docker on Raspberry Pi"

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "Please log out and back in, then run this script again"
    exit 0
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp sample.env .env
    echo "Created .env file - please configure it"
fi

# Create data directory
mkdir -p data logs

# Build and start
echo "Building and starting application..."
docker compose up -d

echo "✅ Application started!"
echo "🌐 Access at: http://$(hostname -I | awk '{print $1}'):3000"
echo "🔍 Check status: docker compose ps"
echo "📋 View logs: docker compose logs -f"
```

This approach uses Docker as intended by your application design, managing both the Node.js app and cloudflared tunnel properly within a single container using supervisord.