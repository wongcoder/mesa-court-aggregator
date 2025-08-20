# Requirements Document

## Introduction

The Court Aggregator system has critical issues with calculating and displaying court availability time windows from the Mesa API. Analysis of actual API responses reveals that while the system correctly interprets time slot status values (1 = booked, 0 = available), it is incorrectly calculating booking periods and generating inaccurate time windows for display. For example, on August 9th, 2025, the API shows Kleinman Park courts 05/06/07 are booked until 7:00 PM with availability starting at 7:30 PM, but the cached data shows different time windows that don't match the actual API response. This affects the reliability of court reservation information displayed to users.

## Requirements

### Requirement 1

**User Story:** As a court reservation user, I want to see accurate booking time windows that match the actual API data, so that I can make informed decisions about when courts are actually available.

#### Acceptance Criteria

1. WHEN the API shows Court 04 booked from 8:30 AM to 9:00 PM (status 1 for slots 0-24) THEN the system SHALL display "Booked 8:30 AM-9:00 PM" and show availability from 9:00-9:30 PM
2. WHEN the API shows Courts 05/06/07 booked from 8:30 AM to 7:00 PM (status 1 for slots 0-21) THEN the system SHALL display "Booked 8:30 AM-7:00 PM" and show availability from 7:30-9:30 PM
3. WHEN calculating booking periods THEN the system SHALL correctly identify the end time as the first available slot time, not add 30 minutes to the last booked slot
4. WHEN generating time windows THEN the system SHALL accurately reflect the actual booking patterns from the API response

### Requirement 2

**User Story:** As a system administrator, I want the booking period calculation logic to be fixed, so that the system accurately processes continuous booking blocks and available periods.

#### Acceptance Criteria

1. WHEN a booking period ends and the next slot is available (status 0) THEN the system SHALL set the booking period end time to that available slot time
2. WHEN a booking period extends to the end of the day (all remaining slots are booked) THEN the system SHALL add 30 minutes to the last booked slot time as the end time
3. WHEN processing mixed booking patterns THEN the system SHALL correctly identify separate booking periods and available gaps
4. WHEN the analyzeTimeSlots method processes time slots THEN it SHALL produce booking periods that exactly match the API response patterns
5. WHEN the API provides different time window configurations (different start times, slot counts, or increments) THEN the system SHALL use the time_slots array from the API response rather than making hardcoded assumptions about time mappings

### Requirement 3

**User Story:** As a system administrator, I want the court data processing to handle edge cases correctly, so that the system provides reliable data even with complex booking patterns.

#### Acceptance Criteria

1. WHEN a court has booking periods that extend to the end of the day THEN the system SHALL correctly calculate the end time by adding 30 minutes to the last booked slot
2. WHEN processing time slots with mixed availability THEN the system SHALL correctly identify continuous booking periods and separate available periods
3. WHEN the API returns unexpected status values THEN the system SHALL handle them gracefully and log appropriate warnings
4. WHEN generating time windows THEN the system SHALL create accurate utilization displays showing correct court counts and percentages

### Requirement 4

**User Story:** As a quality assurance tester, I want to be able to verify the fix against real-world data, so that I can confirm the system now correctly processes actual Mesa API responses.

#### Acceptance Criteria

1. WHEN testing with historical data THEN the system SHALL correctly process and display the expected booking patterns
2. WHEN comparing before and after processing results THEN the system SHALL show measurable improvements in accuracy
3. WHEN validating against manual verification THEN the system SHALL match the actual court availability as confirmed through the Mesa website
4. WHEN processing data for different parks THEN the system SHALL maintain accuracy across all park locations (Kleinman, Gene Autry, Monterey)
