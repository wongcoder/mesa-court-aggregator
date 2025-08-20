/**
 * Court Utilization Calculator Service
 * 
 * Calculates and formats court utilization ratios for display across the application.
 * Provides methods to compute booked/total court ratios, enhance time windows with
 * utilization data, and format display strings.
 * 
 * Features:
 * - Caches park court counts for performance
 * - Handles multiple data structures (with/without time windows)
 * - Provides consistent "X/Y" formatting
 * - Calculates peak utilization across time periods
 * 
 * @class CourtUtilizationCalculator
 */
class CourtUtilizationCalculator {
  constructor() {
    // Cache for park total court counts to avoid recalculation
    this.parkCourtCounts = new Map();
  }

  /**
   * Calculate court utilization for a specific time window
   * @param {Object} parkData - Park data object
   * @param {Object} timeWindow - Time window object with courts array
   * @returns {Object} Utilization data object
   */
  calculateUtilization(parkData, timeWindow) {
    const totalCourts = this.getTotalCourtsForPark(parkData);
    const bookedCourts = timeWindow.courts ? timeWindow.courts.length : 0;
    
    return {
      bookedCount: bookedCourts,
      totalCount: totalCourts,
      displayText: `${bookedCourts}/${totalCourts}`,
      utilizationPercentage: totalCourts > 0 ? Math.round((bookedCourts / totalCourts) * 100) : 0,
      isEmpty: bookedCourts === 0,
      isFull: bookedCourts === totalCourts
    };
  }

  /**
   * Get total court count for a park
   * @param {Object} parkData - Park data object
   * @returns {number} Total number of courts
   */
  getTotalCourtsForPark(parkData) {
    // Use cached value if available
    if (this.parkCourtCounts.has(parkData.name)) {
      return this.parkCourtCounts.get(parkData.name);
    }

    let totalCourts = 0;

    // Try to get from park data properties first
    if (parkData.totalCourts && typeof parkData.totalCourts === 'number') {
      totalCourts = parkData.totalCourts;
    } else if (parkData.courts && Array.isArray(parkData.courts)) {
      // Count unique courts from all court resources
      const uniqueCourts = new Set();
      parkData.courts.forEach(court => {
        if (court.resourceName) {
          uniqueCourts.add(court.resourceName);
        }
      });
      totalCourts = uniqueCourts.size;
    } else {
      // Fallback: analyze all time windows to find maximum concurrent courts
      totalCourts = this.calculateMaxConcurrentCourts(parkData);
    }

    // Cache the result
    this.parkCourtCounts.set(parkData.name, totalCourts);
    return totalCourts;
  }

  /**
   * Calculate maximum concurrent courts from time windows
   * @param {Object} parkData - Park data object
   * @returns {number} Maximum number of concurrent courts
   */
  calculateMaxConcurrentCourts(parkData) {
    if (!parkData.timeWindows || !Array.isArray(parkData.timeWindows)) {
      return 0;
    }

    // Find the time window with the most courts
    let maxCourts = 0;
    parkData.timeWindows.forEach(window => {
      if (window.courts && Array.isArray(window.courts)) {
        maxCourts = Math.max(maxCourts, window.courts.length);
      }
    });

    return maxCourts;
  }

  /**
   * Enhance time windows with utilization data
   * @param {Object} parkData - Park data object
   * @returns {Array} Enhanced time windows with utilization information
   */
  enhanceTimeWindowsWithUtilization(parkData) {
    if (!parkData.timeWindows || !Array.isArray(parkData.timeWindows)) {
      return [];
    }
    
    return parkData.timeWindows.map(window => ({
      ...window,
      utilization: this.calculateUtilization(parkData, window),
      displayLabel: this.createDisplayLabel(window, parkData)
    }));
  }

  /**
   * Create display label with utilization information
   * @param {Object} timeWindow - Time window object
   * @param {Object} parkData - Park data object
   * @returns {Object} Display label object
   */
  createDisplayLabel(timeWindow, parkData) {
    const utilization = this.calculateUtilization(parkData, timeWindow);
    const timeLabel = this.formatTimeRange(timeWindow.startTime, timeWindow.endTime);
    
    return {
      parkName: this.getShortParkName(parkData.name),
      timeRange: timeLabel,
      utilization: utilization.displayText,
      fullText: `${utilization.displayText} courts booked`,
      utilizationPercentage: utilization.utilizationPercentage
    };
  }

  /**
   * Format time range for display
   * @param {string} startTime - Start time in HH:MM:SS format
   * @param {string} endTime - End time in HH:MM:SS format
   * @returns {string} Formatted time range
   */
  formatTimeRange(startTime, endTime) {
    if (!startTime || !endTime) {
      return 'All Day';
    }

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
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  /**
   * Get shortened park name for display
   * @param {string} parkName - Full park name
   * @returns {string} Shortened park name
   */
  getShortParkName(parkName) {
    const shortNames = {
      'Kleinman Park': 'Kleinman',
      'Gene Autry Park': 'Gene Autry',
      'Red Mountain Park': 'Red Mtn',
      'Monterey Park': 'Monterey',
      'Christopher J Brady': 'Brady'
    };
    return shortNames[parkName] || parkName;
  }

  /**
   * Calculate overall park utilization for a given time period
   * @param {Object} parkData - Park data object
   * @param {string} startTime - Start time for calculation period
   * @param {string} endTime - End time for calculation period
   * @returns {Object} Overall utilization data
   */
  calculateParkUtilization(parkData, startTime = null, endTime = null) {
    const totalCourts = this.getTotalCourtsForPark(parkData);
    
    if (!parkData.timeWindows || parkData.timeWindows.length === 0) {
      // Handle parks without specific time windows
      const bookedCourts = parkData.bookedCourts || 0;
      return {
        bookedCount: bookedCourts,
        totalCount: totalCourts,
        displayText: `${bookedCourts}/${totalCourts}`,
        utilizationPercentage: totalCourts > 0 ? Math.round((bookedCourts / totalCourts) * 100) : 0,
        isEmpty: bookedCourts === 0,
        isFull: bookedCourts === totalCourts
      };
    }

    // Find peak utilization across all time windows
    let peakUtilization = 0;
    let peakBookedCourts = 0;

    parkData.timeWindows.forEach(window => {
      const bookedCourts = window.courts ? window.courts.length : 0;
      if (bookedCourts > peakBookedCourts) {
        peakBookedCourts = bookedCourts;
        peakUtilization = totalCourts > 0 ? Math.round((bookedCourts / totalCourts) * 100) : 0;
      }
    });

    return {
      bookedCount: peakBookedCourts,
      totalCount: totalCourts,
      displayText: `${peakBookedCourts}/${totalCourts}`,
      utilizationPercentage: peakUtilization,
      isEmpty: peakBookedCourts === 0,
      isFull: peakBookedCourts === totalCourts,
      isPeakUtilization: true
    };
  }

  /**
   * Clear cached court counts (useful when park data structure changes)
   */
  clearCache() {
    this.parkCourtCounts.clear();
  }

  /**
   * Get utilization statistics for multiple parks
   * @param {Array} parksData - Array of park data objects
   * @returns {Object} Aggregated utilization statistics
   */
  getUtilizationStats(parksData) {
    if (!Array.isArray(parksData) || parksData.length === 0) {
      return {
        totalParks: 0,
        totalCourts: 0,
        totalBookedCourts: 0,
        averageUtilization: 0,
        parks: []
      };
    }

    let totalCourts = 0;
    let totalBookedCourts = 0;
    const parkStats = [];

    parksData.forEach(park => {
      const utilization = this.calculateParkUtilization(park);
      totalCourts += utilization.totalCount;
      totalBookedCourts += utilization.bookedCount;
      
      parkStats.push({
        name: park.name,
        utilization: utilization
      });
    });

    const averageUtilization = totalCourts > 0 ? Math.round((totalBookedCourts / totalCourts) * 100) : 0;

    return {
      totalParks: parksData.length,
      totalCourts,
      totalBookedCourts,
      averageUtilization,
      overallDisplayText: `${totalBookedCourts}/${totalCourts}`,
      parks: parkStats
    };
  }
}

module.exports = CourtUtilizationCalculator;