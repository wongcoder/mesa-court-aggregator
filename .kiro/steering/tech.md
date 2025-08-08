# Technology Stack

## Runtime & Framework
- **Node.js**: >=16.0.0 (specified in package.json engines)
- **Express.js**: ^4.18.2 - Web server framework
- **Platform**: Optimized for Raspberry Pi (ARM architecture)

## Dependencies
- **axios**: ^1.6.0 - HTTP client for external API calls
- **node-cron**: ^3.0.3 - Scheduled task management
- **express**: ^4.18.2 - Web framework

## Frontend Stack
- **Vanilla JavaScript** - No frontend frameworks, pure JS
- **CSS3** - Modern CSS with flexbox/grid, system fonts
- **HTML5** - Semantic markup

## Development Environment
- **Package Manager**: npm (package-lock.json present)
- **License**: MIT

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm start
# or
npm run dev

# Both commands run: node server.js
```

### Production
```bash
# Start production server
npm start
```

### Health Check
- Server health endpoint: `GET /health`
- Returns: `{"status": "ok", "timestamp": "ISO_DATE"}`

## Architecture Notes
- Single-file server architecture (server.js)
- Static file serving from public/ directory
- RESTful API design
- No database - uses JSON file caching in data/ directory
- Modular structure with services/ and utils/ for future expansion