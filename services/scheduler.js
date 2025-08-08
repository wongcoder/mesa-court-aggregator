const cron = require('node-cron');
const MesaApiClient = require('./mesa-api-client');
const CourtDataProcessor = require('./court-data-processor');
const CacheManager = require('./cache-manager');

/**
 * Scheduled Data Update Service
 * Handles daily court data updates using node-cron
 */
class Scheduler {
  constructor() {
    this.apiClient = new MesaApiClient();
    this.processor = new CourtDataProcessor();
    this.cacheManager = new CacheManager();
    this.isRunning = false;
    this.lastUpdateStatus = null;
    this.scheduledTask = null;
  }

  /**
   * Get current date in PST/PDT timezone
   * @returns {string} Date in YYYY-MM-DD format in Pacific timezone
   */
  getCurrentDatePST() {
    const now = new Date();
    // Convert to Pacific timezone (handles PST/PDT automatically)
    const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    
    const year = pstDate.getFullYear();
    const month = String(pstDate.getMonth() + 1).padStart(2, '0');
    const day = String(pstDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Log message with timestamp
   * @param {string} level - Log level (INFO, ERROR, WARN)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    
    if (level === 'ERROR') {
      console.error(logEntry, data || '');
    } else if (level === 'WARN') {
      console.warn(logEntry, data || '');
    } else {
      console.log(logEntry, data || '');
    }
  }

  /**
   * Fetch and process court data for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Update result with success status and data
   */
  async fetchAndProcessData(date) {
    try {
      this.log('INFO', `Starting data fetch for ${date}`);
      
      // Fetch raw data from Mesa API
      const apiResponse = await this.apiClient.fetchCourtData(date);
      this.log('INFO', `Successfully fetched API data for ${date}`);
      
      // Process the response
      const processedData = this.processor.processApiResponse(apiResponse);
      
      if (!processedData.success) {
        throw new Error(`Data processing failed: ${processedData.error}`);
      }
      
      this.log('INFO', `Successfully processed data for ${date}`, {
        totalParks: processedData.totalParks,
        parks: Object.keys(processedData.parks)
      });
      
      return {
        success: true,
        date,
        data: processedData,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.log('ERROR', `Failed to fetch/process data for ${date}`, error.message);
      return {
        success: false,
        date,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Update cache with processed court data
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Object} processedData - Processed court data
   * @returns {Promise<boolean>} Success status
   */
  async updateCache(date, processedData) {
    try {
      // Convert processed data to park array format expected by cache
      const parkArray = Object.values(processedData.parks);
      
      const success = await this.cacheManager.updateDayData(date, parkArray);
      
      if (success) {
        this.log('INFO', `Successfully updated cache for ${date}`, {
          parksUpdated: parkArray.length
        });
      } else {
        this.log('ERROR', `Failed to update cache for ${date}`);
      }
      
      return success;
    } catch (error) {
      this.log('ERROR', `Cache update error for ${date}`, error.message);
      return false;
    }
  }

  /**
   * Perform complete data update for a specific date
   * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to current PST date)
   * @returns {Promise<Object>} Complete update result
   */
  async performUpdate(date = null) {
    const targetDate = date || this.getCurrentDatePST();
    const startTime = Date.now();
    
    this.log('INFO', `Starting scheduled update for ${targetDate}`);
    
    try {
      // Check if we already have fresh data
      const isCacheValid = await this.cacheManager.isCacheValidForDate(targetDate);
      if (isCacheValid) {
        this.log('INFO', `Cache is still fresh for ${targetDate}, skipping update`);
        return {
          success: true,
          date: targetDate,
          skipped: true,
          reason: 'Cache is fresh (less than 24 hours old)',
          duration: Date.now() - startTime
        };
      }
      
      // Fetch and process new data
      const fetchResult = await this.fetchAndProcessData(targetDate);
      
      if (!fetchResult.success) {
        return {
          success: false,
          date: targetDate,
          error: fetchResult.error,
          duration: Date.now() - startTime
        };
      }
      
      // Update cache
      const cacheSuccess = await this.updateCache(targetDate, fetchResult.data);
      
      if (!cacheSuccess) {
        return {
          success: false,
          date: targetDate,
          error: 'Failed to update cache',
          duration: Date.now() - startTime
        };
      }
      
      const duration = Date.now() - startTime;
      this.log('INFO', `Successfully completed update for ${targetDate}`, {
        duration: `${duration}ms`,
        totalParks: fetchResult.data.totalParks
      });
      
      return {
        success: true,
        date: targetDate,
        data: fetchResult.data,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('ERROR', `Update failed for ${targetDate}`, {
        error: error.message,
        duration: `${duration}ms`
      });
      
      return {
        success: false,
        date: targetDate,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Start the scheduled daily updates at 5PM PST
   * @returns {boolean} Success status
   */
  startScheduledUpdates() {
    if (this.isRunning) {
      this.log('WARN', 'Scheduler is already running');
      return false;
    }
    
    try {
      // Schedule daily updates at 5PM PST/PDT
      // The timezone option handles PST/PDT transitions automatically
      this.scheduledTask = cron.schedule('0 17 * * *', async () => {
        this.log('INFO', 'Triggered scheduled daily update');
        
        const result = await this.performUpdate();
        this.lastUpdateStatus = result;
        
        if (result.success) {
          this.log('INFO', 'Scheduled update completed successfully', {
            date: result.date,
            duration: result.duration
          });
        } else {
          this.log('ERROR', 'Scheduled update failed', {
            date: result.date,
            error: result.error,
            duration: result.duration
          });
        }
      }, {
        scheduled: true,
        timezone: "America/Los_Angeles" // Handles PST/PDT automatically
      });
      
      this.isRunning = true;
      this.log('INFO', 'Scheduled daily updates started (5PM PST/PDT)');
      return true;
      
    } catch (error) {
      this.log('ERROR', 'Failed to start scheduled updates', error.message);
      return false;
    }
  }

  /**
   * Stop the scheduled updates
   * @returns {boolean} Success status
   */
  stopScheduledUpdates() {
    if (!this.isRunning || !this.scheduledTask) {
      this.log('WARN', 'Scheduler is not running');
      return false;
    }
    
    try {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      this.isRunning = false;
      this.log('INFO', 'Scheduled updates stopped');
      return true;
    } catch (error) {
      this.log('ERROR', 'Failed to stop scheduled updates', error.message);
      return false;
    }
  }

  /**
   * Start test scheduling with shorter intervals for testing
   * @param {string} cronExpression - Custom cron expression for testing
   * @returns {boolean} Success status
   */
  startTestSchedule(cronExpression = '*/2 * * * *') { // Default: every 2 minutes
    if (this.isRunning) {
      this.log('WARN', 'Scheduler is already running, stopping current schedule');
      this.stopScheduledUpdates();
    }
    
    try {
      this.log('INFO', `Starting test schedule with expression: ${cronExpression}`);
      
      this.scheduledTask = cron.schedule(cronExpression, async () => {
        this.log('INFO', 'Triggered test scheduled update');
        
        const result = await this.performUpdate();
        this.lastUpdateStatus = result;
        
        if (result.success) {
          this.log('INFO', 'Test scheduled update completed successfully', {
            date: result.date,
            duration: result.duration,
            skipped: result.skipped || false
          });
        } else {
          this.log('ERROR', 'Test scheduled update failed', {
            date: result.date,
            error: result.error,
            duration: result.duration
          });
        }
      }, {
        scheduled: true,
        timezone: "America/Los_Angeles"
      });
      
      this.isRunning = true;
      this.log('INFO', `Test schedule started with expression: ${cronExpression}`);
      return true;
      
    } catch (error) {
      this.log('ERROR', 'Failed to start test schedule', error.message);
      return false;
    }
  }

  /**
   * Get scheduler status and last update information
   * @returns {Object} Scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdateStatus: this.lastUpdateStatus,
      currentPSTTime: new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"}),
      currentPSTDate: this.getCurrentDatePST()
    };
  }

  /**
   * Validate cron expression
   * @param {string} expression - Cron expression to validate
   * @returns {boolean} True if valid
   */
  validateCronExpression(expression) {
    return cron.validate(expression);
  }
}

module.exports = Scheduler;