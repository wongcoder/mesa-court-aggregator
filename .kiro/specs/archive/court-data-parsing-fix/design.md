# Design Document

## Overview

This design addresses the critical issues in the Court Aggregator's time slot parsing and booking period calculation logic. The system currently produces incorrect time windows that don't match the actual Mesa API responses. We will fix the `analyzeTimeSlots` method in `court-data-processor.js` to correctly calculate booking periods and ensure the output matches the provided API data exactly.

## Architecture

### Current System Flow
1. Mesa API returns time slot data with status values (1 = booked, 0 = available)
2. `MesaApiClient.extractCourtResources()` processes the raw API response
3. `CourtDataProcessor.analyzeTimeSlots()` calculates booking periods ← **BROKEN**
4. `CourtDataProcessor.generateUserFriendlyTimeWindows()` creates display windows
5. Data is cached and served to frontend

### Problem Analysis
The `analyzeTimeSlots` method incorrectly calculates booking period end times, leading to discrepancies between API data and cached results.

## Components and Interfaces

### Reference Data for Testing

Using the provided August 9th, 2025 API response as our benchmark:

**Official Time Slots Array (30 slots, 30-minute increments):**
```
Index | Time     | Display
0     | 07:00:00 | 7:00 AM
24    | 19:00:00 | 7:00 PM
25    | 19:30:00 | 7:30 PM ← First available for courts 05/06/07
26    | 20:00:00 | 8:00 PM
27    | 20:30:00 | 8:30 PM
28    | 21:00:00 | 9:00 PM ← First available for court 04
29    | 21:30:00 | 9:30 PM
```

**Expected Results for Kleinman Park Courts (Official Data):**

**Court 04 (resource_id: 702):**
- Status pattern: [1×28, 0×2] (booked slots 0-27, available slots 28-29)
- Expected booking period: `{ startTime: "07:00:00", endTime: "21:00:00" }`
- Expected display: "Booked 7:00 AM-9:00 PM"
- Expected availability: 9:00 PM - 9:30 PM

**Courts 05/06/07 (resource_ids: 701, 700, 699):**
- Status pattern: [1×25, 0×5] (booked slots 0-24, available slots 25-29)  
- Expected booking period: `{ startTime: "07:00:00", endTime: "19:30:00" }`
- Expected display: "Booked 7:00 AM-7:30 PM"
- Expected availability: 7:30 PM - 9:30 PM

### Fixed analyzeTimeSlots Method

**Current Logic (BROKEN):**
```javascript
if (slot.status === 1) { // Booked slot
  // ... extend booking period
} else if (currentPeriod) {
  // End current booking period - set end time to the current (available) slot time
  currentPeriod.endTime = slot.time; // ← THIS IS CORRECT
  bookingPeriods.push(currentPeriod);
}

// Handle case where booking period extends to end of day
if (currentPeriod) {
  // Add 30 minutes to the last booked slot ← THIS IS WRONG FOR NON-END-OF-DAY
  const endDate = new Date();
  endDate.setHours(hours, minutes + 30, 0, 0);
  currentPeriod.endTime = `${endHours}:${endMinutes}:00`;
}
```

**Fixed Logic:**
```javascript
if (slot.status === 1) { // Booked slot
  // ... extend booking period
} else if (currentPeriod) {
  // End current booking period - set end time to the current (available) slot time
  currentPeriod.endTime = slot.time; // ← KEEP THIS
  bookingPeriods.push(currentPeriod);
  currentPeriod = null; // ← ENSURE WE RESET
}

// Handle case where booking period extends to ACTUAL end of day
if (currentPeriod) {
  // Only add 30 minutes if we've reached the last slot AND it's booked
  // Otherwise, the booking period should end at the next available slot
  const lastSlotTime = currentPeriod.endTime;
  const [hours, minutes] = lastSlotTime.split(':').map(Number);
  const endDate = new Date();
  endDate.setHours(hours, minutes + 30, 0, 0);
  currentPeriod.endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;
  bookingPeriods.push(currentPeriod);
}
```

## Data Models

### Test Case Data Structure

```javascript
const testCases = {
  "august_9_2025_official": {
    apiResponse: {
      // Full official API response provided by user with 30 time slots
    },
    expectedResults: {
      "Kleinman Park Pickleball Court 04": {
        bookingPeriods: [
          { startTime: "07:00:00", endTime: "21:00:00", startIndex: 0, endIndex: 27 }
        ],
        bookedSlots: 28,
        availableSlots: 2,
        isFullyBooked: false,
        bookingDetailStrings: ["Booked 7:00 AM-9:00 PM"]
      },
      "Kleinman Park Pickleball Court 05": {
        bookingPeriods: [
          { startTime: "07:00:00", endTime: "19:30:00", startIndex: 0, endIndex: 24 }
        ],
        bookedSlots: 25,
        availableSlots: 5,
        isFullyBooked: false,
        bookingDetailStrings: ["Booked 7:00 AM-7:30 PM"]
      }
      // Same pattern for courts 06 and 07
    }
  }
};
```

### Validation Interface

```javascript
class BookingPeriodValidator {
  validateAgainstReferenceData(processedResult, expectedResult) {
    // Compare booking periods exactly
    // Compare time calculations exactly  
    // Compare display strings exactly
    // Return detailed diff if mismatch
  }
}
```

## Error Handling

### Validation Strategy
1. **Pre-processing validation**: Verify time slots array structure matches expected format
2. **Post-processing validation**: Compare results against reference data
3. **Regression testing**: Ensure fixes don't break other park data processing

### Error Detection
- Mismatch between expected and actual booking periods
- Incorrect time calculations (off by 30 minutes, wrong end times)
- Missing or extra booking periods

## Testing Strategy

### Unit Tests with Reference Data
```javascript
describe('Court Data Processor - August 9th Reference Data', () => {
  test('Court 04 booking period calculation', () => {
    const result = processor.analyzeCourtBookings(august9Court04Data);
    expect(result.bookingPeriods).toEqual([
      { startTime: "08:30:00", endTime: "21:00:00", startIndex: 0, endIndex: 24 }
    ]);
    expect(result.bookingDetailStrings).toEqual(["Booked 8:30 AM-9:00 PM"]);
  });

  test('Courts 05/06/07 booking period calculation', () => {
    [court05, court06, court07].forEach(courtData => {
      const result = processor.analyzeCourtBookings(courtData);
      expect(result.bookingPeriods).toEqual([
        { startTime: "08:30:00", endTime: "19:30:00", startIndex: 0, endIndex: 21 }
      ]);
      expect(result.bookingDetailStrings).toEqual(["Booked 8:30 AM-7:30 PM"]);
    });
  });
});
```

### Integration Tests
- Process complete August 9th API response
- Verify park-level time windows match expected patterns
- Ensure cached data structure matches reference expectations

### Micro End-to-End Testing
- Use provided API responses as input
- Validate complete processing pipeline output
- Compare final cached JSON structure against expected format
- Verify frontend display would show correct time windows