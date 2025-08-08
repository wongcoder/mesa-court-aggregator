const axios = require('axios');
const BackfillService = require('./backfill-service');
const CourtDataProcessor = require('./court-data-processor');
const CacheManager = require('./cache-manager');

// Mock dependencies
jest.mock('axios');
jest.mock('./court-data-processor');
jest.mock('./cache-manager');

const mockedAxios = axios;
const MockedCourtDataProcessor = CourtDataProcessor;
const MockedCacheManager = CacheManager;

describe('BackfillService', () => {
  let backfillService;
  let mockProcessor;
  let mockCacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockProcessor = {
      processApiResponse: jest.fn()
    };
    mockCacheManager = {
      updateDayData: jest.fn(),
      isCacheValidForDate: jest.fn()
    };
    
    MockedCourtDataProcessor.mockImplementation(() => mockProcessor);
    MockedCacheManager.mockImplementation(() => mockCacheManager);
    
    backfillService = new BackfillService();
  });

  describe('constructor', () => {
    it('should initialize with correct facility groups', () => {
      expect(backfillService.facilityGroups).toHaveLength(3);
      
      const kleinman = backfillService.facilityGroups.find(fg => fg.id === 29);
      expect(kleinman).toEqual({
        id: 29,
        name: 'Kleinman Park',
        startTime: '09:00:00',
        endTime: '22:00:00',
        pdfLink: expect.stringContaining('kleinman-pickleball-court.pdf')
      });
      
      const geneAutry = backfillService.facilityGroups.find(fg => fg.id === 33);
      expect(geneAutry).toEqual({
        id: 33,
        name: 'Gene Autry Park',
        startTime: '09:00:00',
        endTime: '22:00:00',
        pdfLink: null
      });
      
      const monterey = backfillService.facilityGroups.find(fg => fg.id === 35);
      expect(monterey).toEqual({
        id: 35,
        name: 'Monterey Park',
        startTime: '09:00:00',
        endTime: '22:00:00',
        pdfLink: expect.stringContaining('brady-pickleball-court.pdf')
      });
    });
  });

  describe('buildFacilityGroupPayload', () => {
    it('should build correct payload for facility group', () => {
      const facilityGroup = backfillService.facilityGroups[0]; // Kleinman Park
      const payload = backfillService.buildFacilityGroupPayload('2025-01-08', facilityGroup);
      
      expect(payload).toEqual({
        "facility_group_id": 29,
        "customer_id": 0,
        "company_id": 0,
        "reserve_date": '2025-01-08',
        "change_time_range": false,
        "reload": false,
        "resident": true,
        "start_time": '09:00:00',
        "end_time": '22:00:00'
      });
    });
  });

  describe('generateDateRange', () => {
    it('should generate 4 dates (today + 3 days)', () => {
      const dates = backfillService.generateDateRange();
      
      expect(dates).toHaveLength(4);
      expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dates[3]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Verify dates are consecutive
      const firstDate = new Date(dates[0]);
      const lastDate = new Date(dates[3]);
      const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBe(3);
    });
  });

  describe('fetchFacilityGroupData', () => {
    const mockSuccessResponse = {
      status: 200,
      data: {
        headers: {
          response_code: '0000',
          response_message: 'Successful'
        },
        body: {
          availability: {
            time_slots: ['09:00:00', '09:30:00'],
            resources: [
              {
                resource_id: 611,
                resource_name: 'Pickleball Court 01',
                time_slot_details: [
                  { status: 1, selected: false },
                  { status: 0, selected: false }
                ]
              }
            ]
          }
        }
      }
    };

    it('should successfully fetch facility group data', async () => {
      // Mock CSRF token manager
      backfillService.csrfManager.getValidToken = jest.fn().mockResolvedValue({
        success: true,
        token: 'test-token',
        sessionCookies: 'test-cookies'
      });
      
      mockedAxios.post.mockResolvedValue(mockSuccessResponse);
      
      const facilityGroup = backfillService.facilityGroups[0];
      const result = await backfillService.fetchFacilityGroupData('2025-01-08', facilityGroup);
      
      expect(result.success).toBe(true);
      expect(result.facilityGroup).toBe(facilityGroup);
      expect(result.date).toBe('2025-01-08');
      expect(result.data).toBe(mockSuccessResponse.data);
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('mesaaz/rest/reservation/quickreservation/availability'),
        {
          "facility_group_id": 29,
          "customer_id": 0,
          "company_id": 0,
          "reserve_date": '2025-01-08',
          "change_time_range": false,
          "reload": false,
          "resident": true,
          "start_time": '09:00:00',
          "end_time": '22:00:00'
        },
        expect.objectContaining({
          timeout: 15000,
          validateStatus: expect.any(Function),
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-token',
            'Cookie': 'test-cookies'
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      // Mock CSRF token manager
      backfillService.csrfManager.getValidToken = jest.fn().mockResolvedValue({
        success: true,
        token: 'test-token',
        sessionCookies: 'test-cookies'
      });
      
      const errorResponse = {
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockedAxios.post.mockResolvedValue(errorResponse);
      
      const facilityGroup = backfillService.facilityGroups[0];
      const result = await backfillService.fetchFacilityGroupData('2025-01-08', facilityGroup);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('API returned 500');
    });

    it('should handle network errors', async () => {
      // Mock CSRF token manager
      backfillService.csrfManager.getValidToken = jest.fn().mockResolvedValue({
        success: true,
        token: 'test-token',
        sessionCookies: 'test-cookies'
      });
      
      const networkError = new Error('Network Error');
      mockedAxios.post.mockRejectedValue(networkError);
      
      const facilityGroup = backfillService.facilityGroups[0];
      const result = await backfillService.fetchFacilityGroupData('2025-01-08', facilityGroup);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    it('should handle invalid response structure', async () => {
      // Mock CSRF token manager
      backfillService.csrfManager.getValidToken = jest.fn().mockResolvedValue({
        success: true,
        token: 'test-token',
        sessionCookies: 'test-cookies'
      });
      
      const invalidResponse = {
        status: 200,
        data: { invalid: 'structure' }
      };
      mockedAxios.post.mockResolvedValue(invalidResponse);
      
      const facilityGroup = backfillService.facilityGroups[0];
      const result = await backfillService.fetchFacilityGroupData('2025-01-08', facilityGroup);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid response structure');
    });

    it('should handle API error responses', async () => {
      // Mock CSRF token manager
      backfillService.csrfManager.getValidToken = jest.fn().mockResolvedValue({
        success: true,
        token: 'test-token',
        sessionCookies: 'test-cookies'
      });
      
      const errorResponse = {
        status: 200,
        data: {
          headers: {
            response_code: '1001',
            response_message: 'Authentication failed'
          },
          body: {
            availability: {
              time_slots: [],
              resources: []
            }
          }
        }
      };
      mockedAxios.post.mockResolvedValue(errorResponse);
      
      const facilityGroup = backfillService.facilityGroups[0];
      const result = await backfillService.fetchFacilityGroupData('2025-01-08', facilityGroup);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });

  describe('processAndCacheDate', () => {
    it('should process and cache successful facility results', async () => {
      const facilityResults = [
        {
          success: true,
          facilityGroup: { id: 29, name: 'Kleinman Park' },
          date: '2025-01-08',
          data: { mockApiData: true }
        },
        {
          success: true,
          facilityGroup: { id: 33, name: 'Gene Autry Park' },
          date: '2025-01-08',
          data: { mockApiData: true }
        }
      ];

      mockProcessor.processApiResponse
        .mockReturnValueOnce({
          success: true,
          parks: {
            'Kleinman Park': { name: 'Kleinman Park', totalCourts: 4 }
          }
        })
        .mockReturnValueOnce({
          success: true,
          parks: {
            'Gene Autry Park': { name: 'Gene Autry Park', totalCourts: 6 }
          }
        });

      mockCacheManager.updateDayData.mockResolvedValue(true);

      const result = await backfillService.processAndCacheDate('2025-01-08', facilityResults);

      expect(result.success).toBe(true);
      expect(result.parksCount).toBe(2);
      expect(result.successfulFacilities).toBe(2);
      expect(result.failedFacilities).toBe(0);

      expect(mockCacheManager.updateDayData).toHaveBeenCalledWith('2025-01-08', expect.arrayContaining([
        expect.objectContaining({
          name: 'Kleinman Park',
          facilityGroupId: 29,
          facilityGroupName: 'Kleinman Park'
        }),
        expect.objectContaining({
          name: 'Gene Autry Park',
          facilityGroupId: 33,
          facilityGroupName: 'Gene Autry Park'
        })
      ]));
    });

    it('should handle mixed success/failure results', async () => {
      const facilityResults = [
        {
          success: true,
          facilityGroup: { id: 29, name: 'Kleinman Park' },
          date: '2025-01-08',
          data: { mockApiData: true }
        },
        {
          success: false,
          facilityGroup: { id: 33, name: 'Gene Autry Park' },
          date: '2025-01-08',
          error: 'Network error'
        }
      ];

      mockProcessor.processApiResponse.mockReturnValue({
        success: true,
        parks: {
          'Kleinman Park': { name: 'Kleinman Park', totalCourts: 4 }
        }
      });

      mockCacheManager.updateDayData.mockResolvedValue(true);

      const result = await backfillService.processAndCacheDate('2025-01-08', facilityResults);

      expect(result.success).toBe(true);
      expect(result.parksCount).toBe(1);
      expect(result.successfulFacilities).toBe(1);
      expect(result.failedFacilities).toBe(1);
    });

    it('should handle cache failure', async () => {
      const facilityResults = [
        {
          success: true,
          facilityGroup: { id: 29, name: 'Kleinman Park' },
          date: '2025-01-08',
          data: { mockApiData: true }
        }
      ];

      mockProcessor.processApiResponse.mockReturnValue({
        success: true,
        parks: {
          'Kleinman Park': { name: 'Kleinman Park', totalCourts: 4 }
        }
      });

      mockCacheManager.updateDayData.mockResolvedValue(false);

      const result = await backfillService.processAndCacheDate('2025-01-08', facilityResults);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cache operation failed');
    });

    it('should handle all facility failures', async () => {
      const facilityResults = [
        {
          success: false,
          facilityGroup: { id: 29, name: 'Kleinman Park' },
          date: '2025-01-08',
          error: 'Network error'
        },
        {
          success: false,
          facilityGroup: { id: 33, name: 'Gene Autry Park' },
          date: '2025-01-08',
          error: 'Timeout'
        }
      ];

      const result = await backfillService.processAndCacheDate('2025-01-08', facilityResults);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No successful facility group data to cache');
      expect(result.failedFacilities).toBe(2);
    });
  });

  describe('hasValidCacheForDate', () => {
    it('should return true for valid cache', async () => {
      mockCacheManager.isCacheValidForDate.mockResolvedValue(true);
      
      const result = await backfillService.hasValidCacheForDate('2025-01-08');
      
      expect(result).toBe(true);
      expect(mockCacheManager.isCacheValidForDate).toHaveBeenCalledWith('2025-01-08');
    });

    it('should return false for invalid cache', async () => {
      mockCacheManager.isCacheValidForDate.mockResolvedValue(false);
      
      const result = await backfillService.hasValidCacheForDate('2025-01-08');
      
      expect(result).toBe(false);
    });

    it('should handle cache check errors', async () => {
      mockCacheManager.isCacheValidForDate.mockRejectedValue(new Error('Cache error'));
      
      const result = await backfillService.hasValidCacheForDate('2025-01-08');
      
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = backfillService.getStatus();
      
      expect(status).toEqual({
        facilityGroups: [
          {
            id: 29,
            name: 'Kleinman Park',
            timeRange: '09:00:00 - 22:00:00',
            hasPdfLink: true
          },
          {
            id: 33,
            name: 'Gene Autry Park',
            timeRange: '09:00:00 - 22:00:00',
            hasPdfLink: false
          },
          {
            id: 35,
            name: 'Monterey Park',
            timeRange: '09:00:00 - 22:00:00',
            hasPdfLink: true
          }
        ],
        timeout: 15000,
        baseUrl: expect.stringContaining('mesaaz/rest/reservation/quickreservation/availability'),
        csrfToken: expect.objectContaining({
          hasToken: expect.any(Boolean),
          hasSessionCookies: expect.any(Boolean),
          isValid: expect.any(Boolean)
        })
      });
    });
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const startTime = Date.now();
      await backfillService.delay(100);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });
});