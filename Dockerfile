# Mesa Court Aggregator Dockerfile
# Optimized for Raspberry Pi deployment with minimal resource usage
# Includes cloudflared tunnel support

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install cloudflared and supervisord
RUN apk add --no-cache supervisor wget && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared; \
    elif [ "$ARCH" = "aarch64" ]; then \
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O /usr/local/bin/cloudflared; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    chmod +x /usr/local/bin/cloudflared

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S courtapp -u 1001

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application files
COPY --chown=courtapp:nodejs . .

# Copy configuration files and set permissions
COPY --chown=root:root supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY --chown=courtapp:nodejs tunnel-start.sh /usr/local/bin/tunnel-start.sh
RUN chmod +x /usr/local/bin/tunnel-start.sh

# Create data directory with proper permissions
RUN mkdir -p data && \
    chown -R courtapp:nodejs data && \
    chmod 775 data

# Create tmp directory for supervisord with proper permissions
RUN mkdir -p /tmp && \
    chmod 1777 /tmp

# Don't switch to non-root user here - supervisord needs to run as root
# to manage child processes and switch users

# Expose port
EXPOSE 3000

# Health check - monitors both Node.js app and supervisord processes
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD sh -c ' \
    # Check Node.js application health \
    wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1; \
    # Check if supervisord is managing processes correctly \
    supervisorctl -c /etc/supervisor/conf.d/supervisord.conf status nodejs | grep -q RUNNING || exit 1'

# Start the application with supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]