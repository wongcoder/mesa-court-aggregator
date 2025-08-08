# Mesa Court Aggregator Dockerfile
# Optimized for Raspberry Pi deployment with minimal resource usage

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S courtapp -u 1001

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application files
COPY --chown=courtapp:nodejs . .

# Create data directory with proper permissions
RUN mkdir -p data && \
    chown -R courtapp:nodejs data && \
    chmod 755 data

# Switch to non-root user
USER courtapp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 3000, path: '/health', timeout: 5000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) { process.exit(0); } else { process.exit(1); } \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["node", "server.js"]