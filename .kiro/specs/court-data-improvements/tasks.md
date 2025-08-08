# Implementation Plan

- [ ] 1. Implement cache cleanup functionality in BackfillService
  - Add cleanupOutdatedCacheFiles() method to BackfillService class
  - Implement logic to identify and remove problematic cache files like 2025-08.json
  - Add backup creation before file removal for safety
  - Include proper logging for cache cleanup operations
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 2. Enhance court utilization display in frontend
  - [ ] 2.1 Add court utilization calculation to time window processing
    - Modify parseBookingDetails() to include utilization data
    - Calculate booked/total court ratios for each time window
    - Add utilization formatting methods (e.g., "3/4" display)
    - _Requirements: 2.1, 2.2, 4.1_

  - [ ] 2.2 Update weekly view to show court utilization
    - Modify createWeeklyBookingBlock() to display court ratios
    - Add utilization display elements to booking blocks
    - Ensure text remains readable within block constraints
    - _Requirements: 2.1, 4.2_

  - [ ] 2.3 Update daily view to show court utilization
    - Modify createDailyBookingBlock() to display court ratios
    - Add utilization display elements to daily booking blocks
    - Maintain consistent formatting with weekly view
    - _Requirements: 2.2, 4.4_

- [ ] 3. Fix text truncation and layout issues in booking blocks
  - [ ] 3.1 Update CSS to prevent text truncation
    - Remove `text-overflow: ellipsis` and `white-space: nowrap` from time labels
    - Replace fixed positioning with flexible layout using flexbox
    - Update `.weekly-booking-block` and `.time-block` CSS classes
    - _Requirements: 3.1, 3.2_

  - [ ] 3.2 Implement responsive booking block layout
    - Create flexible content structure with `.booking-content` container
    - Add responsive font sizing for different block sizes
    - Implement compact mode for smaller booking blocks
    - _Requirements: 3.3, 3.4_

  - [ ] 3.3 Enhance time formatting for better readability
    - Add formatTimeForDisplay() method to create compact time formats
    - Convert "9:00 AM" to "9a" and "1:30 PM" to "1:30p" for space efficiency
    - Ensure full time ranges are visible without truncation
    - _Requirements: 3.1, 3.4_

- [ ] 4. Enhance data validation and error handling
  - [ ] 4.1 Add booking period validation to CourtDataProcessor
    - Implement validateBookingPeriods() method
    - Add overlap detection for booking periods
    - Include validation warnings in processed data
    - _Requirements: 1.1, 1.2_

  - [ ] 4.2 Improve API data consistency checking
    - Add data consistency validation in court data processing
    - Log warnings for suspicious booking patterns
    - Implement fallback handling for invalid data
    - _Requirements: 1.3, 1.4_

- [ ] 5. Update CourtDataProcessor with utilization calculations
  - Add calculateCourtUtilization() method to generate utilization data
  - Enhance generateTimeWindows() to include utilization information
  - Modify time window data structure to include utilization metrics
  - _Requirements: 2.3, 2.4_

- [ ] 6. Integrate cache cleanup into server startup
  - Call cache cleanup during server initialization
  - Add cache cleanup to scheduled maintenance tasks
  - Ensure cleanup runs before data backfill operations
  - _Requirements: 5.1, 5.3_

- [ ] 7. Add comprehensive logging and monitoring
  - [ ] 7.1 Implement detailed logging for data processing
    - Add logging for court utilization calculations
    - Include timing information for performance monitoring
    - Log validation warnings and errors with context
    - _Requirements: 1.2, 1.4_

  - [ ] 7.2 Add monitoring for cache management operations
    - Log cache cleanup operations with file details
    - Monitor cache file sizes and ages
    - Track backup creation and restoration operations
    - _Requirements: 5.2, 5.4_

- [ ] 8. Implement API edge case detection system
  - [ ] 8.1 Create ApiEdgeCaseDetector class
    - Implement detectMidnightEdgeCase() method to identify suspicious patterns
    - Add checkSuspiciousPatterns() to validate booking anomalies
    - Include confidence scoring for edge case detection
    - _Requirements: 6.1, 6.2_

  - [ ] 8.2 Implement fallback data management
    - Create FallbackDataManager class for handling invalid data scenarios
    - Add getFallbackData() method to retrieve previous valid data
    - Implement data adaptation for fallback scenarios
    - _Requirements: 6.3, 6.4_

- [ ] 9. Refactor to daily granular cache system
  - [ ] 9.1 Create DailyCacheManager class
    - Implement getDailyCachePath() for structured cache organization
    - Add writeDailyCache() and readDailyCache() methods
    - Create directory structure management (cache/YYYY/MM/DD.json)
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 9.2 Migrate from monthly to daily cache files
    - Update CacheManager to use daily cache structure
    - Modify API endpoints to read from daily cache files
    - Implement migration logic for existing monthly cache files
    - _Requirements: 8.1, 8.4_

- [ ] 10. Implement optimized data collection scheduling
  - [ ] 10.1 Create OptimizedScheduler class
    - Implement setupNextDayCollection() with 11:00 PM scheduling
    - Add collectDataForDate() method for next-day data collection
    - Integrate edge case detection into collection process
    - _Requirements: 7.1, 7.2_

  - [ ] 10.2 Update server startup to use optimized scheduling
    - Replace existing scheduler with OptimizedScheduler
    - Configure 11:00 PM collection time for next day's data
    - Ensure proper integration with existing backfill service
    - _Requirements: 7.3, 7.4_

- [ ] 11. Add user warnings for edge case scenarios
  - Implement frontend warning display for potentially invalid data
  - Add warning indicators when fallback data is being used
  - Create user-friendly messages explaining data limitations
  - _Requirements: 6.4_

- [ ] 12. Write comprehensive tests for new functionality
  - [ ] 12.1 Create unit tests for utilization calculations
    - Test calculateCourtUtilization() with various scenarios
    - Test utilization display formatting
    - Test edge cases with zero or full utilization
    - _Requirements: 2.1, 2.2_

  - [ ] 12.2 Create tests for cache cleanup functionality
    - Test cache file identification and removal
    - Test backup creation and restoration
    - Test error handling for file system operations
    - _Requirements: 5.1, 5.2_

  - [ ] 12.3 Create tests for time window parsing improvements
    - Test time window validation logic
    - Test parsing with invalid or malformed data
    - Test display positioning and rendering
    - _Requirements: 3.1, 3.2_

  - [ ] 12.4 Create tests for API edge case detection
    - Test edge case detection with various booking patterns
    - Test fallback data retrieval and adaptation
    - Test confidence scoring accuracy
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 12.5 Create tests for daily cache system
    - Test daily cache file creation and retrieval
    - Test directory structure management
    - Test migration from monthly to daily cache
    - _Requirements: 8.1, 8.2, 8.3_