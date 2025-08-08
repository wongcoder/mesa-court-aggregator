const express = require('express');
const path = require('path');
const Scheduler = require('./services/scheduler');
const CacheManager = require('./services/cache-manager');
const BackfillService = require('./services/backfill-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const scheduler = new Scheduler();
const cacheManager = new CacheManager();
const backfillService = new BackfillService();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed system health endpoint
app.get('/api/health', async (req, res) => {
  try {
    const cacheHealth = await cacheManager.getCacheHealth();
    const schedulerStatus = scheduler.getStatus();
    const backfillStatus = backfillService.getStatus();
    
    const systemHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cache: cacheHealth,
      scheduler: {
        isRunning: schedulerStatus.isRunning,
        lastUpdate: schedulerStatus.lastUpdateStatus,
        currentTime: schedulerStatus.currentPSTTime
      },
      backfill: {
        facilityGroups: backfillStatus.facilityGroups.length,
        csrfTokenStatus: backfillStatus.csrfToken
      }
    };
    
    // Determine overall health status
    if (cacheHealth.totalFiles === 0) {
      systemHealth.status = 'degraded';
      systemHealth.warnings = ['No cached data available'];
    } else if (cacheHealth.staleFiles > cacheHealth.healthyFiles) {
      systemHealth.status = 'degraded';
      systemHealth.warnings = ['Most cached data is stale'];
    }
    
    if (!schedulerStatus.isRunning) {
      systemHealth.status = 'degraded';
      systemHealth.warnings = systemHealth.warnings || [];
      systemHealth.warnings.push('Scheduler is not running');
    }
    
    res.json(systemHealth);
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Calendar API endpoints
app.get('/api/calendar/:month', async (req, res) => {
  try {
    const { month } = req.params;
    
    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        error: 'Invalid month format. Expected YYYY-MM format.',
        example: '2025-01'
      });
    }
    
    // Validate month values (01-12)
    const [year, monthNum] = month.split('-').map(Number);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        error: 'Invalid month value. Month must be between 01 and 12.',
        example: '2025-01'
      });
    }
    
    // Validate month is not too far in the future (prevent abuse)
    const requestedDate = new Date(year, monthNum - 1);
    const currentDate = new Date();
    const maxFutureDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth());
    
    if (requestedDate > maxFutureDate) {
      return res.status(400).json({
        error: 'Month is too far in the future. Maximum 1 year ahead.',
        requestedMonth: month
      });
    }
    
    // Try to read cached data
    const cacheData = await cacheManager.readCache(month);
    
    if (!cacheData) {
      // Try to find alternative data sources or provide helpful error information
      const fs = require('fs').promises;
      try {
        const files = await fs.readdir('data');
        const jsonFiles = files.filter(file => file.endsWith('.json') && /^\d{4}-\d{2}\.json$/.test(file));
        
        if (jsonFiles.length === 0) {
          return res.status(404).json({
            error: 'No data available for the requested month.',
            month: month,
            message: 'No court data has been collected yet. The system may still be initializing.',
            suggestion: 'Please try again in a few minutes or contact support if this persists.'
          });
        }
        
        // Provide information about available months
        const availableMonths = jsonFiles.map(file => file.replace('.json', '')).sort();
        const latestMonth = availableMonths[availableMonths.length - 1];
        
        return res.status(404).json({
          error: 'No data available for the requested month.',
          month: month,
          message: 'Data may not have been collected yet for this month.',
          availableMonths: availableMonths,
          latestAvailable: latestMonth,
          suggestion: `Try viewing ${latestMonth} or an earlier month with available data.`
        });
        
      } catch (dirError) {
        console.error('Error reading data directory:', dirError.message);
        return res.status(404).json({
          error: 'No data available for the requested month.',
          month: month,
          message: 'Data collection system may be offline. Please try again later.',
          suggestion: 'Contact support if this issue persists.'
        });
      }
    }
    
    // Check data freshness and add metadata
    const dataAge = cacheData.lastUpdated ? 
      Math.floor((new Date() - new Date(cacheData.lastUpdated)) / (1000 * 60 * 60)) : null;
    
    const responseData = {
      ...cacheData,
      metadata: {
        dataAgeHours: dataAge,
        isStale: dataAge && dataAge > 48,
        serverTime: new Date().toISOString()
      }
    };
    
    // Add warning headers for stale data
    if (dataAge && dataAge > 48) {
      res.set('X-Data-Warning', 'Data may be outdated');
      res.set('X-Data-Age-Hours', dataAge.toString());
    }
    
    // Return the cached data with metadata
    res.json(responseData);
    
  } catch (error) {
    console.error(`Error serving calendar data for month ${req.params.month}:`, error.message);
    
    // Try to provide any available data as fallback
    try {
      const fallbackData = await cacheManager.readCache(req.params.month);
      if (fallbackData) {
        console.warn(`Serving potentially stale data for ${req.params.month} due to error`);
        res.status(200).json({
          ...fallbackData,
          metadata: {
            warning: 'Data served from cache due to system error',
            error: 'System temporarily unavailable',
            serverTime: new Date().toISOString()
          }
        });
        return;
      }
    } catch (fallbackError) {
      console.error('Fallback data retrieval also failed:', fallbackError.message);
    }
    
    res.status(500).json({
      error: 'Internal server error while retrieving calendar data.',
      message: 'System is temporarily unavailable. Please try again in a few minutes.',
      month: req.params.month,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/parks', async (req, res) => {
  try {
    // Get current month's data to extract park list
    const currentMonth = cacheManager.getCurrentMonth();
    const cacheData = await cacheManager.readCache(currentMonth);
    
    if (!cacheData || !cacheData.parkList) {
      // If no current month data, try to find any available month
      const fs = require('fs').promises;
      try {
        const files = await fs.readdir('data');
        const jsonFiles = files.filter(file => file.endsWith('.json') && /^\d{4}-\d{2}\.json$/.test(file));
        
        if (jsonFiles.length === 0) {
          return res.status(404).json({
            error: 'No park data available.',
            message: 'No monthly data files found. Data collection may not have started yet.',
            suggestion: 'Please wait for the system to collect initial data or contact support.',
            timestamp: new Date().toISOString()
          });
        }
        
        // Try the most recent file
        const latestFile = jsonFiles.sort().pop();
        const latestMonth = latestFile.replace('.json', '');
        const latestData = await cacheManager.readCache(latestMonth);
        
        if (latestData && latestData.parkList) {
          const dataAge = latestData.lastUpdated ? 
            Math.floor((new Date() - new Date(latestData.lastUpdated)) / (1000 * 60 * 60)) : null;
          
          return res.json({
            parks: latestData.parkList,
            source: `Data from ${latestMonth}`,
            lastUpdated: latestData.lastUpdated,
            metadata: {
              dataAgeHours: dataAge,
              isStale: dataAge && dataAge > 48,
              fallbackUsed: true,
              message: 'Using data from most recent available month'
            }
          });
        }
      } catch (dirError) {
        console.error('Error reading data directory:', dirError.message);
      }
      
      // Provide default park list as ultimate fallback
      const defaultParks = [
        { 
          name: 'Kleinman Park', 
          color: '#1976d2',
          pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf'
        },
        { 
          name: 'Gene Autry Park', 
          color: '#388e3c',
          pdfLink: null
        },
        { 
          name: 'Monterey Park', 
          color: '#8e24aa',
          pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/244/activities-culture/prcf/facilities/pickleball-public-court-calendars/brady-pickleball-court.pdf'
        }
      ];
      
      console.warn('Using default park list as fallback');
      return res.json({
        parks: defaultParks,
        source: 'Default configuration',
        lastUpdated: null,
        metadata: {
          warning: 'Using default park configuration due to data unavailability',
          message: 'Some features may be limited until data collection completes'
        }
      });
    }
    
    // Return the park list with metadata
    const dataAge = cacheData.lastUpdated ? 
      Math.floor((new Date() - new Date(cacheData.lastUpdated)) / (1000 * 60 * 60)) : null;
    
    res.json({
      parks: cacheData.parkList,
      source: `Data from ${currentMonth}`,
      lastUpdated: cacheData.lastUpdated,
      metadata: {
        dataAgeHours: dataAge,
        isStale: dataAge && dataAge > 48,
        serverTime: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error serving parks data:', error.message);
    
    // Provide default park list as fallback even on error
    const defaultParks = [
      { 
        name: 'Kleinman Park', 
        color: '#1976d2',
        pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf'
      },
      { 
        name: 'Gene Autry Park', 
        color: '#388e3c',
        pdfLink: null
      },
      { 
        name: 'Monterey Park', 
        color: '#8e24aa',
        pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/244/activities-culture/prcf/facilities/pickleball-public-court-calendars/brady-pickleball-court.pdf'
      }
    ];
    
    console.warn('Serving default park list due to error');
    res.status(200).json({
      parks: defaultParks,
      source: 'Default configuration (error fallback)',
      lastUpdated: null,
      metadata: {
        error: 'System error occurred, using default configuration',
        message: 'Some features may be limited. Please try refreshing the page.',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Scheduler management endpoints
app.get('/api/scheduler/status', (req, res) => {
  res.json(scheduler.getStatus());
});

app.post('/api/scheduler/start', (req, res) => {
  const success = scheduler.startScheduledUpdates();
  res.json({ 
    success, 
    message: success ? 'Scheduler started' : 'Failed to start scheduler',
    status: scheduler.getStatus()
  });
});

app.post('/api/scheduler/stop', (req, res) => {
  const success = scheduler.stopScheduledUpdates();
  res.json({ 
    success, 
    message: success ? 'Scheduler stopped' : 'Failed to stop scheduler',
    status: scheduler.getStatus()
  });
});

app.post('/api/scheduler/test', (req, res) => {
  const { cronExpression } = req.body;
  const expression = cronExpression || '*/2 * * * *'; // Default: every 2 minutes
  
  if (!scheduler.validateCronExpression(expression)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid cron expression',
      expression
    });
  }
  
  const success = scheduler.startTestSchedule(expression);
  res.json({ 
    success, 
    message: success ? `Test scheduler started with expression: ${expression}` : 'Failed to start test scheduler',
    expression,
    status: scheduler.getStatus()
  });
});

app.post('/api/scheduler/update', async (req, res) => {
  const { date } = req.body;
  
  try {
    const result = await scheduler.performUpdate(date);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Backfill service endpoints
app.get('/api/backfill/status', (req, res) => {
  res.json(backfillService.getStatus());
});

app.post('/api/backfill/run', async (req, res) => {
  const { skipExisting = true, delayBetweenRequests = 500, delayBetweenDates = 1000 } = req.body;
  
  try {
    const result = await backfillService.runBackfillJob({
      skipExisting,
      delayBetweenRequests,
      delayBetweenDates
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// CSRF token management endpoints
app.post('/api/backfill/token/sample', (req, res) => {
  const { token, sessionCookies } = req.body;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required'
    });
  }
  
  try {
    backfillService.setSampleToken(token, sessionCookies);
    res.json({
      success: true,
      message: 'Sample token configured',
      tokenStatus: backfillService.csrfManager.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/backfill/token/refresh', async (req, res) => {
  try {
    const result = await backfillService.refreshToken();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/backfill/test', async (req, res) => {
  const { date } = req.body;
  
  try {
    const result = await backfillService.testApiCall(date);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Run startup initialization
  async function startServer() {
    try {
      console.log('Starting Court Aggregator server...');
      
      // Always fetch fresh data for today first
      const today = new Date().toISOString().split('T')[0];
      console.log(`Fetching fresh data for today (${today})...`);
      
      try {
        const todayResult = await backfillService.fetchFreshDataForDate(today);
        if (todayResult.success) {
          console.log(`Fresh data fetched for today:`, {
            parks: todayResult.totalParks,
            successfulFacilities: todayResult.successfulFacilities,
            failedFacilities: todayResult.failedFacilities
          });
        } else {
          console.warn(`Failed to fetch fresh data for today: ${todayResult.error}`);
        }
      } catch (error) {
        console.warn(`Error fetching fresh data for today: ${error.message}`);
      }
      
      // Run backfill job for other dates (skip existing to avoid refetching today)
      console.log('Running startup backfill job for other dates...');
      const backfillResult = await backfillService.runBackfillJob({
        skipExisting: true,
        delayBetweenRequests: 500,
        delayBetweenDates: 1000
      });
      
      if (backfillResult.success) {
        console.log(`Backfill completed successfully:`, {
          processedDates: backfillResult.processedDates,
          skippedDates: backfillResult.skippedDates,
          successfulDates: backfillResult.successfulDates,
          failedDates: backfillResult.failedDates,
          duration: `${backfillResult.duration}ms`
        });
      } else {
        console.warn('Backfill job failed, but continuing with server startup:', backfillResult.error);
      }
      
      // Start the HTTP server
      app.listen(PORT, () => {
        console.log(`Court Aggregator server running on port ${PORT}`);
        console.log(`Visit http://localhost:${PORT} to view the application`);
        
        // Start the scheduled updates automatically
        const schedulerStarted = scheduler.startScheduledUpdates();
        if (schedulerStarted) {
          console.log('Daily scheduled updates started (5PM PST/PDT)');
        } else {
          console.error('Failed to start scheduled updates');
        }
      });
      
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  }
  
  startServer();
}

module.exports = app;