const MesaApiClient = require('./mesa-api-client');

/**
 * Court Data Processing Service
 * Processes Mesa court API responses and aggregates data by park location
 */
class CourtDataProcessor {
  constructor() {
    this.apiClient = new MesaApiClient();

    // Hard-coded mapping from court resource names to park names
    // Based on actual Mesa AZ court naming conventions from facility groups
    this.courtToParkMapping = {};

    // Park color assignments for consistent UI display
    this.parkColors = {
      'Kleinman Park': '#46f2b7',
      'Gene Autry Park': '#a5b4a1',
      'Monterey Park': '#45b78f'
    };

    // Initialize court utilization calculator
    this.utilizationCalculator = new CourtUtilizationCalculator();
  }

  /**
   * Extract park name from court resource name
   * @param {string} courtName - Court resource name from API
   * @returns {string} Park name or 'Unknown Park' if not found
   */
  extractParkName(courtName) {
    // Check exact mapping first
    if (this.courtToParkMapping[courtName]) {
      return this.courtToParkMapping[courtName];
    }

    // Extract park name from court resource name patterns
    const name = courtName.toLowerCase();

    // Filter out tennis courts first - we only want pickleball courts
    if (name.includes('tennis')) {
      return null; // This will be filtered out
    }

    // Kleinman Park courts
    if (name.includes('kleinman')) {
      return 'Kleinman Park';
    }

    // Gene Autry Park courts (Mesa Tennis Pickleball Center)
    // These come as "Pickleball Court 17", "Pickleball Court 18", etc.
    if (name.match(/^pickleball court \d+$/)) {
      return 'Gene Autry Park';
    }

    // Monterey Park courts (Christopher J. Brady)
    if (name.includes('christopher') || name.includes('brady')) {
      return 'Monterey Park';
    }

    return 'Unknown Park';
  }

  /**
   * Analyze time slots to find continuous booking periods
   * @param {Array} timeSlots - Array of time slot objects with time and status
   * @returns {Array} Array of booking period objects
   */
  analyzeTimeSlots(timeSlots) {
    // Input validation
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      console.warn('analyzeTimeSlots: Invalid or empty timeSlots array');
      return [];
    }

    // Validate time slot structure
    const invalidSlots = timeSlots.filter((slot, index) => {
      return !slot || typeof slot.time !== 'string' || (slot.status !== 0 && slot.status !== 1);
    });

    if (invalidSlots.length > 0) {
      console.warn('analyzeTimeSlots: Found invalid time slots:', invalidSlots);
    }

    // Create index-to-time mapping for validation
    const timeSlotMapping = timeSlots.map((slot, index) => ({
      index,
      time: slot.time,
      status: slot.status,
      interpretation: slot.status === 1 ? 'Booked' : 'Available'
    }));

    // Log time slot analysis for debugging
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TIME_SLOTS) {
      console.log('analyzeTimeSlots: Processing time slots');
      console.log('Time slot mapping (first 5 and last 5):');
      const firstFive = timeSlotMapping.slice(0, 5);
      const lastFive = timeSlotMapping.slice(-5);
      [...firstFive, ...lastFive].forEach(slot => {
        console.log(`  Index ${slot.index}: ${slot.time} - ${slot.interpretation}`);
      });
    }

    const bookingPeriods = [];
    let currentPeriod = null;

    timeSlots.forEach((slot, index) => {
      if (slot.status === 1) { // Booked slot
        if (!currentPeriod) {
          // Start new booking period
          currentPeriod = {
            startTime: slot.time,
            startIndex: index,
            endTime: slot.time,
            endIndex: index
          };

          if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TIME_SLOTS) {
            console.log(`  Starting booking period at index ${index}: ${slot.time}`);
          }
        } else {
          // Extend current booking period
          currentPeriod.endTime = slot.time;
          currentPeriod.endIndex = index;
        }
      } else if (currentPeriod) {
        // End current booking period - set end time to the current (available) slot time
        // This represents the actual end of the booking period
        const previousEndTime = currentPeriod.endTime;
        currentPeriod.endTime = slot.time;

        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TIME_SLOTS) {
          console.log(`  Ending booking period at index ${index}: ${previousEndTime} -> ${slot.time} (first available slot)`);
        }

        // Validate that end time is set to first available slot
        if (slot.status !== 0) {
          console.warn(`analyzeTimeSlots: Expected available slot (status 0) at index ${index}, got status ${slot.status}`);
        }

        bookingPeriods.push(currentPeriod);
        currentPeriod = null;
      }
    });

    // Handle case where booking period extends to end of day
    if (currentPeriod) {
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TIME_SLOTS) {
        console.log(`  End-of-day case: Adding 30 minutes to last booked slot ${currentPeriod.endTime}`);
      }

      // Validate that we have a valid end time
      const lastSlotTime = currentPeriod.endTime;
      if (!lastSlotTime || typeof lastSlotTime !== 'string') {
        console.error('analyzeTimeSlots: Invalid endTime for end-of-day calculation:', lastSlotTime);
        return bookingPeriods; // Return what we have so far
      }

      // For periods extending to end of day, we need to calculate the end time
      // by adding 30 minutes to the last booked slot
      try {
        const [hours, minutes] = lastSlotTime.split(':').map(Number);

        // Validate parsed time components
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.error('analyzeTimeSlots: Invalid time format for end-of-day calculation:', lastSlotTime);
          return bookingPeriods;
        }

        const endDate = new Date();
        endDate.setHours(hours, minutes + 30, 0, 0);

        // Format back to HH:MM:SS
        const endHours = endDate.getHours().toString().padStart(2, '0');
        const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
        const calculatedEndTime = `${endHours}:${endMinutes}:00`;

        currentPeriod.endTime = calculatedEndTime;

        if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TIME_SLOTS) {
          console.log(`  End-of-day calculation: ${lastSlotTime} + 30 minutes = ${calculatedEndTime}`);
        }
      } catch (error) {
        console.error('analyzeTimeSlots: Error in end-of-day calculation:', error.message);
        return bookingPeriods;
      }

      bookingPeriods.push(currentPeriod);
    }

    // Validation: Check booking periods for correctness
    this.validateBookingPeriods(bookingPeriods, timeSlots);

    return bookingPeriods;
  }

  /**
   * Validate booking periods against expected patterns
   * @param {Array} bookingPeriods - Array of booking period objects
   * @param {Array} timeSlots - Original time slots array
   */
  validateBookingPeriods(bookingPeriods, timeSlots) {
    if (bookingPeriods.length === 0) {
      return; // No booking periods to validate
    }

    bookingPeriods.forEach((period, periodIndex) => {
      // Validate period structure
      const requiredFields = ['startTime', 'endTime', 'startIndex', 'endIndex'];
      const missingFields = requiredFields.filter(field => !period.hasOwnProperty(field));

      if (missingFields.length > 0) {
        console.error(`validateBookingPeriods: Period ${periodIndex} missing fields:`, missingFields);
        return;
      }

      // Validate indices are within bounds
      if (period.startIndex < 0 || period.startIndex >= timeSlots.length) {
        console.error(`validateBookingPeriods: Period ${periodIndex} startIndex ${period.startIndex} out of bounds`);
      }

      if (period.endIndex < 0 || period.endIndex >= timeSlots.length) {
        console.error(`validateBookingPeriods: Period ${periodIndex} endIndex ${period.endIndex} out of bounds`);
      }

      // Validate start comes before end
      if (period.startIndex > period.endIndex) {
        console.error(`validateBookingPeriods: Period ${periodIndex} startIndex ${period.startIndex} > endIndex ${period.endIndex}`);
      }

      // Validate time consistency
      const startSlot = timeSlots[period.startIndex];
      if (startSlot && startSlot.time !== period.startTime) {
        console.error(`validateBookingPeriods: Period ${periodIndex} startTime mismatch: expected ${startSlot.time}, got ${period.startTime}`);
      }

      // For end time validation, check if it's an end-of-day case or first-available-slot case
      const isEndOfDay = period.endIndex === timeSlots.length - 1 && timeSlots[period.endIndex].status === 1;

      if (!isEndOfDay) {
        // Should be first available slot time
        const nextAvailableIndex = period.endIndex + 1;
        if (nextAvailableIndex < timeSlots.length) {
          const nextSlot = timeSlots[nextAvailableIndex];
          if (nextSlot && nextSlot.time !== period.endTime) {
            console.warn(`validateBookingPeriods: Period ${periodIndex} endTime should be first available slot time. Expected ${nextSlot.time}, got ${period.endTime}`);
          }

          if (nextSlot && nextSlot.status !== 0) {
            console.warn(`validateBookingPeriods: Period ${periodIndex} next slot after booking should be available (status 0), got status ${nextSlot.status}`);
          }
        }
      }

      // Log validation success for debugging
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TIME_SLOTS) {
        console.log(`  Validated period ${periodIndex}: ${period.startTime} to ${period.endTime} (indices ${period.startIndex}-${period.endIndex})`);
      }
    });

    // Additional pattern validation
    this.validateBookingPatterns(bookingPeriods, timeSlots);
  }

  /**
   * Validate booking patterns against known expected patterns
   * @param {Array} bookingPeriods - Array of booking period objects
   * @param {Array} timeSlots - Original time slots array
   */
  validateBookingPatterns(bookingPeriods, timeSlots) {
    // Check for overlapping periods
    for (let i = 0; i < bookingPeriods.length - 1; i++) {
      const current = bookingPeriods[i];
      const next = bookingPeriods[i + 1];

      if (current.endIndex >= next.startIndex) {
        console.error(`validateBookingPatterns: Overlapping periods detected between period ${i} and ${i + 1}`);
      }
    }

    // Validate total booked slots count
    const totalBookedSlots = timeSlots.filter(slot => slot.status === 1).length;
    const periodsBookedSlots = bookingPeriods.reduce((total, period) => {
      return total + (period.endIndex - period.startIndex + 1);
    }, 0);

    if (totalBookedSlots !== periodsBookedSlots) {
      console.warn(`validateBookingPatterns: Booked slots count mismatch. Total: ${totalBookedSlots}, Periods: ${periodsBookedSlots}`);
    }

    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TIME_SLOTS) {
      console.log(`  Pattern validation complete: ${bookingPeriods.length} periods, ${totalBookedSlots} booked slots`);
    }
  }

  /**
   * Determine booking periods for a single court
   * @param {Object} court - Court resource object from API
   * @returns {Object} Court booking analysis
   */
  analyzeCourtBookings(court) {
    const bookingPeriods = this.analyzeTimeSlots(court.timeSlots);
    const bookedSlots = court.timeSlots.filter(slot => slot.status === 1);
    const availableSlots = court.timeSlots.filter(slot => slot.status === 0);

    return {
      resourceId: court.resourceId,
      resourceName: court.resourceName,
      parkName: this.extractParkName(court.resourceName),
      totalSlots: court.timeSlots.length,
      bookedSlots: bookedSlots.length,
      availableSlots: availableSlots.length,
      bookingPeriods,
      isFullyBooked: availableSlots.length === 0,
      isFullyAvailable: bookedSlots.length === 0,
      warningMessages: court.warningMessages || []
    };
  }

  /**
   * Aggregate court data by park location
   * @param {Array} courtResources - Array of court resource objects
   * @returns {Object} Aggregated data by park
   */
  aggregateByPark(courtResources) {
    const parkData = {};

    // Process each court
    courtResources.forEach(court => {
      const courtAnalysis = this.analyzeCourtBookings(court);
      const parkName = courtAnalysis.parkName;

      // Skip tennis courts and unknown parks
      if (!parkName || parkName === 'Unknown Park') {
        return;
      }

      if (!parkData[parkName]) {
        parkData[parkName] = {
          name: parkName,
          color: this.parkColors[parkName] || '#9aa0a6',
          courts: [],
          totalCourts: 0,
          bookedCourts: 0,
          availableCourts: 0,
          partiallyBookedCourts: 0
        };
      }

      parkData[parkName].courts.push(courtAnalysis);
      parkData[parkName].totalCourts++;

      if (courtAnalysis.isFullyBooked) {
        parkData[parkName].bookedCourts++;
      } else if (courtAnalysis.isFullyAvailable) {
        parkData[parkName].availableCourts++;
      } else {
        parkData[parkName].partiallyBookedCourts++;
      }
    });

    // Calculate park status for each park
    Object.values(parkData).forEach(park => {
      if (park.bookedCourts === park.totalCourts) {
        park.status = 'booked';
      } else if (park.availableCourts === park.totalCourts) {
        park.status = 'available';
      } else {
        park.status = 'partial';
      }
    });

    return parkData;
  }

  /**
   * Generate structured time window objects for a park
   * @param {Object} parkData - Aggregated park data
   * @returns {Array} Array of time window objects
   */
  generateTimeWindows(parkData) {
    const timeWindows = [];
    const timeSlotMap = new Map(); // Map to group courts by time periods

    // Process each court's booking periods
    parkData.courts.forEach(court => {
      court.bookingPeriods.forEach(period => {
        const key = `${period.startTime}-${period.endTime}`;

        if (!timeSlotMap.has(key)) {
          timeSlotMap.set(key, {
            startTime: period.startTime,
            endTime: period.endTime,
            courts: []
          });
        }

        timeSlotMap.get(key).courts.push(court.resourceName);
      });
    });

    // Convert map to array and add display time
    timeSlotMap.forEach(timeWindow => {
      timeWindows.push({
        startTime: timeWindow.startTime,
        endTime: timeWindow.endTime,
        courts: timeWindow.courts,
        displayTime: this.formatTimeRange(timeWindow.startTime, timeWindow.endTime)
      });
    });

    // Sort time windows by start time
    timeWindows.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return timeWindows;
  }

  /**
   * Generate user-friendly time windows that show utilization across all courts
   * Creates logical time segments (e.g., 9AM-7PM: 4/4 courts, 7-9PM: 1/4 courts)
   * @param {Object} parkData - Aggregated park data
   * @returns {Array} Array of user-friendly time window objects
   */
  generateUserFriendlyTimeWindows(parkData) {
    if (!parkData.courts || parkData.courts.length === 0) {
      return [];
    }

    // Collect all unique time points from all courts
    const timePoints = new Set();

    parkData.courts.forEach(court => {
      court.bookingPeriods.forEach(period => {
        timePoints.add(period.startTime);
        timePoints.add(period.endTime);
      });
    });

    // Convert to sorted array
    const sortedTimePoints = Array.from(timePoints).sort();

    if (sortedTimePoints.length < 2) {
      return [];
    }

    const userFriendlyWindows = [];

    // Create time segments between consecutive time points
    for (let i = 0; i < sortedTimePoints.length - 1; i++) {
      const segmentStart = sortedTimePoints[i];
      const segmentEnd = sortedTimePoints[i + 1];

      // Find which courts are booked during this time segment
      const bookedCourts = [];

      parkData.courts.forEach(court => {
        const isCourtBookedInSegment = court.bookingPeriods.some(period => {
          const periodStart = this.timeToMinutes(period.startTime);
          const periodEnd = this.timeToMinutes(period.endTime);
          const segmentStartMin = this.timeToMinutes(segmentStart);
          const segmentEndMin = this.timeToMinutes(segmentEnd);

          // Check if this booking period overlaps with the current segment
          return periodStart <= segmentStartMin && periodEnd >= segmentEndMin;
        });

        if (isCourtBookedInSegment) {
          bookedCourts.push(court.resourceName);
        }
      });

      // Only create a window if there are booked courts in this segment
      if (bookedCourts.length > 0) {
        const totalCourts = parkData.courts.length;
        const utilizationText = `${bookedCourts.length}/${totalCourts}`;

        const timeWindow = {
          startTime: segmentStart,
          endTime: segmentEnd,
          courts: bookedCourts,
          totalCourts: totalCourts,
          bookedCourtCount: bookedCourts.length,
          utilizationText: utilizationText,
          utilizationPercentage: Math.round((bookedCourts.length / totalCourts) * 100),
          displayTime: this.formatTimeRange(segmentStart, segmentEnd),
          isFullyBooked: bookedCourts.length === totalCourts,
          isPartiallyBooked: bookedCourts.length > 0 && bookedCourts.length < totalCourts
        };

        // Add utilization data using the calculator
        timeWindow.utilization = this.utilizationCalculator.calculateUtilization(parkData, timeWindow, 'weekly');

        userFriendlyWindows.push(timeWindow);
      }
    }

    return userFriendlyWindows;
  }

  /**
   * Convert time string to minutes since midnight
   * @param {string} timeString - Time in HH:MM:SS format
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
   * Generate detailed booking period strings for a court
   * @param {Object} courtAnalysis - Court booking analysis
   * @returns {Array} Array of booking period strings
   */
  generateCourtBookingDetails(courtAnalysis) {
    if (courtAnalysis.bookingPeriods.length === 0) {
      return ['Available all day'];
    }

    return courtAnalysis.bookingPeriods.map(period => {
      const startTime = this.formatTime(period.startTime);
      const endTime = this.formatTime(period.endTime);
      return `Booked ${startTime}-${endTime}`;
    });
  }

  /**
   * Process complete API response and return aggregated park data
   * @param {Object} apiResponse - Complete API response from Mesa
   * @returns {Object} Processed court data aggregated by park
   */
  processApiResponse(apiResponse) {
    try {
      // Extract court resources using existing API client method
      const courtResources = this.apiClient.extractCourtResources(apiResponse);

      // Aggregate by park
      const parkData = this.aggregateByPark(courtResources);

      // Generate time windows for each park
      Object.values(parkData).forEach(park => {
        // Generate both old and new time windows for compatibility
        park.timeWindows = this.generateUserFriendlyTimeWindows(park);
        park.legacyTimeWindows = this.generateTimeWindows(park); // Keep old format for backward compatibility

        // Add detailed booking info for each court
        park.courts.forEach(court => {
          court.bookingDetailStrings = this.generateCourtBookingDetails(court);
        });

        // Add methods to get enhanced time windows for different views
        park.getEnhancedTimeWindows = (viewType = 'weekly') => {
          return this.utilizationCalculator.enhanceTimeWindowsWithUtilization(park, viewType);
        };
      });

      return {
        success: true,
        parks: parkData,
        totalParks: Object.keys(parkData).length,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        parks: {},
        totalParks: 0,
        processedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Get list of all available parks with colors
   * @returns {Array} Array of park objects with name and color
   */
  getParkList() {
    return Object.entries(this.parkColors).map(([name, color]) => ({
      name,
      color
    }));
  }
}

/**
 * Court Utilization Calculator
 * Handles court utilization display with view-specific formatting optimizations
 */
class CourtUtilizationCalculator {
  /**
   * Calculate court utilization for display with view-specific formatting
   * @param {Object} parkData - Park data object with courts array
   * @param {Object} timeWindow - Time window object with courts array
   * @param {string} viewType - View type ('weekly', 'daily', 'monthly')
   * @returns {Object} Utilization data with view-optimized formatting
   */
  calculateUtilization(parkData, timeWindow, viewType = 'weekly') {
    const totalCourts = this.getTotalCourtsForPark(parkData);
    const bookedCourts = timeWindow.courts ? timeWindow.courts.length : 0;
    
    return {
      bookedCount: bookedCourts,
      totalCount: totalCourts,
      displayText: this.formatForView(bookedCourts, totalCourts, viewType),
      utilizationPercentage: totalCourts > 0 ? Math.round((bookedCourts / totalCourts) * 100) : 0,
      isEmpty: bookedCourts === 0,
      isFull: bookedCourts === totalCourts,
      viewOptimized: true,
      viewType: viewType
    };
  }

  /**
   * Optimize display format based on available space and view type
   * @param {number} bookedCourts - Number of booked courts
   * @param {number} totalCourts - Total number of courts
   * @param {string} viewType - View type for optimization
   * @returns {string} Optimized display text
   */
  formatForView(bookedCourts, totalCourts, viewType) {
    if (viewType === 'weekly') {
      // Ultra-compact format for ~100px width constraint
      return `${bookedCourts}/${totalCourts}`;
    } else if (viewType === 'daily') {
      // Enhanced format with more available width
      return `${bookedCourts}/${totalCourts} courts`;
    } else if (viewType === 'monthly') {
      // Compact format for monthly overview
      return `${bookedCourts}/${totalCourts}`;
    }
    return `${bookedCourts}/${totalCourts}`;
  }

  /**
   * Get total number of courts for a park
   * @param {Object} parkData - Park data object
   * @returns {number} Total number of courts
   */
  getTotalCourtsForPark(parkData) {
    if (!parkData || !parkData.courts) {
      return 0;
    }
    return parkData.courts.length;
  }

  /**
   * Enhanced time window generation with utilization data
   * @param {Object} parkData - Park data object
   * @param {string} viewType - View type for optimization
   * @returns {Array} Enhanced time windows with utilization data
   */
  enhanceTimeWindowsWithUtilization(parkData, viewType = 'weekly') {
    const timeWindows = parkData.timeWindows || [];
    
    return timeWindows.map(window => ({
      ...window,
      utilization: this.calculateUtilization(parkData, window, viewType),
      displayLabel: this.createDisplayLabel(window, parkData, viewType)
    }));
  }

  /**
   * Create display label for time window with utilization
   * @param {Object} timeWindow - Time window object
   * @param {Object} parkData - Park data object
   * @param {string} viewType - View type for optimization
   * @returns {Object} Display label object
   */
  createDisplayLabel(timeWindow, parkData, viewType = 'weekly') {
    const utilization = this.calculateUtilization(parkData, timeWindow, viewType);
    const timeLabel = this.formatTimeRange(timeWindow.startTime, timeWindow.endTime);
    
    return {
      parkName: this.getShortParkName(parkData.name),
      timeRange: timeLabel,
      utilization: utilization.displayText,
      fullText: `${utilization.displayText} courts booked`,
      viewType: viewType
    };
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
      'Monterey Park': 'Monterey',
      'Christopher J. Brady': 'Brady'
    };
    return shortNames[parkName] || parkName;
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
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  /**
   * Generate CSS classes for utilization display based on view type
   * @param {string} viewType - View type
   * @param {Object} utilization - Utilization data
   * @returns {string} CSS class names
   */
  getUtilizationCssClasses(viewType, utilization) {
    const baseClass = 'court-utilization';
    const viewClass = `${baseClass}--${viewType}`;
    const statusClass = utilization.isFull ? `${baseClass}--full` : 
                       utilization.isEmpty ? `${baseClass}--empty` : 
                       `${baseClass}--partial`;
    
    return `${baseClass} ${viewClass} ${statusClass}`;
  }

  /**
   * Get utilization color based on percentage
   * @param {number} percentage - Utilization percentage
   * @returns {string} Color value
   */
  getUtilizationColor(percentage) {
    if (percentage === 0) return '#28a745'; // Green for available
    if (percentage < 50) return '#ffc107'; // Yellow for partial
    if (percentage < 100) return '#fd7e14'; // Orange for mostly booked
    return '#dc3545'; // Red for fully booked
  }
}

module.exports = CourtDataProcessor;