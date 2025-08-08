# Design Document

## Overview

The cloudflared integration will extend the existing Docker container to include Cloudflare Tunnel functionality, allowing secure external access to the Mesa Court Aggregator without port forwarding. The design maintains the existing single-container architecture while adding optional tunnel capabilities through environment variable configuration.

## Architecture

### Container Architecture
```
Docker Container
├── Node.js Application (Port 3000)
├── cloudflared Process (Tunnel)
└── Process Manager (supervisord)
```

### Process Management
- **supervisord**: Lightweight process manager to handle both Node.js app and cloudflared
- **Node.js Application**: Primary service running on port 3000
- **cloudflared**: Secondary service creating secure tunnel when configured

### Configuration Flow
```
Environment Variables → supervisord config → Process startup
├── CLOUDFLARED_TOKEN (required for tunnel)
├── CLOUDFLARED_TUNNEL_NAME (optional)
└── NODE_ENV (existing)
```

## Components and Interfaces

### Dockerfile Modifications
- Install cloudflared binary from official Cloudflare repository
- Install supervisord for process management
- Add configuration templates for supervisord
- Maintain existing security practices (non-root user)

### Configuration Management
- **supervisord.conf**: Main process configuration
- **tunnel-start.sh**: Wrapper script for cloudflared with environment validation
- **Environment Variables**: Runtime configuration for tunnel parameters

### Process Communication
- Both processes log to stdout/stderr for Docker logging
- Health checks monitor both Node.js app and tunnel status
- Graceful shutdown handling for both processes

## Data Models

### Environment Configuration
```javascript
{
  CLOUDFLARED_TOKEN: "string|undefined",     // Tunnel authentication token
  CLOUDFLARED_TUNNEL_NAME: "string|undefined", // Optional tunnel name
  NODE_ENV: "production|development",         // Existing app environment
  TZ: "America/Phoenix"                      // Existing timezone setting
}
```

### Process Status
```javascript
{
  nodejs: {
    status: "running|stopped|failed",
    pid: "number",
    uptime: "string"
  },
  cloudflared: {
    status: "running|stopped|disabled|failed",
    pid: "number|null",
    tunnel_url: "string|null"
  }
}
```

## Error Handling

### Tunnel Configuration Errors
- Invalid or missing CLOUDFLARED_TOKEN: Log warning, continue without tunnel
- Network connectivity issues: Retry with exponential backoff
- Tunnel authentication failures: Log error details, disable tunnel

### Process Management Errors
- Node.js application failure: Container should exit (existing behavior)
- cloudflared failure: Log error, continue with Node.js only
- supervisord failure: Container should exit for restart

### Health Check Strategy
```bash
# Multi-service health check
1. Check Node.js /health endpoint (existing)
2. If tunnel enabled, verify cloudflared process status
3. Return healthy only if required services are running
```

## Testing Strategy

### Unit Testing
- Environment variable parsing and validation
- Configuration file generation
- Process startup scripts

### Integration Testing
- Container build with cloudflared installation
- Multi-process startup and shutdown
- Health check functionality with and without tunnel

### Manual Testing Scenarios
1. **No tunnel configuration**: Container runs Node.js only
2. **Valid tunnel token**: Both services start successfully
3. **Invalid tunnel token**: Node.js starts, tunnel fails gracefully
4. **Network issues**: Tunnel retries, Node.js remains available
5. **Process failures**: Appropriate restart/exit behavior

## Implementation Details

### Dockerfile Changes
```dockerfile
# Install cloudflared
RUN wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
    && chmod +x cloudflared-linux-arm64 \
    && mv cloudflared-linux-arm64 /usr/local/bin/cloudflared

# Install supervisord
RUN apk add --no-cache supervisor

# Copy configuration files
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY tunnel-start.sh /usr/local/bin/tunnel-start.sh
RUN chmod +x /usr/local/bin/tunnel-start.sh
```

### supervisord Configuration
```ini
[supervisord]
nodaemon=true
user=root
logfile=/dev/stdout
logfile_maxbytes=0

[program:nodejs]
command=node server.js
directory=/app
user=courtapp
autorestart=true
stdout_logfile=/dev/stdout
stderr_logfile=/dev/stderr

[program:cloudflared]
command=/usr/local/bin/tunnel-start.sh
user=courtapp
autorestart=false
stdout_logfile=/dev/stdout
stderr_logfile=/dev/stderr
```

### Tunnel Startup Script
```bash
#!/bin/sh
if [ -n "$CLOUDFLARED_TOKEN" ]; then
    exec cloudflared tunnel --token "$CLOUDFLARED_TOKEN" --url http://localhost:3000
else
    echo "No CLOUDFLARED_TOKEN provided, tunnel disabled"
    sleep infinity
fi
```

## Security Considerations

### Token Management
- Tokens passed via environment variables (not embedded in image)
- No token persistence in container filesystem
- Support for Docker secrets in docker-compose

### Network Security
- Tunnel provides encrypted connection to Cloudflare edge
- No additional ports exposed on host system
- Existing application security measures remain in place

### Process Isolation
- cloudflared runs as non-root user (courtapp)
- Minimal additional attack surface
- Standard Docker security practices maintained