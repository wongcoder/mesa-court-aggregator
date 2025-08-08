# Mesa Court Aggregator

A Node.js web application that aggregates pickleball court availability from Mesa, Arizona's reservation systems into a unified calendar interface. Designed for Raspberry Pi deployment with minimal resource usage.

## Features

- **Multi-Park Support**: Aggregates data from Kleinman Park, Gene Autry Park, and Monterey Park
- **Multiple Calendar Views**: Monthly, weekly, and daily calendar interfaces
- **Real-time Updates**: Scheduled data fetching with 24-hour cache freshness
- **Park Filtering**: Interactive sidebar to filter by specific parks
- **PDF Calendar Links**: Direct access to official PDF calendars where available
- **Mobile Responsive**: Optimized for desktop and mobile devices
- **Raspberry Pi Optimized**: Minimal resource usage and efficient caching

## Quick Start

### Docker Deployment (Recommended)

```bash
# Clone repository
git clone https://github.com/username/mesa-court-aggregator.git
cd mesa-court-aggregator

# Start with Docker Compose
docker-compose up -d

# Access application
open http://localhost:3000
```

### Manual Installation

```bash
# Install dependencies
npm install

# Start application
npm start

# Access application
open http://localhost:3000
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server health status and timestamp.

### Parks Information
```
GET /api/parks
```
Returns list of available parks with colors and PDF links.

### Calendar Data
```
GET /api/calendar/:month
```
Returns court availability data for specified month (format: YYYY-MM).

### Scheduler Status
```
GET /api/scheduler/status
```
Returns current scheduler status and configuration.

## Architecture

### Backend Components

- **Express.js Server** (`server.js`) - Main application server
- **Mesa API Client** (`services/mesa-api-client.js`) - Handles external API communication
- **Court Data Processor** (`services/court-data-processor.js`) - Processes and formats court data
- **Cache Manager** (`services/cache-manager.js`) - Manages monthly JSON cache files
- **Backfill Service** (`services/backfill-service.js`) - Preloads data for multiple dates
- **Scheduler** (`services/scheduler.js`) - Manages daily data updates
- **CSRF Token Manager** (`services/csrf-token-manager.js`) - Handles API authentication

### Frontend Components

- **Calendar Views** - Monthly, weekly, and daily interfaces
- **Park Filtering** - Interactive sidebar with color-coded parks
- **Time Block Visualization** - Visual representation of court bookings
- **Responsive Design** - Mobile-optimized interface

### Data Flow

1. **Scheduled Updates**: Daily at 5 PM PST/PDT
2. **API Fetching**: Retrieves data from Mesa ActiveCommunities API
3. **Data Processing**: Converts API responses to structured time windows
4. **Caching**: Stores processed data in monthly JSON files
5. **Frontend Serving**: Provides cached data via REST API

## Configuration

### Environment Variables

- `NODE_ENV` - Application environment (production/development)
- `TZ` - Timezone (default: America/Phoenix)

### Hard-coded Park Mappings

The application includes hard-coded mappings from court resource names to park names:

```javascript
// Kleinman Park (Facility Group ID: 29)
'MPTC Court 01', 'MPTC Court 01A', 'MPTC Court 01B',
'MPTC Court 09A', 'MPTC Court 09B', 'MPTC Court 13A', 'MPTC Court 13B'

// Gene Autry Park (Facility Group ID: 33)
'Gene Autry Court 1', 'Gene Autry Court 2', 'Gene Autry Court 3',
'Gene Autry Court 4', 'Gene Autry Court 5', 'Gene Autry Court 6',
'Gene Autry Court 7', 'Gene Autry Court 8'

// Monterey Park (Facility Group ID: 35)
'Christopher J Brady Court 1', 'Christopher J Brady Court 2',
'Christopher J Brady Court 3', 'Christopher J Brady Court 4'
```

### PDF Calendar Links

- **Kleinman Park**: [Official PDF Calendar](https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf)
- **Gene Autry Park**: No PDF calendar available
- **Monterey Park**: [Official PDF Calendar](https://www.mesaaz.gov/files/assets/public/v/244/activities-culture/prcf/facilities/pickleball-public-court-calendars/brady-pickleball-court.pdf)

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx jest services/cache-manager.test.js

# Run tests with coverage
npx jest --coverage
```

### Project Structure

```
mesa-court-aggregator/
├── server.js              # Main Express.js server
├── package.json           # Dependencies and scripts
├── Dockerfile             # Docker container configuration
├── docker-compose.yml     # Docker Compose orchestration
├── data/                  # Monthly JSON cache files
├── public/                # Static frontend assets
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styling
│   └── script.js         # Frontend JavaScript
├── services/              # Backend service modules
│   ├── mesa-api-client.js
│   ├── court-data-processor.js
│   ├── cache-manager.js
│   ├── backfill-service.js
│   ├── scheduler.js
│   └── csrf-token-manager.js
└── utils/                 # Utility modules
```

### Adding New Parks

To add support for a new park:

1. **Update Backfill Service** (`services/backfill-service.js`):
   ```javascript
   this.facilityGroups = [
     // ... existing parks
     {
       id: NEW_FACILITY_ID,
       name: 'New Park Name',
       startTime: '09:00:00',
       endTime: '22:00:00',
       pdfLink: 'https://example.com/new-park-calendar.pdf' // or null
     }
   ];
   ```

2. **Update Court Data Processor** (`services/court-data-processor.js`):
   ```javascript
   const COURT_MAPPINGS = {
     // ... existing mappings
     'New Park Court 1': 'New Park Name',
     'New Park Court 2': 'New Park Name',
     // ... additional courts
   };
   ```

3. **Update Frontend Colors** (`public/script.js`):
   ```javascript
   const accessibleColors = {
     // ... existing colors
     'New Park Name': '#color-code'
   };
   ```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions including:

- Docker deployment
- Raspberry Pi setup
- Auto-restart configuration
- Logging and monitoring
- Troubleshooting guide
- Backup and recovery procedures

## Troubleshooting

### Common Issues

1. **No Data Available**: Check network connectivity and API access
2. **Memory Issues**: Increase swap space on Raspberry Pi
3. **Port Conflicts**: Ensure port 3000 is available
4. **Permission Errors**: Check data directory permissions

### Debug Information

```bash
# Check application health
curl http://localhost:3000/health

# View recent logs
docker-compose logs --tail=50

# Check system resources
free -h && df -h
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

### Code Style

- Use ES6+ features
- Include error handling
- Add unit tests for new features
- Follow existing naming conventions

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
3. Create an issue with system information and logs

## Acknowledgments

- Mesa, Arizona Parks and Recreation Department for providing the court reservation API
- ActiveCommunities platform for the reservation system integration