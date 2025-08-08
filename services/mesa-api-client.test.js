const axios = require('axios');
const MesaApiClient = require('./mesa-api-client');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('MesaApiClient', () => {
  let client;
  
  beforeEach(() => {
    client = new MesaApiClient();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(client.baseUrl).toBe('https://anc.apm.activecommunities.com/mesaaz/rest/reservation/quickreservation/availability');
      expect(client.timeout).toBe(10000);
      expect(client.defaultHeaders).toHaveProperty('Content-Type', 'application/json;charset=utf-8');
    });
  });

  describe('buildRequestPayload', () => {
    it('should build correct payload for valid date', () => {
      const payload = client.buildRequestPayload('2025-01-08');
      
      expect(payload).toEqual({
        "group_id": 5,
        "activity_id": 0,
        "facility_id": 0,
        "resource_id": 0,
        "package_id": 0,
        "date": '2025-01-08',
        "duration": 60,
        "party_size": 1,
        "show_all_resources": true
      });
    });

    it('should throw error for invalid date format', () => {
      expect(() => client.buildRequestPayload('invalid-date')).toThrow('Invalid date format. Expected YYYY-MM-DD');
      expect(() => client.buildRequestPayload('2025/01/08')).toThrow('Invalid date format. Expected YYYY-MM-DD');
      expect(() => client.buildRequestPayload('')).toThrow('Invalid date format. Expected YYYY-MM-DD');
      expect(() => client.buildRequestPayload(null)).toThrow('Invalid date format. Expected YYYY-MM-DD');
    });
  });

  describe('buildHeaders', () => {
    it('should build headers without CSRF token and session ID', () => {
      const headers = client.buildHeaders();
      
      expect(headers).toHaveProperty('Content-Type', 'application/json;charset=utf-8');
      expect(headers).toHaveProperty('X-Requested-With', 'XMLHttpRequest');
      expect(headers).not.toHaveProperty('X-CSRF-Token');
      expect(headers).not.toHaveProperty('Cookie');
    });

    it('should include CSRF token when provided', () => {
      const headers = client.buildHeaders('test-csrf-token');
      
      expect(headers).toHaveProperty('X-CSRF-Token', 'test-csrf-token');
    });

    it('should include session ID in cookies when provided', () => {
      const headers = client.buildHeaders(null, 'test-session-id');
      
      expect(headers).toHaveProperty('Cookie', 'JSESSIONID=test-session-id; mesaaz_JSESSIONID=test-session-id');
    });

    it('should include both CSRF token and session ID when provided', () => {
      const headers = client.buildHeaders('test-csrf-token', 'test-session-id');
      
      expect(headers).toHaveProperty('X-CSRF-Token', 'test-csrf-token');
      expect(headers).toHaveProperty('Cookie', 'JSESSIONID=test-session-id; mesaaz_JSESSIONID=test-session-id');
    });
  });

  describe('isValidDate', () => {
    it('should validate correct date formats', () => {
      expect(client.isValidDate('2025-01-08')).toBe(true);
      expect(client.isValidDate('2025-12-31')).toBe(true);
      expect(client.isValidDate('2024-02-29')).toBe(true); // leap year
    });

    it('should reject invalid date formats', () => {
      expect(client.isValidDate('2025/01/08')).toBe(false);
      expect(client.isValidDate('01-08-2025')).toBe(false);
      expect(client.isValidDate('2025-1-8')).toBe(false);
      expect(client.isValidDate('invalid')).toBe(false);
      expect(client.isValidDate('')).toBe(false);
      expect(client.isValidDate(null)).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(client.isValidDate('2025-13-01')).toBe(false); // invalid month
      expect(client.isValidDate('2025-02-30')).toBe(false); // invalid day
      expect(client.isValidDate('2023-02-29')).toBe(false); // not a leap year
    });
  });

  describe('validateResponse', () => {
    const mockValidResponse = {
      headers: {
        response_code: '0000',
        response_message: 'Successful'
      },
      body: {
        availability: {
          time_slots: ['06:00:00', '06:30:00'],
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
    };

    it('should validate correct response structure', () => {
      expect(() => client.validateResponse(mockValidResponse)).not.toThrow();
      expect(client.validateResponse(mockValidResponse)).toEqual(mockValidResponse);
    });

    it('should throw error for null or undefined response', () => {
      expect(() => client.validateResponse(null)).toThrow('Invalid response: Expected JSON object');
      expect(() => client.validateResponse(undefined)).toThrow('Invalid response: Expected JSON object');
      expect(() => client.validateResponse('string')).toThrow('Invalid response: Expected JSON object');
    });

    it('should throw error for missing headers or body', () => {
      expect(() => client.validateResponse({})).toThrow('Invalid response: Missing headers or body');
      expect(() => client.validateResponse({ headers: {} })).toThrow('Invalid response: Missing headers or body');
      expect(() => client.validateResponse({ body: {} })).toThrow('Invalid response: Missing headers or body');
    });

    it('should throw error for non-success response code', () => {
      const errorResponse = {
        ...mockValidResponse,
        headers: {
          response_code: '1001',
          response_message: 'Authentication failed'
        }
      };
      
      expect(() => client.validateResponse(errorResponse)).toThrow('API error: Authentication failed');
    });

    it('should throw error for missing availability data', () => {
      const invalidResponse = {
        headers: { response_code: '0000' },
        body: {}
      };
      
      expect(() => client.validateResponse(invalidResponse)).toThrow('Invalid response: Missing availability data');
    });

    it('should throw error for invalid resources structure', () => {
      const invalidResponse = {
        headers: { response_code: '0000' },
        body: {
          availability: {
            resources: 'not-an-array',
            time_slots: []
          }
        }
      };
      
      expect(() => client.validateResponse(invalidResponse)).toThrow('Invalid response: Resources should be an array');
    });

    it('should throw error for invalid time_slots structure', () => {
      const invalidResponse = {
        headers: { response_code: '0000' },
        body: {
          availability: {
            resources: [],
            time_slots: 'not-an-array'
          }
        }
      };
      
      expect(() => client.validateResponse(invalidResponse)).toThrow('Invalid response: Time slots should be an array');
    });
  });

  describe('extractCourtResources', () => {
    const mockResponse = {
      body: {
        availability: {
          time_slots: ['06:00:00', '06:30:00', '07:00:00'],
          resources: [
            {
              resource_id: 611,
              resource_name: 'Pickleball Court 01',
              time_slot_details: [
                { status: 1, selected: false },
                { status: 0, selected: false },
                { status: 1, selected: false }
              ],
              warning_messages: ['Residents cannot make reservations more than 14 day(s) in advance.']
            },
            {
              resource_id: 841,
              resource_name: 'Pickleball Court 01A',
              time_slot_details: [
                { status: 0, selected: false },
                { status: 0, selected: false },
                { status: 1, selected: false }
              ]
            }
          ]
        }
      }
    };

    it('should extract court resources correctly', () => {
      const resources = client.extractCourtResources(mockResponse);
      
      expect(resources).toHaveLength(2);
      
      expect(resources[0]).toEqual({
        resourceId: 611,
        resourceName: 'Pickleball Court 01',
        timeSlots: [
          { time: '06:00:00', status: 1, selected: false },
          { time: '06:30:00', status: 0, selected: false },
          { time: '07:00:00', status: 1, selected: false }
        ],
        warningMessages: ['Residents cannot make reservations more than 14 day(s) in advance.']
      });
      
      expect(resources[1]).toEqual({
        resourceId: 841,
        resourceName: 'Pickleball Court 01A',
        timeSlots: [
          { time: '06:00:00', status: 0, selected: false },
          { time: '06:30:00', status: 0, selected: false },
          { time: '07:00:00', status: 1, selected: false }
        ],
        warningMessages: []
      });
    });
  });

  describe('fetchCourtData', () => {
    const mockSuccessResponse = {
      status: 200,
      data: {
        headers: {
          response_code: '0000',
          response_message: 'Successful'
        },
        body: {
          availability: {
            time_slots: ['06:00:00'],
            resources: []
          }
        }
      }
    };

    it('should successfully fetch court data', async () => {
      mockedAxios.post.mockResolvedValue(mockSuccessResponse);
      
      const result = await client.fetchCourtData('2025-01-08');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://anc.apm.activecommunities.com/mesaaz/rest/reservation/quickreservation/availability?locale=en-US',
        {
          "group_id": 5,
          "activity_id": 0,
          "facility_id": 0,
          "resource_id": 0,
          "package_id": 0,
          "date": '2025-01-08',
          "duration": 60,
          "party_size": 1,
          "show_all_resources": true
        },
        expect.objectContaining({
          timeout: 10000,
          validateStatus: expect.any(Function)
        })
      );
      
      expect(result).toEqual(mockSuccessResponse.data);
    });

    it('should include CSRF token and session ID in request', async () => {
      mockedAxios.post.mockResolvedValue(mockSuccessResponse);
      
      await client.fetchCourtData('2025-01-08', 'csrf-token', 'session-id');
      
      const callArgs = mockedAxios.post.mock.calls[0];
      const headers = callArgs[2].headers;
      
      expect(headers['X-CSRF-Token']).toBe('csrf-token');
      expect(headers['Cookie']).toBe('JSESSIONID=session-id; mesaaz_JSESSIONID=session-id');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValue(timeoutError);
      
      await expect(client.fetchCourtData('2025-01-08')).rejects.toThrow('Request timeout after 10000ms');
    });

    it('should handle HTTP error responses', async () => {
      const httpError = new Error('Request failed');
      httpError.response = {
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockedAxios.post.mockRejectedValue(httpError);
      
      await expect(client.fetchCourtData('2025-01-08')).rejects.toThrow('API error 500: Internal Server Error');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.request = {};
      mockedAxios.post.mockRejectedValue(networkError);
      
      await expect(client.fetchCourtData('2025-01-08')).rejects.toThrow('Network error: Unable to reach Mesa API');
    });

    it('should handle 4xx status codes from API', async () => {
      const errorResponse = {
        status: 400,
        statusText: 'Bad Request',
        data: mockSuccessResponse.data
      };
      mockedAxios.post.mockResolvedValue(errorResponse);
      
      await expect(client.fetchCourtData('2025-01-08')).rejects.toThrow('API returned 400: Bad Request');
    });

    it('should handle invalid date input', async () => {
      await expect(client.fetchCourtData('invalid-date')).rejects.toThrow('Invalid date format. Expected YYYY-MM-DD');
    });

    it('should handle API response validation errors', async () => {
      const invalidResponse = {
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
      mockedAxios.post.mockResolvedValue(invalidResponse);
      
      await expect(client.fetchCourtData('2025-01-08')).rejects.toThrow('API error: Authentication failed');
    });

    it('should handle generic request errors', async () => {
      const genericError = new Error('Something went wrong');
      mockedAxios.post.mockRejectedValue(genericError);
      
      await expect(client.fetchCourtData('2025-01-08')).rejects.toThrow('Request failed: Something went wrong');
    });
  });
});