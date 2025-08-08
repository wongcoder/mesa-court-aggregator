# Mesa Court Aggregator Dockerfile
# Optimized for Raspberry Pi deployment with minimal resource usage
# Includes cloudflared tunnel support

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install cloudflared and supervisord
RUN apk add --no-cache supervisor wget && \
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O /usr/local/bin/cloudflared && \
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
    chmod 755 data

# Switch to non-root user
USER courtapp

# Expose port
EXPOSE 3000

# Health check - monitors both Node.js app and supervisord processes
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD sh -c ' \
    # Check Node.js application health \
    node -e "const http = require(\"http\"); \
      const options = { hostname: \"localhost\", port: 3000, path: \"/health\", timeout: 5000 }; \
      const req = http.request(options, (res) => { \
        if (res.statusCode === 200) { process.exit(0); } else { process.exit(1); } \
      }); \
      req.on(\"error\", () => process.exit(1)); \
      req.on(\"timeout\", () => process.exit(1)); \
      req.end();" && \
    # Check if supervisord is managing processes correctly \
    supervisorctl -c /etc/supervisor/conf.d/supervisord.conf status nodejs | grep -q RUNNING'

# Start the application with supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]