# Implementation Plan

- [x] 1. Set up project structure and basic Node.js application

  - Create package.json with required dependencies (express, axios, node-cron)
  - Set up basic Express.js server with static file serving
  - Create directory structure for data storage and frontend assets
  - _Requirements: 5.1, 5.2, 10.1_

- [x] 2. Implement Mesa court API client

  - Create API client module to fetch court data from Mesa endpoints
  - Implement POST request with proper headers and CSRF token handling
  - Add request payload structure for date-based queries
  - Add error handling for API failures and timeouts
  - Write unit tests for API client with mock responses
  - _Requirements: 8.1, 8.2, 8.3, 9.1_

- [x] 3. Create court data processing service

  - Implement hard-coded mapping from court resource names to park names
  - Create functions to analyze time slots and determine booking periods
  - Build aggregation logic to count total/booked/available courts per park
  - Generate human-readable booking details strings
  - Write unit tests for data processing with sample API responses
  - _Requirements: 1.1, 1.2, 2.2, 2.3, 7.3_

- [x] 4. Implement monthly JSON file caching system

  - Create file-based cache manager for monthly court data
  - Implement functions to read/write monthly JSON files
  - Add logic to determine cache freshness (24-hour rule)
  - Include park list with consistent color assignments in cache structure
  - Write unit tests for cache operations
  - _Requirements: 3.1, 3.2, 6.1, 6.2_

- [x] 5. Build scheduled data update system

  - Implement node-cron job for daily 5PM PST updates
  - Create update function that fetches, processes, and caches court data
  - Add proper timezone handling for PST/PDT transitions
  - Implement logging for successful updates and failures
  - Test scheduling functionality with shorter intervals
  - _Requirements: 3.3, 10.2, 10.3_

- [x] 6. Create REST API endpoints for frontend

  - Implement GET /api/calendar/:month endpoint to serve monthly data
  - Create GET /api/parks endpoint to return available parks for filtering
  - Include proper error responses and status codes
  - Write integration tests for all API endpoints
  - _Requirements: 1.1, 6.1, 9.3_
  - _Note: GET /health endpoint already implemented_

- [x] 7. Build calendar HTML structure and basic styling

  - Create responsive HTML calendar grid using CSS Grid
  - Implement month navigation (previous/next buttons)
  - Add calendar header with month/year display
  - Create CSS styling for calendar layout with Google Calendar aesthetic
  - Ensure mobile-responsive design
  - _Requirements: 4.1, 4.2_

- [x] 8. Implement park filtering sidebar

  - Create sidebar with checkbox list for each park
  - Add color indicators next to park names
  - Implement "Select All" and "Deselect All" functionality
  - Make sidebar collapsible for mobile devices
  - Style sidebar to match Google Calendar aesthetic
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Add time block visualization to calendar

  - Implement JavaScript to render booking blocks within day cells
  - Use park colors for different booking blocks
  - Add time labels to booking blocks (e.g., "2:30-5:00 PM")
  - Handle overlapping time periods and visual stacking
  - Ensure blocks are properly sized and positioned
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 10. Implement calendar view toggle system

  - Create view toggle buttons for Monthly, Weekly, and Daily views
  - Implement JavaScript logic to switch between different calendar layouts
  - Add state persistence using localStorage to remember selected view
  - Ensure smooth transitions between view types with CSS animations
  - Maintain date context and park filter selections across view changes
  - _Requirements: 5.1, 5.2, 5.4, 5.7_

- [x] 11. Build weekly calendar view

  - Create 7-day horizontal grid layout for weekly view
  - Implement detailed time slots with vertical time axis
  - Add enhanced time information display compared to monthly view
  - Create previous/next week navigation functionality
  - Ensure responsive design for mobile weekly view with horizontal scroll
  - _Requirements: 5.2, 5.5_

- [x] 12. Build daily calendar view

  - Create single-day focused layout with maximum detail
  - Implement hourly breakdown showing 6 AM - 10 PM time slots
  - Add court-by-court status display for each time period
  - Create previous/next day navigation functionality
  - Show complete booking information and availability details
  - _Requirements: 5.3, 5.6_

- [x] 13. Refactor data structure to use time windows instead of booking details strings

  - Update court data processor to generate structured time window objects instead of booking detail strings
  - Modify `generateBookingDetails()` function to `generateTimeWindows()` that creates array of time window objects
  - Update time window objects to include startTime, endTime, courts array, and displayTime
  - Ensure startTime and endTime use 24-hour format for easy sorting and comparison
  - Write unit tests for new time window generation logic
  - _Requirements: 1.2, 2.2, 8.3_

- [x] 14. Update cache manager to handle new time window data structure

  - Modify cache file format to store timeWindows array instead of bookingDetails string
  - Update cache read/write operations to handle new data structure
  - Add migration logic to convert existing cache files from old format to new format
  - Ensure backward compatibility during transition period
  - Write unit tests for cache operations with new data structure
  - _Requirements: 3.1, 3.2_

- [x] 15. Update frontend to consume time window data structure

  - Modify JavaScript calendar rendering to use timeWindows array instead of bookingDetails string
  - Update time block visualization to iterate through timeWindows for each park
  - Enhance tooltip functionality to show detailed court information from time window objects
  - Update all three calendar views (monthly, weekly, daily) to use new data structure
  - Ensure proper time formatting and display across all views
  - _Requirements: 4.2, 4.3, 8.1, 8.3_

- [x] 16. Implement backfill job for data preloading

  - Create startup backfill function to preload data from today to two weeks ahead
  - Implement separate API requests for each date and facility group (29, 33, 35)
  - Add proper error handling and logging for backfill operations
  - Ensure backfill job runs on application startup before serving requests
  - Optimize backfill performance to avoid overwhelming the API
  - _Requirements: 3.4, 3.5_

- [x] 17. Add PDF helper link functionality

  - Display helper links for parks that have associated PDF calendars
  - Implement click handlers to open PDF calendars in new tabs
  - Add visual indicators showing which parks have PDF calendars available
  - Hide helper links for parks without PDF calendars (like Gene Autry)
  - Style helper links to match the overall interface design
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 18. Implement interactive features

  - Add hover tooltips showing detailed court information
  - Create click handler for day cells to show expanded details
  - Implement real-time park filtering with smooth animations
  - Add loading states during data fetching
  - Handle error states with user-friendly messages
  - _Requirements: 8.1, 8.2, 7.2, 10.3_

- [x] 19. Add error handling and edge cases

  - Implement graceful fallback to cached data when API fails
  - Handle missing data for specific days or parks
  - Add "last updated" timestamp display
  - Show appropriate messages for empty calendar months
  - Handle network connectivity issues gracefully
  - _Requirements: 9.1, 9.2, 9.4, 10.4_

- [x] 21. Implement comprehensive testing

  - Write unit tests for all core functions and modules
  - Create integration tests for API endpoints and data flow
  - Add end-to-end tests for calendar functionality
  - Test responsive design on various screen sizes
  - Validate accessibility features and color contrast
  - _Requirements: All requirements validation_
  - _Note: Comprehensive unit tests already implemented for all services_

- [x] 20. Fix time window end time calculation bug

  - Fixed bug where booking periods weren't including their full end times
  - Updated `analyzeTimeSlots()` method to calculate correct end times for booking periods
  - For periods ending with available slots, end time is now set to the next available slot time
  - For periods extending to end of day, end time is calculated by adding 30 minutes to last booked slot
  - Added comprehensive test case to verify correct time window calculation
  - Updated existing tests to reflect correct behavior
  - _Bug: Kleinman park time window 9:30-10:00 was showing as ending at 9:30 instead of 10:00_

- [ ] 21. Implement comprehensive testing

  - Write unit tests for all core functions and modules
  - Create integration tests for API endpoints and data flow
  - Add end-to-end tests for calendar functionality
  - Test responsive design on various screen sizes
  - Validate accessibility features and color contrast
  - _Requirements: All requirements validation_
  - _Note: Comprehensive unit tests already implemented for all services_

- [x] 22. Fix time window display to start at 9:00 AM with hourly UI intervals

  - Update time slot generation to start at 9:00 AM instead of 8:30 AM
  - Modify UI to display hourly time windows (9:00 AM, 10:00 AM, etc.) while maintaining 30-minute internal granularity
  - Update weekly and daily view time slot rendering to show hourly intervals
  - Ensure booking blocks still accurately represent 30-minute booking periods
  - Update time slot calculation functions to use 9:00 AM as the starting point
  - _Requirements: 2.2, 2.3_

- [x] 23. Create deployment and documentation
  - Write installation and setup instructions for Pi
  - Create configuration documentation for API endpoints
  - Add troubleshooting guide for common issues
  - Document the hard-coded park name mappings
  - Create backup and recovery procedures for data files
  - _Requirements: 6.1, 6.2, 6.4_
