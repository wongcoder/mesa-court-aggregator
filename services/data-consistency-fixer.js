const WeeklyViewValidator = require('./weekly-view-validator');

/**
 * Data Consistency Fixer
 * Identifies and resolves weekly view data mismatches
 * Ensures time windows align correctly with source data
 * Adds validation warnings for data inconsistencies
 */
class DataConsistencyFixer {
  constructor() {
    this.validator = new WeeklyViewValidator();
    this.fixedData = null;
    this.appliedFixes = [];
    this.validationWarnings = [];
  }

  /**
   * Log message with timestamp and context
   * @param {string} level - Log level (INFO, WARN, ERROR)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [DATA_FIXER] [${level}] ${message}`;
    
    if (level === 'ERROR') {
      console.error(logEntry, data || '');
    } else if (level === 'WARN') {
      console.warn(logEntry, data || '');
    } else {
      console.log(logEntry, data || '');
    }
  }

  /**
   * Fix data processing inconsistencies in weekly view data
   * @param {Object} weeklyData - Weekly view data to fix
   * @param {Object} sourceData - Source data to validate against
   * @param {Object} options - Fix options
   * @returns {Object} Fixed data with applied fixes and warnings
   */
  async fixDataInconsistencies(weeklyData, sourceData, options = {}) {
    const {
      autoFix = true,
      preserveOriginal = true,
      strictValidation = true
    } = options;

    this.log('INFO', 'Starting data consistency fixing process', {
      weeklyDataDates: Object.keys(weeklyData || {}),
      sourceDataDates: Object.keys(sourceData || {}),
      autoFix,
      strictValidation
    });

    // Reset state
    this.appliedFixes = [];
    this.validationWarnings = [];
    this.fixedData = preserveOriginal ? this.deepClone(weeklyData) : weeklyData;

    if (!weeklyData || !sourceData) {
      this.validationWarnings.push({
        type: 'missing_data',
        severity: 'high',
        message: 'Cannot fix inconsistencies: missing weekly or source data',
        weeklyDataExists: !!weeklyData,
        sourceDataExists: !!sourceData
      });
      return this.getFixResults();
    }

    // First, validate the data to identify issues
    const validationResults = this.validator.validateWeeklyData(weeklyData, sourceData);

    this.log('INFO', 'Validation completed', {
      isConsistent: validationResults.isConsistent,
      discrepancyCount: validationResults.discrepancies.length,
      warningCount: validationResults.warnings.length
    });

    // Process each discrepancy and apply fixes if enabled
    for (const discrepancy of validationResults.discrepancies) {
      if (autoFix) {
        await this.applyFix(discrepancy, sourceData);
      } else {
        this.validationWarnings.push({
          ...discrepancy,
          fixAvailable: this.isFixable(discrepancy),
          autoFixDisabled: true
        });
      }
    }

    // Add validation warnings to our warnings list
    this.validationWarnings.push(...validationResults.warnings.map(warning => ({
      ...warning,
      source: 'validator'
    })));

    // Perform additional consistency checks only if auto-fixing
    if (autoFix) {
      await this.performAdditionalConsistencyChecks();

      // Ensure time windows align correctly
      await this.alignTimeWindows();
    }

    const results = this.getFixResults();
    
    this.log('INFO', 'Data consistency fixing completed', {
      totalFixes: results.appliedFixes.length,
      totalWarnings: results.validationWarnings.length,
      dataFixed: results.appliedFixes.length > 0
    });

    return results;
  }

  /**
   * Apply a specific fix for a data discrepancy
   * @param {Object} discrepancy - Discrepancy to fix
   * @param {Object} sourceData - Source data for reference
   */
  async applyFix(discrepancy, sourceData) {
    const { type, date, parkName } = discrepancy;

    this.log('INFO', `Applying fix for ${type}`, {
      date,
      parkName,
      severity: discrepancy.severity
    });

    try {
      switch (type) {
        case 'time_window_count_mismatch':
          await this.fixTimeWindowCountMismatch(discrepancy, sourceData);
          break;
        
        case 'court_count_mismatch':
          await this.fixCourtCountMismatch(discrepancy, sourceData);
          break;
        
        case 'time_range_mismatch':
          await this.fixTimeRangeMismatch(discrepancy, sourceData);
          break;
        
        case 'total_court_count_mismatch':
          await this.fixTotalCourtCountMismatch(discrepancy, sourceData);
          break;
        
        case 'booking_overlap_detected':
          await this.fixBookingOverlaps(discrepancy, sourceData);
          break;
        
        default:
          this.validationWarnings.push({
            ...discrepancy,
            fixApplied: false,
            reason: 'No fix available for this discrepancy type'
          });
      }
    } catch (error) {
      this.log('ERROR', `Failed to apply fix for ${type}`, {
        date,
        parkName,
        error: error.message
      });
      
      this.validationWarnings.push({
        ...discrepancy,
        fixApplied: false,
        fixError: error.message
      });
    }
  }

  /**
   * Fix time window count mismatch by using source data
   * @param {Object} discrepancy - Time window count mismatch discrepancy
   * @param {Object} sourceData - Source data
   */
  async fixTimeWindowCountMismatch(discrepancy, sourceData) {
    const { date, parkName } = discrepancy;
    
    if (!this.fixedData[date] || !this.fixedData[date].parks) {
      return;
    }

    const weeklyPark = this.fixedData[date].parks.find(p => p.name === parkName);
    const sourcePark = sourceData[date]?.parks?.find(p => p.name === parkName);

    if (!weeklyPark || !sourcePark) {
      return;
    }

    // Replace weekly time windows with source time windows
    const originalTimeWindows = weeklyPark.timeWindows || [];
    weeklyPark.timeWindows = JSON.parse(JSON.stringify(sourcePark.timeWindows || []));

    this.appliedFixes.push({
      type: 'time_window_count_fix',
      date,
      parkName,
      originalCount: originalTimeWindows.length,
      fixedCount: weeklyPark.timeWindows.length,
      message: `Fixed time window count mismatch: ${originalTimeWindows.length} → ${weeklyPark.timeWindows.length}`,
      timestamp: new Date().toISOString()
    });

    this.log('INFO', `Fixed time window count mismatch for ${parkName} on ${date}`, {
      originalCount: originalTimeWindows.length,
      fixedCount: weeklyPark.timeWindows.length
    });
  }

  /**
   * Fix court count mismatch in time windows
   * @param {Object} discrepancy - Court count mismatch discrepancy
   * @param {Object} sourceData - Source data
   */
  async fixCourtCountMismatch(discrepancy, sourceData) {
    const { date, parkName, timeWindow } = discrepancy;
    
    if (!this.fixedData[date] || !this.fixedData[date].parks) {
      return;
    }

    const weeklyPark = this.fixedData[date].parks.find(p => p.name === parkName);
    const sourcePark = sourceData[date]?.parks?.find(p => p.name === parkName);

    if (!weeklyPark || !sourcePark) {
      return;
    }

    // Find the specific time window and fix court count
    const weeklyWindow = weeklyPark.timeWindows?.find(w => 
      w.displayTime === timeWindow || w.startTime === timeWindow
    );
    const sourceWindow = sourcePark.timeWindows?.find(w => 
      w.displayTime === timeWindow || w.startTime === timeWindow
    );

    if (weeklyWindow && sourceWindow) {
      const originalCourts = weeklyWindow.courts || [];
      weeklyWindow.courts = JSON.parse(JSON.stringify(sourceWindow.courts || []));

      this.appliedFixes.push({
        type: 'court_count_fix',
        date,
        parkName,
        timeWindow,
        originalCount: originalCourts.length,
        fixedCount: weeklyWindow.courts.length,
        message: `Fixed court count in time window ${timeWindow}: ${originalCourts.length} → ${weeklyWindow.courts.length}`,
        timestamp: new Date().toISOString()
      });

      this.log('INFO', `Fixed court count mismatch for ${parkName} at ${timeWindow} on ${date}`, {
        originalCount: originalCourts.length,
        fixedCount: weeklyWindow.courts.length
      });
    }
  }

  /**
   * Fix time range mismatch by using source data
   * @param {Object} discrepancy - Time range mismatch discrepancy
   * @param {Object} sourceData - Source data
   */
  async fixTimeRangeMismatch(discrepancy, sourceData) {
    const { date, parkName, weeklyTimeRange, sourceTimeRange } = discrepancy;
    
    if (!this.fixedData[date] || !this.fixedData[date].parks) {
      return;
    }

    const weeklyPark = this.fixedData[date].parks.find(p => p.name === parkName);
    const sourcePark = sourceData[date]?.parks?.find(p => p.name === parkName);

    if (!weeklyPark || !sourcePark || !weeklyPark.timeWindows || !sourcePark.timeWindows) {
      return;
    }

    // Find and fix the mismatched time window
    for (let i = 0; i < weeklyPark.timeWindows.length && i < sourcePark.timeWindows.length; i++) {
      const weeklyWindow = weeklyPark.timeWindows[i];
      const sourceWindow = sourcePark.timeWindows[i];

      const weeklyRange = `${weeklyWindow.startTime}-${weeklyWindow.endTime}`;
      if (weeklyRange === weeklyTimeRange) {
        weeklyWindow.startTime = sourceWindow.startTime;
        weeklyWindow.endTime = sourceWindow.endTime;
        weeklyWindow.displayTime = sourceWindow.displayTime;

        this.appliedFixes.push({
          type: 'time_range_fix',
          date,
          parkName,
          originalRange: weeklyTimeRange,
          fixedRange: sourceTimeRange,
          message: `Fixed time range mismatch: ${weeklyTimeRange} → ${sourceTimeRange}`,
          timestamp: new Date().toISOString()
        });

        this.log('INFO', `Fixed time range mismatch for ${parkName} on ${date}`, {
          originalRange: weeklyTimeRange,
          fixedRange: sourceTimeRange
        });
        break;
      }
    }
  }

  /**
   * Fix total court count mismatch
   * @param {Object} discrepancy - Total court count mismatch discrepancy
   * @param {Object} sourceData - Source data
   */
  async fixTotalCourtCountMismatch(discrepancy, sourceData) {
    const { date, parkName } = discrepancy;
    
    if (!this.fixedData[date] || !this.fixedData[date].parks) {
      return;
    }

    const weeklyPark = this.fixedData[date].parks.find(p => p.name === parkName);
    const sourcePark = sourceData[date]?.parks?.find(p => p.name === parkName);

    if (!weeklyPark || !sourcePark) {
      return;
    }

    // Update court-related counts from source
    const originalTotalCourts = weeklyPark.totalCourts;
    const originalBookedCourts = weeklyPark.bookedCourts;

    weeklyPark.totalCourts = sourcePark.totalCourts;
    weeklyPark.bookedCourts = sourcePark.bookedCourts;
    weeklyPark.availableCourts = sourcePark.availableCourts;
    weeklyPark.partiallyBookedCourts = sourcePark.partiallyBookedCourts;

    // Update courts array if available
    if (sourcePark.courts) {
      weeklyPark.courts = JSON.parse(JSON.stringify(sourcePark.courts));
    }

    this.appliedFixes.push({
      type: 'total_court_count_fix',
      date,
      parkName,
      originalTotalCourts,
      fixedTotalCourts: weeklyPark.totalCourts,
      originalBookedCourts,
      fixedBookedCourts: weeklyPark.bookedCourts,
      message: `Fixed total court count: ${originalTotalCourts} → ${weeklyPark.totalCourts}, booked: ${originalBookedCourts} → ${weeklyPark.bookedCourts}`,
      timestamp: new Date().toISOString()
    });

    this.log('INFO', `Fixed total court count mismatch for ${parkName} on ${date}`, {
      originalTotal: originalTotalCourts,
      fixedTotal: weeklyPark.totalCourts,
      originalBooked: originalBookedCourts,
      fixedBooked: weeklyPark.bookedCourts
    });
  }

  /**
   * Fix booking overlaps by consolidating overlapping periods
   * @param {Object} discrepancy - Booking overlap discrepancy
   * @param {Object} sourceData - Source data
   */
  async fixBookingOverlaps(discrepancy, sourceData) {
    const { date, parkName, overlapDetails } = discrepancy;
    
    if (!this.fixedData[date] || !this.fixedData[date].parks || !overlapDetails) {
      return;
    }

    const weeklyPark = this.fixedData[date].parks.find(p => p.name === parkName);
    if (!weeklyPark || !weeklyPark.courts) {
      return;
    }

    let fixesApplied = 0;

    // Fix overlapping booking periods
    overlapDetails.forEach(overlap => {
      if (overlap.type === 'weekly_booking_overlap' && overlap.courtIndex !== undefined) {
        const court = weeklyPark.courts[overlap.courtIndex];
        if (court && court.bookingPeriods) {
          // Consolidate overlapping periods
          const consolidatedPeriods = this.consolidateOverlappingPeriods(court.bookingPeriods);
          court.bookingPeriods = consolidatedPeriods;
          fixesApplied++;
        }
      }
    });

    if (fixesApplied > 0) {
      this.appliedFixes.push({
        type: 'booking_overlap_fix',
        date,
        parkName,
        overlapsFixed: fixesApplied,
        message: `Fixed ${fixesApplied} booking overlaps for ${parkName}`,
        timestamp: new Date().toISOString()
      });

      this.log('INFO', `Fixed booking overlaps for ${parkName} on ${date}`, {
        overlapsFixed: fixesApplied
      });
    }
  }

  /**
   * Consolidate overlapping booking periods
   * @param {Array} periods - Array of booking periods
   * @returns {Array} Consolidated periods without overlaps
   */
  consolidateOverlappingPeriods(periods) {
    if (!periods || periods.length <= 1) {
      return periods;
    }

    // Sort periods by start time
    const sortedPeriods = periods.slice().sort((a, b) => {
      const timeA = this.timeToMinutes(a.startTime);
      const timeB = this.timeToMinutes(b.startTime);
      return timeA - timeB;
    });

    const consolidated = [sortedPeriods[0]];

    for (let i = 1; i < sortedPeriods.length; i++) {
      const current = sortedPeriods[i];
      const last = consolidated[consolidated.length - 1];

      // Check if current period overlaps with the last consolidated period
      if (this.timeToMinutes(current.startTime) <= this.timeToMinutes(last.endTime)) {
        // Merge the periods
        last.endTime = this.timeToMinutes(current.endTime) > this.timeToMinutes(last.endTime) 
          ? current.endTime 
          : last.endTime;
      } else {
        // No overlap, add as new period
        consolidated.push(current);
      }
    }

    return consolidated;
  }

  /**
   * Perform additional consistency checks beyond basic validation
   */
  async performAdditionalConsistencyChecks() {
    if (!this.fixedData) return;

    for (const [date, dayData] of Object.entries(this.fixedData)) {
      if (!dayData.parks) continue;

      for (const park of dayData.parks) {
        // Check for logical inconsistencies in park status
        await this.checkParkStatusConsistency(park, date);
        
        // Check for time window gaps or overlaps
        await this.checkTimeWindowConsistency(park, date);
        
        // Check for court utilization calculation accuracy
        await this.checkUtilizationConsistency(park, date);
      }
    }
  }

  /**
   * Check park status consistency with actual booking data
   * @param {Object} park - Park data to check
   * @param {string} date - Date being checked
   */
  async checkParkStatusConsistency(park, date) {
    if (!park.totalCourts || park.totalCourts === 0) {
      return;
    }

    const expectedStatus = this.calculateExpectedParkStatus(park);
    
    if (park.status !== expectedStatus) {
      this.validationWarnings.push({
        type: 'park_status_inconsistency',
        date,
        parkName: park.name,
        currentStatus: park.status,
        expectedStatus,
        severity: 'medium',
        message: `Park status inconsistency: status is '${park.status}' but should be '${expectedStatus}' based on booking data`
      });

      // Auto-fix the status
      park.status = expectedStatus;
      
      this.appliedFixes.push({
        type: 'park_status_fix',
        date,
        parkName: park.name,
        originalStatus: park.status,
        fixedStatus: expectedStatus,
        message: `Fixed park status: ${park.status} → ${expectedStatus}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Calculate expected park status based on booking data
   * @param {Object} park - Park data
   * @returns {string} Expected status
   */
  calculateExpectedParkStatus(park) {
    if (!park.totalCourts || park.totalCourts === 0) {
      return 'available';
    }

    const bookedCourts = park.bookedCourts || 0;
    
    if (bookedCourts === 0) {
      return 'available';
    } else if (bookedCourts === park.totalCourts) {
      return 'booked';
    } else {
      return 'partial';
    }
  }

  /**
   * Check time window consistency for gaps and proper sequencing
   * @param {Object} park - Park data to check
   * @param {string} date - Date being checked
   */
  async checkTimeWindowConsistency(park, date) {
    if (!park.timeWindows || park.timeWindows.length <= 1) {
      return;
    }

    // Sort time windows by start time
    const sortedWindows = park.timeWindows.slice().sort((a, b) => {
      return this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
    });

    // Check for overlaps or inconsistent sequencing
    for (let i = 0; i < sortedWindows.length - 1; i++) {
      const current = sortedWindows[i];
      const next = sortedWindows[i + 1];

      const currentEnd = this.timeToMinutes(current.endTime);
      const nextStart = this.timeToMinutes(next.startTime);

      if (currentEnd > nextStart) {
        this.validationWarnings.push({
          type: 'time_window_overlap',
          date,
          parkName: park.name,
          window1: `${current.startTime}-${current.endTime}`,
          window2: `${next.startTime}-${next.endTime}`,
          severity: 'high',
          message: `Time window overlap detected: ${current.startTime}-${current.endTime} overlaps with ${next.startTime}-${next.endTime}`
        });
      }
    }
  }

  /**
   * Check utilization calculation consistency
   * @param {Object} park - Park data to check
   * @param {string} date - Date being checked
   */
  async checkUtilizationConsistency(park, date) {
    if (!park.timeWindows || !park.totalCourts) {
      return;
    }

    // Check each time window's utilization
    park.timeWindows.forEach((window, index) => {
      const courtCount = window.courts ? window.courts.length : 0;
      const expectedUtilization = `${courtCount}/${park.totalCourts}`;
      
      // This would be compared against actual utilization if it exists in the data
      // For now, we just validate that court count doesn't exceed total courts
      if (courtCount > park.totalCourts) {
        this.validationWarnings.push({
          type: 'utilization_inconsistency',
          date,
          parkName: park.name,
          timeWindow: window.displayTime || `${window.startTime}-${window.endTime}`,
          courtCount,
          totalCourts: park.totalCourts,
          severity: 'high',
          message: `Court count (${courtCount}) exceeds total courts (${park.totalCourts}) in time window`
        });
      }
    });
  }

  /**
   * Ensure time windows align correctly with expected patterns
   */
  async alignTimeWindows() {
    if (!this.fixedData) return;

    for (const [date, dayData] of Object.entries(this.fixedData)) {
      if (!dayData.parks) continue;

      for (const park of dayData.parks) {
        if (!park.timeWindows) continue;

        // Sort time windows by start time
        park.timeWindows.sort((a, b) => {
          return this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime);
        });

        // Ensure display times are consistent with actual times
        park.timeWindows.forEach(window => {
          if (window.startTime && window.endTime) {
            const expectedDisplayTime = this.formatTimeRange(window.startTime, window.endTime);
            if (window.displayTime !== expectedDisplayTime) {
              window.displayTime = expectedDisplayTime;
              
              this.appliedFixes.push({
                type: 'display_time_alignment',
                date,
                parkName: park.name,
                timeWindow: `${window.startTime}-${window.endTime}`,
                message: `Aligned display time for time window`,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
      }
    }
  }

  /**
   * Format time range for display
   * @param {string} startTime - Start time in HH:MM:SS format
   * @param {string} endTime - End time in HH:MM:SS format
   * @returns {string} Formatted time range
   */
  formatTimeRange(startTime, endTime) {
    const start = this.formatTime(startTime);
    const end = this.formatTime(endTime);
    return `${start}-${end}`;
  }

  /**
   * Format time for display (convert 24h to 12h format)
   * @param {string} time24 - Time in HH:MM:SS format
   * @returns {string} Time in 12h format
   */
  formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
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
   * Check if a discrepancy is fixable
   * @param {Object} discrepancy - Discrepancy to check
   * @returns {boolean} True if fixable
   */
  isFixable(discrepancy) {
    const fixableTypes = [
      'time_window_count_mismatch',
      'court_count_mismatch',
      'time_range_mismatch',
      'total_court_count_mismatch',
      'booking_overlap_detected'
    ];
    
    return fixableTypes.includes(discrepancy.type);
  }

  /**
   * Get comprehensive fix results
   * @returns {Object} Fix results with fixed data, applied fixes, and warnings
   */
  getFixResults() {
    return {
      fixedData: this.fixedData,
      appliedFixes: this.appliedFixes,
      validationWarnings: this.validationWarnings,
      summary: {
        totalFixes: this.appliedFixes.length,
        totalWarnings: this.validationWarnings.length,
        dataWasModified: this.appliedFixes.length > 0,
        fixesByType: this.groupFixesByType(),
        warningsByType: this.groupWarningsByType(),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Group applied fixes by type for summary
   * @returns {Object} Fixes grouped by type
   */
  groupFixesByType() {
    const grouped = {};
    this.appliedFixes.forEach(fix => {
      if (!grouped[fix.type]) {
        grouped[fix.type] = 0;
      }
      grouped[fix.type]++;
    });
    return grouped;
  }

  /**
   * Group warnings by type for summary
   * @returns {Object} Warnings grouped by type
   */
  groupWarningsByType() {
    const grouped = {};
    this.validationWarnings.forEach(warning => {
      if (!grouped[warning.type]) {
        grouped[warning.type] = 0;
      }
      grouped[warning.type]++;
    });
    return grouped;
  }

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Deep cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }

  /**
   * Reset the fixer state for new operation
   */
  reset() {
    this.fixedData = null;
    this.appliedFixes = [];
    this.validationWarnings = [];
    this.validator.reset();
  }
}

module.exports = DataConsistencyFixer;