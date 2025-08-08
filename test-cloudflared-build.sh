#!/bin/bash

# Test script for cloudflared integration
# Tests container build and startup scenarios

set -e

echo "=== Cloudflared Integration Test ==="
echo "Testing container build and startup scenarios..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test functions
test_build() {
    echo -e "\n${YELLOW}Test 1: Container Build${NC}"
    echo "Building container with cloudflared integration..."
    
    if docker build -t mesa-court-aggregator:test .; then
        echo -e "${GREEN}✓ Container build successful${NC}"
        return 0
    else
        echo -e "${RED}✗ Container build failed${NC}"
        return 1
    fi
}

test_startup_no_token() {
    echo -e "\n${YELLOW}Test 2: Startup without tunnel token${NC}"
    echo "Testing container startup without CLOUDFLARED_TOKEN..."
    
    # Start container without token
    docker run -d --name test-no-token -p 3001:3000 mesa-court-aggregator:test
    
    # Wait for startup
    sleep 10
    
    # Check if container is running
    if docker ps | grep -q test-no-token; then
        echo -e "${GREEN}✓ Container started successfully without token${NC}"
        
        # Check logs for expected message
        if docker logs test-no-token 2>&1 | grep -q "No CLOUDFLARED_TOKEN provided, tunnel disabled"; then
            echo -e "${GREEN}✓ Tunnel correctly disabled when no token provided${NC}"
        else
            echo -e "${RED}✗ Expected tunnel disabled message not found${NC}"
        fi
        
        # Test health endpoint
        sleep 5
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Application health endpoint accessible${NC}"
        else
            echo -e "${RED}✗ Application health endpoint not accessible${NC}"
        fi
    else
        echo -e "${RED}✗ Container failed to start without token${NC}"
    fi
    
    # Cleanup
    docker stop test-no-token > /dev/null 2>&1 || true
    docker rm test-no-token > /dev/null 2>&1 || true
}

test_startup_with_token() {
    echo -e "\n${YELLOW}Test 3: Startup with tunnel token${NC}"
    echo "Testing container startup with CLOUDFLARED_TOKEN..."
    
    # Use a dummy token for testing (will fail to connect but should start)
    DUMMY_TOKEN="eyJhIjoiZHVtbXkiLCJ0IjoiZHVtbXktdG9rZW4tZm9yLXRlc3RpbmctcHVycG9zZXMtb25seSIsInMiOiJkdW1teS1zZWNyZXQifQ=="
    
    # Start container with dummy token
    docker run -d --name test-with-token -p 3002:3000 \
        -e CLOUDFLARED_TOKEN="$DUMMY_TOKEN" \
        -e CLOUDFLARED_TUNNEL_NAME="test-tunnel" \
        mesa-court-aggregator:test
    
    # Wait for startup
    sleep 15
    
    # Check if container is running
    if docker ps | grep -q test-with-token; then
        echo -e "${GREEN}✓ Container started successfully with token${NC}"
        
        # Check logs for tunnel startup attempt
        if docker logs test-with-token 2>&1 | grep -q "CLOUDFLARED_TOKEN found, starting tunnel"; then
            echo -e "${GREEN}✓ Tunnel startup initiated with token${NC}"
        else
            echo -e "${RED}✗ Tunnel startup message not found${NC}"
        fi
        
        # Test health endpoint (should work even if tunnel fails)
        sleep 5
        if curl -f http://localhost:3002/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Application health endpoint accessible with tunnel config${NC}"
        else
            echo -e "${RED}✗ Application health endpoint not accessible with tunnel config${NC}"
        fi
    else
        echo -e "${RED}✗ Container failed to start with token${NC}"
    fi
    
    # Cleanup
    docker stop test-with-token > /dev/null 2>&1 || true
    docker rm test-with-token > /dev/null 2>&1 || true
}

test_supervisord_processes() {
    echo -e "\n${YELLOW}Test 4: Process Management${NC}"
    echo "Testing supervisord process management..."
    
    # Start container for process testing
    docker run -d --name test-processes -p 3003:3000 mesa-court-aggregator:test
    
    # Wait for startup
    sleep 10
    
    if docker ps | grep -q test-processes; then
        # Check supervisord status
        if docker exec test-processes supervisorctl status > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Supervisord is running and accessible${NC}"
            
            # Show process status
            echo "Process status:"
            docker exec test-processes supervisorctl status
        else
            echo -e "${RED}✗ Supervisord not accessible${NC}"
        fi
    else
        echo -e "${RED}✗ Container not running for process test${NC}"
    fi
    
    # Cleanup
    docker stop test-processes > /dev/null 2>&1 || true
    docker rm test-processes > /dev/null 2>&1 || true
}

cleanup_all() {
    echo -e "\n${YELLOW}Cleaning up test resources...${NC}"
    
    # Stop and remove any remaining test containers
    docker stop test-no-token test-with-token test-processes > /dev/null 2>&1 || true
    docker rm test-no-token test-with-token test-processes > /dev/null 2>&1 || true
    
    # Remove test image
    docker rmi mesa-court-aggregator:test > /dev/null 2>&1 || true
    
    echo -e "${GREEN}✓ Cleanup completed${NC}"
}

# Trap to ensure cleanup on exit
trap cleanup_all EXIT

# Run tests
echo "Starting cloudflared integration tests..."

if test_build; then
    test_startup_no_token
    test_startup_with_token
    test_supervisord_processes
    
    echo -e "\n${GREEN}=== All tests completed ===${NC}"
    echo "Review the output above for any failures."
    echo "If all tests passed, the cloudflared integration is working correctly."
else
    echo -e "\n${RED}=== Build test failed ===${NC}"
    echo "Fix build issues before running other tests."
    exit 1
fi