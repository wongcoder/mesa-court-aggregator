const axios = require('axios');
const CsrfTokenManager = require('./csrf-token-manager');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('CsrfTokenManager', () => {
  let csrfManager;

  beforeEach(() => {
    jest.clearAllMocks();
    csrfManager = new CsrfTokenManager();
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(csrfManager.baseUrl).toBe('https://anc.apm.activecommunities.com/mesaaz');
      expect(csrfManager.timeout).toBe(10000);
      expect(csrfManager.currentToken).toBeNull();
      expect(csrfManager.sessionCookies).toBeNull();
      expect(csrfManager.tokenExpiry).toBeNull();
    });
  });

  describe('extractCsrfTokenFromHtml', () => {
    it('should extract token from meta tag', () => {
      const html = '<html><head><meta name="_csrf" content="test-token-123"></head></html>';
      const token = csrfManager.extractCsrfTokenFromHtml(html);
      expect(token).toBe('test-token-123');
    });

    it('should extract token from input field', () => {
      const html = '<form><input type="hidden" name="_csrf" value="input-token-456"></form>';
      const token = csrfManager.extractCsrfTokenFromHtml(html);
      expect(token).toBe('input-token-456');
    });

    it('should extract token from JavaScript variable', () => {
      const html = '<script>var csrfToken = "js-token-789";</script>';
      const token = csrfManager.extractCsrfTokenFromHtml(html);
      expect(token).toBe('js-token-789');
    });

    it('should extract token from data attribute', () => {
      const html = '<div data-csrf-token="data-token-abc"></div>';
      const token = csrfManager.extractCsrfTokenFromHtml(html);
      expect(token).toBe('data-token-abc');
    });

    it('should return null if no token found', () => {
      const html = '<html><body>No token here</body></html>';
      const token = csrfManager.extractCsrfTokenFromHtml(html);
      expect(token).toBeNull();
    });
  });

  describe('extractSessionId', () => {
    it('should extract JSESSIONID from cookies', () => {
      const cookies = ['JSESSIONID=session123; Path=/'];
      const sessionId = csrfManager.extractSessionId(cookies);
      expect(sessionId).toBe('session123');
    });

    it('should extract mesaaz_JSESSIONID from cookies', () => {
      const cookies = ['mesaaz_JSESSIONID=mesa-session456; Path=/'];
      const sessionId = csrfManager.extractSessionId(cookies);
      expect(sessionId).toBe('mesa-session456');
    });

    it('should return null if no session ID found', () => {
      const cookies = ['OTHER_COOKIE=value; Path=/'];
      const sessionId = csrfManager.extractSessionId(cookies);
      expect(sessionId).toBeNull();
    });

    it('should handle null or undefined cookies', () => {
      expect(csrfManager.extractSessionId(null)).toBeNull();
      expect(csrfManager.extractSessionId(undefined)).toBeNull();
      expect(csrfManager.extractSessionId([])).toBeNull();
    });
  });

  describe('fetchCsrfToken', () => {
    it('should successfully fetch token from HTML', async () => {
      const mockHtml = '<html><head><meta name="_csrf" content="html-token-123"></head></html>';
      const mockResponse = {
        status: 200,
        data: mockHtml,
        headers: {
          'set-cookie': ['JSESSIONID=session123; Path=/']
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await csrfManager.fetchCsrfToken();

      expect(result.success).toBe(true);
      expect(result.token).toBe('html-token-123');
      expect(result.sessionCookies).toBe('JSESSIONID=session123;');
      expect(result.source).toBe('html');
      expect(csrfManager.currentToken).toBe('html-token-123');
      expect(csrfManager.sessionCookies).toBe('JSESSIONID=session123;');
    });

    it('should handle HTTP errors', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 404,
        statusText: 'Not Found'
      });

      const result = await csrfManager.fetchCsrfToken();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load reservation page: 404');
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await csrfManager.fetchCsrfToken();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should try alternative endpoint if token not found in HTML', async () => {
      const mockHtmlResponse = {
        status: 200,
        data: '<html><body>No token here</body></html>',
        headers: { 'set-cookie': [] }
      };

      const mockAltResponse = {
        status: 200,
        data: { token: 'alt-token-456' }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockHtmlResponse)
        .mockResolvedValueOnce(mockAltResponse);

      const result = await csrfManager.fetchCsrfToken();

      expect(result.success).toBe(true);
      expect(result.token).toBe('alt-token-456');
      expect(result.source).toBe('alternative');
    });
  });

  describe('isTokenValid', () => {
    it('should return true for valid token', () => {
      csrfManager.currentToken = 'test-token';
      csrfManager.tokenExpiry = Date.now() + 10000; // 10 seconds in future

      expect(csrfManager.isTokenValid()).toBe(true);
    });

    it('should return false for expired token', () => {
      csrfManager.currentToken = 'test-token';
      csrfManager.tokenExpiry = Date.now() - 10000; // 10 seconds in past

      expect(csrfManager.isTokenValid()).toBe(false);
    });

    it('should return false for missing token', () => {
      csrfManager.currentToken = null;
      csrfManager.tokenExpiry = Date.now() + 10000;

      expect(csrfManager.isTokenValid()).toBe(false);
    });
  });

  describe('getValidToken', () => {
    it('should return cached token if valid', async () => {
      csrfManager.currentToken = 'cached-token';
      csrfManager.sessionCookies = 'cached-session';
      csrfManager.tokenExpiry = Date.now() + 10000;

      const result = await csrfManager.getValidToken();

      expect(result.success).toBe(true);
      expect(result.token).toBe('cached-token');
      expect(result.sessionCookies).toBe('cached-session');
      expect(result.source).toBe('cache');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch new token if current is expired', async () => {
      csrfManager.currentToken = 'expired-token';
      csrfManager.tokenExpiry = Date.now() - 10000; // Expired

      const mockResponse = {
        status: 200,
        data: '<meta name="_csrf" content="new-token">',
        headers: { 'set-cookie': ['JSESSIONID=new-session; Path=/'] }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await csrfManager.getValidToken();

      expect(result.success).toBe(true);
      expect(result.token).toBe('new-token');
      expect(result.source).toBe('html');
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      csrfManager.currentToken = 'valid-token';
      csrfManager.tokenExpiry = Date.now() + 10000; // Still valid

      const mockResponse = {
        status: 200,
        data: '<meta name="_csrf" content="forced-new-token">',
        headers: { 'set-cookie': [] }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await csrfManager.getValidToken(true);

      expect(result.success).toBe(true);
      expect(result.token).toBe('forced-new-token');
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  describe('useSampleToken', () => {
    it('should set sample token and session', () => {
      const sampleToken = 'sample-token-123';
      const sampleSession = 'sample-session-456';

      csrfManager.useSampleToken(sampleToken, sampleSession);

      expect(csrfManager.currentToken).toBe(sampleToken);
      expect(csrfManager.sessionCookies).toBe(sampleSession);
      expect(csrfManager.tokenExpiry).toBeGreaterThan(Date.now());
    });

    it('should set sample token without session', () => {
      const sampleToken = 'sample-token-only';

      csrfManager.useSampleToken(sampleToken);

      expect(csrfManager.currentToken).toBe(sampleToken);
      expect(csrfManager.sessionCookies).toBeNull();
    });
  });

  describe('clearToken', () => {
    it('should clear all token data', () => {
      csrfManager.currentToken = 'test-token';
      csrfManager.sessionCookies = 'test-session';
      csrfManager.tokenExpiry = Date.now() + 10000;

      csrfManager.clearToken();

      expect(csrfManager.currentToken).toBeNull();
      expect(csrfManager.sessionCookies).toBeNull();
      expect(csrfManager.tokenExpiry).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return correct status for valid token', () => {
      const expiry = Date.now() + 10000;
      csrfManager.currentToken = 'test-token-123456';
      csrfManager.sessionCookies = 'test-session-cookies';
      csrfManager.tokenExpiry = expiry;

      const status = csrfManager.getStatus();

      expect(status).toEqual({
        hasToken: true,
        hasSessionCookies: true,
        isValid: true,
        expiresAt: new Date(expiry).toISOString(),
        tokenPreview: 'test-tok...',
        cookiePreview: 'test-session-cookies...'
      });
    });

    it('should return correct status for no token', () => {
      const status = csrfManager.getStatus();

      expect(status).toEqual({
        hasToken: false,
        hasSessionCookies: false,
        isValid: false,
        expiresAt: null,
        tokenPreview: null,
        cookiePreview: null
      });
    });
  });
});