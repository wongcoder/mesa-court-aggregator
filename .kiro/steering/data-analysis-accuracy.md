# Data Analysis Accuracy Rules

## Critical Data Analysis Requirements

### Array Index Mapping
- **ALWAYS** manually verify array index mappings when analyzing time slot data
- **NEVER** assume array indices without explicitly counting from index 0
- **ALWAYS** create a clear mapping table showing: Index → Time → Status before making any conclusions
- **DOUBLE-CHECK** all time calculations by manually walking through the array

### Time Slot Analysis Protocol
1. **First**: Extract the complete time_slots array from the API response
2. **Second**: Create an explicit index-to-time mapping table
3. **Third**: Map each status value to its corresponding time slot using the index
4. **Fourth**: Verify the mapping by spot-checking at least 3 different indices
5. **Fifth**: Only then draw conclusions about booking periods

### Data Verification Requirements
- **ALWAYS** show your work when analyzing time-based data
- **ALWAYS** include the actual array indices and corresponding times in your analysis
- **NEVER** make assumptions about time slot patterns without explicit verification
- **ALWAYS** cross-reference your interpretation with the user's expected results

### Error Prevention
- When analyzing any array-based time data, create a table format like:
  ```
  Index | Time     | Status | Interpretation
  0     | 08:30:00 | 1      | Booked
  21    | 19:00:00 | 1      | Booked (last booked slot)
  22    | 19:30:00 | 0      | Available (first available slot)
  ```
- **MANDATORY**: Ask for user confirmation of time interpretations before proceeding with requirements or design
- **CRITICAL**: Treat time slot analysis errors as system-breaking issues that require immediate correction

### Consequences
- Time slot interpretation errors in reservation systems can cause users to miss available court times
- Incorrect booking period calculations directly impact user experience and system reliability
- These errors are considered critical system failures, not minor bugs

## Application to Court Reservation System
- Mesa API time slots are in 30-minute increments
- Status 1 = booked, Status 0 = available
- Booking periods end at the time of the first available slot, not 30 minutes after the last booked slot
- Always verify time calculations against the actual time_slots array provided in API responses