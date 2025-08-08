#!/bin/bash

# Mesa Court Aggregator - Raspberry Pi Health Check Script
# Use this to monitor the application status

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

echo "🥧 Mesa Court Aggregator - Health Check"
echo "======================================"

# Check if application is running
print_status "Checking application status..."

# Check if port 3000 is listening
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    print_success "Application is listening on port 3000"
    
    # Test health endpoint
    if curl -s http://localhost:3000/health > /dev/null; then
        HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
        print_success "Health endpoint responding: $HEALTH_RESPONSE"
        
        # Test detailed health
        DETAILED_HEALTH=$(curl -s http://localhost:3000/api/health)
        echo ""
        print_status "Detailed health status:"
        echo "$DETAILED_HEALTH" | python3 -m json.tool 2>/dev/null || echo "$DETAILED_HEALTH"
        
    else
        print_error "Health endpoint not responding"
    fi
else
    print_error "Application is not running on port 3000"
fi

echo ""
print_status "System information:"

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
echo "Memory usage: $MEMORY_USAGE"

# Check disk usage
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}')
echo "Disk usage: $DISK_USAGE"

# Check data directory
if [ -d "data" ]; then
    DATA_FILES=$(ls -1 data/*.json 2>/dev/null | wc -l)
    echo "Data files: $DATA_FILES"
    
    if [ $DATA_FILES -gt 0 ]; then
        LATEST_FILE=$(ls -t data/*.json 2>/dev/null | head -1)
        if [ -n "$LATEST_FILE" ]; then
            LATEST_DATE=$(stat -c %y "$LATEST_FILE" 2>/dev/null | cut -d' ' -f1)
            echo "Latest data: $LATEST_DATE"
        fi
    fi
else
    print_warning "Data directory not found"
fi

# Check PM2 status if available
if command -v pm2 &> /dev/null; then
    echo ""
    print_status "PM2 status:"
    pm2 list | grep court-aggregator || print_warning "Court aggregator not found in PM2"
fi

# Check temperature (Raspberry Pi specific)
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$((TEMP/1000))
    echo "CPU temperature: ${TEMP_C}°C"
    
    if [ $TEMP_C -gt 70 ]; then
        print_warning "CPU temperature is high (${TEMP_C}°C)"
    fi
fi

echo ""
print_status "Network access:"
PI_IP=$(hostname -I | awk '{print $1}')
echo "Local: http://localhost:3000"
echo "Network: http://$PI_IP:3000"