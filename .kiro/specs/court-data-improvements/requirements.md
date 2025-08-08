# Requirements Document

## Introduction

The Court Aggregator application has several data accuracy and display issues that need to be addressed:

1. **Data Accuracy Issue**: Christopher J. Brady (Monterey Park) court data appears incorrect - the API shows overlapping bookings (9:00-1:30 PM and 9:30-10:00 AM) which suggests a data processing error
2. **Court Count Display**: Users want to see at-a-glance court utilization information (e.g., "3/4 courts booked") in the weekly and daily views
3. **Time Window Overflow**: The current time window display overflows beyond the calendar grid, making it difficult to read

## Requirements

### Requirement 1

**User Story:** As a user viewing court data, I want accurate booking information that correctly reflects the actual court reservations from the Mesa API, so that I can make informed decisions about court availability.

#### Acceptance Criteria

1. WHEN the system processes API data THEN it SHALL correctly handle overlapping time slots and booking periods
2. WHEN there are data inconsistencies in the API response THEN the system SHALL log warnings and apply data validation rules
3. WHEN booking periods are calculated THEN the system SHALL ensure no impossible overlaps (e.g., 9:00-1:30 PM and 9:30-10:00 AM)
4. WHEN court data is processed THEN the system SHALL validate time formats and booking logic before storing

### Requirement 2

**User Story:** As a user viewing the weekly or daily calendar, I want to see court utilization ratios (e.g., "3/4 courts booked") for each park during specific time windows, so that I can quickly assess availability without examining individual court details.

#### Acceptance Criteria

1. WHEN viewing weekly calendar THEN the system SHALL display court utilization ratios for each park's booking blocks
2. WHEN viewing daily calendar THEN the system SHALL display court utilization ratios for each park's booking blocks
3. WHEN multiple courts are booked during the same time period THEN the system SHALL show the count of booked courts vs total courts
4. WHEN court utilization changes during a time window THEN the system SHALL display the peak utilization for that period

### Requirement 3

**User Story:** As a user viewing court booking details, I want time labels to display fully readable text instead of being truncated to "09...", so that I can clearly see the complete time windows for court bookings.

#### Acceptance Criteria

1. WHEN time labels are displayed in booking blocks THEN the system SHALL show complete time ranges without text truncation
2. WHEN booking blocks are too small for full text THEN the system SHALL use responsive layout techniques instead of ellipsis truncation
3. WHEN multiple time windows exist THEN the system SHALL use flexible layout (flexbox/grid) instead of fixed positioning
4. WHEN text doesn't fit in the allocated space THEN the system SHALL wrap text or adjust layout rather than truncate with "..."

### Requirement 4

**User Story:** As a user, I want improved visual clarity in the court booking display, so that I can easily distinguish between different levels of court utilization and booking patterns.

#### Acceptance Criteria

1. WHEN displaying court utilization THEN the system SHALL use clear, readable formatting (e.g., "3/4" not "3 of 4 courts")
2. WHEN showing booking blocks THEN the system SHALL ensure text remains readable within the allocated space
3. WHEN multiple parks have bookings THEN the system SHALL maintain visual separation and clarity
4. WHEN court counts are displayed THEN the system SHALL use consistent formatting across all views

### Requirement 5

**User Story:** As a system administrator, I want the cache management system to properly clean up outdated cache files, so that the system doesn't accumulate stale data and maintains optimal performance.

#### Acceptance Criteria

1. WHEN the backfill service runs THEN it SHALL remove outdated cache files like 2025-08.json that may contain incorrect data
2. WHEN cache cleanup occurs THEN the system SHALL log the cleanup actions for audit purposes
3. WHEN cache files are removed THEN the system SHALL ensure no active processes are using the files
4. WHEN new data is cached THEN the system SHALL verify the data integrity before replacing existing cache files

### Requirement 6

**User Story:** As a user, I want the system to detect and handle the API edge case where all courts appear unavailable after midnight, so that I receive accurate court availability information.

#### Acceptance Criteria

1. WHEN all courts for all parks show as fully booked for an entire day THEN the system SHALL detect this as a potential API edge case
2. WHEN the API edge case is detected THEN the system SHALL log a warning and mark the data as potentially invalid
3. WHEN invalid data is detected THEN the system SHALL attempt to use cached data from the previous successful fetch
4. WHEN displaying potentially invalid data THEN the system SHALL show a warning message to users

### Requirement 7

**User Story:** As a system administrator, I want the data collection schedule optimized to avoid API edge cases, so that the system collects accurate data consistently.

#### Acceptance Criteria

1. WHEN scheduling data collection THEN the system SHALL fetch data at 11:00 PM for the next day's availability
2. WHEN collecting data for date X THEN the system SHALL fetch it on date X-1 at 11:00 PM
3. WHEN the scheduled collection runs THEN the system SHALL store data in daily cache files rather than monthly files
4. WHEN storing daily cache files THEN the system SHALL organize them in a dedicated cache directory structure

### Requirement 8

**User Story:** As a developer, I want the cache system refactored to use daily granular storage, so that data management is more efficient and easier to maintain.

#### Acceptance Criteria

1. WHEN caching court data THEN the system SHALL store each day's data in a separate JSON file (e.g., 2025-08-09.json)
2. WHEN organizing cache files THEN the system SHALL store them in a structured directory (e.g., cache/2025/08/09.json)
3. WHEN accessing cached data THEN the system SHALL efficiently locate and load daily cache files
4. WHEN cleaning up cache THEN the system SHALL easily identify and remove outdated daily files
