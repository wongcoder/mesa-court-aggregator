const axios = require('axios');
const CourtDataProcessor = require('./court-data-processor');
const CacheManager = require('./cache-manager');
const CsrfTokenManager = require('./csrf-token-manager');

/**
 * Backfill Service for Court Data Preloading
 * Handles startup data preloading from today to two weeks ahead
 * Uses facility group API endpoints for different park locations
 */
class BackfillService {
  constructor() {
    this.processor = new CourtDataProcessor();
    this.cacheManager = new CacheManager();
    this.csrfManager = new CsrfTokenManager();
    this.baseUrl = 'https://anc.apm.activecommunities.com/mesaaz/rest/reservation/quickreservation/availability';
    this.timeout = 15000; // 15 second timeout for backfill operations
    
    // Facility group configurations
    this.facilityGroups = [
      {
        id: 29,
        name: 'Kleinman Park',
        startTime: '09:00:00',
        endTime: '22:00:00',
        pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf'
      },
      {
        id: 33,
        name: 'Gene Autry Park',
        startTime: '09:00:00',
        endTime: '22:00:00',
        pdfLink: null
      },
      {
        id: 35,
        name: 'Monterey Park',
        startTime: '09:00:00',
        endTime: '22:00:00',
        pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/244/activities-culture/prcf/facilities/pickleball-public-court-calendars/brady-pickleball-court.pdf'
      }
    ];
    
    this.defaultHeaders = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Content-Type': 'application/json;charset=utf-8',
      'DNT': '1',
      'Origin': 'https://anc.apm.activecommunities.com',
      'Referer': 'https://anc.apm.activecommunities.com/mesaaz/reservation/landing/quick?locale=en-US&groupId=5',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'page_info': JSON.stringify({"page_number":1,"total_records_per_page":20}),
      'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"'
    };
  }

  /**
   * Log message with timestamp and context
   * @param {string} level - Log level (INFO, ERROR, WARN)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [BACKFILL] [${level}] ${message}`;
    
    if (level === 'ERROR') {
      console.error(logEntry, data || '');
    } else if (level === 'WARN') {
      console.warn(logEntry, data || '');
    } else {
      console.log(logEntry, data || '');
    }
  }

  /**
   * Build request payload for facility group API
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Object} facilityGroup - Facility group configuration
   * @returns {Object} Request payload
   */
  buildFacilityGroupPayload(date, facilityGroup) {
    return {
      "facility_group_id": facilityGroup.id,
      "customer_id": 0,
      "company_id": 0,
      "reserve_date": date,
      "change_time_range": false,
      "reload": false,
      "resident": true,
      "start_time": facilityGroup.startTime,
      "end_time": facilityGroup.endTime
    };
  }

  /**
   * Fetch court data for a specific date and facility group
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Object} facilityGroup - Facility group configuration
   * @returns {Promise<Object>} API response or error result
   */
  async fetchFacilityGroupData(date, facilityGroup) {
    try {
      const payload = this.buildFacilityGroupPayload(date, facilityGroup);
      
      this.log('INFO', `Fetching data for ${facilityGroup.name} on ${date}`, {
        facilityGroupId: facilityGroup.id
      });

      // Get valid CSRF token
      const tokenResult = await this.csrfManager.getValidToken();
      if (!tokenResult.success) {
        throw new Error(`Failed to obtain CSRF token: ${tokenResult.error}`);
      }

      // Build headers with CSRF token and session cookies
      const headers = { 
        ...this.defaultHeaders,
        'Referer': 'https://anc.apm.activecommunities.com/mesaaz/reservation/landing/quick?locale=en-US&groupId=5'
      };
      
      if (tokenResult.token) {
        headers['X-CSRF-Token'] = tokenResult.token;
      }
      if (tokenResult.sessionCookies) {
        headers['Cookie'] = tokenResult.sessionCookies;
      }
      
      const response = await axios.post(
        `${this.baseUrl}?locale=en-US`,
        payload,
        {
          headers,
          timeout: this.timeout,
          validateStatus: (status) => status < 500
        }
      );

      if (response.status >= 400) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      // Validate response structure
      if (!response.data || !response.data.headers || !response.data.body) {
        throw new Error('Invalid response structure');
      }

      if (response.data.headers.response_code !== '0000') {
        throw new Error(`API error: ${response.data.headers.response_message || 'Unknown error'}`);
      }

      this.log('INFO', `Successfully fetched data for ${facilityGroup.name} on ${date}`, {
        facilityGroupId: facilityGroup.id,
        resourceCount: response.data.body.availability?.resources?.length || 0
      });

      return {
        success: true,
        facilityGroup: facilityGroup,
        date: date,
        data: response.data
      };

    } catch (error) {
      this.log('ERROR', `Failed to fetch data for ${facilityGroup.name} on ${date}`, {
        facilityGroupId: facilityGroup.id,
        error: error.message
      });

      return {
        success: false,
        facilityGroup: facilityGroup,
        date: date,
        error: error.message
      };
    }
  }

  /**
   * Process and cache data for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Array} facilityResults - Array of facility group fetch results
   * @returns {Promise<Object>} Processing result
   */
  async processAndCacheDate(date, facilityResults) {
    try {
      const allParkData = [];
      let successCount = 0;
      let errorCount = 0;

      // Process each facility group result
      for (const result of facilityResults) {
        if (result.success) {
          successCount++;
          
          // Process the API response using existing processor
          const processedData = this.processor.processApiResponse(result.data);
          
          if (processedData.success) {
            // Add facility group context and PDF links to park data
            Object.values(processedData.parks).forEach(park => {
              park.facilityGroupId = result.facilityGroup.id;
              park.facilityGroupName = result.facilityGroup.name;
              park.pdfLink = result.facilityGroup.pdfLink;
              allParkData.push(park);
            });
          } else {
            this.log('WARN', `Failed to process data for ${result.facilityGroup.name} on ${date}`, {
              error: processedData.error
            });
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      // Cache the aggregated data if we have any successful results
      if (allParkData.length > 0) {
        const cacheSuccess = await this.cacheManager.updateDayData(date, allParkData);
        
        if (cacheSuccess) {
          this.log('INFO', `Successfully cached data for ${date}`, {
            parksCount: allParkData.length,
            successfulFacilities: successCount,
            failedFacilities: errorCount
          });
          
          return {
            success: true,
            date: date,
            parksCount: allParkData.length,
            successfulFacilities: successCount,
            failedFacilities: errorCount
          };
        } else {
          this.log('ERROR', `Failed to cache data for ${date}`);
          return {
            success: false,
            date: date,
            error: 'Cache operation failed'
          };
        }
      } else {
        this.log('WARN', `No data to cache for ${date} - all facility groups failed`);
        return {
          success: false,
          date: date,
          error: 'No successful facility group data to cache',
          failedFacilities: errorCount
        };
      }

    } catch (error) {
      this.log('ERROR', `Error processing data for ${date}`, error.message);
      return {
        success: false,
        date: date,
        error: error.message
      };
    }
  }

  /**
   * Generate array of dates from today to three days ahead
   * @returns {Array<string>} Array of date strings in YYYY-MM-DD format
   */
  generateDateRange() {
    const dates = [];
    const startDate = new Date();
    const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days ahead
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      dates.push(dateString);
    }
    
    return dates;
  }

  /**
   * Check if data already exists and is fresh for a given date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<boolean>} True if fresh data exists
   */
  async hasValidCacheForDate(date) {
    try {
      return await this.cacheManager.isCacheValidForDate(date);
    } catch (error) {
      this.log('WARN', `Error checking cache validity for ${date}`, error.message);
      return false;
    }
  }

  /**
   * Fetch fresh data for a single date and cache it
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Processing result
   */
  async fetchFreshDataForDate(date) {
    try {
      this.log('INFO', `Fetching fresh data for ${date}`);
      
      // Fetch data from all facility groups for this date
      const facilityResults = [];
      
      for (const facilityGroup of this.facilityGroups) {
        const result = await this.fetchFacilityGroupData(date, facilityGroup);
        facilityResults.push(result);
        
        // Small delay between facility group requests
        await this.delay(500);
      }

      // Process and cache the results for this date
      const dateResult = await this.processAndCacheDate(date, facilityResults);
      
      if (dateResult.success) {
        this.log('INFO', `Successfully fetched and cached fresh data for ${date}`, {
          totalParks: dateResult.totalParks,
          successfulFacilities: dateResult.successfulFacilities,
          failedFacilities: dateResult.failedFacilities
        });
      } else {
        this.log('ERROR', `Failed to process fresh data for ${date}`, dateResult.error);
      }

      return dateResult;
    } catch (error) {
      this.log('ERROR', `Error fetching fresh data for ${date}`, error.message);
      return {
        success: false,
        error: error.message,
        totalParks: 0,
        successfulFacilities: 0,
        failedFacilities: 0
      };
    }
  }

  /**
   * Add delay between API requests to avoid overwhelming the server
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run the complete backfill job
   * @param {Object} options - Backfill options
   * @param {boolean} options.skipExisting - Skip dates with valid cache (default: true)
   * @param {number} options.delayBetweenRequests - Delay between API requests in ms (default: 500)
   * @param {number} options.delayBetweenDates - Delay between processing dates in ms (default: 1000)
   * @returns {Promise<Object>} Backfill result summary
   */
  async runBackfillJob(options = {}) {
    const {
      skipExisting = true,
      delayBetweenRequests = 500,
      delayBetweenDates = 1000
    } = options;

    const startTime = Date.now();
    this.log('INFO', 'Starting backfill job', {
      skipExisting,
      delayBetweenRequests,
      delayBetweenDates
    });

    try {
      const dates = this.generateDateRange();
      const results = {
        totalDates: dates.length,
        processedDates: 0,
        skippedDates: 0,
        successfulDates: 0,
        failedDates: 0,
        totalApiRequests: 0,
        successfulApiRequests: 0,
        failedApiRequests: 0,
        errors: []
      };

      this.log('INFO', `Processing ${dates.length} dates from ${dates[0]} to ${dates[dates.length - 1]}`);

      // Process each date
      for (const date of dates) {
        try {
          // Check if we should skip this date
          if (skipExisting && await this.hasValidCacheForDate(date)) {
            this.log('INFO', `Skipping ${date} - valid cache exists`);
            results.skippedDates++;
            continue;
          }

          results.processedDates++;
          
          // Fetch data from all facility groups for this date
          const facilityResults = [];
          
          for (const facilityGroup of this.facilityGroups) {
            const result = await this.fetchFacilityGroupData(date, facilityGroup);
            facilityResults.push(result);
            results.totalApiRequests++;
            
            if (result.success) {
              results.successfulApiRequests++;
            } else {
              results.failedApiRequests++;
              results.errors.push({
                date,
                facilityGroup: facilityGroup.name,
                error: result.error
              });
            }
            
            // Add delay between facility group requests
            if (delayBetweenRequests > 0) {
              await this.delay(delayBetweenRequests);
            }
          }

          // Process and cache the results for this date
          const dateResult = await this.processAndCacheDate(date, facilityResults);
          
          if (dateResult.success) {
            results.successfulDates++;
          } else {
            results.failedDates++;
            results.errors.push({
              date,
              error: dateResult.error
            });
          }

          // Add delay between dates
          if (delayBetweenDates > 0) {
            await this.delay(delayBetweenDates);
          }

        } catch (error) {
          this.log('ERROR', `Unexpected error processing ${date}`, error.message);
          results.failedDates++;
          results.errors.push({
            date,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      
      this.log('INFO', 'Backfill job completed', {
        duration: `${duration}ms`,
        ...results
      });

      return {
        success: true,
        duration,
        ...results
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('ERROR', 'Backfill job failed', {
        error: error.message,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Set a sample CSRF token for testing
   * @param {string} sampleToken - Sample CSRF token
   * @param {string} sampleSessionId - Optional sample session ID
   */
  setSampleToken(sampleToken, sampleSessionId = null) {
    this.csrfManager.useSampleToken(sampleToken, sampleSessionId);
    this.log('INFO', 'Sample CSRF token configured for testing');
  }

  /**
   * Force refresh of CSRF token
   * @returns {Promise<Object>} Token refresh result
   */
  async refreshToken() {
    this.log('INFO', 'Forcing CSRF token refresh');
    return await this.csrfManager.getValidToken(true);
  }

  /**
   * Test a single API call with current token
   * @param {string} date - Date to test (optional, defaults to today)
   * @returns {Promise<Object>} Test result
   */
  async testApiCall(date = null) {
    const testDate = date || new Date().toISOString().split('T')[0];
    const testFacility = this.facilityGroups[0]; // Use Kleinman Park for testing
    
    this.log('INFO', `Testing API call for ${testFacility.name} on ${testDate}`);
    
    const result = await this.fetchFacilityGroupData(testDate, testFacility);
    
    return {
      success: result.success,
      date: testDate,
      facilityGroup: testFacility.name,
      error: result.error || null,
      tokenStatus: this.csrfManager.getStatus()
    };
  }

  /**
   * Get backfill service status and configuration
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      facilityGroups: this.facilityGroups.map(fg => ({
        id: fg.id,
        name: fg.name,
        timeRange: `${fg.startTime} - ${fg.endTime}`,
        hasPdfLink: !!fg.pdfLink
      })),
      timeout: this.timeout,
      baseUrl: this.baseUrl,
      csrfToken: this.csrfManager.getStatus()
    };
  }
}

module.exports = BackfillService;