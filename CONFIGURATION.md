# Mesa Court Aggregator Configuration Guide

This document provides detailed configuration information for the Mesa Court Aggregator application.

## Table of Contents

1. [API Endpoints Configuration](#api-endpoints-configuration)
2. [Park Name Mappings](#park-name-mappings)
3. [Facility Group Configuration](#facility-group-configuration)
4. [Scheduling Configuration](#scheduling-configuration)
5. [Cache Configuration](#cache-configuration)
6. [Frontend Configuration](#frontend-configuration)

## API Endpoints Configuration

### Mesa ActiveCommunities API

The application integrates with the Mesa, Arizona ActiveCommunities reservation system.

**Base URL**: `https://anc.apm.activecommunities.com/mesaaz`

**Key Endpoints**:

1. **Reservation Page** (for CSRF token):
   ```
   GET /reservation/landing/quick?locale=en-US&groupId=5
   ```

2. **Availability API**:
   ```
   POST /rest/reservation/quickreservation/availability?locale=en-US
   ```

**Request Headers**:
```javascript
{
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Content-Type': 'application/json;charset=utf-8',
  'DNT': '1',
  'Origin': 'https://anc.apm.activecommunities.com',
  'Referer': 'https://anc.apm.activecommunities.com/mesaaz/reservation/landing/quick?locale=en-US&groupId=5',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
  'X-CSRF-Token': '<dynamic-token>',
  'Cookie': '<session-cookies>'
}
```

**Request Payload**:
```javascript
{
  "facility_group_id": 29,  // Park-specific ID
  "customer_id": 0,
  "company_id": 0,
  "reserve_date": "2025-01-08",  // YYYY-MM-DD format
  "reload": false,
  "resident": true,
  "start_time": "09:00:00",
  "end_time": "22:00:00"
}
```

## Park Name Mappings

The application uses hard-coded mappings to convert court resource names from the API to user-friendly park names.

### Kleinman Park (Facility Group ID: 29)

**API Resource Names → Park Name**:
```javascript
'MPTC Court 01' → 'Kleinman Park'
'MPTC Court 01A' → 'Kleinman Park'
'MPTC Court 01B' → 'Kleinman Park'
'MPTC Court 09A' → 'Kleinman Park'
'MPTC Court 09B' → 'Kleinman Park'
'MPTC Court 13A' → 'Kleinman Park'
'MPTC Court 13B' → 'Kleinman Park'
```

### Gene Autry Park (Facility Group ID: 33)

**API Resource Names → Park Name**:
```javascript
'Gene Autry Court 1' → 'Gene Autry Park'
'Gene Autry Court 2' → 'Gene Autry Park'
'Gene Autry Court 3' → 'Gene Autry Park'
'Gene Autry Court 4' → 'Gene Autry Park'
'Gene Autry Court 5' → 'Gene Autry Park'
'Gene Autry Court 6' → 'Gene Autry Park'
'Gene Autry Court 7' → 'Gene Autry Park'
'Gene Autry Court 8' → 'Gene Autry Park'
```

### Monterey Park (Facility Group ID: 35)

**API Resource Names → Park Name**:
```javascript
'Christopher J Brady Court 1' → 'Monterey Park'
'Christopher J Brady Court 2' → 'Monterey Park'
'Christopher J Brady Court 3' → 'Monterey Park'
'Christopher J Brady Court 4' → 'Monterey Park'
```

**Note**: Monterey Park is also known as "Christopher J Brady Park" in some contexts.

## Facility Group Configuration

### Configuration Location
File: `services/backfill-service.js`

### Current Configuration
```javascript
this.facilityGroups = [
  {
    id: 29,
    name: 'Kleinman Park',
    startTime: '09:00:00',
    endTime: '22:00:00',
    pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf'
  },
  {
    id: 33,
    name: 'Gene Autry Park',
    startTime: '09:00:00',
    endTime: '22:00:00',
    pdfLink: null
  },
  {
    id: 35,
    name: 'Monterey Park',
    startTime: '09:00:00',
    endTime: '22:00:00',
    pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/244/activities-culture/prcf/facilities/pickleball-public-court-calendars/brady-pickleball-court.pdf'
  }
];
```

### Adding New Facility Groups

To add a new park:

1. **Determine Facility Group ID**: Inspect the Mesa reservation system to find the facility group ID
2. **Update Configuration**: Add new entry to `facilityGroups` array
3. **Add Court Mappings**: Update `COURT_MAPPINGS` in `court-data-processor.js`
4. **Add Frontend Colors**: Update color mappings in `script.js`

## Scheduling Configuration

### Configuration Location
File: `services/scheduler.js`

### Default Schedule
- **Daily Updates**: 5:00 PM PST/PDT
- **Cron Expression**: `0 17 * * *`
- **Timezone**: America/Phoenix (Arizona - no DST)

### Backfill Configuration
- **Startup Backfill**: Today + 2 weeks ahead
- **Skip Existing**: Only fetches data if cache is stale (>24 hours)
- **Delay Between Requests**: 500ms
- **Delay Between Dates**: 1000ms

### Customizing Schedule

```javascript
// In scheduler.js constructor
this.cronExpression = '0 17 * * *';  // 5 PM daily
this.timezone = 'America/Phoenix';   // Arizona timezone

// For testing, use shorter intervals
this.startTestSchedule('*/5 * * * *');  // Every 5 minutes
```

## Cache Configuration

### Cache Structure
```javascript
{
  "month": "2025-01",
  "lastUpdated": "2025-01-08T18:22:36.797Z",
  "parkList": [
    {
      "name": "Kleinman Park",
      "color": "#1976d2",
      "pdfLink": "https://..."
    }
  ],
  "days": {
    "2025-01-08": {
      "parks": [
        {
          "name": "Kleinman Park",
          "status": "partially_booked",
          "timeWindows": [
            {
              "startTime": "14:30",
              "endTime": "17:00",
              "courts": ["MPTC Court 01", "MPTC Court 01A"],
              "displayTime": "2:30-5:00 PM"
            }
          ],
          "color": "#1976d2",
          "facilityGroupId": 29,
          "facilityGroupName": "Kleinman Park",
          "pdfLink": "https://..."
        }
      ]
    }
  }
}
```

### Cache Settings
- **File Location**: `data/YYYY-MM.json`
- **Freshness Threshold**: 24 hours
- **Auto-migration**: Old format automatically converted to new format

## Frontend Configuration

### Color Scheme
```javascript
// CSS Custom Properties (styles.css)
:root {
  --primary-blue: #1976d2;
  --park-1: #1976d2;  /* Kleinman Park - Blue */
  --park-2: #388e3c;  /* Gene Autry Park - Green */
  --park-3: #f57c00;  /* Red Mountain Park - Orange */
  --park-4: #8e24aa;  /* Monterey Park - Purple */
}
```

### Time Slot Configuration
```javascript
// Frontend time slots (script.js)
generateTimeSlots() {
  // Start: 9:00 AM
  // End: 10:00 PM
  // Interval: 1 hour (display)
  // Granularity: 30 minutes (internal)
}
```

### View Persistence
- **Storage**: localStorage
- **Key**: 'court-aggregator-view'
- **Values**: 'monthly', 'weekly', 'daily'

## Error Handling Configuration

### API Timeouts
```javascript
// Mesa API Client
timeout: 15000,  // 15 seconds

// CSRF Token Manager
timeout: 10000,  // 10 seconds
```

### Retry Configuration
```javascript
// Currently no automatic retries implemented
// Failed requests are logged and skipped
```

### Fallback Behavior
1. **API Failure**: Use cached data if available
2. **Cache Miss**: Return empty state with error message
3. **Partial Failure**: Show available data with warnings

## Security Configuration

### CSRF Protection
- **Token Source**: Scraped from reservation page HTML
- **Token Lifetime**: Session-based (refreshed as needed)
- **Fallback**: Alternative endpoint if primary fails

### Request Headers
- **User-Agent**: Mimics Chrome browser
- **Referer**: Set to Mesa reservation page
- **Origin**: Set to Mesa domain

### Container Security
- **User**: Non-root (UID 1001)
- **Base Image**: Alpine Linux (minimal)
- **Exposed Ports**: 3000 only

## Performance Configuration

### Resource Limits (Docker)
```yaml
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

### Caching Strategy
- **Cache Duration**: 24 hours
- **Cache Granularity**: Monthly files
- **Memory Usage**: Minimal (files read on-demand)

### Request Optimization
- **Concurrent Requests**: Limited to prevent API overload
- **Request Delays**: 500ms between facility groups
- **Date Delays**: 1000ms between dates

## Monitoring Configuration

### Health Check
```javascript
// Endpoint: GET /health
{
  "status": "ok",
  "timestamp": "2025-01-08T18:22:36.797Z"
}
```

### Logging Levels
- **INFO**: Normal operations
- **WARN**: Non-critical issues
- **ERROR**: Critical failures

### Log Rotation (Docker)
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Troubleshooting Configuration Issues

### Common Configuration Problems

1. **Wrong Facility Group ID**:
   - Symptom: No data for a park
   - Solution: Verify ID in Mesa reservation system

2. **Incorrect Court Mappings**:
   - Symptom: Courts not appearing under correct park
   - Solution: Check API response for actual resource names

3. **Timezone Issues**:
   - Symptom: Updates happening at wrong time
   - Solution: Verify timezone setting matches local time

4. **PDF Link Errors**:
   - Symptom: 404 errors on PDF links
   - Solution: Verify PDF URLs are current and accessible

### Configuration Validation

```bash
# Test API connectivity
curl -I https://anc.apm.activecommunities.com

# Verify facility group IDs
# (Manual inspection of Mesa reservation system required)

# Test PDF links
curl -I "https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf"
```