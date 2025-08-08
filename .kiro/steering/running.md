# Node.js Development and Process Management Rules

## Script Execution Preferences

- **Prefer writing scripts over inline execution**: Instead of using `node -e "code"`, create temporary script files for better readability and debugging
- **Use descriptive script names**: When creating test scripts, use names that clearly indicate their purpose (e.g., `test-time-slots.js`, `verify-api-response.js`)

## Server Process Management

- **Avoid background processes**: Never run Node.js servers with `&` (background operator) as it can hang the development environment
- **Use proper process termination**: Always use `pkill -f "node server.js"` or similar to cleanly stop running servers before starting new ones
- **Handle server restarts gracefully**: When restarting servers, ensure the previous process is fully terminated before starting a new one

## Development Workflow

- **Test before deploy**: Create small test scripts to verify functionality before making changes to main application files
- **Clean up temporary files**: Remove test scripts and temporary files after verification to keep the workspace clean
- **Use npm scripts**: Leverage package.json scripts for common development tasks rather than running node commands directly

## Process Monitoring

- **Check for running processes**: Before starting servers, verify no conflicting processes are already running on the target port
- **Use health checks**: Implement and use health check endpoints to verify server status
- **Monitor resource usage**: Be mindful of memory and CPU usage, especially when running multiple Node.js processes during development
