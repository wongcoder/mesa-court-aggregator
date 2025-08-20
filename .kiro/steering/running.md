---
inclusion: always
---

# Development and Process Management Rules

## Script Execution Preferences

- **Prefer writing scripts over inline execution**: Instead of using `node -e "code"`, create temporary script files for better readability and debugging
- **Use descriptive script names**: When creating test scripts, use names that clearly indicate their purpose (e.g., `test-time-slots.js`, `verify-api-response.js`)
- **Clean up temporary files**: Remove test scripts and temporary files after verification to keep the workspace clean

## Server Process Management

- **CRITICAL: Avoid unnecessary server restarts**: The server auto-reloads on file changes. DO NOT kill and restart `node server.js` for CSS/HTML changes
- **Use proper process termination**: If restart is truly needed, use `pkill -f "node server.js"` to cleanly stop servers
- **Check for running processes**: Before starting servers, verify no conflicting processes are running on port 3000
- **Never use background processes**: Avoid `&` operator as it can hang the development environment

## Development Workflow

### Testing Strategy
- **Use npm test**: Run Jest tests with `npm test` for automated testing
- **Manual testing scripts**: Create scripts in tests/ directory for manual verification
- **API testing**: Use the comprehensive API endpoints for testing functionality
- **Health checks**: Use `/api/health` endpoint to verify system status

### File Modification Guidelines
- **Frontend changes**: CSS/HTML changes are served immediately, no server restart needed
- **Backend changes**: Server auto-reloads on JavaScript file changes
- **Service changes**: Modifications to services/ files trigger automatic reload
- **Configuration changes**: .env changes may require manual restart

### API Development
- **Use existing endpoints**: Leverage `/api/scheduler/*` and `/api/backfill/*` for testing
- **Test with curl**: Use curl commands for API endpoint testing
- **Check logs**: Monitor console output for debugging information
- **Validate responses**: Ensure API responses match expected format

## Process Monitoring

### Health Monitoring
- **Basic health**: `GET /health` for simple status check
- **Detailed health**: `GET /api/health` for comprehensive system status
- **Scheduler status**: `GET /api/scheduler/status` for scheduled task monitoring
- **Cache health**: Included in detailed health endpoint

### Resource Management
- **Monitor memory usage**: Be mindful of JSON cache file sizes
- **Check disk space**: Monthly cache files can accumulate over time
- **Network monitoring**: Mesa API calls have rate limiting considerations
- **Process cleanup**: Ensure proper cleanup of temporary resources

### Debugging Guidelines
- **Use console.log**: Server logs provide detailed operation information
- **Check error responses**: API endpoints return detailed error information
- **Validate data**: Use cache health endpoints to verify data integrity
- **Test incrementally**: Make small changes and test frequently
