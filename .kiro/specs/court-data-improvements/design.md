# Design Document

## Overview

This design addresses comprehensive user experience improvements for the Court Aggregator application based on customer feedback and usability testing. The focus is on creating a more intuitive, mobile-friendly interface with accurate data display and improved navigation.

The design addresses six main areas:
1. **Court Utilization Display**: Clear "X/Y courts booked" ratios for quick availability assessment
2. **User Interface Improvements**: Better click targets, mobile responsiveness, and visual clarity
3. **Navigation Enhancements**: Accurate date selection, "Today" button, and current day highlighting
4. **Data Accuracy Fixes**: Resolve weekly view inconsistencies and date navigation issues
5. **Mobile Experience**: Responsive design with mobile-optimized defaults and layouts
6. **Backend Improvements**: Cache cleanup, data validation, and performance optimization

## Architecture

### Current Data Flow
```
Mesa API → CourtDataProcessor → CacheManager → Frontend Display
```

### Enhanced Data Flow
```
Mesa API → CourtDataProcessor (with validation) → CacheManager → Enhanced Frontend
                                                                      ↓
                                                    Mobile Detection → Responsive UI
                                                                      ↓
                                                    Utilization Display + Navigation
```

### Mobile-First Responsive Architecture
```
Device Detection → View Selection (Daily/Weekly/Monthly) → Responsive Layout → Touch-Optimized UI
```

## Components and Interfaces

### 1. Court Utilization Display System

#### Court Utilization Calculator
```javascript
class CourtUtilizationCalculator {
  // Calculate court utilization for display with view-specific formatting
  calculateUtilization(parkData, timeWindow, viewType = 'weekly') {
    const totalCourts = this.getTotalCourtsForPark(parkData);
    const bookedCourts = timeWindow.courts ? timeWindow.courts.length : 0;
    
    return {
      bookedCount: bookedCourts,
      totalCount: totalCourts,
      displayText: this.formatForView(bookedCourts, totalCourts, viewType),
      utilizationPercentage: totalCourts > 0 ? Math.round((bookedCourts / totalCourts) * 100) : 0,
      isEmpty: bookedCourts === 0,
      isFull: bookedCourts === totalCourts,
      viewOptimized: true
    };
  }

  // Optimize display format based on available space
  formatForView(bookedCourts, totalCourts, viewType) {
    if (viewType === 'weekly') {
      // Ultra-compact format for ~100px width constraint
      return `${bookedCourts}/${totalCourts}`;
    } else if (viewType === 'daily') {
      // Enhanced format with more available width
      return `${bookedCourts}/${totalCourts} courts`;
    }
    return `${bookedCourts}/${totalCourts}`;
  }

  // Enhanced time window generation with utilization data
  enhanceTimeWindowsWithUtilization(parkData, viewType = 'weekly') {
    const timeWindows = parkData.timeWindows || [];
    
    return timeWindows.map(window => ({
      ...window,
      utilization: this.calculateUtilization(parkData, window, viewType),
      displayLabel: this.createDisplayLabel(window, parkData, viewType)
    }));
  }

  createDisplayLabel(timeWindow, parkData) {
    const utilization = this.calculateUtilization(parkData, timeWindow);
    const timeLabel = this.formatTimeRange(timeWindow.startTime, timeWindow.endTime);
    
    return {
      parkName: this.getShortParkName(parkData.name),
      timeRange: timeLabel,
      utilization: utilization.displayText,
      fullText: `${utilization.displayText} courts booked`
    };
  }
}
```

### 2. Enhanced User Interface Components

#### Improved Filter Button Interface
```javascript
class FilterButtonManager {
  createFilterButton(filterOption) {
    const button = document.createElement('button');
    button.className = 'filter-button';
    button.setAttribute('role', 'checkbox');
    button.setAttribute('aria-checked', filterOption.checked);
    
    // Make entire button clickable, not just checkbox
    button.innerHTML = `
      <span class="filter-checkbox" aria-hidden="true">
        <span class="checkmark ${filterOption.checked ? 'checked' : ''}"></span>
      </span>
      <span class="filter-label">${filterOption.label}</span>
    `;
    
    // Enhanced click handling for entire button surface
    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleFilter(filterOption.id);
      this.updateButtonState(button, !filterOption.checked);
    });
    
    // Keyboard accessibility
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });
    
    return button;
  }
  
  updateButtonState(button, checked) {
    button.setAttribute('aria-checked', checked);
    const checkmark = button.querySelector('.checkmark');
    checkmark.classList.toggle('checked', checked);
  }
}
```

#### Enhanced Navigation System
```javascript
class NavigationManager {
  constructor() {
    this.currentDate = new Date();
    this.currentView = this.detectDefaultView();
  }
  
  // Detect device type and set appropriate default view
  detectDefaultView() {
    const isMobile = window.innerWidth <= 768 || 
                    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile ? 'daily' : 'weekly';
  }
  
  // Create "Today" button for quick navigation
  createTodayButton() {
    const todayButton = document.createElement('button');
    todayButton.className = 'today-button';
    todayButton.textContent = 'Today';
    todayButton.setAttribute('aria-label', 'Go to today\'s date');
    
    todayButton.addEventListener('click', () => {
      this.navigateToToday();
    });
    
    return todayButton;
  }
  
  navigateToToday() {
    const today = new Date();
    this.currentDate = today;
    this.updateCalendarView(today);
    this.highlightCurrentDay();
  }
  
  // Fix month view date selection (off by one day issue)
  handleMonthViewClick(clickedDate) {
    // Ensure we're using the correct date without timezone offset issues
    const correctedDate = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), clickedDate.getDate());
    this.navigateToDate(correctedDate);
  }
  
  // Highlight current day in weekly view
  highlightCurrentDay() {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // Remove existing highlights
    document.querySelectorAll('.current-day').forEach(el => {
      el.classList.remove('current-day');
    });
    
    // Add highlight to current day
    const todayElement = document.querySelector(`[data-date="${todayString}"]`);
    if (todayElement) {
      todayElement.classList.add('current-day');
    }
  }
}
```

#### Mobile-Responsive CSS Framework
```css
/* Enhanced filter button styling */
.filter-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--background-color);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px; /* Touch-friendly minimum */
  
  /* Ensure entire button is clickable */
  width: 100%;
  text-align: left;
}

.filter-button:hover {
  background: var(--hover-background);
  border-color: var(--primary-color);
  /* Enhanced visual feedback with emojis instead of accessibility hints */
}

.filter-button:hover .filter-label::after {
  content: ' 🎯';
  opacity: 0.7;
}

/* Remove conflicting accessibility hints that overlap with tooltips */
.filter-button[aria-describedby] {
  /* Override any accessibility hint positioning that causes overlap */
}

.filter-button:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

.filter-checkbox {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkmark.checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkmark.checked::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}

/* Current day highlighting */
.current-day {
  background: var(--current-day-background) !important;
  border: 2px solid var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

.current-day .day-header {
  font-weight: bold;
  color: var(--primary-color);
}

/* Today button styling */
.today-button {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  min-height: 44px;
}

.today-button:hover {
  background: var(--primary-color-dark);
}

.today-button:focus {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}

/* View-specific optimizations for space constraints */
.weekly-view .court-utilization {
  /* Ultra-compact format for ~100px width constraint */
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 2px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
  min-width: 28px;
  text-align: center;
  display: inline-block;
}

.daily-view .court-utilization {
  /* Enhanced format with more available width */
  font-size: 13px;
  font-weight: 500;
  padding: 4px 8px;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
  margin: 2px 0;
  display: inline-block;
}

.daily-view .court-utilization::after {
  content: ' courts';
  font-size: 11px;
  opacity: 0.9;
}

/* Optimize weekly booking blocks for readability */
.weekly-booking-block {
  position: relative;
  min-height: 28px;
  padding: 2px 4px;
  font-size: 10px;
  line-height: 1.3;
  overflow: hidden;
}

.weekly-booking-block .court-utilization {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 2;
}

/* Daily view has more space for enhanced presentation */
.daily-booking-block {
  min-height: 40px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.4;
}

.daily-booking-block .court-utilization {
  float: right;
  margin-left: 8px;
}

/* Mobile-responsive layout */
@media (max-width: 768px) {
  .calendar-container {
    padding: 8px;
  }
  
  .filter-buttons {
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-button {
    width: 100%;
    justify-content: flex-start;
  }
  
  .navigation-controls {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .today-button {
    width: 100%;
    margin-bottom: 12px;
  }
  
  /* Enhanced booking blocks for mobile */
  .weekly-booking-block {
    min-height: 32px;
    padding: 4px 6px;
    font-size: 12px;
  }
  
  .court-utilization {
    font-size: 10px;
    font-weight: bold;
    background: rgba(0, 0, 0, 0.3);
    padding: 1px 4px;
    border-radius: 3px;
  }
}

/* Tablet adjustments */
@media (min-width: 769px) and (max-width: 1024px) {
  .filter-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}
```

### 3. Data Accuracy and Validation System

#### Weekly View Data Consistency Validator
```javascript
class WeeklyViewValidator {
  validateWeeklyData(weeklyData, sourceData) {
    const validationResults = {
      isConsistent: true,
      discrepancies: [],
      warnings: []
    };
    
    // Compare weekly view data against source data
    for (const [date, dayData] of Object.entries(weeklyData)) {
      const sourceDay = sourceData[date];
      
      if (!sourceDay) {
        validationResults.warnings.push(`Missing source data for ${date}`);
        continue;
      }
      
      // Validate Christopher J. Brady data specifically
      const bradyWeekly = dayData.parks?.find(p => p.name.includes('Brady'));
      const bradySource = sourceDay.parks?.find(p => p.name.includes('Brady'));
      
      if (bradyWeekly && bradySource) {
        const discrepancy = this.compareBradyData(bradyWeekly, bradySource, date);
        if (discrepancy) {
          validationResults.discrepancies.push(discrepancy);
          validationResults.isConsistent = false;
        }
      }
    }
    
    return validationResults;
  }
  
  compareBradyData(weeklyData, sourceData, date) {
    // Compare time windows and court counts
    const weeklyWindows = weeklyData.timeWindows || [];
    const sourceWindows = sourceData.timeWindows || [];
    
    if (weeklyWindows.length !== sourceWindows.length) {
      return {
        type: 'time_window_count_mismatch',
        date,
        weeklyCount: weeklyWindows.length,
        sourceCount: sourceWindows.length,
        message: `Brady data: Weekly view shows ${weeklyWindows.length} time windows, source has ${sourceWindows.length}`
      };
    }
    
    // Check for booking overlaps or inconsistencies
    for (let i = 0; i < weeklyWindows.length; i++) {
      const weeklyWindow = weeklyWindows[i];
      const sourceWindow = sourceWindows[i];
      
      if (weeklyWindow.courts?.length !== sourceWindow.courts?.length) {
        return {
          type: 'court_count_mismatch',
          date,
          timeWindow: weeklyWindow.timeLabel,
          weeklyCount: weeklyWindow.courts?.length || 0,
          sourceCount: sourceWindow.courts?.length || 0,
          message: `Brady data mismatch at ${weeklyWindow.timeLabel}: Weekly shows ${weeklyWindow.courts?.length || 0} courts, source shows ${sourceWindow.courts?.length || 0}`
        };
      }
    }
    
    return null; // No discrepancy found
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