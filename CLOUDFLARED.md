# Cloudflared Tunnel Integration

This document explains how to set up and configure Cloudflare Tunnels with the Mesa Court Aggregator for secure external access without port forwarding.

## Overview

Cloudflare Tunnels create a secure connection between your application and Cloudflare's edge network, allowing external access without exposing ports or configuring firewalls. The integration runs cloudflared alongside the Node.js application using supervisord for process management.

## Prerequisites

1. **Cloudflare Account**: Free account at [cloudflare.com](https://cloudflare.com)
2. **Domain**: A domain managed by Cloudflare (can be free)
3. **Zero Trust Setup**: Access to Cloudflare Zero Trust dashboard

## Getting Your Tunnel Token

### Step 1: Access Zero Trust Dashboard
1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Zero Trust** → **Networks** → **Tunnels**
3. Click **Create a tunnel**

### Step 2: Create Tunnel
1. Choose **Cloudflared** as the connector type
2. Give your tunnel a name (e.g., `mesa-court-aggregator`)
3. Click **Save tunnel**

### Step 3: Get Token
1. In the tunnel configuration, you'll see installation commands
2. Copy the token from the command that looks like:
   ```bash
   cloudflared tunnel --token eyJhIj...
   ```
3. The token is the long base64-encoded string after `--token`

### Step 4: Configure Public Hostname
1. In the **Public Hostnames** tab of your tunnel
2. Add a public hostname:
   - **Subdomain**: `court-aggregator` (or your choice)
   - **Domain**: Your Cloudflare-managed domain
   - **Service**: `http://localhost:3000`
3. Click **Save hostname**

## Configuration

### Environment Variables

Add these environment variables to your deployment:

```bash
# Required: Your tunnel token from Cloudflare
CLOUDFLARED_TOKEN=your_tunnel_token_here

# Optional: Custom tunnel name (defaults to Cloudflare-generated name)
CLOUDFLARED_TUNNEL_NAME=mesa-court-aggregator
```

### Docker Compose Configuration

Edit your `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - TZ=America/Phoenix
  # Uncomment and set your token
  - CLOUDFLARED_TOKEN=your_tunnel_token_here
  - CLOUDFLARED_TUNNEL_NAME=mesa-court-aggregator
```

### Environment File (Recommended)

Create a `.env` file for sensitive data:

```bash
# .env file
CLOUDFLARED_TOKEN=your_tunnel_token_here
CLOUDFLARED_TUNNEL_NAME=mesa-court-aggregator
```

Then reference it in docker-compose.yml:
```yaml
env_file:
  - .env
```

**Important**: Add `.env` to your `.gitignore` file to prevent committing tokens.

## Deployment

### With Tunnel (External Access)
```bash
# Set your token in docker-compose.yml or .env file
docker-compose up -d
```

### Without Tunnel (Local Only)
```bash
# Leave CLOUDFLARED_TOKEN unset or commented out
docker-compose up -d
```

## Verification

### Check Container Logs
```bash
# View all logs
docker-compose logs -f

# View only cloudflared logs
docker-compose logs -f | grep cloudflared
```

### Expected Log Output
```
INFO: CLOUDFLARED_TOKEN found, starting tunnel...
INFO: Connecting to Cloudflare tunnel...
INF Connection established
INF Each HA connection's tunnel IDs: map[0:tunnel-id 1:tunnel-id]
```

### Test Access
1. **Local**: http://localhost:3000
2. **External**: https://your-subdomain.your-domain.com

## Security Best Practices

### Token Management
- **Never commit tokens to version control**
- Use environment variables or Docker secrets
- Rotate tokens periodically
- Restrict tunnel access in Cloudflare Zero Trust

### Access Control
- Configure Cloudflare Access policies for additional security
- Use Cloudflare WAF rules to protect against attacks
- Monitor tunnel usage in Cloudflare Analytics

### Network Security
- Tunnel traffic is encrypted end-to-end
- No inbound ports need to be opened on your firewall
- Application remains accessible locally on port 3000

## Troubleshooting

### Common Issues

#### "No CLOUDFLARED_TOKEN provided"
- **Cause**: Token not set in environment variables
- **Solution**: Set `CLOUDFLARED_TOKEN` in docker-compose.yml or .env file

#### "CLOUDFLARED_TOKEN appears to be invalid"
- **Cause**: Token is malformed or incomplete
- **Solution**: Copy the complete token from Cloudflare dashboard

#### "Connection failed"
- **Cause**: Network connectivity or token authentication issues
- **Solution**: Check internet connection and verify token is active

#### "Tunnel not accessible externally"
- **Cause**: Public hostname not configured correctly
- **Solution**: Verify hostname configuration in Cloudflare Zero Trust

### Debug Commands

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --tail=50 mesa-court-aggregator

# Check process status inside container
docker-compose exec mesa-court-aggregator supervisorctl status

# Test local application
curl http://localhost:3000/health
```

### Log Analysis

Look for these key log messages:

**Successful startup**:
```
INFO: CLOUDFLARED_TOKEN found, starting tunnel...
INF Connection established
```

**Token issues**:
```
ERROR: CLOUDFLARED_TOKEN appears to be invalid
```

**Network issues**:
```
ERR Connection terminated
```

## Advanced Configuration

### Custom Tunnel Configuration
For advanced use cases, you can create a custom tunnel configuration file and mount it into the container.

### Multiple Services
Configure multiple public hostnames in Cloudflare to route different paths to different services.

### Load Balancing
Use Cloudflare Load Balancing to distribute traffic across multiple tunnel instances.

## Support

- **Cloudflare Documentation**: [developers.cloudflare.com/cloudflare-one/connections/connect-apps/](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- **Tunnel Troubleshooting**: [developers.cloudflare.com/cloudflare-one/connections/connect-apps/troubleshooting/](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/troubleshooting/)
- **Community Support**: [community.cloudflare.com](https://community.cloudflare.com)