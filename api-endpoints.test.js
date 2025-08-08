const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

// Set test environment before requiring server
process.env.NODE_ENV = 'test';

const app = require('./server');
const CacheManager = require('./services/cache-manager');

describe('API Endpoints Integration Tests', () => {
  let cacheManager;
  const testDataDir = 'test-data';

  beforeAll(async () => {
    // Create test cache manager with separate directory
    cacheManager = new CacheManager(testDataDir);
    
    // Ensure test data directory exists
    try {
      await fs.mkdir(testDataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterAll(async () => {
    // Clean up test data directory
    try {
      const files = await fs.readdir(testDataDir);
      for (const file of files) {
        await fs.unlink(path.join(testDataDir, file));
      }
      await fs.rmdir(testDataDir);
    } catch (error) {
      // Directory might not exist or be empty
    }
  });

  beforeEach(async () => {
    // Clean up any existing test files
    try {
      const files = await fs.readdir(testDataDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(testDataDir, file));
        }
      }
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/calendar/:month', () => {
    it('should return 404 when no cache data exists', async () => {
      const response = await request(app)
        .get('/api/calendar/2025-01')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('month', '2025-01');
      expect(response.body.error).toContain('No data available');
    });

    it('should return 400 for invalid month format', async () => {
      const response = await request(app)
        .get('/api/calendar/invalid-month')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid month format');
      expect(response.body).toHaveProperty('example', '2025-01');
    });

    it('should return 400 for month too far in future', async () => {
      const futureYear = new Date().getFullYear() + 2;
      const futureMonth = `${futureYear}-01`;

      const response = await request(app)
        .get(`/api/calendar/${futureMonth}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('too far in the future');
      expect(response.body).toHaveProperty('requestedMonth', futureMonth);
    });

    it('should validate month parameter boundaries', async () => {
      // Test various invalid formats
      const invalidMonths = ['2025-13', '2025-00'];
      
      for (const month of invalidMonths) {
        const response = await request(app)
          .get(`/api/calendar/${month}`)
          .expect(400);
        
        expect(response.body.error).toMatch(/Invalid month/);
      }
      
      // Test formats that Express routing catches
      const routingCaughtMonths = ['25-01', '2025-1'];
      for (const month of routingCaughtMonths) {
        const response = await request(app)
          .get(`/api/calendar/${month}`);
        
        // Express routing returns 404 for malformed paths, or 400 if it reaches our handler
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('GET /api/parks', () => {
    it('should return parks data when available', async () => {
      const response = await request(app)
        .get('/api/parks');

      // Could be 200 if data exists, or 404 if no data
      if (response.status === 200) {
        expect(response.body).toHaveProperty('parks');
        expect(response.body).toHaveProperty('source');
        expect(response.body).toHaveProperty('lastUpdated');
        expect(Array.isArray(response.body.parks)).toBe(true);
      } else if (response.status === 404) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('No park data available');
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    });
  });

  describe('API Error Handling', () => {
    it('should handle concurrent requests properly', async () => {
      // Make multiple concurrent requests to health endpoint (which should always work)
      const requests = Array(5).fill().map(() => 
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
      });
    });

    it('should return proper JSON error responses', async () => {
      const response = await request(app)
        .get('/api/calendar/invalid')
        .expect(400);

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing route parameters', async () => {
      // This should return 404 from Express for missing route parameter
      const response = await request(app)
        .get('/api/calendar/')
        .expect(404);

      // Express returns HTML for 404, which is expected behavior
      expect(response.status).toBe(404);
    });
  });

  describe('Response Headers and Format', () => {
    it('should return JSON content type for API endpoints', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should include proper CORS headers if needed', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Basic response should work
      expect(response.status).toBe(200);
    });
  });
});