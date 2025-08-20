# Implementation Plan

- [x] 1. Implement cache cleanup functionality in BackfillService

  - Add cleanupOutdatedCacheFiles() method to BackfillService class
  - Implement logic to identify and remove problematic cache files like 2025-08.json
  - Add backup creation before file removal for safety
  - Include proper logging for cache cleanup operations
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement court utilization display system

  - [x] 2.1 Create CourtUtilizationCalculator class

    - Add calculateUtilization() method with view-specific formatting support
    - Implement enhanceTimeWindowsWithUtilization() for data processing with viewType parameter
    - Create formatForView() method to optimize display for weekly (~100px) vs daily views
    - Add display formatting methods optimized for space constraints
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [x] 2.2 Update frontend to display court utilization ratios
    - Modify booking block creation to include view-specific utilization display
    - Add ultra-compact utilization text for weekly view (~100px width constraint)
    - Add enhanced utilization display for daily view with more available width
    - Ensure optimal readability despite space limitations
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

- [ ] 3. Improve filter button user interface

  - [ ] 3.1 Create FilterButtonManager class

    - Implement createFilterButton() with full-surface click targets
    - Add proper ARIA attributes for accessibility without overlapping tooltips
    - Include keyboard navigation support
    - Remove conflicting accessibility hints that cause UI overlap
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

  - [ ] 3.2 Update filter button CSS for enhanced visual feedback
    - Make entire button surface clickable, not just checkbox
    - Add emoji-based hover feedback instead of accessibility hints
    - Ensure touch-friendly minimum sizes (44px) for mobile
    - Remove overlapping accessibility hint positioning
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [x] 4. Fix weekly view data accuracy issues

  - [x] 4.1 Create WeeklyViewValidator class

    - Implement validateWeeklyData() to compare against source data
    - Add compareBradyData() method for Christopher J. Brady specific validation
    - Include discrepancy detection and logging
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.2 Fix data processing inconsistencies
    - Identify and resolve weekly view data mismatches
    - Ensure time windows align correctly with source data
    - Add validation warnings for data inconsistencies
    - _Requirements: 3.4_

- [ ] 5. Implement enhanced navigation system

  - [ ] 5.1 Create NavigationManager class

    - Add detectDefaultView() for mobile-first view selection
    - Implement createTodayButton() for quick navigation to current date
    - Add navigateToToday() method with proper date handling
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 5.2 Fix month view date selection issue

    - Correct handleMonthViewClick() to navigate to correct date (not day before)
    - Fix timezone offset issues in date calculations
    - Ensure accurate date context maintenance
    - _Requirements: 4.1, 4.4_

  - [ ] 5.3 Add current day highlighting to weekly view
    - Implement highlightCurrentDay() method
    - Add visual styling for current day indication
    - Update highlighting when date changes
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Implement mobile-responsive interface

  - [ ] 6.1 Add mobile device detection and default view selection

    - Detect mobile devices and default to daily view
    - Implement responsive breakpoints for different screen sizes
    - Add touch-friendly interface elements
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 6.2 Create mobile-optimized CSS framework

    - Ensure interface fits properly within mobile screen boundaries
    - Add responsive font sizing and spacing
    - Implement mobile-friendly navigation controls
    - _Requirements: 6.2, 6.4_

  - [ ] 6.3 Optimize booking blocks for mobile display
    - Adjust booking block sizes for touch interaction
    - Implement view-specific optimizations for weekly (~100px) vs daily views
    - Ensure court utilization text remains readable despite space constraints
    - Add ultra-compact formatting for weekly view and enhanced formatting for daily view
    - _Requirements: 6.3, 6.4, 1.5, 1.6_

- [ ] 7. Enhance data validation and error handling

  - [ ] 7.1 Implement comprehensive data validation

    - Add validation for booking period overlaps and inconsistencies
    - Create data consistency checking for API responses
    - Include fallback handling for invalid data scenarios
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 7.2 Add performance optimization
    - Optimize data collection scheduling to avoid API edge cases
    - Implement efficient cache file organization and cleanup
    - Add performance monitoring for data processing operations
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 8. Write comprehensive tests for new functionality

  - [ ] 8.1 Create unit tests for court utilization display

    - Test CourtUtilizationCalculator with various booking scenarios and view types
    - Test view-specific formatting for weekly (~100px) vs daily views
    - Test utilization display formatting and edge cases with space constraints
    - Test integration with booking block rendering for both view types
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 8.2 Create tests for filter button improvements

    - Test FilterButtonManager click handling and accessibility without overlapping hints
    - Test emoji-based hover feedback instead of accessibility hints
    - Test keyboard navigation and ARIA attributes without UI conflicts
    - Test mobile touch interaction with enhanced visual feedback
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 8.3 Create tests for navigation enhancements

    - Test NavigationManager date handling and view selection
    - Test "Today" button functionality and current day highlighting
    - Test month view date selection fixes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.4 Create tests for mobile responsiveness

    - Test mobile device detection and default view selection
    - Test responsive layout adjustments and touch targets
    - Test mobile-optimized booking block display
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 8.5 Create tests for data validation improvements
    - Test WeeklyViewValidator for data consistency checking
    - Test Christopher J. Brady data validation specifically
    - Test error handling and fallback scenarios
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4_
