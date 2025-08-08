---
inclusion: always
---

# Court Aggregator Product Guide

Court Aggregator is a Node.js web application that aggregates pickleball court availability from multiple reservation systems into a unified calendar interface. Designed for Raspberry Pi deployment with minimal resource usage.

## Core Functionality

### Data Aggregation
- Fetches court availability from external reservation APIs (Mesa AZ ActiveCommunities)
- Caches data in monthly JSON files (`data/YYYY-MM.json`)
- Supports multiple court resources with standardized naming (Courts 01, 01A, 01B, 09A, 09B, 13A)
- Time slots in 30-minute increments (6:00 AM - 10:00 PM)

### API Endpoints
- `GET /health` - Health check endpoint returning `{"status": "ok", "timestamp": "ISO_DATE"}`
- `GET /api/courts` - Court availability data
- Static file serving from `public/` directory

### Frontend Interface
- Single-page calendar-style interface
- Vanilla JavaScript (no frameworks)
- Mobile-responsive design
- Real-time availability updates

## Development Constraints

### Performance Requirements
- Optimize for Raspberry Pi ARM architecture
- Minimize memory usage and CPU overhead
- Use efficient caching strategies
- Limit concurrent API requests

### Data Handling
- Cache external API responses to reduce load
- Handle API rate limits gracefully
- Implement retry logic for failed requests
- Store data in simple JSON format for easy debugging

### Error Handling
- Always include try-catch blocks for external API calls
- Provide meaningful error messages for debugging
- Implement graceful degradation when external services are unavailable
- Log errors without exposing sensitive information

## Business Rules

### Court Availability
- Display only available time slots
- Handle reservation conflicts and restrictions
- Show court-specific availability (different courts may have different schedules)
- Support filtering by date range and court type

### User Experience
- Prioritize fast loading times over feature richness
- Maintain simple, intuitive navigation
- Ensure accessibility on mobile devices
- Provide clear visual indicators for availability status

## Integration Guidelines

### External APIs
- Mesa AZ ActiveCommunities platform is primary data source
- Implement robust error handling for API failures
- Cache responses to minimize API calls
- Follow rate limiting guidelines from external services

### Deployment
- Default port 3000 for local network access
- Environment variables for configuration
- Minimal dependencies to reduce attack surface
- Support for process managers like PM2