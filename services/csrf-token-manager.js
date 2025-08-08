const axios = require('axios');

/**
 * CSRF Token Manager for Mesa ActiveCommunities API
 * Handles obtaining and managing CSRF tokens for authenticated requests
 */
class CsrfTokenManager {
  constructor() {
    this.baseUrl = 'https://anc.apm.activecommunities.com/mesaaz';
    this.timeout = 10000;
    this.currentToken = null;
    this.sessionCookies = null;
    this.tokenExpiry = null;
    
    // Headers for initial page load to get CSRF token
    this.initialHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'DNT': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"'
    };
  }

  /**
   * Log message with timestamp
   * @param {string} level - Log level (INFO, ERROR, WARN)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [CSRF] [${level}] ${message}`;
    
    if (level === 'ERROR') {
      console.error(logEntry, data || '');
    } else if (level === 'WARN') {
      console.warn(logEntry, data || '');
    } else {
      console.log(logEntry, data || '');
    }
  }

  /**
   * Extract CSRF token from HTML content
   * @param {string} html - HTML content from the page
   * @returns {string|null} CSRF token or null if not found
   */
  extractCsrfTokenFromHtml(html) {
    // Look for CSRF token in meta tags
    const metaTokenMatch = html.match(/<meta\s+name=["']_csrf["']\s+content=["']([^"']+)["']/i);
    if (metaTokenMatch) {
      return metaTokenMatch[1];
    }

    // Look for CSRF token in hidden input fields
    const inputTokenMatch = html.match(/<input[^>]*name=["']_csrf["'][^>]*value=["']([^"']+)["']/i);
    if (inputTokenMatch) {
      return inputTokenMatch[1];
    }

    // Look for CSRF token in JavaScript variables
    const jsTokenMatch = html.match(/csrfToken\s*[:=]\s*["']([^"']+)["']/i);
    if (jsTokenMatch) {
      return jsTokenMatch[1];
    }

    // Look for CSRF token in data attributes
    const dataTokenMatch = html.match(/data-csrf-token=["']([^"']+)["']/i);
    if (dataTokenMatch) {
      return dataTokenMatch[1];
    }

    return null;
  }

  /**
   * Extract session ID from cookies
   * @param {Array} cookies - Array of cookie strings
   * @returns {string|null} Session ID or null if not found
   */
  extractSessionId(cookies) {
    if (!cookies || !Array.isArray(cookies)) {
      return null;
    }

    for (const cookie of cookies) {
      // Look for JSESSIONID
      const jsessionMatch = cookie.match(/JSESSIONID=([^;]+)/);
      if (jsessionMatch) {
        return jsessionMatch[1];
      }

      // Look for mesaaz_JSESSIONID
      const mesaSessionMatch = cookie.match(/mesaaz_JSESSIONID=([^;]+)/);
      if (mesaSessionMatch) {
        return mesaSessionMatch[1];
      }
    }

    return null;
  }

  /**
   * Fetch the reservation page to get CSRF token and session
   * @returns {Promise<Object>} Token and session information
   */
  async fetchCsrfToken() {
    try {
      this.log('INFO', 'Fetching CSRF token from reservation page');

      // First, get the main reservation page to establish session
      const reservationUrl = `${this.baseUrl}/reservation/landing/quick?locale=en-US&groupId=5`;
      
      const response = await axios.get(reservationUrl, {
        headers: this.initialHeaders,
        timeout: this.timeout,
        validateStatus: (status) => status < 400,
        maxRedirects: 5
      });

      if (response.status >= 300) {
        throw new Error(`Failed to load reservation page: ${response.status} ${response.statusText}`);
      }

      // Extract CSRF token from HTML using multiple patterns
      const html = response.data;
      let csrfToken = null;
      
      // Try multiple token extraction patterns
      const tokenPatterns = [
        /csrfToken\s*[:=]\s*["']([^"']+)["']/i,  // JavaScript variable (most common)
        /<meta\s+name=["']_csrf["']\s+content=["']([^"']+)["']/i,  // Meta tag
        /<input[^>]*name=["']_csrf["'][^>]*value=["']([^"']+)["']/i,  // Input field
        /data-csrf-token=["']([^"']+)["']/i,  // Data attribute
        /_csrf["']\s*:\s*["']([^"']+)["']/i  // JSON property
      ];

      for (const pattern of tokenPatterns) {
        const match = html.match(pattern);
        if (match) {
          csrfToken = match[1];
          break;
        }
      }
      
      // Extract ALL session cookies (not just JSESSIONID)
      const cookies = response.headers['set-cookie'] || [];
      let sessionCookies = '';
      
      cookies.forEach(cookie => {
        const [nameValue] = cookie.split(';');
        // Include all cookies that look session-related
        if (nameValue.includes('JSESSIONID') || 
            nameValue.includes('mesaaz') || 
            nameValue.includes('BIGip') || 
            nameValue.includes('TS0')) {
          sessionCookies += nameValue + '; ';
        }
      });

      if (!csrfToken) {
        this.log('WARN', 'CSRF token not found in HTML, trying alternative methods');
        
        // Try to get token from a different endpoint
        const altToken = await this.tryAlternativeTokenEndpoint();
        if (altToken) {
          this.currentToken = altToken;
          this.sessionCookies = sessionCookies.trim();
          this.tokenExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes
          
          this.log('INFO', 'Successfully obtained CSRF token from alternative endpoint');
          return {
            success: true,
            token: this.currentToken,
            sessionCookies: this.sessionCookies,
            source: 'alternative'
          };
        }
        
        throw new Error('CSRF token not found in page content');
      }

      // Store the token and session info
      this.currentToken = csrfToken;
      this.sessionCookies = sessionCookies.trim();
      this.tokenExpiry = Date.now() + (30 * 60 * 1000); // Assume 30 minute expiry

      this.log('INFO', 'Successfully obtained CSRF token', {
        tokenLength: csrfToken.length,
        hasSessionCookies: !!this.sessionCookies,
        cookieCount: cookies.length,
        source: 'html'
      });

      return {
        success: true,
        token: this.currentToken,
        sessionCookies: this.sessionCookies,
        source: 'html'
      };

    } catch (error) {
      this.log('ERROR', 'Failed to fetch CSRF token', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Try alternative endpoint to get CSRF token
   * @returns {Promise<string|null>} CSRF token or null
   */
  async tryAlternativeTokenEndpoint() {
    try {
      // Try the API endpoint that might return token info
      const apiUrl = `${this.baseUrl}/rest/reservation/quickreservation/token`;
      
      const response = await axios.get(apiUrl, {
        headers: {
          ...this.initialHeaders,
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: this.timeout,
        validateStatus: (status) => status < 500
      });

      if (response.data && response.data.token) {
        return response.data.token;
      }

      // If that doesn't work, try making a test request to see what error we get
      const testUrl = `${this.baseUrl}/rest/reservation/quickreservation/availability?locale=en-US`;
      const testResponse = await axios.post(testUrl, {
        "facility_group_id": 29,
        "customer_id": 0,
        "company_id": 0,
        "reserve_date": new Date().toISOString().split('T')[0],
        "change_time_range": false,
        "reload": false,
        "resident": true,
        "start_time": "08:30:00",
        "end_time": "22:00:00"
      }, {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: this.timeout,
        validateStatus: () => true // Accept all status codes
      });

      // Look for token in error response
      if (testResponse.data && testResponse.data.headers && testResponse.data.headers.csrf_token) {
        return testResponse.data.headers.csrf_token;
      }

    } catch (error) {
      this.log('WARN', 'Alternative token endpoint failed', error.message);
    }

    return null;
  }

  /**
   * Check if current token is valid and not expired
   * @returns {boolean} True if token is valid
   */
  isTokenValid() {
    if (!this.currentToken || !this.tokenExpiry) {
      return false;
    }
    return Date.now() < this.tokenExpiry;
  }

  /**
   * Get current valid CSRF token, fetching new one if needed
   * @param {boolean} forceRefresh - Force refresh even if current token is valid
   * @returns {Promise<Object>} Token information
   */
  async getValidToken(forceRefresh = false) {
    if (!forceRefresh && this.isTokenValid()) {
      this.log('INFO', 'Using cached CSRF token');
      return {
        success: true,
        token: this.currentToken,
        sessionCookies: this.sessionCookies,
        source: 'cache'
      };
    }

    this.log('INFO', 'Fetching new CSRF token', {
      reason: forceRefresh ? 'forced refresh' : 'token expired/missing'
    });

    return await this.fetchCsrfToken();
  }

  /**
   * Use the provided sample token for testing
   * @param {string} sampleToken - Sample CSRF token
   * @param {string} sampleSessionCookies - Optional sample session cookies
   */
  useSampleToken(sampleToken, sampleSessionCookies = null) {
    this.currentToken = sampleToken;
    this.sessionCookies = sampleSessionCookies;
    this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour for testing
    
    this.log('INFO', 'Using provided sample CSRF token', {
      tokenLength: sampleToken.length,
      hasSessionCookies: !!sampleSessionCookies
    });
  }

  /**
   * Clear current token and session
   */
  clearToken() {
    this.currentToken = null;
    this.sessionCookies = null;
    this.tokenExpiry = null;
    this.log('INFO', 'Cleared CSRF token and session');
  }

  /**
   * Get current token status
   * @returns {Object} Token status information
   */
  getStatus() {
    return {
      hasToken: !!this.currentToken,
      hasSessionCookies: !!this.sessionCookies,
      isValid: this.isTokenValid(),
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      tokenPreview: this.currentToken ? `${this.currentToken.substring(0, 8)}...` : null,
      cookiePreview: this.sessionCookies ? `${this.sessionCookies.substring(0, 50)}...` : null
    };
  }
}

module.exports = CsrfTokenManager;