# Mesa Court Aggregator Troubleshooting Guide

This guide helps diagnose and resolve common issues with the Mesa Court Aggregator application.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [API Connection Problems](#api-connection-problems)
4. [Data Issues](#data-issues)
5. [Performance Problems](#performance-problems)
6. [Docker Issues](#docker-issues)
7. [Raspberry Pi Specific Issues](#raspberry-pi-specific-issues)
8. [Log Analysis](#log-analysis)

## Quick Diagnostics

### Health Check

```bash
# Test application health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-08T18:22:36.797Z"}
```

### Service Status

```bash
# Docker Compose
docker-compose ps

# Systemd (manual installation)
sudo systemctl status mesa-court-aggregator
```

### Resource Usage

```bash
# Memory and disk usage
free -h
df -h

# Docker container resources
docker stats mesa-court-aggregator
```

## Common Issues

### 1. Application Won't Start

**Symptoms**:

- Container exits immediately
- "Port already in use" error
- Permission denied errors

**Diagnosis**:

```bash
# Check if port 3000 is in use
sudo netstat -tlnp | grep :3000
# or
sudo lsof -i :3000

# Check container logs
docker-compose logs

# Check file permissions
ls -la data/
```

**Solutions**:

```bash
# Kill process using port 3000
sudo kill $(sudo lsof -t -i:3000)

# Fix data directory permissions
sudo chown -R 1001:1001 data/
chmod 755 data/

# Use different port (modify docker-compose.yml)
ports:
  - "3001:3000"  # Use port 3001 instead
```

### 2. No Data Available

**Symptoms**:

- Empty calendar views
- "No data available" messages
- API endpoints return 404

**Diagnosis**:

```bash
# Check if data files exist
ls -la data/

# Test API connectivity
curl -I https://anc.apm.activecommunities.com

# Check application logs
docker-compose logs | grep -i error
```

**Solutions**:

```bash
# Trigger manual data fetch
curl -X POST http://localhost:3000/api/scheduler/trigger

# Clear cache and restart
rm -f data/*.json
docker-compose restart

# Check network connectivity
ping anc.apm.activecommunities.com
```

### 3. Partial Data Missing

**Symptoms**:

- Some parks show data, others don't
- Intermittent data availability
- Some dates missing

**Diagnosis**:

```bash
# Check cache files
ls -la data/
cat data/$(date +%Y-%m).json | jq '.days | keys'

# Look for API errors in logs
docker-compose logs | grep -i "failed to fetch"
```

**Solutions**:

```bash
# Check facility group configuration
# Verify IDs in services/backfill-service.js

# Manual backfill for specific date
curl -X POST "http://localhost:3000/api/scheduler/backfill?date=2025-01-08"

# Restart with fresh cache
docker-compose down
rm -f data/*.json
docker-compose up -d
```

## API Connection Problems

### 1. Network Connectivity Issues

**Symptoms**:

- "Network Error" in logs
- Timeouts
- DNS resolution failures

**Diagnosis**:

```bash
# Test DNS resolution
nslookup anc.apm.activecommunities.com

# Test HTTPS connectivity
curl -I https://anc.apm.activecommunities.com

# Check firewall rules
sudo ufw status
```

**Solutions**:

```bash
# Configure DNS (if needed)
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf

# Allow outbound HTTPS
sudo ufw allow out 443

# Check proxy settings (if applicable)
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

### 2. CSRF Token Issues

**Symptoms**:

- "Authentication failed" errors
- 403 Forbidden responses
- "Failed to fetch CSRF token"

**Diagnosis**:

```bash
# Check CSRF-related logs
docker-compose logs | grep -i csrf

# Test manual CSRF token fetch
curl -s "https://anc.apm.activecommunities.com/mesaaz/reservation/landing/quick?locale=en-US&groupId=5" | grep -o 'csrf-token[^"]*'
```

**Solutions**:

```bash
# Clear CSRF cache and restart
docker-compose restart

# Check if Mesa website structure changed
# (May require code updates)

# Verify User-Agent string is current
# (Check services/csrf-token-manager.js)
```

### 3. API Rate Limiting

**Symptoms**:

- 429 Too Many Requests
- Intermittent API failures
- Slow response times

**Diagnosis**:

```bash
# Check request timing in logs
docker-compose logs | grep -i "fetching data"

# Monitor request frequency
docker-compose logs | grep -E "\[INFO\].*Fetching" | tail -20
```

**Solutions**:

```bash
# Increase delays between requests
# Edit services/backfill-service.js:
# delayBetweenRequests: 1000  # Increase from 500ms
# delayBetweenDates: 2000     # Increase from 1000ms

# Reduce concurrent requests
# Implement request queuing if needed
```

## Data Issues

### 1. Incorrect Park Mappings

**Symptoms**:

- Courts appearing under wrong park names
- Missing courts
- Unknown court names in logs

**Diagnosis**:

```bash
# Check court mappings in logs
docker-compose logs | grep -i "unknown court"

# Examine raw API response
# (Enable debug logging in court-data-processor.js)
```

**Solutions**:

```bash
# Update court mappings in services/court-data-processor.js
# Add new mappings to COURT_MAPPINGS object

# Example:
# 'New Court Name': 'Park Name'
```

### 2. Time Zone Issues

**Symptoms**:

- Updates happening at wrong time
- Incorrect time displays
- Scheduling conflicts

**Diagnosis**:

```bash
# Check system timezone
timedatectl status

# Check container timezone
docker exec mesa-court-aggregator date

# Check scheduled update time
docker-compose logs | grep -i "scheduled update"
```

**Solutions**:

```bash
# Set timezone in docker-compose.yml
environment:
  - TZ=America/Phoenix

# Update system timezone (if needed)
sudo timedatectl set-timezone America/Phoenix
```

### 3. Cache Corruption

**Symptoms**:

- "Invalid cache structure" warnings
- Inconsistent data display
- Application crashes when reading cache

**Diagnosis**:

```bash
# Validate cache file structure
cat data/$(date +%Y-%m).json | jq '.'

# Check for migration messages
docker-compose logs | grep -i migration
```

**Solutions**:

```bash
# Clear corrupted cache
rm -f data/*.json
docker-compose restart

# Force cache recovery
curl -X POST http://localhost:3000/api/cache/recover
```

## Performance Problems

### 1. High Memory Usage

**Symptoms**:

- Container killed by OOM killer
- Slow response times
- System becomes unresponsive

**Diagnosis**:

```bash
# Check memory usage
free -h
docker stats mesa-court-aggregator

# Check for memory leaks
docker-compose logs | grep -i "memory\|heap"
```

**Solutions**:

```bash
# Increase swap space (Raspberry Pi)
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Increase Docker memory limit
# Edit docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 1G
```

### 2. Slow API Responses

**Symptoms**:

- Long page load times
- Timeouts in browser
- Slow calendar navigation

**Diagnosis**:

```bash
# Test API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/parks

# Check cache hit rates
ls -la data/
docker-compose logs | grep -i "cache"
```

**Solutions**:

```bash
# Optimize cache usage
# Ensure cache files are being created and used

# Check disk I/O
iostat -x 1 5

# Consider SSD upgrade for Raspberry Pi
```

### 3. High CPU Usage

**Symptoms**:

- System sluggishness
- High load average
- Thermal throttling (Raspberry Pi)

**Diagnosis**:

```bash
# Check CPU usage
top -p $(docker inspect --format '{{.State.Pid}}' mesa-court-aggregator)

# Check system load
uptime

# Check thermal throttling (Raspberry Pi)
vcgencmd measure_temp
vcgencmd get_throttled
```

**Solutions**:

```bash
# Add CPU cooling (Raspberry Pi)
# Install heatsinks or fan

# Reduce processing frequency
# Increase delays in backfill service

# Monitor background processes
ps aux | grep -v grep | sort -k3 -nr | head -10
```

## Docker Issues

### 1. Container Build Failures

**Symptoms**:

- "docker build" fails
- Missing dependencies
- Permission errors during build

**Diagnosis**:

```bash
# Build with verbose output
docker-compose build --no-cache --progress=plain

# Check Dockerfile syntax
docker run --rm -i hadolint/hadolint < Dockerfile
```

**Solutions**:

```bash
# Clear Docker cache
docker system prune -a

# Update base image
docker pull node:18-alpine

# Check .dockerignore file
cat .dockerignore
```

### 2. Volume Mount Issues

**Symptoms**:

- Data not persisting
- Permission denied errors
- Files not visible in container

**Diagnosis**:

```bash
# Check volume mounts
docker inspect mesa-court-aggregator | jq '.[0].Mounts'

# Check host directory permissions
ls -la data/

# Check container directory
docker exec mesa-court-aggregator ls -la /app/data/
```

**Solutions**:

```bash
# Fix host directory permissions
sudo chown -R 1001:1001 data/

# Recreate volumes
docker-compose down -v
docker-compose up -d
```

### 3. Network Issues

**Symptoms**:

- Cannot access application from host
- Container cannot reach external APIs
- DNS resolution failures in container

**Diagnosis**:

```bash
# Check port mapping
docker port mesa-court-aggregator

# Test network connectivity from container
docker exec mesa-court-aggregator ping google.com

# Check Docker networks
docker network ls
```

**Solutions**:

```bash
# Recreate network
docker-compose down
docker-compose up -d

# Check firewall rules
sudo ufw status

# Use host networking (if needed)
# Add to docker-compose.yml:
network_mode: host
```

## Raspberry Pi Specific Issues

### 1. SD Card Corruption

**Symptoms**:

- Read-only filesystem errors
- Random application crashes
- Boot failures

**Diagnosis**:

```bash
# Check filesystem
sudo fsck /dev/mmcblk0p2

# Check for read-only mode
mount | grep "ro,"

# Check SD card health
sudo dmesg | grep -i "mmc\|sd"
```

**Solutions**:

```bash
# Remount filesystem as read-write
sudo mount -o remount,rw /

# Replace SD card with high-quality one
# Use Class 10 or better, A1/A2 rated

# Enable log2ram to reduce writes
sudo apt install log2ram
```

### 2. Power Issues

**Symptoms**:

- Random reboots
- USB devices disconnecting
- Under-voltage warnings

**Diagnosis**:

```bash
# Check power supply
vcgencmd get_throttled

# Check voltage
vcgencmd measure_volts

# Check system logs
sudo dmesg | grep -i "voltage\|power"
```

**Solutions**:

```bash
# Use official Raspberry Pi power supply
# Minimum 3A for Pi 4

# Check USB cable quality
# Use short, high-quality cables

# Reduce power consumption
# Disable unused services
sudo systemctl disable bluetooth
sudo systemctl disable wifi
```

### 3. Thermal Issues

**Symptoms**:

- CPU throttling
- Performance degradation
- System instability

**Diagnosis**:

```bash
# Check temperature
vcgencmd measure_temp

# Check throttling status
vcgencmd get_throttled

# Monitor temperature over time
watch -n 1 vcgencmd measure_temp
```

**Solutions**:

```bash
# Install cooling solution
# Heatsinks, fan, or case with cooling

# Improve ventilation
# Ensure adequate airflow

# Reduce CPU usage
# Optimize application settings
```

## Log Analysis

### Understanding Log Levels

```bash
# INFO: Normal operations
[2025-01-08T18:22:34.619Z] [INFO] Court Aggregator server running on port 3000

# WARN: Non-critical issues
[2025-01-08T18:22:35.062Z] [WARN] Cache is stale, fetching fresh data

# ERROR: Critical failures
[2025-01-08T18:22:36.798Z] [ERROR] Failed to fetch data: Network timeout
```

### Common Log Patterns

```bash
# Successful operations
docker-compose logs | grep -i "successfully"

# API failures
docker-compose logs | grep -i "failed to fetch"

# Cache operations
docker-compose logs | grep -i "cache"

# Scheduling events
docker-compose logs | grep -i "scheduled"

# CSRF token issues
docker-compose logs | grep -i "csrf"
```

### Log Collection for Support

```bash
# Create comprehensive log report
cat > collect-logs.sh << 'EOF'
#!/bin/bash
echo "=== System Information ===" > support-logs.txt
uname -a >> support-logs.txt
date >> support-logs.txt
uptime >> support-logs.txt

echo -e "\n=== Docker Information ===" >> support-logs.txt
docker --version >> support-logs.txt
docker-compose --version >> support-logs.txt
docker-compose ps >> support-logs.txt

echo -e "\n=== Container Logs ===" >> support-logs.txt
docker-compose logs --tail=200 >> support-logs.txt

echo -e "\n=== System Resources ===" >> support-logs.txt
free -h >> support-logs.txt
df -h >> support-logs.txt

echo -e "\n=== Network Connectivity ===" >> support-logs.txt
ping -c 3 anc.apm.activecommunities.com >> support-logs.txt 2>&1

echo -e "\n=== Cache Status ===" >> support-logs.txt
ls -la data/ >> support-logs.txt

echo "Log collection complete: support-logs.txt"
EOF

chmod +x collect-logs.sh
./collect-logs.sh
```

## Getting Help

If you cannot resolve the issue using this guide:

1. **Collect diagnostic information** using the log collection script above
2. **Check the GitHub issues** for similar problems
3. **Create a new issue** with:
   - System information (OS, hardware, Docker version)
   - Complete error messages
   - Steps to reproduce
   - Log files (support-logs.txt)

## Prevention

### Regular Maintenance

```bash
# Weekly maintenance script
#!/bin/bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean Docker resources
docker system prune -f

# Check disk space
df -h

# Backup data
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Check application health
curl -f http://localhost:3000/health || echo "Health check failed"
```

### Monitoring Setup

```bash
# Add to crontab for automated monitoring
# crontab -e

# Health check every 5 minutes
*/5 * * * * curl -f http://localhost:3000/health || echo "Health check failed at $(date)" >> /var/log/mesa-court-aggregator-health.log

# Disk space check daily
0 6 * * * df -h | grep -E "9[0-9]%" && echo "Disk space warning at $(date)" >> /var/log/disk-space.log

# Memory check every hour
0 * * * * free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }' >> /var/log/memory-usage.log
```
