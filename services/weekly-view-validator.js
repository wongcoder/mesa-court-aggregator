/**
 * Weekly View Data Validator
 * Validates weekly view data consistency against source data
 * Specifically handles Christopher J. Brady court data validation
 */
class WeeklyViewValidator {
  constructor() {
    this.validationResults = {
      isConsistent: true,
      discrepancies: [],
      warnings: []
    };
  }

  /**
   * Log validation message with timestamp
   * @param {string} level - Log level (INFO, WARN, ERROR)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [WEEKLY_VALIDATOR] [${level}] ${message}`;
    
    if (level === 'ERROR') {
      console.error(logEntry, data || '');
    } else if (level === 'WARN') {
      console.warn(logEntry, data || '');
    } else {
      console.log(logEntry, data || '');
    }
  }

  /**
   * Validate weekly view data against source data
   * @param {Object} weeklyData - Weekly view data to validate
   * @param {Object} sourceData - Source data from cache/API
   * @returns {Object} Validation results with discrepancies and warnings
   */
  validateWeeklyData(weeklyData, sourceData) {
    this.validationResults = {
      isConsistent: true,
      discrepancies: [],
      warnings: []
    };

    this.log('INFO', 'Starting weekly view data validation', {
      weeklyDataDates: Object.keys(weeklyData || {}),
      sourceDataDates: Object.keys(sourceData || {})
    });

    if (!weeklyData || !sourceData) {
      this.validationResults.warnings.push({
        type: 'missing_data',
        message: 'Missing weekly or source data for validation',
        weeklyDataExists: !!weeklyData,
        sourceDataExists: !!sourceData
      });
      return this.validationResults;
    }

    // Compare weekly view data against source data for each date
    for (const [date, dayData] of Object.entries(weeklyData)) {
      const sourceDay = sourceData[date];
      
      if (!sourceDay) {
        this.validationResults.warnings.push({
          type: 'missing_source_data',
          date: date,
          message: `Missing source data for ${date}`
        });
        continue;
      }

      // Validate each park's data for this date
      if (dayData.parks && sourceDay.parks) {
        this.validateDayParks(date, dayData.parks, sourceDay.parks);
      }
    }

    // Log validation summary
    this.log('INFO', 'Weekly view validation completed', {
      isConsistent: this.validationResults.isConsistent,
      discrepancyCount: this.validationResults.discrepancies.length,
      warningCount: this.validationResults.warnings.length
    });

    if (this.validationResults.discrepancies.length > 0) {
      this.log('WARN', 'Data discrepancies detected', {
        discrepancies: this.validationResults.discrepancies
      });
    }

    return this.validationResults;
  }

  /**
   * Validate park data for a specific date
   * @param {string} date - Date being validated
   * @param {Array} weeklyParks - Parks data from weekly view
   * @param {Array} sourceParks - Parks data from source
   */
  validateDayParks(date, weeklyParks, sourceParks) {
    // Create maps for easier comparison
    const weeklyParkMap = new Map();
    const sourceParkMap = new Map();

    weeklyParks.forEach(park => {
      weeklyParkMap.set(park.name, park);
    });

    sourceParks.forEach(park => {
      sourceParkMap.set(park.name, park);
    });

    // Check each park in weekly data
    for (const [parkName, weeklyPark] of weeklyParkMap) {
      const sourcePark = sourceParkMap.get(parkName);
      
      if (!sourcePark) {
        this.validationResults.warnings.push({
          type: 'missing_source_park',
          date: date,
          parkName: parkName,
          message: `Park ${parkName} exists in weekly data but not in source data for ${date}`
        });
        continue;
      }

      // Validate Christopher J. Brady data specifically
      if (parkName.includes('Brady') || parkName.includes('Monterey')) {
        const discrepancy = this.compareBradyData(weeklyPark, sourcePark, date);
        if (discrepancy) {
          this.validationResults.discrepancies.push(discrepancy);
          this.validationResults.isConsistent = false;
        }
      }

      // General park validation
      this.validateParkData(date, parkName, weeklyPark, sourcePark);
    }

    // Check for parks that exist in source but not in weekly data
    for (const [parkName, sourcePark] of sourceParkMap) {
      if (!weeklyParkMap.has(parkName)) {
        this.validationResults.warnings.push({
          type: 'missing_weekly_park',
          date: date,
          parkName: parkName,
          message: `Park ${parkName} exists in source data but not in weekly data for ${date}`
        });
      }
    }
  }

  /**
   * Compare Christopher J. Brady specific data for discrepancies
   * @param {Object} weeklyData - Weekly view park data
   * @param {Object} sourceData - Source park data
   * @param {string} date - Date being compared
   * @returns {Object|null} Discrepancy object or null if no discrepancy
   */
  compareBradyData(weeklyData, sourceData, date) {
    this.log('INFO', `Validating Brady data for ${date}`, {
      weeklyPark: weeklyData.name,
      sourcePark: sourceData.name
    });

    // Compare time windows if they exist
    const weeklyWindows = weeklyData.timeWindows || [];
    const sourceWindows = sourceData.timeWindows || [];

    // Check time window count mismatch
    if (weeklyWindows.length !== sourceWindows.length) {
      return {
        type: 'time_window_count_mismatch',
        date: date,
        parkName: weeklyData.name,
        weeklyCount: weeklyWindows.length,
        sourceCount: sourceWindows.length,
        message: `Brady data: Weekly view shows ${weeklyWindows.length} time windows, source has ${sourceWindows.length}`,
        severity: 'high'
      };
    }

    // Compare individual time windows
    for (let i = 0; i < weeklyWindows.length; i++) {
      const weeklyWindow = weeklyWindows[i];
      const sourceWindow = sourceWindows[i];

      // Compare court counts in time windows
      const weeklyCourts = weeklyWindow.courts || [];
      const sourceCourts = sourceWindow.courts || [];

      if (weeklyCourts.length !== sourceCourts.length) {
        return {
          type: 'court_count_mismatch',
          date: date,
          parkName: weeklyData.name,
          timeWindow: weeklyWindow.displayTime || weeklyWindow.startTime,
          weeklyCount: weeklyCourts.length,
          sourceCount: sourceCourts.length,
          message: `Brady data mismatch at ${weeklyWindow.displayTime || weeklyWindow.startTime}: Weekly shows ${weeklyCourts.length} courts, source shows ${sourceCourts.length}`,
          severity: 'high',
          details: {
            weeklyTimeWindow: weeklyWindow,
            sourceTimeWindow: sourceWindow
          }
        };
      }

      // Compare time ranges
      if (weeklyWindow.startTime !== sourceWindow.startTime || 
          weeklyWindow.endTime !== sourceWindow.endTime) {
        return {
          type: 'time_range_mismatch',
          date: date,
          parkName: weeklyData.name,
          weeklyTimeRange: `${weeklyWindow.startTime}-${weeklyWindow.endTime}`,
          sourceTimeRange: `${sourceWindow.startTime}-${sourceWindow.endTime}`,
          message: `Brady data time range mismatch: Weekly shows ${weeklyWindow.startTime}-${weeklyWindow.endTime}, source shows ${sourceWindow.startTime}-${sourceWindow.endTime}`,
          severity: 'medium'
        };
      }
    }

    // Compare court data if available
    if (weeklyData.courts && sourceData.courts) {
      const weeklyCourtCount = weeklyData.courts.length;
      const sourceCourtCount = sourceData.courts.length;

      if (weeklyCourtCount !== sourceCourtCount) {
        return {
          type: 'total_court_count_mismatch',
          date: date,
          parkName: weeklyData.name,
          weeklyCount: weeklyCourtCount,
          sourceCount: sourceCourtCount,
          message: `Brady data total court count mismatch: Weekly shows ${weeklyCourtCount} courts, source shows ${sourceCourtCount}`,
          severity: 'high'
        };
      }

      // Check for booking period overlaps or inconsistencies
      const overlapIssues = this.detectBookingOverlaps(weeklyData.courts, sourceData.courts, date);
      if (overlapIssues.length > 0) {
        return {
          type: 'booking_overlap_detected',
          date: date,
          parkName: weeklyData.name,
          message: `Brady data booking overlaps detected for ${date}`,
          severity: 'high',
          overlapDetails: overlapIssues
        };
      }
    }

    return null; // No discrepancy found
  }

  /**
   * General park data validation
   * @param {string} date - Date being validated
   * @param {string} parkName - Name of the park
   * @param {Object} weeklyPark - Weekly view park data
   * @param {Object} sourcePark - Source park data
   */
  validateParkData(date, parkName, weeklyPark, sourcePark) {
    // Check park status consistency
    if (weeklyPark.status !== sourcePark.status) {
      this.validationResults.warnings.push({
        type: 'park_status_mismatch',
        date: date,
        parkName: parkName,
        weeklyStatus: weeklyPark.status,
        sourceStatus: sourcePark.status,
        message: `Park status mismatch for ${parkName} on ${date}: Weekly shows '${weeklyPark.status}', source shows '${sourcePark.status}'`
      });
    }

    // Check total courts count
    if (weeklyPark.totalCourts !== sourcePark.totalCourts) {
      this.validationResults.warnings.push({
        type: 'total_courts_mismatch',
        date: date,
        parkName: parkName,
        weeklyTotal: weeklyPark.totalCourts,
        sourceTotal: sourcePark.totalCourts,
        message: `Total courts mismatch for ${parkName} on ${date}: Weekly shows ${weeklyPark.totalCourts}, source shows ${sourcePark.totalCourts}`
      });
    }

    // Check booked courts count
    if (weeklyPark.bookedCourts !== sourcePark.bookedCourts) {
      this.validationResults.warnings.push({
        type: 'booked_courts_mismatch',
        date: date,
        parkName: parkName,
        weeklyBooked: weeklyPark.bookedCourts,
        sourceBooked: sourcePark.bookedCourts,
        message: `Booked courts mismatch for ${parkName} on ${date}: Weekly shows ${weeklyPark.bookedCourts}, source shows ${sourcePark.bookedCourts}`
      });
    }
  }

  /**
   * Detect booking period overlaps and inconsistencies
   * @param {Array} weeklyCourts - Courts data from weekly view
   * @param {Array} sourceCourts - Courts data from source
   * @param {string} date - Date being checked
   * @returns {Array} Array of overlap issues
   */
  detectBookingOverlaps(weeklyCourts, sourceCourts, date) {
    const overlapIssues = [];

    // Check for overlapping booking periods within weekly data
    weeklyCourts.forEach((court, courtIndex) => {
      if (court.bookingPeriods && court.bookingPeriods.length > 1) {
        const periods = court.bookingPeriods;
        
        for (let i = 0; i < periods.length - 1; i++) {
          const current = periods[i];
          const next = periods[i + 1];
          
          if (this.timePeriodsOverlap(current, next)) {
            overlapIssues.push({
              type: 'weekly_booking_overlap',
              courtName: court.resourceName,
              courtIndex: courtIndex,
              overlappingPeriods: [current, next],
              message: `Overlapping booking periods in weekly data: ${current.startTime}-${current.endTime} and ${next.startTime}-${next.endTime}`
            });
          }
        }
      }
    });

    // Compare booking periods between weekly and source data
    weeklyCourts.forEach((weeklyCourt, courtIndex) => {
      const sourceCourt = sourceCourts.find(sc => 
        sc.resourceName === weeklyCourt.resourceName || 
        sc.resourceId === weeklyCourt.resourceId
      );

      if (sourceCourt && weeklyCourt.bookingPeriods && sourceCourt.bookingPeriods) {
        const weeklyPeriods = weeklyCourt.bookingPeriods;
        const sourcePeriods = sourceCourt.bookingPeriods;

        // Check if booking periods are significantly different
        if (weeklyPeriods.length !== sourcePeriods.length) {
          overlapIssues.push({
            type: 'booking_period_count_mismatch',
            courtName: weeklyCourt.resourceName,
            weeklyPeriodCount: weeklyPeriods.length,
            sourcePeriodCount: sourcePeriods.length,
            message: `Booking period count mismatch for ${weeklyCourt.resourceName}: Weekly has ${weeklyPeriods.length}, source has ${sourcePeriods.length}`
          });
        }
      }
    });

    return overlapIssues;
  }

  /**
   * Check if two time periods overlap
   * @param {Object} period1 - First time period with startTime and endTime
   * @param {Object} period2 - Second time period with startTime and endTime
   * @returns {boolean} True if periods overlap
   */
  timePeriodsOverlap(period1, period2) {
    if (!period1.startTime || !period1.endTime || !period2.startTime || !period2.endTime) {
      return false;
    }

    const start1 = this.timeToMinutes(period1.startTime);
    const end1 = this.timeToMinutes(period1.endTime);
    const start2 = this.timeToMinutes(period2.startTime);
    const end2 = this.timeToMinutes(period2.endTime);

    // Check if periods overlap (start of one is before end of other and vice versa)
    return start1 < end2 && start2 < end1;
  }

  /**
   * Convert time string to minutes since midnight
   * @param {string} timeString - Time in HH:MM:SS or HH:MM format
   * @returns {number} Minutes since midnight
   */
  timeToMinutes(timeString) {
    if (!timeString) return 0;
    
    const parts = timeString.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    
    return hours * 60 + minutes;
  }

  /**
   * Get validation summary for reporting
   * @returns {Object} Summary of validation results
   */
  getValidationSummary() {
    const summary = {
      isValid: this.validationResults.isConsistent,
      totalIssues: this.validationResults.discrepancies.length + this.validationResults.warnings.length,
      criticalIssues: this.validationResults.discrepancies.length,
      warnings: this.validationResults.warnings.length,
      bradySpecificIssues: this.validationResults.discrepancies.filter(d => 
        d.parkName && (d.parkName.includes('Brady') || d.parkName.includes('Monterey'))
      ).length
    };

    // Categorize issues by type
    summary.issuesByType = {};
    
    [...this.validationResults.discrepancies, ...this.validationResults.warnings].forEach(issue => {
      if (!summary.issuesByType[issue.type]) {
        summary.issuesByType[issue.type] = 0;
      }
      summary.issuesByType[issue.type]++;
    });

    return summary;
  }

  /**
   * Reset validation results for new validation run
   */
  reset() {
    this.validationResults = {
      isConsistent: true,
      discrepancies: [],
      warnings: []
    };
  }

  /**
   * Get detailed validation results
   * @returns {Object} Complete validation results
   */
  getResults() {
    return {
      ...this.validationResults,
      summary: this.getValidationSummary(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WeeklyViewValidator;