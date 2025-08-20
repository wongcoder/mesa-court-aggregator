---
inclusion: always
---

# Project Structure

## Directory Organization

```
mesa-court-aggregator/
├── server.js              # Main Express.js server entry point
├── package.json           # Node.js dependencies and scripts
├── package-lock.json      # Locked dependency versions
├── README.md              # Project documentation
├── .env                   # Environment variables (not in git)
├── sample.env             # Environment template
├── data/                  # Monthly JSON cache files (YYYY-MM.json)
│   ├── .gitkeep          # Keep empty directory in git
│   ├── 2025-08.json      # Example monthly cache file
│   └── backups/          # Automated cache backups
├── public/                # Static frontend assets
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styling
│   ├── script.js         # Frontend JavaScript
│   └── court-utilization-utils.js  # Utility functions
├── services/              # Backend service modules
│   ├── cache-manager.js  # Cache management and file operations
│   ├── scheduler.js      # Scheduled updates via node-cron
│   ├── backfill-service.js  # Historical data backfill
│   ├── mesa-api-client.js   # Mesa API communication
│   ├── csrf-token-manager.js # CSRF token handling
│   └── court-data-processor.js # Data processing utilities
├── tests/                 # Test files and test data
│   ├── *.test.js         # Jest test files
│   └── test-*.js         # Manual test scripts
├── utils/                 # Utility modules
│   └── .gitkeep          # Keep empty directory in git
├── logs/                  # Application logs
└── .kiro/                 # Kiro IDE configuration
    ├── steering/         # AI assistant guidance
    └── specs/            # Feature specifications
```

## File Conventions

### Backend Structure
- **server.js**: Express server with comprehensive API endpoints
- **services/**: Modular business logic (CacheManager, Scheduler, BackfillService, etc.)
- **utils/**: Shared utility functions and helpers
- **data/**: JSON cache files organized by month (YYYY-MM.json format)
- **tests/**: Jest tests and manual testing scripts

### Frontend Structure
- **public/**: All static assets served directly by Express
- **index.html**: Single-page application with calendar interface
- **styles.css**: Global styles with system fonts and responsive design
- **script.js**: Main application JavaScript with API integration
- **court-utilization-utils.js**: Court availability calculation utilities

## Service Architecture

### Core Services
- **CacheManager**: File-based JSON caching with monthly organization
- **Scheduler**: Automated daily updates via node-cron (5PM PST/PDT)
- **BackfillService**: Historical data collection and management
- **MesaApiClient**: Mesa AZ ActiveCommunities API integration
- **CSRFTokenManager**: Authentication token management

### Data Flow
1. **Scheduled Updates**: Daily at 5PM PST/PDT
2. **API Integration**: Mesa ActiveCommunities reservation system
3. **Cache Management**: Monthly JSON files with daily data organization
4. **Frontend Serving**: Real-time calendar interface with park filtering

## Coding Conventions

### JavaScript Style
- **Modern ES6+**: const/let, arrow functions, async/await, destructuring
- **Error Handling**: Comprehensive try-catch blocks for all external operations
- **Async Patterns**: Prefer async/await over promise chains
- **Descriptive Naming**: Clear variable and function names
- **Modular Design**: Single responsibility principle for services

### API Design
- **RESTful Endpoints**: Standard HTTP methods and status codes
- **Error Responses**: Consistent error format with helpful messages
- **Validation**: Input validation for dates, parameters
- **Health Checks**: Comprehensive system status monitoring

### Frontend Patterns
- **Vanilla JavaScript**: No build process or frameworks
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Mobile-First**: Responsive design with touch-friendly interface
- **System Fonts**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### File Naming
- **kebab-case**: Directories and files
- **camelCase**: JavaScript variables and functions
- **Descriptive Names**: Indicate purpose and functionality

## Development Workflow
- **Service Isolation**: Each service handles specific functionality
- **Test Coverage**: Jest tests for critical functionality
- **Clean Architecture**: Separation of concerns between layers
- **Documentation**: Comprehensive inline documentation
- **Error Recovery**: Graceful degradation and fallback mechanisms