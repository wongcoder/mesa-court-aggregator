# Daily Cache Migration Requirements

## Overview
Migrate the current monthly JSON cache system (YYYY-MM.json) to a daily JSON cache system (YYYY-MM-DD.json) for better data organization and performance.

## Current State
- Cache files organized by month: `data/2025-08.json`
- Each monthly file contains a `days` object with daily data
- Monthly files can become large and unwieldy
- All data for a month loaded when accessing any day

## Target State
- Cache files organized by day: `data/2025-08-09.json`
- Each daily file contains only that day's court availability data
- Smaller, more focused cache files
- Only load data for requested dates
- Better performance for single-day queries

## Benefits
1. **Performance**: Load only required daily data instead of entire month
2. **Scalability**: Smaller individual files are easier to manage
3. **Maintenance**: Easier to clean up old data by removing individual day files
4. **Debugging**: Simpler to inspect and troubleshoot specific day data
5. **Backup**: More granular backup and recovery options

## Requirements

### Data Structure Changes
- **Current**: `data/YYYY-MM.json` with nested daily data
- **Target**: `data/YYYY-MM-DD.json` with single day data
- Maintain same internal data structure for park/court information
- Preserve park list and color assignments across daily files

### API Compatibility
- Maintain existing API endpoints: `/api/calendar/:month`
- Aggregate daily files when serving monthly calendar data
- Ensure backward compatibility during transition period
- No breaking changes to frontend interface

### Migration Strategy
1. **Dual System**: Support both monthly and daily files during transition
2. **Data Migration**: Convert existing monthly files to daily files
3. **Service Updates**: Update CacheManager to handle daily files
4. **Cleanup**: Remove old monthly files after successful migration

### Service Updates Required
- **CacheManager**: Update file path generation and data operations
- **BackfillService**: Modify to create daily files instead of monthly
- **Scheduler**: Update to work with daily cache structure
- **API Endpoints**: Aggregate daily files for monthly responses

### Error Handling
- Graceful fallback to monthly files if daily files missing
- Handle partial daily data scenarios
- Maintain data integrity during migration process
- Comprehensive error logging for troubleshooting

## Success Criteria
1. All new data stored in daily JSON files
2. Existing monthly data successfully migrated
3. API responses unchanged from user perspective
4. Performance improvement in single-day data access
5. No data loss during migration process
6. Comprehensive test coverage for new system

## Implementation Phases
1. **Phase 1**: Update CacheManager to support daily files
2. **Phase 2**: Create migration utility for existing data
3. **Phase 3**: Update services to use daily cache system
4. **Phase 4**: Test and validate migration
5. **Phase 5**: Deploy and cleanup old monthly files