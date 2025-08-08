#!/bin/bash

# Health check test script for cloudflared integration
# Tests Docker health check functionality with multi-process setup

set -e

echo "=== Health Check Test ==="
echo "Testing Docker health check with supervisord and cloudflared..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test functions
test_health_check_no_token() {
    echo -e "\n${YELLOW}Test 1: Health check without tunnel token${NC}"
    
    # Build and start container
    docker build -t mesa-court-aggregator:health-test . > /dev/null
    docker run -d --name health-test-no-token -p 3004:3000 mesa-court-aggregator:health-test
    
    echo "Waiting for container startup and health check..."
    sleep 45  # Wait for health check start period
    
    # Check container health status
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' health-test-no-token 2>/dev/null || echo "no-health")
    
    case $HEALTH_STATUS in
        "healthy")
            echo -e "${GREEN}✓ Container is healthy without tunnel${NC}"
            ;;
        "unhealthy")
            echo -e "${RED}✗ Container is unhealthy${NC}"
            echo "Health check logs:"
            docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' health-test-no-token
            ;;
        "starting")
            echo -e "${YELLOW}⚠ Container still starting, waiting longer...${NC}"
            sleep 30
            HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' health-test-no-token)
            echo "Final health status: $HEALTH_STATUS"
            ;;
        *)
            echo -e "${RED}✗ Unexpected health status: $HEALTH_STATUS${NC}"
            ;;
    esac
    
    # Test manual health check
    echo "Testing manual health check..."
    if docker exec health-test-no-token sh -c 'node -e "const http = require(\"http\"); const options = { hostname: \"localhost\", port: 3000, path: \"/health\", timeout: 5000 }; const req = http.request(options, (res) => { if (res.statusCode === 200) { process.exit(0); } else { process.exit(1); } }); req.on(\"error\", () => process.exit(1)); req.on(\"timeout\", () => process.exit(1)); req.end();"'; then
        echo -e "${GREEN}✓ Manual health check passed${NC}"
    else
        echo -e "${RED}✗ Manual health check failed${NC}"
    fi
    
    # Test supervisord status check
    echo "Testing supervisord status check..."
    if docker exec health-test-no-token supervisorctl -c /etc/supervisor/conf.d/supervisord.conf status nodejs | grep -q RUNNING; then
        echo -e "${GREEN}✓ Supervisord status check passed${NC}"
    else
        echo -e "${RED}✗ Supervisord status check failed${NC}"
        echo "Supervisord status:"
        docker exec health-test-no-token supervisorctl -c /etc/supervisor/conf.d/supervisord.conf status || true
    fi
    
    # Cleanup
    docker stop health-test-no-token > /dev/null 2>&1 || true
    docker rm health-test-no-token > /dev/null 2>&1 || true
}

test_health_check_with_token() {
    echo -e "\n${YELLOW}Test 2: Health check with tunnel token${NC}"
    
    # Use dummy token
    DUMMY_TOKEN="eyJhIjoiZHVtbXkiLCJ0IjoiZHVtbXktdG9rZW4tZm9yLXRlc3RpbmctcHVycG9zZXMtb25seSIsInMiOiJkdW1teS1zZWNyZXQifQ=="
    
    # Start container with token
    docker run -d --name health-test-with-token -p 3005:3000 \
        -e CLOUDFLARED_TOKEN="$DUMMY_TOKEN" \
        mesa-court-aggregator:health-test
    
    echo "Waiting for container startup with tunnel configuration..."
    sleep 45  # Wait for health check start period
    
    # Check container health status
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' health-test-with-token 2>/dev/null || echo "no-health")
    
    case $HEALTH_STATUS in
        "healthy")
            echo -e "${GREEN}✓ Container is healthy with tunnel configuration${NC}"
            ;;
        "unhealthy")
            echo -e "${RED}✗ Container is unhealthy with tunnel${NC}"
            echo "Health check logs:"
            docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' health-test-with-token
            ;;
        "starting")
            echo -e "${YELLOW}⚠ Container still starting, waiting longer...${NC}"
            sleep 30
            HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' health-test-with-token)
            echo "Final health status: $HEALTH_STATUS"
            ;;
        *)
            echo -e "${RED}✗ Unexpected health status: $HEALTH_STATUS${NC}"
            ;;
    esac
    
    # Show process status
    echo "Process status with tunnel configuration:"
    docker exec health-test-with-token supervisorctl -c /etc/supervisor/conf.d/supervisord.conf status || true
    
    # Cleanup
    docker stop health-test-with-token > /dev/null 2>&1 || true
    docker rm health-test-with-token > /dev/null 2>&1 || true
}

test_health_check_failure_scenarios() {
    echo -e "\n${YELLOW}Test 3: Health check failure scenarios${NC}"
    
    # Start container normally
    docker run -d --name health-test-failure -p 3006:3000 mesa-court-aggregator:health-test
    
    echo "Waiting for normal startup..."
    sleep 30
    
    # Stop the Node.js process to simulate failure
    echo "Simulating Node.js process failure..."
    docker exec health-test-failure supervisorctl -c /etc/supervisor/conf.d/supervisord.conf stop nodejs || true
    
    # Wait for health check to detect failure
    sleep 40
    
    # Check if health check detects the failure
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' health-test-failure 2>/dev/null || echo "no-health")
    
    if [ "$HEALTH_STATUS" = "unhealthy" ]; then
        echo -e "${GREEN}✓ Health check correctly detected Node.js failure${NC}"
    else
        echo -e "${RED}✗ Health check did not detect Node.js failure (status: $HEALTH_STATUS)${NC}"
    fi
    
    # Restart the process
    echo "Restarting Node.js process..."
    docker exec health-test-failure supervisorctl -c /etc/supervisor/conf.d/supervisord.conf start nodejs || true
    
    # Wait for recovery
    sleep 40
    
    # Check if health recovers
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' health-test-failure 2>/dev/null || echo "no-health")
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✓ Health check correctly detected Node.js recovery${NC}"
    else
        echo -e "${YELLOW}⚠ Health check status after recovery: $HEALTH_STATUS${NC}"
    fi
    
    # Cleanup
    docker stop health-test-failure > /dev/null 2>&1 || true
    docker rm health-test-failure > /dev/null 2>&1 || true
}

cleanup_all() {
    echo -e "\n${YELLOW}Cleaning up health check test resources...${NC}"
    
    # Stop and remove test containers
    docker stop health-test-no-token health-test-with-token health-test-failure > /dev/null 2>&1 || true
    docker rm health-test-no-token health-test-with-token health-test-failure > /dev/null 2>&1 || true
    
    # Remove test image
    docker rmi mesa-court-aggregator:health-test > /dev/null 2>&1 || true
    
    echo -e "${GREEN}✓ Health check test cleanup completed${NC}"
}

# Trap to ensure cleanup on exit
trap cleanup_all EXIT

# Run tests
echo "Starting health check tests..."

test_health_check_no_token
test_health_check_with_token
test_health_check_failure_scenarios

echo -e "\n${GREEN}=== Health check tests completed ===${NC}"
echo "Review the output above for any failures."
echo "The health check should correctly monitor both Node.js and supervisord processes."