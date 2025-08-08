#!/bin/bash

# Verification script for cloudflared integration
# Checks files and configuration without requiring Docker

set -e

echo "=== Mesa Court Aggregator Setup Verification ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description: $file"
        return 0
    else
        echo -e "${RED}✗${NC} $description: $file (missing)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_file_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo -e "\n${YELLOW}Checking core application files...${NC}"
check_file "server.js" "Main application server"
check_file "package.json" "Node.js dependencies"
check_file "public/index.html" "Frontend HTML"
check_file "public/script.js" "Frontend JavaScript"
check_file "public/styles.css" "Frontend CSS"

echo -e "\n${YELLOW}Checking Docker configuration...${NC}"
check_file "Dockerfile" "Docker build configuration"
check_file "docker-compose.yml" "Docker Compose configuration"
check_file ".dockerignore" "Docker ignore file"

echo -e "\n${YELLOW}Checking cloudflared integration files...${NC}"
check_file "tunnel-start.sh" "Cloudflared startup script"
check_file "supervisord.conf" "Process manager configuration"
check_file "sample.env" "Environment template"

echo -e "\n${YELLOW}Checking file permissions...${NC}"
if [ -x "tunnel-start.sh" ]; then
    echo -e "${GREEN}✓${NC} tunnel-start.sh is executable"
else
    echo -e "${RED}✗${NC} tunnel-start.sh is not executable"
    ERRORS=$((ERRORS + 1))
fi

echo -e "\n${YELLOW}Checking Dockerfile content...${NC}"
check_file_content "Dockerfile" "cloudflared" "Cloudflared installation in Dockerfile"
check_file_content "Dockerfile" "supervisor" "Supervisord installation in Dockerfile"
check_file_content "Dockerfile" "supervisord" "Supervisord startup command"

echo -e "\n${YELLOW}Checking supervisord configuration...${NC}"
check_file_content "supervisord.conf" "nodejs" "Node.js process configuration"
check_file_content "supervisord.conf" "cloudflared" "Cloudflared process configuration"

echo -e "\n${YELLOW}Checking tunnel startup script...${NC}"
check_file_content "tunnel-start.sh" "CLOUDFLARED_TOKEN" "Token validation in startup script"
check_file_content "tunnel-start.sh" "cloudflared tunnel" "Cloudflared command in startup script"

echo -e "\n${YELLOW}Checking docker-compose configuration...${NC}"
check_file_content "docker-compose.yml" "env_file" "Environment file configuration"
check_file_content "docker-compose.yml" "3000:3000" "Port mapping"
check_file_content "docker-compose.yml" "data:/app/data" "Data volume mapping"

echo -e "\n${YELLOW}Checking security measures...${NC}"
if [ -f ".gitignore" ] && grep -q ".env" ".gitignore"; then
    echo -e "${GREEN}✓${NC} .env files are gitignored"
else
    echo -e "${RED}✗${NC} .env files not properly gitignored"
    ERRORS=$((ERRORS + 1))
fi

# Check that no real tokens are in committed files
echo -e "\n${YELLOW}Checking for token security...${NC}"
if grep -r "eyJhIjoiYjJiZWVkZWRlZWRlMjM0MzE2Y2M1Y2U0ODU3MjA3ZDk" . --exclude-dir=.git --exclude="verify-setup.sh" 2>/dev/null; then
    echo -e "${RED}✗${NC} Real token found in files!"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓${NC} No real tokens found in committed files"
fi

echo -e "\n${YELLOW}Checking sample.env template...${NC}"
if [ -f "sample.env" ]; then
    if grep -q "your_tunnel_token_here" "sample.env"; then
        echo -e "${GREEN}✓${NC} sample.env has placeholder token"
    else
        echo -e "${RED}✗${NC} sample.env missing placeholder token"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "NODE_ENV=production" "sample.env"; then
        echo -e "${GREEN}✓${NC} sample.env has NODE_ENV"
    else
        echo -e "${RED}✗${NC} sample.env missing NODE_ENV"
        ERRORS=$((ERRORS + 1))
    fi
fi

echo -e "\n${YELLOW}Summary${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Setup is ready for deployment.${NC}"
    echo ""
    echo "To deploy:"
    echo "1. Copy sample.env to .env and add your cloudflared token"
    echo "2. Run: docker compose up -d"
    echo "3. Check: docker compose logs -f"
    echo "4. Test: curl http://localhost:3000/health"
else
    echo -e "${RED}✗ Found $ERRORS issues that need to be fixed.${NC}"
    exit 1
fi