const Scheduler = require('./scheduler');
const MesaApiClient = require('./mesa-api-client');
const CourtDataProcessor = require('./court-data-processor');
const CacheManager = require('./cache-manager');

// Mock the dependencies
jest.mock('./mesa-api-client');
jest.mock('./court-data-processor');
jest.mock('./cache-manager');
jest.mock('node-cron');

const cron = require('node-cron');

describe('Scheduler', () => {
  let scheduler;
  let mockApiClient;
  let mockProcessor;
  let mockCacheManager;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockApiClient = {
      fetchCourtData: jest.fn()
    };
    mockProcessor = {
      processApiResponse: jest.fn()
    };
    mockCacheManager = {
      isCacheValidForDate: jest.fn(),
      updateDayData: jest.fn()
    };

    // Mock constructors
    MesaApiClient.mockImplementation(() => mockApiClient);
    CourtDataProcessor.mockImplementation(() => mockProcessor);
    CacheManager.mockImplementation(() => mockCacheManager);

    // Mock cron functions
    cron.schedule = jest.fn();
    cron.validate = jest.fn();

    scheduler = new Scheduler();
  });

  describe('getCurrentDatePST', () => {
    it('should return current date in PST timezone format', () => {
      // Mock Date to return a specific time
      const mockDate = new Date('2025-01-08T10:00:00Z'); // UTC time
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
      
      // Mock toLocaleString to simulate PST conversion
      mockDate.toLocaleString = jest.fn().mockReturnValue('1/8/2025, 2:00:00 AM');
      
      const result = scheduler.getCurrentDatePST();
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(mockDate.toLocaleString).toHaveBeenCalledWith("en-US", {timeZone: "America/Los_Angeles"});
      
      global.Date.mockRestore();
    });
  });

  describe('log', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = {
        log: jest.spyOn(console, 'log').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation()
      };
    });

    afterEach(() => {
      Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    });

    it('should log INFO messages to console.log', () => {
      scheduler.log('INFO', 'Test message', { data: 'test' });
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] Test message/),
        { data: 'test' }
      );
    });

    it('should log ERROR messages to console.error', () => {
      scheduler.log('ERROR', 'Error message', 'error details');
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[ERROR\] Error message/),
        'error details'
      );
    });

    it('should log WARN messages to console.warn', () => {
      scheduler.log('WARN', 'Warning message');
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[WARN\] Warning message/),
        ''
      );
    });
  });

  describe('fetchAndProcessData', () => {
    it('should successfully fetch and process data', async () => {
      const mockApiResponse = { body: { availability: { resources: [], time_slots: [] } } };
      const mockProcessedData = { 
        success: true, 
        parks: { 'MPTC Park': { name: 'MPTC Park' } },
        totalParks: 1
      };

      mockApiClient.fetchCourtData.mockResolvedValue(mockApiResponse);
      mockProcessor.processApiResponse.mockReturnValue(mockProcessedData);

      const result = await scheduler.fetchAndProcessData('2025-01-08');

      expect(result.success).toBe(true);
      expect(result.date).toBe('2025-01-08');
      expect(result.data).toEqual(mockProcessedData);
      expect(mockApiClient.fetchCourtData).toHaveBeenCalledWith('2025-01-08');
      expect(mockProcessor.processApiResponse).toHaveBeenCalledWith(mockApiResponse);
    });

    it('should handle API fetch errors', async () => {
      const error = new Error('API error');
      mockApiClient.fetchCourtData.mockRejectedValue(error);

      const result = await scheduler.fetchAndProcessData('2025-01-08');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(result.date).toBe('2025-01-08');
    });

    it('should handle processing errors', async () => {
      const mockApiResponse = { body: { availability: { resources: [], time_slots: [] } } };
      const mockProcessedData = { 
        success: false, 
        error: 'Processing failed'
      };

      mockApiClient.fetchCourtData.mockResolvedValue(mockApiResponse);
      mockProcessor.processApiResponse.mockReturnValue(mockProcessedData);

      const result = await scheduler.fetchAndProcessData('2025-01-08');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Data processing failed: Processing failed');
    });
  });

  describe('updateCache', () => {
    it('should successfully update cache', async () => {
      const processedData = {
        parks: {
          'MPTC Park': { name: 'MPTC Park', totalCourts: 4 }
        }
      };

      mockCacheManager.updateDayData.mockResolvedValue(true);

      const result = await scheduler.updateCache('2025-01-08', processedData);

      expect(result).toBe(true);
      expect(mockCacheManager.updateDayData).toHaveBeenCalledWith(
        '2025-01-08',
        [{ name: 'MPTC Park', totalCourts: 4 }]
      );
    });

    it('should handle cache update failures', async () => {
      const processedData = { parks: {} };
      mockCacheManager.updateDayData.mockResolvedValue(false);

      const result = await scheduler.updateCache('2025-01-08', processedData);

      expect(result).toBe(false);
    });

    it('should handle cache update errors', async () => {
      const processedData = { parks: {} };
      mockCacheManager.updateDayData.mockRejectedValue(new Error('Cache error'));

      const result = await scheduler.updateCache('2025-01-08', processedData);

      expect(result).toBe(false);
    });
  });

  describe('performUpdate', () => {
    beforeEach(() => {
      // Mock getCurrentDatePST to return a consistent date
      jest.spyOn(scheduler, 'getCurrentDatePST').mockReturnValue('2025-01-08');
    });

    it('should skip update if cache is fresh', async () => {
      mockCacheManager.isCacheValidForDate.mockResolvedValue(true);

      const result = await scheduler.performUpdate();

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Cache is fresh (less than 24 hours old)');
      expect(mockApiClient.fetchCourtData).not.toHaveBeenCalled();
    });

    it('should perform full update when cache is stale', async () => {
      const mockApiResponse = { body: { availability: { resources: [], time_slots: [] } } };
      const mockProcessedData = { 
        success: true, 
        parks: { 'MPTC Park': { name: 'MPTC Park' } },
        totalParks: 1
      };

      mockCacheManager.isCacheValidForDate.mockResolvedValue(false);
      mockApiClient.fetchCourtData.mockResolvedValue(mockApiResponse);
      mockProcessor.processApiResponse.mockReturnValue(mockProcessedData);
      mockCacheManager.updateDayData.mockResolvedValue(true);

      const result = await scheduler.performUpdate();

      expect(result.success).toBe(true);
      expect(result.date).toBe('2025-01-08');
      expect(result.data).toEqual(mockProcessedData);
      expect(typeof result.duration).toBe('number');
    });

    it('should handle fetch failures', async () => {
      mockCacheManager.isCacheValidForDate.mockResolvedValue(false);
      mockApiClient.fetchCourtData.mockRejectedValue(new Error('API error'));

      const result = await scheduler.performUpdate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });

    it('should handle cache update failures', async () => {
      const mockApiResponse = { body: { availability: { resources: [], time_slots: [] } } };
      const mockProcessedData = { 
        success: true, 
        parks: { 'MPTC Park': { name: 'MPTC Park' } },
        totalParks: 1
      };

      mockCacheManager.isCacheValidForDate.mockResolvedValue(false);
      mockApiClient.fetchCourtData.mockResolvedValue(mockApiResponse);
      mockProcessor.processApiResponse.mockReturnValue(mockProcessedData);
      mockCacheManager.updateDayData.mockResolvedValue(false);

      const result = await scheduler.performUpdate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update cache');
    });
  });

  describe('startScheduledUpdates', () => {
    it('should start scheduled updates successfully', () => {
      const mockTask = { stop: jest.fn() };
      cron.schedule.mockReturnValue(mockTask);

      const result = scheduler.startScheduledUpdates();

      expect(result).toBe(true);
      expect(scheduler.isRunning).toBe(true);
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 17 * * *',
        expect.any(Function),
        {
          scheduled: true,
          timezone: "America/Los_Angeles"
        }
      );
    });

    it('should not start if already running', () => {
      scheduler.isRunning = true;

      const result = scheduler.startScheduledUpdates();

      expect(result).toBe(false);
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should handle cron schedule errors', () => {
      cron.schedule.mockImplementation(() => {
        throw new Error('Cron error');
      });

      const result = scheduler.startScheduledUpdates();

      expect(result).toBe(false);
      expect(scheduler.isRunning).toBe(false);
    });
  });

  describe('stopScheduledUpdates', () => {
    it('should stop scheduled updates successfully', () => {
      const mockTask = { stop: jest.fn() };
      scheduler.scheduledTask = mockTask;
      scheduler.isRunning = true;

      const result = scheduler.stopScheduledUpdates();

      expect(result).toBe(true);
      expect(scheduler.isRunning).toBe(false);
      expect(scheduler.scheduledTask).toBe(null);
      expect(mockTask.stop).toHaveBeenCalled();
    });

    it('should not stop if not running', () => {
      const result = scheduler.stopScheduledUpdates();

      expect(result).toBe(false);
    });
  });

  describe('startTestSchedule', () => {
    it('should start test schedule with default expression', () => {
      const mockTask = { stop: jest.fn() };
      cron.schedule.mockReturnValue(mockTask);

      const result = scheduler.startTestSchedule();

      expect(result).toBe(true);
      expect(scheduler.isRunning).toBe(true);
      expect(cron.schedule).toHaveBeenCalledWith(
        '*/2 * * * *',
        expect.any(Function),
        {
          scheduled: true,
          timezone: "America/Los_Angeles"
        }
      );
    });

    it('should start test schedule with custom expression', () => {
      const mockTask = { stop: jest.fn() };
      cron.schedule.mockReturnValue(mockTask);

      const result = scheduler.startTestSchedule('*/5 * * * *');

      expect(result).toBe(true);
      expect(cron.schedule).toHaveBeenCalledWith(
        '*/5 * * * *',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should stop existing schedule before starting test', () => {
      const mockTask = { stop: jest.fn() };
      scheduler.scheduledTask = mockTask;
      scheduler.isRunning = true;
      
      cron.schedule.mockReturnValue(mockTask);

      const result = scheduler.startTestSchedule();

      expect(result).toBe(true);
      expect(mockTask.stop).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return scheduler status', () => {
      scheduler.isRunning = true;
      scheduler.lastUpdateStatus = { success: true, date: '2025-01-08' };

      const status = scheduler.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.lastUpdateStatus).toEqual({ success: true, date: '2025-01-08' });
      expect(status.currentPSTTime).toBeDefined();
      expect(status.currentPSTDate).toBeDefined();
    });
  });

  describe('validateCronExpression', () => {
    it('should validate cron expressions', () => {
      cron.validate.mockReturnValue(true);

      const result = scheduler.validateCronExpression('0 17 * * *');

      expect(result).toBe(true);
      expect(cron.validate).toHaveBeenCalledWith('0 17 * * *');
    });

    it('should return false for invalid expressions', () => {
      cron.validate.mockReturnValue(false);

      const result = scheduler.validateCronExpression('invalid');

      expect(result).toBe(false);
    });
  });
});