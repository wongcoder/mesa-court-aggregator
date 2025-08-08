# Mesa Court Aggregator Deployment Guide

This guide provides comprehensive instructions for deploying the Mesa Court Aggregator application, with a focus on Docker deployment and Raspberry Pi optimization.

## Table of Contents

1. [Quick Start with Docker](#quick-start-with-docker)
2. [Manual Installation](#manual-installation)
3. [Raspberry Pi Deployment](#raspberry-pi-deployment)
4. [Auto-restart Configuration](#auto-restart-configuration)
5. [Logging and Monitoring](#logging-and-monitoring)
6. [Troubleshooting](#troubleshooting)
7. [Backup and Recovery](#backup-and-recovery)

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- At least 512MB RAM available
- Network access to Mesa AZ ActiveCommunities API

### 1. Clone and Build

```bash
# Clone the repository
git clone https://github.com/username/mesa-court-aggregator.git
cd mesa-court-aggregator

# Build and start with Docker Compose
docker-compose up -d
```

### 2. Verify Deployment

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:3000/health
```

The application will be available at `http://localhost:3000`

## Manual Installation

### Prerequisites

- Node.js >= 16.0.0
- npm package manager
- 512MB RAM minimum, 1GB recommended

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Application

```bash
# Production mode
npm start

# Development mode
npm run dev
```

### 3. Verify Installation

```bash
# Test health endpoint
curl http://localhost:3000/health

# Check API endpoints
curl http://localhost:3000/api/parks
```

## Raspberry Pi Deployment

### Recommended Setup

- **Model**: Raspberry Pi 4 (2GB+ RAM recommended)
- **OS**: Raspberry Pi OS Lite (64-bit)
- **Storage**: Class 10 SD card (16GB minimum)

### 1. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Reboot to apply changes
sudo reboot
```

### 2. Deploy Application

```bash
# Create application directory
mkdir -p ~/mesa-court-aggregator
cd ~/mesa-court-aggregator

# Copy application files (via git, scp, or other method)
git clone https://github.com/username/mesa-court-aggregator.git .

# Create data directory
mkdir -p data logs

# Start application
docker-compose up -d
```

### 3. Performance Optimization

```bash
# Enable memory cgroup (add to /boot/cmdline.txt)
echo " cgroup_enable=memory cgroup_memory=1" | sudo tee -a /boot/cmdline.txt

# Increase swap if needed
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=512/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## Auto-restart Configuration

### Docker Compose (Recommended)

The provided `docker-compose.yml` includes `restart: unless-stopped` which automatically restarts the container on:
- System reboot
- Container crashes
- Docker daemon restart

### Systemd Service (Manual Installation)

Create a systemd service for non-Docker deployments:

```bash
# Create service file
sudo tee /etc/systemd/system/court-aggregator.service > /dev/null <<EOF
[Unit]
Description=Mesa Court Aggregator Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/mesa-court-aggregator
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=mesa-court-aggregator

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable mesa-court-aggregator
sudo systemctl start mesa-court-aggregator
```

### Monitoring Service Status

```bash
# Docker Compose
docker-compose ps
docker-compose logs -f

# Systemd
sudo systemctl status mesa-court-aggregator
sudo journalctl -u mesa-court-aggregator -f
```

## Logging and Monitoring

### Docker Logging

Logs are automatically managed by Docker with rotation:

```bash
# View real-time logs
docker-compose logs -f

# View specific number of lines
docker-compose logs --tail=100

# View logs for specific time period
docker-compose logs --since="2024-01-01T00:00:00"

# Log files location (on host)
# /var/lib/docker/containers/<container-id>/<container-id>-json.log
```

### Log Configuration

The `docker-compose.yml` includes log rotation:
- Maximum file size: 10MB
- Maximum files: 3
- Total log storage: ~30MB

### Application Logs

The application logs to stdout/stderr with structured logging:

```bash
# Log levels: INFO, WARN, ERROR
# Format: [timestamp] [level] message

# Example log entries:
[2024-01-08T18:22:34.619Z] [INFO] Court Aggregator server running on port 3000
[2024-01-08T18:22:35.062Z] [INFO] Successfully fetched data for Kleinman Park
[2024-01-08T18:22:36.798Z] [ERROR] Failed to fetch data: Network timeout
```

### Health Monitoring

```bash
# Manual health check
curl http://localhost:3000/health

# Automated monitoring with cron
echo "*/5 * * * * curl -f http://localhost:3000/health || echo 'Health check failed' | logger" | crontab -
```

### System Resource Monitoring

```bash
# Monitor container resources
docker stats court-aggregator

# Monitor system resources
htop
free -h
df -h
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker-compose logs

# Common causes:
# - Port 3000 already in use
# - Insufficient memory
# - Permission issues with data directory
```

#### 2. API Connection Issues

```bash
# Test network connectivity
curl -I https://anc.apm.activecommunities.com

# Check DNS resolution
nslookup anc.apm.activecommunities.com

# Verify firewall settings
sudo ufw status
```

#### 3. Memory Issues on Raspberry Pi

```bash
# Check memory usage
free -h

# Increase swap space
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=512/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### 4. Data Directory Permissions

```bash
# Fix permissions
sudo chown -R 1001:1001 data/
chmod 755 data/
```

### Debug Mode

Enable debug logging:

```bash
# Docker Compose
docker-compose down
docker-compose up -d --build

# Manual
NODE_ENV=development npm start
```

### Performance Issues

```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/parks

# Monitor cache hit rates
ls -la data/
```

## Backup and Recovery

### Data Backup

The application stores cache data in JSON files:

```bash
# Backup data directory
tar -czf mesa-court-aggregator-backup-$(date +%Y%m%d).tar.gz data/

# Automated backup script
#!/bin/bash
BACKUP_DIR="/home/pi/backups"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/mesa-court-aggregator-$(date +%Y%m%d-%H%M).tar.gz data/
find $BACKUP_DIR -name "mesa-court-aggregator-*.tar.gz" -mtime +7 -delete
```

### Recovery

```bash
# Stop application
docker-compose down

# Restore data
tar -xzf mesa-court-aggregator-backup-20240108.tar.gz

# Start application
docker-compose up -d
```

### Configuration Backup

```bash
# Backup configuration files
cp docker-compose.yml docker-compose.yml.backup
cp Dockerfile Dockerfile.backup
```

## Security Considerations

### Container Security

- Application runs as non-root user (UID 1001)
- Minimal base image (Alpine Linux)
- No unnecessary packages installed
- Health checks enabled

### Network Security

```bash
# Firewall configuration (if needed)
sudo ufw allow 3000/tcp
sudo ufw enable
```

### Data Security

- Cache files contain no sensitive information
- API requests use HTTPS
- No authentication credentials stored

## Maintenance

### Regular Tasks

```bash
# Update application (Docker)
docker-compose pull
docker-compose up -d

# Clean up old images
docker image prune -f

# Monitor disk usage
df -h
du -sh data/
```

### Cache Management

```bash
# Clear cache (if needed)
rm -f data/*.json
docker-compose restart
```

## Support

### Log Collection for Support

```bash
# Collect system information
echo "=== System Info ===" > support-info.txt
uname -a >> support-info.txt
docker --version >> support-info.txt
docker-compose --version >> support-info.txt

echo "=== Container Status ===" >> support-info.txt
docker-compose ps >> support-info.txt

echo "=== Recent Logs ===" >> support-info.txt
docker-compose logs --tail=100 >> support-info.txt

echo "=== System Resources ===" >> support-info.txt
free -h >> support-info.txt
df -h >> support-info.txt
```

### Configuration Reference

Key configuration files:
- `docker-compose.yml` - Container orchestration
- `Dockerfile` - Container build instructions
- `package.json` - Node.js dependencies
- `server.js` - Application entry point

For additional support, include the generated `support-info.txt` file when reporting issues.