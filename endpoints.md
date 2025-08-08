# Mesa Court API Endpoints

## API Configuration

**Base URL**: Mesa ActiveCommunities API endpoint
**Method**: POST
**Content-Type**: application/json

## Facility Groups

### Kleinman Park
- **Facility Group ID**: 29
- **Start Time**: 08:30:00
- **End Time**: 22:00:00
- **PDF Calendar**: https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf
- **Notes**: Ignore tennis courts, only use pickleball courts

**Request Payload**:
```json
{
  "facility_group_id": 29,
  "customer_id": 0,
  "company_id": 0,
  "reserve_date": "2025-08-09",
  "change_time_range": false,
  "reload": false,
  "resident": true,
  "start_time": "08:30:00",
  "end_time": "22:00:00"
}
```

### Gene Autry (Mesa Tennis Pickleball Center)
- **Facility Group ID**: 33
- **Start Time**: 08:30:00
- **End Time**: 22:00:00
- **PDF Calendar**: Not available

**Request Payload**:
```json
{
  "facility_group_id": 33,
  "customer_id": 0,
  "company_id": 0,
  "reserve_date": "2025-08-09",
  "change_time_range": false,
  "reload": false,
  "resident": true,
  "start_time": "08:30:00",
  "end_time": "22:00:00"
}
```

### Monterey (Christopher J Brady)
- **Facility Group ID**: 35
- **Start Time**: 08:30:00
- **End Time**: 22:00:00
- **PDF Calendar**: https://www.mesaaz.gov/files/assets/public/v/244/activities-culture/prcf/facilities/pickleball-public-court-calendars/brady-pickleball-court.pdf

**Request Payload**:
```json
{
  "facility_group_id": 35,
  "customer_id": 0,
  "company_id": 0,
  "reserve_date": "2025-08-09",
  "change_time_range": false,
  "reload": false,
  "resident": true,
  "start_time": "08:30:00",
  "end_time": "22:00:00"
}
```

## Usage Notes

- **Date Format**: Use YYYY-MM-DD format for `reserve_date`
- **Backfill Strategy**: Make separate requests for each date and facility group
- **Time Range**: Each facility has different operating hours
- **PDF Links**: Only Kleinman Park and Monterey have PDF calendars available

