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
        } else {
          // Extend current booking period
          currentPeriod.endTime = slot.time;
          currentPeriod.endIndex = index;
        }
      } else if (currentPeriod) {
        // End current booking period - set end time to the current (available) slot time
        // This represents the actual end of the booking period
        currentPeriod.endTime = slot.time;
        bookingPeriods.push(currentPeriod);
        currentPeriod = null;
      }
    });

    // Handle case where booking period extends to end of day
    if (currentPeriod) {
      // For periods extending to end of day, we need to calculate the end time
      // by adding 30 minutes to the last booked slot
      const lastSlotTime = currentPeriod.endTime;
      const [hours, minutes, seconds] = lastSlotTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours, minutes + 30, 0, 0);

      // Format back to HH:MM:SS
      const endHours = endDate.getHours().toString().padStart(2, '0');
      const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
      currentPeriod.endTime = `${endHours}:${endMinutes}:00`;

      bookingPeriods.push(currentPeriod);
    }

    return bookingPeriods;
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
        park.timeWindows = this.generateTimeWindows(park);

        // Add detailed booking info for each court
        park.courts.forEach(court => {
          court.bookingDetailStrings = this.generateCourtBookingDetails(court);
        });
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

module.exports = CourtDataProcessor;