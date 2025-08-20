# Implementation Plan

- [x] 1. Validate reference test data files are correctly saved

  - Verify `tests/reference-data/august-9-2025-official-api-response.json` contains the complete official API response
  - Verify `tests/reference-data/august-9-2025-expected-results.json` contains correct expected processing results
  - Validate time slot mapping table matches official API: Index 0=07:00:00, Index 25=19:30:00, Index 28=21:00:00
  - _Requirements: 1.1, 1.2, 4.1, 4.3_

- [x] 2. Write comprehensive unit tests using reference data

  - [x] 2.1 Create test for Court 04 booking period calculation using official data

    - Test that status pattern [1×28, 0×2] produces booking period 7:00 AM-9:00 PM
    - Verify booking detail string shows "Booked 7:00 AM-9:00 PM"
    - Validate bookedSlots=28, availableSlots=2, isFullyBooked=false
    - _Requirements: 1.1, 3.1, 4.2_

  - [x] 2.2 Create test for Courts 05/06/07 booking period calculation using official data

    - Test that status pattern [1×25, 0×5] produces booking period 7:00 AM-7:30 PM
    - Verify booking detail string shows "Booked 7:00 AM-7:30 PM"
    - Validate bookedSlots=25, availableSlots=5, isFullyBooked=false
    - Test all three courts (05, 06, 07) produce identical results
    - _Requirements: 1.2, 3.1, 4.2_

  - [x] 2.3 Create integration test using saved reference files
    - Load `tests/reference-data/august-9-2025-official-api-response.json` and process through complete pipeline
    - Compare results against `tests/reference-data/august-9-2025-expected-results.json`
    - Validate park-level aggregation matches expected time windows and utilization percentages
    - _Requirements: 1.4, 2.4, 4.1_

- [x] 3. Fix the analyzeTimeSlots method logic

  - [x] 3.1 Identify and fix the booking period end time calculation bug

    - Analyze current logic that incorrectly adds 30 minutes to last booked slot
    - Fix logic to set end time to first available slot time when available slots exist
    - Preserve the +30 minutes logic only for true end-of-day scenarios
    - _Requirements: 2.1, 2.2, 3.2_

  - [x] 3.2 Add validation to ensure booking periods match expected patterns
    - Add logging to show time slot analysis step-by-step
    - Include index-to-time mapping validation
    - Add assertions to catch incorrect time calculations early
    - _Requirements: 2.4, 3.3_

- [x] 4. Validate fixes against reference data

  - [x] 4.1 Run unit tests to verify Court 04 produces expected results from official data

    - Confirm booking period: { startTime: "07:00:00", endTime: "21:00:00" }
    - Confirm display string: "Booked 7:00 AM-9:00 PM"
    - Confirm availability window: 9:00 PM - 9:30 PM
    - _Requirements: 1.1, 4.2_

  - [x] 4.2 Run unit tests to verify Courts 05/06/07 produce expected results from official data

    - Confirm booking period: { startTime: "07:00:00", endTime: "19:30:00" }
    - Confirm display string: "Booked 7:00 AM-7:30 PM"
    - Confirm availability window: 7:30 PM - 9:30 PM
    - _Requirements: 1.2, 4.2_

  - [x] 4.3 Run integration test against saved reference files
    - Process `tests/reference-data/august-9-2025-official-api-response.json` through complete system
    - Compare all results against `tests/reference-data/august-9-2025-expected-results.json`
    - Verify time windows, utilization patterns, and cached data structure match expected format exactly
    - _Requirements: 1.4, 4.1, 4.3_

- [x] 5. Test edge cases and regression scenarios

  - [x] 5.1 Test fully booked courts (all status = 1)

    - Create test case where all time slots are booked
    - Verify system correctly adds 30 minutes to last slot for end time
    - Confirm isFullyBooked = true and availableSlots = 0
    - _Requirements: 2.2, 3.1_

  - [x] 5.2 Test fully available courts (all status = 0)

    - Create test case where no time slots are booked
    - Verify system produces empty booking periods array
    - Confirm bookingDetailStrings shows "Available all day"
    - _Requirements: 3.2, 4.4_

  - [x] 5.3 Test mixed booking patterns
    - Create test cases with multiple booking periods separated by available slots
    - Verify system correctly identifies separate booking blocks
    - Confirm time window generation handles complex patterns
    - _Requirements: 2.3, 3.2_

- [x] 6. Update cached data processing to use fixed logic

  - Apply the fixed analyzeTimeSlots method to regenerate cached court data
  - Verify that regenerated data matches expected patterns from reference API responses
  - Update any dependent time window generation logic to work with corrected booking periods
  - _Requirements: 1.3, 1.4, 4.1_

- [ ] 7. Create validation script for ongoing data accuracy
  - Write script that can compare processed results against known reference data
  - Include time slot mapping verification and booking period validation
  - Add logging to identify when processed data deviates from expected patterns
  - _Requirements: 4.2, 4.3, 4.4_
