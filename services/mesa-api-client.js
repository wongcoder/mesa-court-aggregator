const axios = require('axios');

/**
 * Mesa Court API Client
 * Handles communication with Mesa AZ's ActiveCommunities court reservation system
 */
class MesaApiClient {
  constructor() {
    this.baseUrl = 'https://anc.apm.activecommunities.com/mesaaz/rest/reservation/quickreservation/availability';
    this.timeout = 10000; // 10 second timeout
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
   * Fetch court availability data for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} csrfToken - CSRF token for authentication
   * @param {string} sessionId - Session ID from cookies
   * @returns {Promise<Object>} API response with court availability data
   */
  async fetchCourtData(date, csrfToken = null, sessionId = null) {
    try {
      const payload = this.buildRequestPayload(date);
      const headers = this.buildHeaders(csrfToken, sessionId);
      
      const response = await axios.post(
        `${this.baseUrl}?locale=en-US`,
        payload,
        {
          headers,
          timeout: this.timeout,
          validateStatus: (status) => status < 500 // Accept 4xx as valid responses
        }
      );

      if (response.status >= 400) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      return this.validateResponse(response.data);
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      } else if (error.response) {
        throw new Error(`API error ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach Mesa API');
      } else {
        throw new Error(`Request failed: ${error.message}`);
      }
    }
  }

  /**
   * Build the request payload for the Mesa API
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} Request payload
   */
  buildRequestPayload(date) {
    if (!date || !this.isValidDate(date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    return {
      "group_id": 5,
      "activity_id": 0,
      "facility_id": 0,
      "resource_id": 0,
      "package_id": 0,
      "date": date,
      "duration": 60,
      "party_size": 1,
      "show_all_resources": true
    };
  }

  /**
   * Build request headers with CSRF token and session handling
   * @param {string} csrfToken - CSRF token
   * @param {string} sessionId - Session ID
   * @returns {Object} Complete headers object
   */
  buildHeaders(csrfToken, sessionId) {
    const headers = { ...this.defaultHeaders };
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    if (sessionId) {
      headers['Cookie'] = `JSESSIONID=${sessionId}; mesaaz_JSESSIONID=${sessionId}`;
    }
    
    return headers;
  }

  /**
   * Validate the API response structure
   * @param {Object} data - Response data from API
   * @returns {Object} Validated response data
   */
  validateResponse(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response: Expected JSON object');
    }

    if (!data.headers || !data.body) {
      throw new Error('Invalid response: Missing headers or body');
    }

    if (data.headers.response_code !== '0000') {
      throw new Error(`API error: ${data.headers.response_message || 'Unknown error'}`);
    }

    if (!data.body.availability) {
      throw new Error('Invalid response: Missing availability data');
    }

    const availability = data.body.availability;
    if (!Array.isArray(availability.resources)) {
      throw new Error('Invalid response: Resources should be an array');
    }

    if (!Array.isArray(availability.time_slots)) {
      throw new Error('Invalid response: Time slots should be an array');
    }

    return data;
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param {string} date - Date string to validate
   * @returns {boolean} True if valid date format
   */
  isValidDate(date) {
    if (!date || typeof date !== 'string') {
      return false;
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }
    
    const parsedDate = new Date(date + 'T00:00:00.000Z');
    if (!(parsedDate instanceof Date) || isNaN(parsedDate)) {
      return false;
    }
    
    // Check if the date string matches the parsed date (catches invalid dates like 2025-02-30)
    const [year, month, day] = date.split('-').map(Number);
    return parsedDate.getUTCFullYear() === year && 
           parsedDate.getUTCMonth() === month - 1 && 
           parsedDate.getUTCDate() === day;
  }

  /**
   * Extract court resources from API response
   * @param {Object} responseData - Validated API response
   * @returns {Array} Array of court resources with availability
   */
  extractCourtResources(responseData) {
    const availability = responseData.body.availability;
    const timeSlots = availability.time_slots;
    
    return availability.resources.map(resource => ({
      resourceId: resource.resource_id,
      resourceName: resource.resource_name,
      timeSlots: resource.time_slot_details.map((slot, index) => ({
        time: timeSlots[index],
        status: slot.status, // 0 = booked, 1 = available
        selected: slot.selected
      })),
      warningMessages: resource.warning_messages || []
    }));
  }
}

module.exports = MesaApiClient;