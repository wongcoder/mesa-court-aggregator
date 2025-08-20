const WeeklyViewValidator = require('./weekly-view-validator');

describe('WeeklyViewValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new WeeklyViewValidator();
  });

  describe('validateWeeklyData', () => {
    test('should return consistent result when data matches', () => {
      const weeklyData = {
        '2025-08-08': {
          parks: [{
            name: 'Monterey Park',
            timeWindows: [{
              startTime: '09:00:00',
              endTime: '17:00:00',
              courts: ['Court 01', 'Court 02'],
              displayTime: '9:00 AM-5:00 PM'
            }],
            totalCourts: 4,
            bookedCourts: 2,
            status: 'partial'
          }]
        }
      };

      const sourceData = {
        '2025-08-08': {
          parks: [{
            name: 'Monterey Park',
            timeWindows: [{
              startTime: '09:00:00',
              endTime: '17:00:00',
              courts: ['Court 01', 'Court 02'],
              displayTime: '9:00 AM-5:00 PM'
            }],
            totalCourts: 4,
            bookedCourts: 2,
            status: 'partial'
          }]
        }
      };

      const result = validator.validateWeeklyData(weeklyData, sourceData);

      expect(result.isConsistent).toBe(true);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should detect Brady data time window count mismatch', () => {
      const weeklyData = {
        '2025-08-08': {
          parks: [{
            name: 'Christopher J. Brady',
            timeWindows: [{
              startTime: '09:00:00',
              endTime: '17:00:00',
              courts: ['Court 01'],
              displayTime: '9:00 AM-5:00 PM'
            }],
            totalCourts: 4,
            bookedCourts: 1
          }]
        }
      };

      const sourceData = {
        '2025-08-08': {
          parks: [{
            name: 'Christopher J. Brady',
            timeWindows: [
              {
                startTime: '09:00:00',
                endTime: '12:00:00',
                courts: ['Court 01'],
                displayTime: '9:00 AM-12:00 PM'
              },
              {
                startTime: '14:00:00',
                endTime: '17:00:00',
                courts: ['Court 02'],
                displayTime: '2:00 PM-5:00 PM'
              }
            ],
            totalCourts: 4,
            bookedCourts: 2
          }]
        }
      };

      const result = validator.validateWeeklyData(weeklyData, sourceData);

      expect(result.isConsistent).toBe(false);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('time_window_count_mismatch');
      expect(result.discrepancies[0].parkName).toBe('Christopher J. Brady');
      expect(result.discrepancies[0].weeklyCount).toBe(1);
      expect(result.discrepancies[0].sourceCount).toBe(2);
    });

    test('should detect Brady data court count mismatch', () => {
      const weeklyData = {
        '2025-08-08': {
          parks: [{
            name: 'Monterey Park',
            timeWindows: [{
              startTime: '09:00:00',
              endTime: '17:00:00',
              courts: ['Court 01', 'Court 02', 'Court 03'],
              displayTime: '9:00 AM-5:00 PM'
            }],
            totalCourts: 4,
            bookedCourts: 3
          }]
        }
      };

      const sourceData = {
        '2025-08-08': {
          parks: [{
            name: 'Monterey Park',
            timeWindows: [{
              startTime: '09:00:00',
              endTime: '17:00:00',
              courts: ['Court 01'],
              displayTime: '9:00 AM-5:00 PM'
            }],
            totalCourts: 4,
            bookedCourts: 1
          }]
        }
      };

      const result = validator.validateWeeklyData(weeklyData, sourceData);

      expect(result.isConsistent).toBe(false);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('court_count_mismatch');
      expect(result.discrepancies[0].weeklyCount).toBe(3);
      expect(result.discrepancies[0].sourceCount).toBe(1);
    });

    test('should detect time range mismatch', () => {
      const weeklyData = {
        '2025-08-08': {
          parks: [{
            name: 'Christopher J. Brady',
            timeWindows: [{
              startTime: '09:00:00',
              endTime: '17:00:00',
              courts: ['Court 01'],
              displayTime: '9:00 AM-5:00 PM'
            }]
          }]
        }
      };

      const sourceData = {
        '2025-08-08': {
          parks: [{
            name: 'Christopher J. Brady',
            timeWindows: [{
              startTime: '10:00:00',
              endTime: '18:00:00',
              courts: ['Court 01'],
              displayTime: '10:00 AM-6:00 PM'
            }]
          }]
        }
      };

      const result = validator.validateWeeklyData(weeklyData, sourceData);

      expect(result.isConsistent).toBe(false);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('time_range_mismatch');
    });

    test('should handle missing source data', () => {
      const weeklyData = {
        '2025-08-08': {
          parks: [{
            name: 'Kleinman Park',
            timeWindows: []
          }]
        }
      };

      const sourceData = {};

      const result = validator.validateWeeklyData(weeklyData, sourceData);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('missing_source_data');
    });

    test('should handle missing weekly or source data', () => {
      const result1 = validator.validateWeeklyData(null, {});
      expect(result1.warnings).toHaveLength(1);
      expect(result1.warnings[0].type).toBe('missing_data');

      const result2 = validator.validateWeeklyData({}, null);
      expect(result2.warnings).toHaveLength(1);
      expect(result2.warnings[0].type).toBe('missing_data');
    });
  });

  describe('compareBradyData', () => {
    test('should return null when Brady data matches', () => {
      const weeklyData = {
        name: 'Christopher J. Brady',
        timeWindows: [{
          startTime: '09:00:00',
          endTime: '17:00:00',
          courts: ['Court 01'],
          displayTime: '9:00 AM-5:00 PM'
        }],
        courts: [{ resourceName: 'Court 01' }]
      };

      const sourceData = {
        name: 'Christopher J. Brady',
        timeWindows: [{
          startTime: '09:00:00',
          endTime: '17:00:00',
          courts: ['Court 01'],
          displayTime: '9:00 AM-5:00 PM'
        }],
        courts: [{ resourceName: 'Court 01' }]
      };

      const result = validator.compareBradyData(weeklyData, sourceData, '2025-08-08');
      expect(result).toBeNull();
    });

    test('should detect total court count mismatch', () => {
      const weeklyData = {
        name: 'Christopher J. Brady',
        timeWindows: [],
        courts: [
          { resourceName: 'Court 01' },
          { resourceName: 'Court 02' }
        ]
      };

      const sourceData = {
        name: 'Christopher J. Brady',
        timeWindows: [],
        courts: [
          { resourceName: 'Court 01' },
          { resourceName: 'Court 02' },
          { resourceName: 'Court 03' },
          { resourceName: 'Court 04' }
        ]
      };

      const result = validator.compareBradyData(weeklyData, sourceData, '2025-08-08');
      expect(result).not.toBeNull();
      expect(result.type).toBe('total_court_count_mismatch');
      expect(result.weeklyCount).toBe(2);
      expect(result.sourceCount).toBe(4);
    });
  });

  describe('detectBookingOverlaps', () => {
    test('should detect overlapping booking periods', () => {
      const weeklyCourts = [{
        resourceName: 'Court 01',
        bookingPeriods: [
          { startTime: '09:00:00', endTime: '12:00:00' },
          { startTime: '11:00:00', endTime: '15:00:00' } // Overlaps with previous
        ]
      }];

      const sourceCourts = [{
        resourceName: 'Court 01',
        bookingPeriods: [
          { startTime: '09:00:00', endTime: '15:00:00' }
        ]
      }];

      const overlaps = validator.detectBookingOverlaps(weeklyCourts, sourceCourts, '2025-08-08');
      expect(overlaps).toHaveLength(2); // One overlap + one count mismatch
      expect(overlaps[0].type).toBe('weekly_booking_overlap');
    });

    test('should detect booking period count mismatch', () => {
      const weeklyCourts = [{
        resourceName: 'Court 01',
        bookingPeriods: [
          { startTime: '09:00:00', endTime: '12:00:00' }
        ]
      }];

      const sourceCourts = [{
        resourceName: 'Court 01',
        bookingPeriods: [
          { startTime: '09:00:00', endTime: '12:00:00' },
          { startTime: '14:00:00', endTime: '17:00:00' }
        ]
      }];

      const overlaps = validator.detectBookingOverlaps(weeklyCourts, sourceCourts, '2025-08-08');
      expect(overlaps).toHaveLength(1);
      expect(overlaps[0].type).toBe('booking_period_count_mismatch');
    });
  });

  describe('timePeriodsOverlap', () => {
    test('should detect overlapping periods', () => {
      const period1 = { startTime: '09:00:00', endTime: '12:00:00' };
      const period2 = { startTime: '11:00:00', endTime: '15:00:00' };
      
      expect(validator.timePeriodsOverlap(period1, period2)).toBe(true);
    });

    test('should detect non-overlapping periods', () => {
      const period1 = { startTime: '09:00:00', endTime: '12:00:00' };
      const period2 = { startTime: '13:00:00', endTime: '15:00:00' };
      
      expect(validator.timePeriodsOverlap(period1, period2)).toBe(false);
    });

    test('should handle adjacent periods', () => {
      const period1 = { startTime: '09:00:00', endTime: '12:00:00' };
      const period2 = { startTime: '12:00:00', endTime: '15:00:00' };
      
      expect(validator.timePeriodsOverlap(period1, period2)).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    test('should provide correct summary', () => {
      // Add some test data to validator results
      validator.validationResults = {
        isConsistent: false,
        discrepancies: [
          { type: 'court_count_mismatch', parkName: 'Christopher J. Brady' },
          { type: 'time_window_count_mismatch', parkName: 'Kleinman Park' }
        ],
        warnings: [
          { type: 'missing_source_data' }
        ]
      };

      const summary = validator.getValidationSummary();

      expect(summary.isValid).toBe(false);
      expect(summary.totalIssues).toBe(3);
      expect(summary.criticalIssues).toBe(2);
      expect(summary.warnings).toBe(1);
      expect(summary.bradySpecificIssues).toBe(1);
      expect(summary.issuesByType['court_count_mismatch']).toBe(1);
      expect(summary.issuesByType['missing_source_data']).toBe(1);
    });
  });

  describe('timeToMinutes', () => {
    test('should convert time strings correctly', () => {
      expect(validator.timeToMinutes('09:00:00')).toBe(540);
      expect(validator.timeToMinutes('12:30:00')).toBe(750);
      expect(validator.timeToMinutes('00:00:00')).toBe(0);
      expect(validator.timeToMinutes('23:59:00')).toBe(1439);
    });

    test('should handle HH:MM format', () => {
      expect(validator.timeToMinutes('09:00')).toBe(540);
      expect(validator.timeToMinutes('12:30')).toBe(750);
    });

    test('should handle invalid input', () => {
      expect(validator.timeToMinutes('')).toBe(0);
      expect(validator.timeToMinutes(null)).toBe(0);
      expect(validator.timeToMinutes(undefined)).toBe(0);
    });
  });
});