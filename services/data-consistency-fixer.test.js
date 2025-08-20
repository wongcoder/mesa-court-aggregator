const DataConsistencyFixer = require('./data-consistency-fixer');

describe('DataConsistencyFixer', () => {
  let fixer;

  beforeEach(() => {
    fixer = new DataConsistencyFixer();
  });

  describe('fixDataInconsistencies', () => {
    test('should fix time window count mismatch', async () => {
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

      const result = await fixer.fixDataInconsistencies(weeklyData, sourceData);

      expect(result.summary.totalFixes).toBeGreaterThan(0);
      expect(result.appliedFixes.some(fix => fix.type === 'time_window_count_fix')).toBe(true);
      expect(result.fixedData['2025-08-08'].parks[0].timeWindows).toHaveLength(2);
    });

    test('should fix court count mismatch', async () => {
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

      const result = await fixer.fixDataInconsistencies(weeklyData, sourceData);

      expect(result.summary.totalFixes).toBeGreaterThan(0);
      expect(result.appliedFixes.some(fix => fix.type === 'court_count_fix')).toBe(true);
      expect(result.fixedData['2025-08-08'].parks[0].timeWindows[0].courts).toHaveLength(1);
    });

    test('should fix time range mismatch', async () => {
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

      const result = await fixer.fixDataInconsistencies(weeklyData, sourceData);

      expect(result.summary.totalFixes).toBeGreaterThan(0);
      expect(result.appliedFixes.some(fix => fix.type === 'time_range_fix')).toBe(true);
      expect(result.fixedData['2025-08-08'].parks[0].timeWindows[0].startTime).toBe('10:00:00');
      expect(result.fixedData['2025-08-08'].parks[0].timeWindows[0].endTime).toBe('18:00:00');
    });

    test('should fix total court count mismatch', async () => {
      const weeklyData = {
        '2025-08-08': {
          parks: [{
            name: 'Christopher J. Brady',
            timeWindows: [],
            totalCourts: 2,
            bookedCourts: 1,
            courts: [
              { resourceName: 'Court 01' },
              { resourceName: 'Court 02' }
            ]
          }]
        }
      };

      const sourceData = {
        '2025-08-08': {
          parks: [{
            name: 'Christopher J. Brady',
            timeWindows: [],
            totalCourts: 4,
            bookedCourts: 2,
            availableCourts: 2,
            partiallyBookedCourts: 0,
            courts: [
              { resourceName: 'Court 01' },
              { resourceName: 'Court 02' },
              { resourceName: 'Court 03' },
              { resourceName: 'Court 04' }
            ]
          }]
        }
      };

      const result = await fixer.fixDataInconsistencies(weeklyData, sourceData);

      expect(result.summary.totalFixes).toBeGreaterThan(0);
      expect(result.appliedFixes.some(fix => fix.type === 'total_court_count_fix')).toBe(true);
      expect(result.fixedData['2025-08-08'].parks[0].totalCourts).toBe(4);
      expect(result.fixedData['2025-08-08'].parks[0].bookedCourts).toBe(2);
      expect(result.fixedData['2025-08-08'].parks[0].courts).toHaveLength(4);
    });

    test('should handle missing data gracefully', async () => {
      const result1 = await fixer.fixDataInconsistencies(null, {});
      expect(result1.validationWarnings).toHaveLength(1);
      expect(result1.validationWarnings[0].type).toBe('missing_data');

      const result2 = await fixer.fixDataInconsistencies({}, null);
      expect(result2.validationWarnings).toHaveLength(1);
      expect(result2.validationWarnings[0].type).toBe('missing_data');
    });

    test('should preserve original data when preserveOriginal is true', async () => {
      const originalWeeklyData = {
        '2025-08-08': {
          parks: [{
            name: 'Christopher J. Brady',
            timeWindows: [{
              startTime: '09:00:00',
              endTime: '17:00:00',
              courts: ['Court 01']
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
              courts: ['Court 01']
            }]
          }]
        }
      };

      const result = await fixer.fixDataInconsistencies(originalWeeklyData, sourceData, {
        preserveOriginal: true
      });

      // Original data should be unchanged
      expect(originalWeeklyData['2025-08-08'].parks[0].timeWindows[0].startTime).toBe('09:00:00');
      
      // Fixed data should be different
      expect(result.fixedData['2025-08-08'].parks[0].timeWindows[0].startTime).toBe('10:00:00');
    });

    test('should not auto-fix when autoFix is false', async () => {
      const weeklyData = {
        '2025-08-08': {
          parks: [{
            name: 'Christopher J. Brady',
            timeWindows: [{
              startTime: '09:00:00',
              endTime: '17:00:00',
              courts: ['Court 01']
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
              courts: ['Court 01']
            }]
          }]
        }
      };

      const result = await fixer.fixDataInconsistencies(weeklyData, sourceData, {
        autoFix: false
      });

      expect(result.summary.totalFixes).toBe(0);
      expect(result.validationWarnings.some(w => w.autoFixDisabled)).toBe(true);
    });
  });

  describe('consolidateOverlappingPeriods', () => {
    test('should consolidate overlapping periods', () => {
      const periods = [
        { startTime: '09:00:00', endTime: '12:00:00' },
        { startTime: '11:00:00', endTime: '15:00:00' },
        { startTime: '17:00:00', endTime: '19:00:00' }
      ];

      const consolidated = fixer.consolidateOverlappingPeriods(periods);

      expect(consolidated).toHaveLength(2);
      expect(consolidated[0].startTime).toBe('09:00:00');
      expect(consolidated[0].endTime).toBe('15:00:00');
      expect(consolidated[1].startTime).toBe('17:00:00');
      expect(consolidated[1].endTime).toBe('19:00:00');
    });

    test('should handle non-overlapping periods', () => {
      const periods = [
        { startTime: '09:00:00', endTime: '12:00:00' },
        { startTime: '13:00:00', endTime: '15:00:00' },
        { startTime: '17:00:00', endTime: '19:00:00' }
      ];

      const consolidated = fixer.consolidateOverlappingPeriods(periods);

      expect(consolidated).toHaveLength(3);
      expect(consolidated).toEqual(periods);
    });

    test('should handle empty or single period arrays', () => {
      expect(fixer.consolidateOverlappingPeriods([])).toEqual([]);
      expect(fixer.consolidateOverlappingPeriods(null)).toEqual(null);
      
      const singlePeriod = [{ startTime: '09:00:00', endTime: '12:00:00' }];
      expect(fixer.consolidateOverlappingPeriods(singlePeriod)).toEqual(singlePeriod);
    });
  });

  describe('calculateExpectedParkStatus', () => {
    test('should calculate correct park status', () => {
      expect(fixer.calculateExpectedParkStatus({ totalCourts: 4, bookedCourts: 0 })).toBe('available');
      expect(fixer.calculateExpectedParkStatus({ totalCourts: 4, bookedCourts: 4 })).toBe('booked');
      expect(fixer.calculateExpectedParkStatus({ totalCourts: 4, bookedCourts: 2 })).toBe('partial');
      expect(fixer.calculateExpectedParkStatus({ totalCourts: 0 })).toBe('available');
    });
  });

  describe('formatTimeRange', () => {
    test('should format time ranges correctly', () => {
      expect(fixer.formatTimeRange('09:00:00', '17:00:00')).toBe('9:00 AM-5:00 PM');
      expect(fixer.formatTimeRange('13:30:00', '18:45:00')).toBe('1:30 PM-6:45 PM');
      expect(fixer.formatTimeRange('00:00:00', '12:00:00')).toBe('12:00 AM-12:00 PM');
    });
  });

  describe('formatTime', () => {
    test('should format times correctly', () => {
      expect(fixer.formatTime('09:00:00')).toBe('9:00 AM');
      expect(fixer.formatTime('13:30:00')).toBe('1:30 PM');
      expect(fixer.formatTime('00:00:00')).toBe('12:00 AM');
      expect(fixer.formatTime('12:00:00')).toBe('12:00 PM');
    });
  });

  describe('timeToMinutes', () => {
    test('should convert time strings to minutes correctly', () => {
      expect(fixer.timeToMinutes('09:00:00')).toBe(540);
      expect(fixer.timeToMinutes('12:30:00')).toBe(750);
      expect(fixer.timeToMinutes('00:00:00')).toBe(0);
      expect(fixer.timeToMinutes('23:59:00')).toBe(1439);
    });

    test('should handle HH:MM format', () => {
      expect(fixer.timeToMinutes('09:00')).toBe(540);
      expect(fixer.timeToMinutes('12:30')).toBe(750);
    });

    test('should handle invalid input', () => {
      expect(fixer.timeToMinutes('')).toBe(0);
      expect(fixer.timeToMinutes(null)).toBe(0);
      expect(fixer.timeToMinutes(undefined)).toBe(0);
    });
  });

  describe('isFixable', () => {
    test('should identify fixable discrepancy types', () => {
      expect(fixer.isFixable({ type: 'time_window_count_mismatch' })).toBe(true);
      expect(fixer.isFixable({ type: 'court_count_mismatch' })).toBe(true);
      expect(fixer.isFixable({ type: 'time_range_mismatch' })).toBe(true);
      expect(fixer.isFixable({ type: 'total_court_count_mismatch' })).toBe(true);
      expect(fixer.isFixable({ type: 'booking_overlap_detected' })).toBe(true);
      expect(fixer.isFixable({ type: 'unknown_type' })).toBe(false);
    });
  });

  describe('getFixResults', () => {
    test('should provide comprehensive fix results', async () => {
      // Set up some test data
      fixer.appliedFixes = [
        { type: 'time_window_count_fix', date: '2025-08-08' },
        { type: 'court_count_fix', date: '2025-08-08' }
      ];
      fixer.validationWarnings = [
        { type: 'missing_source_data', date: '2025-08-09' }
      ];
      fixer.fixedData = { '2025-08-08': { parks: [] } };

      const results = fixer.getFixResults();

      expect(results.summary.totalFixes).toBe(2);
      expect(results.summary.totalWarnings).toBe(1);
      expect(results.summary.dataWasModified).toBe(true);
      expect(results.summary.fixesByType['time_window_count_fix']).toBe(1);
      expect(results.summary.fixesByType['court_count_fix']).toBe(1);
      expect(results.summary.warningsByType['missing_source_data']).toBe(1);
      expect(results.fixedData).toBeDefined();
      expect(results.appliedFixes).toHaveLength(2);
      expect(results.validationWarnings).toHaveLength(1);
    });
  });

  describe('reset', () => {
    test('should reset fixer state', () => {
      fixer.appliedFixes = [{ type: 'test' }];
      fixer.validationWarnings = [{ type: 'test' }];
      fixer.fixedData = { test: 'data' };

      fixer.reset();

      expect(fixer.appliedFixes).toHaveLength(0);
      expect(fixer.validationWarnings).toHaveLength(0);
      expect(fixer.fixedData).toBeNull();
    });
  });
});