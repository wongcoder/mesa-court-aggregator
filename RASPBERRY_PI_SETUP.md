# Raspberry Pi Deployment Guide

## Prerequisites

### 1. Raspberry Pi Setup
- Raspberry Pi 3B+ or newer (4GB RAM recommended)
- Raspberry Pi OS (64-bit recommended)
- Internet connection
- SSH access enabled (optional but recommended)

### 2. Node.js Installation
Check if Node.js is installed:
```bash
node --version
npm --version
```

If not installed or version is below 16.0.0, install Node.js:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository for latest LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.x or higher
npm --version
```

## Installation Steps

### 1. Transfer Files to Raspberry Pi
If you're setting this up remotely, transfer the project files:

```bash
# Option A: Using SCP (from your development machine)
scp -r /path/to/court-aggregator pi@your-pi-ip:/home/pi/

# Option B: Using Git (on the Pi)
cd /home/pi
git clone your-repository-url court-aggregator
cd court-aggregator
```

### 2. Install Dependencies
```bash
cd /home/pi/court-aggregator
npm install
```

### 3. Configure Environment
```bash
# Copy the sample environment file
cp sample.env .env

# Edit the environment file
nano .env
```

Update `.env` with your settings:
```env
# Application Environment
NODE_ENV=production

# Timezone (Arizona doesn't observe DST)
TZ=America/Phoenix

# Cloudflared Tunnel Configuration (Optional)
# Get your token from: https://dash.cloudflare.com -> Zero Trust -> Networks -> Tunnels
# Leave blank or comment out to disable tunnel
# CLOUDFLARED_TOKEN=your_tunnel_token_here

# Optional: Custom tunnel name
# CLOUDFLARED_TUNNEL_NAME=mesa-court-aggregator
```

### 4. Create Data Directory
```bash
mkdir -p data
chmod 755 data
```

### 5. Test the Application
```bash
# Start the application
npm start

# In another terminal, test the health endpoint
curl http://localhost:3000/health

# Test the web interface
curl -I http://localhost:3000/
```

You should see:
- Health endpoint returns: `{"status":"ok","timestamp":"..."}`
- Web interface returns HTTP 200

## Running as a Service (Recommended)

### Option 1: Using PM2 (Recommended)
PM2 is a production process manager for Node.js applications:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application with PM2
cd /home/pi/court-aggregator
pm2 start server.js --name "court-aggregator"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above

# Check status
pm2 status
pm2 logs court-aggregator
```

PM2 Commands:
```bash
pm2 start court-aggregator    # Start the app
pm2 stop court-aggregator     # Stop the app
pm2 restart court-aggregator  # Restart the app
pm2 delete court-aggregator   # Remove from PM2
pm2 logs court-aggregator     # View logs
pm2 monit                     # Monitor resources
```

### Option 2: Using systemd
Create a systemd service file:

```bash
sudo nano /etc/systemd/system/court-aggregator.service
```

Add this content:
```ini
[Unit]
Description=Mesa Court Aggregator
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/court-aggregator
Environment=NODE_ENV=production
Environment=TZ=America/Phoenix
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=court-aggregator

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable court-aggregator
sudo systemctl start court-aggregator

# Check status
sudo systemctl status court-aggregator

# View logs
sudo journalctl -u court-aggregator -f
```

## Network Access

### Local Network Access
The application runs on port 3000. To access from other devices on your network:

1. Find your Pi's IP address:
```bash
hostname -I
```

2. Access from any device on your network:
```
http://YOUR_PI_IP:3000
```

### Port Forwarding (Optional)
To access from outside your network, configure port forwarding on your router:
- Forward external port (e.g., 8080) to Pi's IP:3000
- Access via: `http://YOUR_PUBLIC_IP:8080`

## Monitoring and Maintenance

### Health Checks
```bash
# Check application health
curl http://localhost:3000/health

# Check detailed system health
curl http://localhost:3000/api/health

# Check if port 3000 is listening
sudo netstat -tlnp | grep :3000
```

### Log Management
```bash
# If using PM2
pm2 logs court-aggregator --lines 100

# If using systemd
sudo journalctl -u court-aggregator --since "1 hour ago"

# Check disk space (important for data directory)
df -h
du -sh /home/pi/court-aggregator/data/
```

### Updates
```bash
cd /home/pi/court-aggregator

# Pull latest changes (if using git)
git pull

# Update dependencies
npm install

# Restart the application
pm2 restart court-aggregator
# OR
sudo systemctl restart court-aggregator
```

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 PID_NUMBER
```

2. **Permission issues**
```bash
# Fix file permissions
chmod +x /home/pi/court-aggregator/server.js
chown -R pi:pi /home/pi/court-aggregator/
```

3. **Memory issues**
```bash
# Check memory usage
free -h

# If low on memory, create swap file
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

4. **Node.js version issues**
```bash
# Check Node.js version
node --version

# If too old, update Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Performance Optimization

1. **Reduce memory usage**
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=512"
```

2. **Monitor resources**
```bash
# Install htop for better monitoring
sudo apt install htop
htop
```

## Security Considerations

1. **Firewall setup**
```bash
# Install and configure UFW
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000
sudo ufw enable
```

2. **Regular updates**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
npm audit fix
```

3. **Backup data**
```bash
# Backup data directory
tar -czf court-data-backup-$(date +%Y%m%d).tar.gz data/

# Copy to external storage or cloud
```

## Quick Start Commands

Once everything is set up, these are the essential commands:

```bash
# Start the application
pm2 start court-aggregator

# Check status
pm2 status

# View logs
pm2 logs court-aggregator

# Restart if needed
pm2 restart court-aggregator

# Access the application
# Local: http://localhost:3000
# Network: http://YOUR_PI_IP:3000
```