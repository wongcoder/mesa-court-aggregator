#!/bin/sh

# Cloudflared tunnel startup script
# Validates environment and starts tunnel if configured

echo "Starting cloudflared tunnel service..."

# Check if CLOUDFLARED_TOKEN is provided
if [ -z "$CLOUDFLARED_TOKEN" ]; then
    echo "INFO: No CLOUDFLARED_TOKEN provided, tunnel disabled"
    echo "INFO: Application will be accessible locally only"
    # Keep the process alive but inactive
    while true; do
        sleep 3600
    done
fi

# Validate token format (basic check)
if [ ${#CLOUDFLARED_TOKEN} -lt 50 ]; then
    echo "ERROR: CLOUDFLARED_TOKEN appears to be invalid (too short)"
    echo "ERROR: Expected a base64-encoded JSON token from Cloudflare"
    exit 1
fi

echo "INFO: CLOUDFLARED_TOKEN found, starting tunnel..."

# Start cloudflared with error handling
echo "INFO: Connecting to Cloudflare tunnel..."

# The token contains all the tunnel information, so we don't need to specify the tunnel name separately
exec cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARED_TOKEN" --url http://localhost:3000