# Design Document

## Overview

Based on the investigation of Christopher J. Brady court data for 2025-08-09, the current system appears to be processing data correctly. The user's concern about overlapping bookings (9:00-1:30 PM and 9:30-10:00) may have been from a different date or a temporary API inconsistency. However, there are legitimate improvements needed for court utilization display and time window overflow handling.

The design addresses six main areas:
1. **Enhanced Court Utilization Display**: Show "X/Y courts booked" ratios in weekly and daily views
2. **Time Window Parsing Corrections**: Fix issues with time window display and parsing in the frontend
3. **Data Validation Improvements**: Add better validation and logging for booking period inconsistencies
4. **Cache Management Cleanup**: Implement proper cleanup of outdated cache files
5. **API Edge Case Detection**: Detect and handle the midnight API refresh issue
6. **Daily Granular Cache System**: Refactor from monthly to daily cache files with optimized scheduling

## Architecture

### Current Data Flow
```
Mesa API → CourtDataProcessor → CacheManager → Frontend Display
```

### Enhanced Data Flow
```
Mesa API → CourtDataProcessor (with validation) → CacheManager → Frontend (with utilization display)
```

## Components and Interfaces

### 1. Enhanced Court Data Processing

#### CourtDataProcessor Enhancements
```javascript
class CourtDataProcessor {
  // New method to calculate court utilization for time windows
  calculateCourtUtilization(parkData, timeWindow) {
    const totalCourts = parkData.totalCourts;
    const bookedCourts = timeWindow.courts.length;
    return {
      bookedCount: bookedCourts,
      totalCount: totalCourts,
      utilizationRatio: `${bookedCourts}/${totalCourts}`,
      utilizationPercentage: Math.round((bookedCourts / totalCourts) * 100)
    };
  }

  // Enhanced time window generation with utilization data
  generateTimeWindows(parkData) {
    const timeWindows = this.generateTimeWindowsBase(parkData);
    
    return timeWindows.map(window => ({
      ...window,
      utilization: this.calculateCourtUtilization(parkData, window),
      isExtendedHours: this.isExtendedHours(window.startTime, window.endTime)
    }));
  }

  // Validate booking periods for overlaps and inconsistencies
  validateBookingPeriods(court) {
    const periods = court.bookingPeriods;
    const warnings = [];
    
    for (let i = 0; i < periods.length - 1; i++) {
      const current = periods[i];
      const next = periods[i + 1];
      
      if (this.parseTimeToMinutes(current.endTime) > this.parseTimeToMinutes(next.startTime)) {
        warnings.push(`Overlapping booking periods: ${current.startTime}-${current.endTime} and ${next.startTime}-${next.endTime}`);
      }
    }
    
    return warnings;
  }
}
```

### 2. Frontend Display Enhancements

#### Weekly View Court Utilization
```javascript
createWeeklyBookingBlock(park, timeBlock, parkIndex, totalParks) {
  const block = document.createElement('div');
  block.className = 'weekly-booking-block';
  
  // Enhanced content with court utilization
  const parkShortName = this.getShortParkName(park.name);
  const utilizationText = timeBlock.utilization ? 
    `${timeBlock.utilization.utilizationRatio}` : '';
  
  block.innerHTML = `
    <div class="park-name">${parkShortName}</div>
    <div class="court-utilization">${utilizationText}</div>
    <div class="time-label">${this.getShortTimeLabel(timeBlock.timeLabel)}</div>
  `;
  
  // ... rest of positioning logic
}
```

#### Responsive Layout Improvements
```javascript
// Enhanced booking block creation with flexible layout
createWeeklyBookingBlock(park, timeBlock, parkIndex, totalParks) {
  const block = document.createElement('div');
  block.className = 'weekly-booking-block';
  block.style.backgroundColor = this.getAccessibleParkColor(park.name);

  // Create flexible content structure
  const contentContainer = document.createElement('div');
  contentContainer.className = 'booking-content';
  
  const parkNameDiv = document.createElement('div');
  parkNameDiv.className = 'park-name';
  parkNameDiv.textContent = this.getShortParkName(park.name);
  
  const utilizationDiv = document.createElement('div');
  utilizationDiv.className = 'court-utilization';
  utilizationDiv.textContent = timeBlock.utilization ? 
    timeBlock.utilization.utilizationRatio : '';
  
  const timeDiv = document.createElement('div');
  timeDiv.className = 'time-range';
  timeDiv.textContent = this.formatTimeForDisplay(timeBlock.timeLabel);
  
  contentContainer.appendChild(parkNameDiv);
  if (utilizationDiv.textContent) {
    contentContainer.appendChild(utilizationDiv);
  }
  contentContainer.appendChild(timeDiv);
  
  block.appendChild(contentContainer);
  
  // Enhanced positioning with flexible layout
  this.positionBookingBlock(block, parkIndex, totalParks, timeBlock);
  
  return block;
}

// Improved time formatting to prevent truncation
formatTimeForDisplay(timeLabel) {
  // Convert long time ranges to more compact but readable format
  if (timeLabel.includes('-')) {
    const [start, end] = timeLabel.split('-');
    const shortStart = this.formatTimeShort(start.trim());
    const shortEnd = this.formatTimeShort(end.trim());
    return `${shortStart}-${shortEnd}`;
  }
  return timeLabel;
}

formatTimeShort(time) {
  // Convert "9:00 AM" to "9a", "1:30 PM" to "1:30p"
  return time.replace(':00 ', '').replace(' AM', 'a').replace(' PM', 'p');
}
```

#### CSS Layout Improvements
```css
/* Enhanced booking block layout */
.weekly-booking-block {
  position: absolute;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-on-primary);
  cursor: pointer;
  transition: opacity 0.2s ease;
  box-shadow: var(--shadow-light);
  z-index: 1;
  
  /* Use flexbox instead of fixed positioning */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  /* Remove text truncation */
  overflow: visible;
  white-space: normal;
  word-wrap: break-word;
  hyphens: auto;
  line-height: 1.1;
}

.booking-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 1px;
}

.weekly-booking-block .park-name {
  font-weight: 600;
  font-size: 9px;
  line-height: 1;
  color: var(--text-on-primary);
  text-align: center;
}

.weekly-booking-block .court-utilization {
  font-size: 8px;
  font-weight: 700;
  color: var(--text-on-primary);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  padding: 0 2px;
  line-height: 1;
}

.weekly-booking-block .time-range {
  font-size: 8px;
  line-height: 1;
  color: var(--text-on-primary);
  text-align: center;
  opacity: 0.9;
}

/* Responsive adjustments for smaller blocks */
.weekly-booking-block.compact {
  padding: 1px 2px;
}

.weekly-booking-block.compact .park-name {
  font-size: 8px;
}

.weekly-booking-block.compact .court-utilization {
  font-size: 7px;
}

.weekly-booking-block.compact .time-range {
  font-size: 7px;
}
```

### 3. Cache Management and Cleanup

#### BackfillService Cache Cleanup
```javascript
class BackfillService {
  async cleanupOutdatedCacheFiles() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const dataDir = 'data';
      const files = await fs.readdir(dataDir);
      const cacheFiles = files.filter(file => file.endsWith('.json') && file !== '.gitkeep');
      
      const filesToRemove = [];
      
      for (const file of cacheFiles) {
        const filePath = path.join(dataDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = Date.now() - stats.mtime.getTime();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        // Remove files that are too old or known to be problematic
        if (fileAge > maxAge || this.isProblematicFile(file)) {
          filesToRemove.push(file);
        }
      }
      
      // Create backup before removal
      if (filesToRemove.length > 0) {
        await this.createCacheBackup(filesToRemove);
      }
      
      // Remove outdated files
      for (const file of filesToRemove) {
        const filePath = path.join(dataDir, file);
        await fs.unlink(filePath);
        this.log('INFO', `Removed outdated cache file: ${file}`);
      }
      
      return {
        success: true,
        removedFiles: filesToRemove,
        message: `Cleaned up ${filesToRemove.length} cache files`
      };
      
    } catch (error) {
      this.log('ERROR', 'Cache cleanup failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  isProblematicFile(filename) {
    // List of known problematic files
    const problematicFiles = ['2025-08.json'];
    return problematicFiles.includes(filename);
  }
}
```

### 4. API Edge Case Detection System

#### Edge Case Detection Logic
```javascript
class ApiEdgeCaseDetector {
  detectMidnightEdgeCase(processedData) {
    const parks = Object.values(processedData.parks);
    
    if (parks.length === 0) {
      return { detected: false, reason: 'no_data' };
    }
    
    const totalCourts = parks.reduce((sum, park) => sum + park.totalCourts, 0);
    const fullyBookedCourts = parks.reduce((sum, park) => sum + park.bookedCourts, 0);
    
    // Edge case: All courts are fully booked (suspicious pattern)
    if (totalCourts > 0 && fullyBookedCourts === totalCourts) {
      // Additional validation: Check if all courts have identical booking patterns
      const suspiciousPatterns = this.checkSuspiciousPatterns(parks);
      
      if (suspiciousPatterns.score > 0.8) {
        return {
          detected: true,
          reason: 'all_courts_fully_booked',
          totalCourts,
          fullyBookedCourts,
          confidence: suspiciousPatterns.score,
          details: suspiciousPatterns.details
        };
      }
    }
    
    return { detected: false, reason: 'normal_pattern' };
  }
  
  checkSuspiciousPatterns(parks) {
    let suspiciousScore = 0;
    const details = [];
    
    // Check if all parks have identical booking patterns
    const bookingPatterns = parks.map(park => 
      park.courts.map(court => court.bookingPeriods.length).join(',')
    );
    
    const uniquePatterns = new Set(bookingPatterns);
    if (uniquePatterns.size === 1 && parks.length > 1) {
      suspiciousScore += 0.4;
      details.push('identical_booking_patterns_across_parks');
    }
    
    // Check if all courts are booked for the entire day
    const allDayBookings = parks.every(park =>
      park.courts.every(court =>
        court.bookingPeriods.some(period =>
          period.startTime === '09:00:00' && period.endTime >= '21:00:00'
        )
      )
    );
    
    if (allDayBookings) {
      suspiciousScore += 0.5;
      details.push('all_courts_booked_entire_day');
    }
    
    return { score: suspiciousScore, details };
  }
}
```

#### Fallback Data Management
```javascript
class FallbackDataManager {
  async getFallbackData(date) {
    // Try to get data from previous successful fetch
    const previousDay = this.getPreviousDay(date);
    const fallbackPath = this.getDailyCachePath(previousDay);
    
    try {
      const fallbackData = await this.readDailyCache(fallbackPath);
      if (fallbackData && !fallbackData.edgeCaseDetected) {
        return {
          success: true,
          data: this.adaptFallbackData(fallbackData, date),
          source: 'fallback',
          originalDate: previousDay
        };
      }
    } catch (error) {
      console.warn('Could not load fallback data:', error.message);
    }
    
    return { success: false, reason: 'no_fallback_available' };
  }
}
```

### 5. Daily Granular Cache System

#### New Cache Directory Structure
```
cache/
├── 2025/
│   ├── 08/
│   │   ├── 08.json
│   │   ├── 09.json
│   │   └── 10.json
│   └── 09/
│       ├── 01.json
│       └── 02.json
└── backups/
    └── monthly/
        └── 2025-08.json.backup
```

#### Daily Cache Manager
```javascript
class DailyCacheManager {
  constructor() {
    this.cacheBaseDir = 'cache';
    this.backupDir = 'cache/backups';
  }
  
  getDailyCachePath(date) {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${this.cacheBaseDir}/${year}/${month}/${day}.json`;
  }
  
  async writeDailyCache(date, data) {
    const cachePath = this.getDailyCachePath(date);
    const cacheDir = path.dirname(cachePath);
    
    // Ensure directory exists
    await fs.mkdir(cacheDir, { recursive: true });
    
    // Add metadata
    const cacheData = {
      date,
      fetchedAt: new Date().toISOString(),
      fetchedFor: this.getFetchContext(date),
      isValid: !data.edgeCaseDetected,
      edgeCaseDetected: data.edgeCaseDetected || false,
      ...data
    };
    
    await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2));
    console.log(`Daily cache written: ${cachePath}`);
  }
  
  async readDailyCache(date) {
    const cachePath = this.getDailyCachePath(date);
    
    try {
      const data = await fs.readFile(cachePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }
  
  async cleanupOldDailyCache(maxAgeDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgedays);
    
    // Implementation to recursively clean old cache files
    // ... cleanup logic
  }
}
```

### 6. Optimized Scheduling System

#### Next-Day Data Collection
```javascript
class OptimizedScheduler {
  constructor() {
    this.dailyCacheManager = new DailyCacheManager();
    this.edgeCaseDetector = new ApiEdgeCaseDetector();
    this.fallbackManager = new FallbackDataManager();
  }
  
  setupNextDayCollection() {
    // Schedule data collection at 11:00 PM for next day
    const cronExpression = '0 23 * * *'; // 11:00 PM daily
    
    cron.schedule(cronExpression, async () => {
      const tomorrow = this.getTomorrowDate();
      await this.collectDataForDate(tomorrow);
    });
  }
  
  async collectDataForDate(date) {
    console.log(`Collecting data for ${date} (next day collection)`);
    
    try {
      // Fetch data using existing backfill service
      const result = await this.backfillService.fetchFreshDataForDate(date);
      
      if (result.success) {
        // Check for edge cases
        const edgeCase = this.edgeCaseDetector.detectMidnightEdgeCase(result.processedData);
        
        if (edgeCase.detected) {
          console.warn(`Edge case detected for ${date}:`, edgeCase);
          
          // Try to use fallback data
          const fallback = await this.fallbackManager.getFallbackData(date);
          if (fallback.success) {
            result.processedData = fallback.data;
            result.processedData.edgeCaseDetected = true;
            result.processedData.fallbackUsed = true;
          }
        }
        
        // Store in daily cache
        await this.dailyCacheManager.writeDailyCache(date, result.processedData);
        
      } else {
        console.error(`Failed to collect data for ${date}:`, result.error);
      }
      
    } catch (error) {
      console.error(`Error collecting data for ${date}:`, error);
    }
  }
}
```

### 7. Data Validation and Logging

#### Enhanced Validation System
```javascript
class DataValidator {
  validateCourtData(courtData) {
    const validationResults = {
      isValid: true,
      warnings: [],
      errors: []
    };
    
    // Check for overlapping booking periods
    const overlapWarnings = this.checkBookingOverlaps(courtData.bookingPeriods);
    validationResults.warnings.push(...overlapWarnings);
    
    // Check for impossible time ranges
    const timeRangeErrors = this.validateTimeRanges(courtData.bookingPeriods);
    validationResults.errors.push(...timeRangeErrors);
    
    // Check for data consistency
    const consistencyWarnings = this.checkDataConsistency(courtData);
    validationResults.warnings.push(...consistencyWarnings);
    
    validationResults.isValid = validationResults.errors.length === 0;
    
    return validationResults;
  }
  
  checkBookingOverlaps(periods) {
    const warnings = [];
    
    for (let i = 0; i < periods.length - 1; i++) {
      const current = periods[i];
      const next = periods[i + 1];
      
      if (this.timeOverlaps(current, next)) {
        warnings.push({
          type: 'overlap',
          message: `Booking periods overlap: ${current.startTime}-${current.endTime} and ${next.startTime}-${next.endTime}`,
          periods: [current, next]
        });
      }
    }
    
    return warnings;
  }
}
```

## Data Models

### Enhanced Time Window Model
```javascript
{
  startTime: "09:00:00",
  endTime: "14:00:00",
  courts: ["Court 01", "Court 02"],
  displayTime: "9:00 AM-2:00 PM",
  utilization: {
    bookedCount: 2,
    totalCount: 4,
    utilizationRatio: "2/4",
    utilizationPercentage: 50
  },
  isExtendedHours: false
}
```

### Court Utilization Display Model
```javascript
{
  parkName: "Kleinman Park",
  timeWindow: "9:00 AM-1:30 PM",
  utilization: {
    bookedCount: 3,
    totalCount: 4,
    displayText: "3/4",
    percentage: 75
  }
}
```

### Cache Management Model
```javascript
{
  action: "cleanup",
  removedFiles: ["2025-08.json"],
  reason: "outdated_data",
  timestamp: "2025-08-08T20:15:00.000Z",
  backupCreated: true
}
```

### Daily Cache Structure Model
```javascript
// File: cache/2025/08/09.json
{
  date: "2025-08-09",
  fetchedAt: "2025-08-08T23:00:00.000Z",
  fetchedFor: "next_day",
  isValid: true,
  edgeCaseDetected: false,
  parks: {
    // park data structure
  }
}
```

### API Edge Case Detection Model
```javascript
{
  date: "2025-08-09",
  edgeCaseDetected: true,
  reason: "all_courts_fully_booked",
  totalCourts: 16,
  fullyBookedCourts: 16,
  confidence: 0.95,
  fallbackDataUsed: true,
  warningMessage: "Data may be affected by API refresh cycle"
}
```

## Error Handling

### Data Validation Errors
1. **Overlapping Periods**: Log warnings but continue processing
2. **Invalid Time Formats**: Log errors and skip invalid periods
3. **Missing Data**: Use fallback values and log warnings
4. **API Inconsistencies**: Log detailed information for debugging

### Display Error Handling
1. **Missing Utilization Data**: Show "N/A" instead of ratios
2. **Extended Hours Overflow**: Move to dedicated section
3. **Rendering Failures**: Show error placeholders with retry options

## Testing Strategy

### Data Validation Tests
- Test overlapping booking period detection
- Test invalid time format handling
- Test data consistency validation
- Test edge cases (midnight crossover, etc.)

### Display Tests
- Test court utilization display in weekly view
- Test court utilization display in daily view
- Test extended hours section rendering
- Test responsive behavior with different screen sizes

### Integration Tests
- Test complete data flow from API to display
- Test error handling scenarios
- Test performance with large datasets
- Test real-world data scenarios

## Performance Considerations

### Utilization Calculation Optimization
- Cache utilization calculations for repeated time windows
- Use efficient data structures for court counting
- Minimize DOM manipulations during rendering

### Extended Hours Detection
- Pre-calculate extended hours during data processing
- Cache results to avoid repeated calculations
- Use efficient filtering for overflow detection

## Implementation Notes

### Backward Compatibility
- Maintain existing API contracts
- Ensure existing displays continue to work
- Add new features as enhancements, not replacements

### Configuration Options
- Allow customization of extended hours threshold (default: 10:00 PM)
- Enable/disable court utilization display
- Configure utilization display format preferences

### Monitoring and Debugging
- Add detailed logging for data validation issues
- Include performance metrics for utilization calculations
- Provide debug mode for troubleshooting display issues