---
inclusion: always
---

# Technology Stack

## Runtime & Framework
- **Node.js**: >=16.0.0 (specified in package.json engines)
- **Express.js**: ^4.18.2 - Web server framework
- **Platform**: Optimized for Raspberry Pi (ARM architecture)

## Dependencies
- **axios**: ^1.6.0 - HTTP client for external API calls
- **node-cron**: ^3.0.3 - Scheduled task management
- **express**: ^4.18.2 - Web framework
- **jest**: ^30.0.5 - Testing framework (dev dependency)
- **supertest**: ^7.1.4 - HTTP testing (dev dependency)

## Frontend Stack
- **Vanilla JavaScript** - No frontend frameworks, pure JS
- **CSS3** - Modern CSS with flexbox/grid, system fonts
- **HTML5** - Semantic markup

## Development Environment
- **Package Manager**: npm (package-lock.json present)
- **License**: MIT
- **Testing**: Jest with Supertest for API testing

## API Endpoints

### Core Endpoints
- `GET /health` - Basic health check: `{"status": "ok", "timestamp": "ISO_DATE"}`
- `GET /api/health` - Detailed system health with cache, scheduler, and backfill status
- `GET /api/calendar/:month` - Court availability data for specific month (YYYY-MM format)
- `GET /api/parks` - Available parks with colors and PDF links

### Management Endpoints
- `GET /api/scheduler/status` - Scheduler status and configuration
- `POST /api/scheduler/start` - Start scheduled updates
- `POST /api/scheduler/stop` - Stop scheduled updates
- `POST /api/scheduler/test` - Test scheduler with custom cron expression
- `POST /api/scheduler/update` - Manual update trigger
- `GET /api/backfill/status` - Backfill service status
- `POST /api/backfill/run` - Run backfill job with options
- `POST /api/backfill/token/sample` - Set sample CSRF token
- `POST /api/backfill/token/refresh` - Refresh CSRF token
- `POST /api/backfill/test` - Test API call for specific date

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm start
# or
npm run dev

# Run tests
npm test
```

### Production
```bash
# Start production server
npm start
```

## Architecture Notes
- **Modular service architecture**: CacheManager, Scheduler, BackfillService, MesaApiClient
- **Static file serving** from public/ directory
- **RESTful API design** with comprehensive error handling
- **JSON file caching** in data/ directory (monthly files: YYYY-MM.json)
- **Scheduled updates** via node-cron (daily at 5PM PST/PDT)
- **CSRF token management** for Mesa API authentication
- **Comprehensive health monitoring** and status endpoints