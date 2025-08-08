# Mesa Court Aggregator Backup and Recovery Procedures

This document provides comprehensive backup and recovery procedures for the Mesa Court Aggregator application.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Data Backup Procedures](#data-backup-procedures)
3. [Configuration Backup](#configuration-backup)
4. [Automated Backup Scripts](#automated-backup-scripts)
5. [Recovery Procedures](#recovery-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Testing Backups](#testing-backups)

## Backup Strategy

### What to Backup

1. **Application Data**: Monthly cache files in `data/` directory
2. **Configuration Files**: Docker Compose, Dockerfile, environment settings
3. **Application Code**: Source code and dependencies (if modified)
4. **System Configuration**: Service files, cron jobs, network settings

### Backup Frequency

- **Data Files**: Daily (automated)
- **Configuration**: After any changes
- **Full System**: Weekly
- **Before Updates**: Always backup before application updates

### Retention Policy

- **Daily Backups**: Keep for 30 days
- **Weekly Backups**: Keep for 12 weeks
- **Monthly Backups**: Keep for 12 months
- **Before Updates**: Keep indefinitely

## Data Backup Procedures

### Manual Data Backup

```bash
# Create backup directory
mkdir -p ~/backups

# Backup data directory with timestamp
tar -czf ~/backups/mesa-court-aggregator-data-$(date +%Y%m%d-%H%M).tar.gz data/

# Verify backup
tar -tzf ~/backups/mesa-court-aggregator-data-$(date +%Y%m%d-%H%M).tar.gz

# List recent backups
ls -la ~/backups/mesa-court-aggregator-data-*.tar.gz
```

### Docker Volume Backup

```bash
# Stop application
docker-compose down

# Create backup of data volume
docker run --rm -v mesa-court-aggregator_data:/data -v ~/backups:/backup alpine tar -czf /backup/mesa-court-aggregator-volume-$(date +%Y%m%d).tar.gz -C /data .

# Start application
docker-compose up -d
```

### Database-style Backup (JSON Export)

```bash
# Export all cache data to single JSON file
cat > export-data.js << 'EOF'
const fs = require('fs');
const path = require('path');

const dataDir = 'data';
const exportData = {
  exportDate: new Date().toISOString(),
  version: '1.0',
  cacheFiles: {}
};

// Read all JSON files in data directory
fs.readdirSync(dataDir)
  .filter(file => file.endsWith('.json'))
  .forEach(file => {
    const filePath = path.join(dataDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    exportData.cacheFiles[file] = content;
  });

// Write export file
const exportFile = `mesa-court-aggregator-export-${new Date().toISOString().split('T')[0]}.json`;
fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
console.log(`Data exported to ${exportFile}`);
EOF

node export-data.js
```

## Configuration Backup

### Essential Configuration Files

```bash
# Create configuration backup
mkdir -p ~/backups/config

# Backup Docker configuration
cp docker-compose.yml ~/backups/config/
cp Dockerfile ~/backups/config/
cp .dockerignore ~/backups/config/

# Backup environment files (if any)
cp .env ~/backups/config/ 2>/dev/null || true

# Backup systemd service (if using manual installation)
sudo cp /etc/systemd/system/court-aggregator.service ~/backups/config/ 2>/dev/null || true

# Create configuration archive
tar -czf ~/backups/court-aggregator-config-$(date +%Y%m%d).tar.gz -C ~/backups/config .

echo "Configuration backed up to ~/backups/court-aggregator-config-$(date +%Y%m%d).tar.gz"
```

### Application Code Backup

```bash
# Backup entire application directory (excluding data and node_modules)
tar -czf ~/backups/court-aggregator-app-$(date +%Y%m%d).tar.gz \
  --exclude='data' \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='.git' \
  .

echo "Application code backed up"
```

## Automated Backup Scripts

### Daily Backup Script

```bash
# Create daily backup script
cat > ~/backup-court-aggregator.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="$HOME/backups"
APP_DIR="$HOME/court-aggregator"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Change to application directory
cd "$APP_DIR" || exit 1

# Create timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M)

# Backup data files
echo "Backing up data files..."
tar -czf "$BACKUP_DIR/mesa-court-aggregator-data-$TIMESTAMP.tar.gz" data/

# Backup logs (if they exist)
if [ -d "logs" ]; then
    echo "Backing up logs..."
    tar -czf "$BACKUP_DIR/mesa-court-aggregator-logs-$TIMESTAMP.tar.gz" logs/
fi

# Create health report
echo "Creating health report..."
cat > "$BACKUP_DIR/health-report-$TIMESTAMP.txt" << 'HEALTH'
=== Backup Health Report ===
Date: $(date)
System: $(uname -a)
Disk Usage: $(df -h /)
Memory: $(free -h)
Docker Status: $(docker-compose ps)
Application Health: $(curl -s http://localhost:3000/health || echo "FAILED")
Data Files: $(ls -la data/)
HEALTH

# Clean old backups
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "court-aggregator-*" -type f -mtime +$RETENTION_DAYS -delete

# Report results
echo "Backup completed: $TIMESTAMP"
echo "Backup location: $BACKUP_DIR"
echo "Files created:"
ls -la "$BACKUP_DIR"/*$TIMESTAMP*

# Send notification (optional)
# echo "Court Aggregator backup completed: $TIMESTAMP" | mail -s "Backup Report" admin@example.com
EOF

chmod +x ~/backup-court-aggregator.sh
```

### Weekly Full Backup Script

```bash
# Create weekly full backup script
cat > ~/weekly-backup.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="$HOME/backups/weekly"
APP_DIR="$HOME/court-aggregator"
TIMESTAMP=$(date +%Y%m%d)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Change to application directory
cd "$APP_DIR" || exit 1

echo "Starting weekly full backup..."

# Stop application for consistent backup
echo "Stopping application..."
docker-compose down

# Create full backup
echo "Creating full backup..."
tar -czf "$BACKUP_DIR/court-aggregator-full-$TIMESTAMP.tar.gz" \
  --exclude='node_modules' \
  --exclude='.git' \
  .

# Backup Docker volumes
echo "Backing up Docker volumes..."
docker run --rm \
  -v court-aggregator_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar -czf "/backup/court-aggregator-volumes-$TIMESTAMP.tar.gz" -C /data .

# Start application
echo "Starting application..."
docker-compose up -d

# Wait for application to be ready
echo "Waiting for application to start..."
sleep 30

# Verify application health
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Application health check: PASSED"
else
    echo "Application health check: FAILED"
    # Send alert
    echo "Weekly backup completed but application health check failed" | logger
fi

# Clean old weekly backups (keep 12 weeks)
find "$BACKUP_DIR" -name "court-aggregator-full-*" -type f -mtime +84 -delete
find "$BACKUP_DIR" -name "court-aggregator-volumes-*" -type f -mtime +84 -delete

echo "Weekly backup completed: $TIMESTAMP"
ls -la "$BACKUP_DIR"/*$TIMESTAMP*
EOF

chmod +x ~/weekly-backup.sh
```

### Automated Scheduling

```bash
# Add to crontab
crontab -e

# Add these lines:
# Daily backup at 2 AM
0 2 * * * /home/pi/backup-court-aggregator.sh >> /var/log/court-aggregator-backup.log 2>&1

# Weekly backup on Sunday at 3 AM
0 3 * * 0 /home/pi/weekly-backup.sh >> /var/log/court-aggregator-weekly-backup.log 2>&1

# Monthly cleanup on first day of month at 4 AM
0 4 1 * * find /home/pi/backups -name "*.tar.gz" -mtime +365 -delete
```

## Recovery Procedures

### Data Recovery

#### Restore from Data Backup

```bash
# Stop application
docker-compose down

# Backup current data (just in case)
mv data data.backup.$(date +%Y%m%d-%H%M)

# Extract backup
tar -xzf ~/backups/court-aggregator-data-YYYYMMDD-HHMM.tar.gz

# Verify data integrity
ls -la data/
cat data/$(date +%Y-%m).json | jq '.' > /dev/null && echo "JSON valid" || echo "JSON invalid"

# Start application
docker-compose up -d

# Verify recovery
curl http://localhost:3000/health
curl http://localhost:3000/api/parks
```

#### Restore from JSON Export

```bash
# Create restore script
cat > restore-data.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Read export file
const exportFile = process.argv[2];
if (!exportFile) {
  console.error('Usage: node restore-data.js <export-file.json>');
  process.exit(1);
}

const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));

// Create data directory
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

// Restore each cache file
Object.entries(exportData.cacheFiles).forEach(([filename, content]) => {
  const filePath = path.join('data', filename);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  console.log(`Restored ${filename}`);
});

console.log(`Data restored from export dated ${exportData.exportDate}`);
EOF

# Stop application
docker-compose down

# Restore data
node restore-data.js court-aggregator-export-2025-01-08.json

# Start application
docker-compose up -d
```

### Configuration Recovery

```bash
# Stop application
docker-compose down

# Restore configuration files
tar -xzf ~/backups/court-aggregator-config-YYYYMMDD.tar.gz

# Rebuild and start application
docker-compose build --no-cache
docker-compose up -d
```

### Full System Recovery

```bash
# Create new application directory
mkdir -p ~/court-aggregator-recovery
cd ~/court-aggregator-recovery

# Extract full backup
tar -xzf ~/backups/weekly/court-aggregator-full-YYYYMMDD.tar.gz

# Restore Docker volumes (if needed)
docker volume create court-aggregator_data
docker run --rm -v court-aggregator_data:/data -v ~/backups/weekly:/backup alpine tar -xzf /backup/court-aggregator-volumes-YYYYMMDD.tar.gz -C /data

# Install dependencies
npm install

# Start application
docker-compose up -d

# Verify recovery
curl http://localhost:3000/health
```

## Disaster Recovery

### Complete System Failure

1. **Prepare New System**:
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo apt install docker-compose-plugin
   ```

2. **Restore Application**:
   ```bash
   # Create application directory
   mkdir -p ~/court-aggregator
   cd ~/court-aggregator
   
   # Copy backup files to new system
   scp user@backup-server:~/backups/court-aggregator-full-latest.tar.gz .
   
   # Extract and start
   tar -xzf court-aggregator-full-latest.tar.gz
   docker-compose up -d
   ```

3. **Verify Recovery**:
   ```bash
   # Test all endpoints
   curl http://localhost:3000/health
   curl http://localhost:3000/api/parks
   curl http://localhost:3000/api/calendar/$(date +%Y-%m)
   ```

### Data Corruption Recovery

```bash
# Create recovery script
cat > recover-corrupted-data.sh << 'EOF'
#!/bin/bash

echo "Starting data corruption recovery..."

# Stop application
docker-compose down

# Backup corrupted data
mv data data.corrupted.$(date +%Y%m%d-%H%M)

# Try to recover from most recent backup
LATEST_BACKUP=$(ls -t ~/backups/court-aggregator-data-*.tar.gz | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    echo "Restoring from: $LATEST_BACKUP"
    tar -xzf "$LATEST_BACKUP"
else
    echo "No backup found, creating empty data directory"
    mkdir -p data
fi

# Start application
docker-compose up -d

# Wait for startup
sleep 30

# Trigger fresh data fetch
curl -X POST http://localhost:3000/api/scheduler/trigger

echo "Recovery completed"
EOF

chmod +x recover-corrupted-data.sh
```

## Testing Backups

### Backup Verification Script

```bash
# Create backup test script
cat > test-backup.sh << 'EOF'
#!/bin/bash

BACKUP_FILE="$1"
TEST_DIR="/tmp/backup-test-$(date +%s)"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

echo "Testing backup: $BACKUP_FILE"

# Create test directory
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Extract backup
echo "Extracting backup..."
tar -xzf "$BACKUP_FILE"

# Verify data integrity
echo "Verifying data integrity..."
if [ -d "data" ]; then
    for json_file in data/*.json; do
        if [ -f "$json_file" ]; then
            if jq '.' "$json_file" > /dev/null 2>&1; then
                echo "✓ $json_file is valid JSON"
            else
                echo "✗ $json_file is invalid JSON"
            fi
        fi
    done
else
    echo "✗ No data directory found in backup"
fi

# Verify configuration files
echo "Verifying configuration files..."
for config_file in docker-compose.yml Dockerfile package.json; do
    if [ -f "$config_file" ]; then
        echo "✓ $config_file found"
    else
        echo "✗ $config_file missing"
    fi
done

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo "Backup test completed"
EOF

chmod +x test-backup.sh

# Test latest backup
./test-backup.sh ~/backups/court-aggregator-data-$(date +%Y%m%d)*.tar.gz
```

### Recovery Test

```bash
# Create recovery test script
cat > test-recovery.sh << 'EOF'
#!/bin/bash

echo "Starting recovery test..."

# Create test environment
TEST_DIR="/tmp/recovery-test-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Copy application files (excluding data)
rsync -av --exclude='data' --exclude='node_modules' ~/court-aggregator/ .

# Restore from backup
LATEST_BACKUP=$(ls -t ~/backups/court-aggregator-data-*.tar.gz | head -1)
tar -xzf "$LATEST_BACKUP"

# Test startup
echo "Testing application startup..."
docker-compose up -d

# Wait for startup
sleep 60

# Test endpoints
echo "Testing endpoints..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✓ Health endpoint working"
else
    echo "✗ Health endpoint failed"
fi

if curl -f http://localhost:3001/api/parks > /dev/null 2>&1; then
    echo "✓ Parks endpoint working"
else
    echo "✗ Parks endpoint failed"
fi

# Cleanup
docker-compose down
cd /
rm -rf "$TEST_DIR"

echo "Recovery test completed"
EOF

chmod +x test-recovery.sh
```

## Monitoring Backup Health

### Backup Monitoring Script

```bash
# Create backup monitoring script
cat > monitor-backups.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="$HOME/backups"
ALERT_EMAIL="admin@example.com"  # Optional

echo "=== Backup Health Report ===" > /tmp/backup-report.txt
echo "Date: $(date)" >> /tmp/backup-report.txt
echo "" >> /tmp/backup-report.txt

# Check if backups exist
echo "Recent Backups:" >> /tmp/backup-report.txt
ls -la "$BACKUP_DIR"/court-aggregator-data-*.tar.gz | tail -7 >> /tmp/backup-report.txt

# Check backup age
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/court-aggregator-data-*.tar.gz | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))
    echo "" >> /tmp/backup-report.txt
    echo "Latest backup age: $BACKUP_AGE hours" >> /tmp/backup-report.txt
    
    if [ $BACKUP_AGE -gt 48 ]; then
        echo "WARNING: Latest backup is older than 48 hours!" >> /tmp/backup-report.txt
    fi
else
    echo "ERROR: No backups found!" >> /tmp/backup-report.txt
fi

# Check disk space
echo "" >> /tmp/backup-report.txt
echo "Backup Directory Usage:" >> /tmp/backup-report.txt
du -sh "$BACKUP_DIR" >> /tmp/backup-report.txt

# Display report
cat /tmp/backup-report.txt

# Send email alert if configured
if [ -n "$ALERT_EMAIL" ] && command -v mail > /dev/null; then
    if grep -q "WARNING\|ERROR" /tmp/backup-report.txt; then
        mail -s "Court Aggregator Backup Alert" "$ALERT_EMAIL" < /tmp/backup-report.txt
    fi
fi
EOF

chmod +x monitor-backups.sh

# Add to crontab for daily monitoring
# 0 8 * * * /home/pi/monitor-backups.sh >> /var/log/backup-monitor.log 2>&1
```

This comprehensive backup and recovery guide ensures that your Court Aggregator application data and configuration are protected against various failure scenarios.