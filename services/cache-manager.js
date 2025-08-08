const fs = require('fs').promises;
const path = require('path');

class CacheManager {
  constructor(dataDir = 'data') {
    this.dataDir = dataDir;
  }

  /**
   * Get the file path for a given month
   * @param {string} month - Format: YYYY-MM
   * @returns {string} File path
   */
  getFilePath(month) {
    return path.join(this.dataDir, `${month}.json`);
  }

  /**
   * Get current month in YYYY-MM format
   * @returns {string} Current month
   */
  getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Generate consistent color for a park name using hash
   * @param {string} parkName - Name of the park
   * @returns {string} Hex color code
   */
  generateParkColor(parkName) {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < parkName.length; i++) {
      const char = parkName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Generate RGB values from hash
    const r = Math.abs(hash) % 200 + 55; // 55-254 range for better visibility
    const g = Math.abs(hash >> 8) % 200 + 55;
    const b = Math.abs(hash >> 16) % 200 + 55;
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Create park list with consistent color assignments and PDF links
   * @param {Array} parkNames - Array of park names
   * @param {Object} pdfLinks - Optional mapping of park names to PDF URLs
   * @returns {Array} Array of park objects with colors and PDF links
   */
  createParkList(parkNames, pdfLinks = {}) {
    return parkNames.map(name => ({
      name,
      color: this.generateParkColor(name),
      pdfLink: pdfLinks[name] || null
    }));
  } 
 /**
   * Check if cached data is fresh (less than 24 hours old)
   * @param {string} lastUpdated - ISO timestamp string
   * @returns {boolean} True if data is fresh
   */
  isCacheFresh(lastUpdated) {
    if (!lastUpdated) return false;
    
    const lastUpdate = new Date(lastUpdated);
    const now = new Date();
    const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
    
    return hoursDiff < 24;
  }

  /**
   * Migrate cache data from old format (bookingDetails string) to new format (timeWindows array)
   * @param {Object} cacheData - Cache data to potentially migrate
   * @returns {Object} Migrated cache data
   */
  async migrateToNewFormat(cacheData) {
    let needsMigration = false;
    
    // Check if any day data uses old format
    for (const [date, dayData] of Object.entries(cacheData.days)) {
      if (dayData.parks) {
        for (const park of dayData.parks) {
          if (park.bookingDetails && !park.timeWindows) {
            needsMigration = true;
            break;
          }
        }
      }
      if (needsMigration) break;
    }
    
    if (!needsMigration) {
      return cacheData;
    }
    
    console.log(`Migrating cache data for ${cacheData.month} from old format to new format`);
    
    // Migrate each day's data
    for (const [date, dayData] of Object.entries(cacheData.days)) {
      if (dayData.parks) {
        dayData.parks = dayData.parks.map(park => {
          if (park.bookingDetails && !park.timeWindows) {
            // Convert bookingDetails string to timeWindows array
            park.timeWindows = this.convertBookingDetailsToTimeWindows(park.bookingDetails);
            // Remove old bookingDetails field
            delete park.bookingDetails;
          }
          return park;
        });
      }
    }
    
    // Write migrated data back to file to avoid future migrations
    try {
      await this.writeCache(cacheData.month, cacheData);
      console.log(`Successfully migrated and saved cache data for ${cacheData.month}`);
    } catch (error) {
      console.warn(`Failed to save migrated cache data for ${cacheData.month}:`, error.message);
    }
    
    return cacheData;
  }

  /**
   * Convert old bookingDetails string format to new timeWindows array format
   * @param {string} bookingDetails - Old format booking details string
   * @returns {Array} Array of time window objects
   */
  convertBookingDetailsToTimeWindows(bookingDetails) {
    // Handle special cases
    if (!bookingDetails || bookingDetails === 'All courts available') {
      return [];
    }
    
    if (bookingDetails === 'All courts booked') {
      // Return a generic full-day booking window
      return [{
        startTime: '06:00',
        endTime: '22:00',
        courts: ['All courts'],
        displayTime: '6:00 AM-10:00 PM'
      }];
    }
    
    const timeWindows = [];
    
    // Parse booking details string to extract time ranges
    // Example: "Courts 1,2,3 booked 2:30-5:00 PM"
    const timeRangeRegex = /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*(AM|PM)/gi;
    const courtRegex = /Courts?\s+([\d,\s]+)/i;
    
    let match;
    while ((match = timeRangeRegex.exec(bookingDetails)) !== null) {
      const startTime12 = match[1];
      const endTime12 = match[2];
      const period = match[3];
      
      // Convert to 24-hour format
      const startTime24 = this.convertTo24Hour(startTime12, period);
      const endTime24 = this.convertTo24Hour(endTime12, period);
      
      // Extract court information
      const courtMatch = courtRegex.exec(bookingDetails);
      const courts = courtMatch ? 
        courtMatch[1].split(',').map(c => `Court ${c.trim()}`) : 
        ['Courts'];
      
      timeWindows.push({
        startTime: startTime24,
        endTime: endTime24,
        courts: courts,
        displayTime: `${startTime12}-${endTime12} ${period}`
      });
    }
    
    // If no time ranges found, create a generic time window
    if (timeWindows.length === 0) {
      timeWindows.push({
        startTime: '14:30',
        endTime: '17:00',
        courts: ['Courts'],
        displayTime: '2:30-5:00 PM'
      });
    }
    
    return timeWindows;
  }

  /**
   * Convert 12-hour time format to 24-hour format
   * @param {string} time12 - Time in 12-hour format (e.g., "2:30")
   * @param {string} period - AM or PM
   * @returns {string} Time in 24-hour format (e.g., "14:30")
   */
  convertTo24Hour(time12, period) {
    const [hours, minutes] = time12.split(':');
    let hour24 = parseInt(hours);
    
    if (period.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  }

  /**
   * Read monthly cache data from JSON file
   * @param {string} month - Format: YYYY-MM (optional, defaults to current month)
   * @returns {Object|null} Cache data or null if not found/invalid
   */
  async readCache(month = null) {
    try {
      const targetMonth = month || this.getCurrentMonth();
      const filePath = this.getFilePath(targetMonth);
      
      const data = await fs.readFile(filePath, 'utf8');
      let cacheData = JSON.parse(data);
      
      // Validate cache structure
      if (!cacheData.month || !cacheData.lastUpdated || !cacheData.days) {
        console.warn(`Invalid cache structure in ${filePath}`);
        return null;
      }
      
      // Migrate old format to new format if needed
      cacheData = await this.migrateToNewFormat(cacheData);
      
      return cacheData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, which is normal for new months
        return null;
      }
      console.error(`Error reading cache for ${month}:`, error.message);
      return null;
    }
  }

  /**
   * Write monthly cache data to JSON file
   * @param {string} month - Format: YYYY-MM
   * @param {Object} data - Cache data to write
   * @returns {boolean} Success status
   */
  async writeCache(month, data) {
    try {
      const filePath = this.getFilePath(month);
      
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Validate required fields
      if (!data.month || !data.lastUpdated || !data.days) {
        throw new Error('Invalid cache data structure - missing required fields');
      }
      
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf8');
      
      return true;
    } catch (error) {
      console.error(`Error writing cache for ${month}:`, error.message);
      return false;
    }
  }

  /**
   * Update cache with new day data
   * @param {string} date - Format: YYYY-MM-DD
   * @param {Array} parkData - Array of park availability data
   * @returns {boolean} Success status
   */
  async updateDayData(date, parkData) {
    try {
      const month = date.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
      let cacheData = await this.readCache(month);
      
      // Create new cache structure if it doesn't exist
      if (!cacheData) {
        // Extract unique park names and PDF links from parkData
        const parkNames = [...new Set(parkData.map(park => park.name))];
        const pdfLinks = {};
        parkData.forEach(park => {
          if (park.pdfLink !== undefined) {
            pdfLinks[park.name] = park.pdfLink;
          }
        });
        
        cacheData = {
          month,
          lastUpdated: new Date().toISOString(),
          parkList: this.createParkList(parkNames, pdfLinks),
          days: {}
        };
      } else {
        // Update lastUpdated timestamp
        cacheData.lastUpdated = new Date().toISOString();
        
        // Update park list if new parks are found
        const existingParkNames = cacheData.parkList.map(p => p.name);
        const newParkNames = parkData
          .map(park => park.name)
          .filter(name => !existingParkNames.includes(name));
        
        if (newParkNames.length > 0) {
          // Extract PDF links for new parks
          const newPdfLinks = {};
          parkData.forEach(park => {
            if (newParkNames.includes(park.name) && park.pdfLink !== undefined) {
              newPdfLinks[park.name] = park.pdfLink;
            }
          });
          
          const newParks = this.createParkList(newParkNames, newPdfLinks);
          cacheData.parkList.push(...newParks);
        }
        
        // Update PDF links for existing parks if they've changed
        parkData.forEach(park => {
          if (park.pdfLink !== undefined) {
            const existingPark = cacheData.parkList.find(p => p.name === park.name);
            if (existingPark && existingPark.pdfLink !== park.pdfLink) {
              existingPark.pdfLink = park.pdfLink;
            }
          }
        });
      }
      
      // Add color information to park data
      const parkColorMap = {};
      cacheData.parkList.forEach(park => {
        parkColorMap[park.name] = park.color;
      });
      
      const enrichedParkData = parkData.map(park => ({
        ...park,
        color: parkColorMap[park.name] || this.generateParkColor(park.name)
      }));
      
      // Update day data
      cacheData.days[date] = {
        parks: enrichedParkData
      };
      
      return await this.writeCache(month, cacheData);
    } catch (error) {
      console.error(`Error updating day data for ${date}:`, error.message);
      return false;
    }
  }

  /**
   * Get cached data for a specific date
   * @param {string} date - Format: YYYY-MM-DD
   * @returns {Object|null} Day data or null if not found
   */
  async getDayData(date) {
    try {
      const month = date.substring(0, 7);
      const cacheData = await this.readCache(month);
      
      if (!cacheData || !cacheData.days[date]) {
        return null;
      }
      
      return cacheData.days[date];
    } catch (error) {
      console.error(`Error getting day data for ${date}:`, error.message);
      return null;
    }
  }

  /**
   * Check if cache exists and is fresh for a given date
   * @param {string} date - Format: YYYY-MM-DD
   * @returns {boolean} True if cache is fresh
   */
  async isCacheValidForDate(date) {
    try {
      const month = date.substring(0, 7);
      const cacheData = await this.readCache(month);
      
      if (!cacheData || !cacheData.days[date]) {
        return false;
      }
      
      return this.isCacheFresh(cacheData.lastUpdated);
    } catch (error) {
      console.error(`Error checking cache validity for ${date}:`, error.message);
      return false;
    }
  }

  /**
   * Get cache status and health information
   * @returns {Object} Cache health status
   */
  async getCacheHealth() {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json') && /^\d{4}-\d{2}\.json$/.test(file));
      
      const cacheInfo = {
        totalFiles: jsonFiles.length,
        availableMonths: jsonFiles.map(file => file.replace('.json', '')).sort(),
        oldestData: null,
        newestData: null,
        staleFiles: 0,
        healthyFiles: 0
      };
      
      // Check each file's freshness
      for (const file of jsonFiles) {
        const month = file.replace('.json', '');
        try {
          const data = await this.readCache(month);
          if (data && data.lastUpdated) {
            const updateTime = new Date(data.lastUpdated);
            
            if (!cacheInfo.oldestData || updateTime < cacheInfo.oldestData) {
              cacheInfo.oldestData = updateTime;
            }
            if (!cacheInfo.newestData || updateTime > cacheInfo.newestData) {
              cacheInfo.newestData = updateTime;
            }
            
            if (this.isCacheFresh(data.lastUpdated)) {
              cacheInfo.healthyFiles++;
            } else {
              cacheInfo.staleFiles++;
            }
          }
        } catch (fileError) {
          console.warn(`Error reading cache file ${file}:`, fileError.message);
        }
      }
      
      return cacheInfo;
    } catch (error) {
      console.error('Error getting cache health:', error.message);
      return {
        error: error.message,
        totalFiles: 0,
        availableMonths: [],
        healthyFiles: 0,
        staleFiles: 0
      };
    }
  }

  /**
   * Attempt to recover from cache corruption by cleaning invalid files
   * @returns {Object} Recovery result
   */
  async recoverCache() {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json') && /^\d{4}-\d{2}\.json$/.test(file));
      
      const recovery = {
        totalFiles: jsonFiles.length,
        validFiles: 0,
        corruptedFiles: 0,
        removedFiles: [],
        errors: []
      };
      
      for (const file of jsonFiles) {
        const filePath = path.join(this.dataDir, file);
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const parsed = JSON.parse(data);
          
          // Validate basic structure
          if (parsed.month && parsed.lastUpdated && parsed.days) {
            recovery.validFiles++;
          } else {
            console.warn(`Invalid cache structure in ${file}, removing...`);
            await fs.unlink(filePath);
            recovery.corruptedFiles++;
            recovery.removedFiles.push(file);
          }
        } catch (fileError) {
          console.error(`Error processing ${file}:`, fileError.message);
          recovery.errors.push({ file, error: fileError.message });
          
          // Remove completely unreadable files
          try {
            await fs.unlink(filePath);
            recovery.corruptedFiles++;
            recovery.removedFiles.push(file);
          } catch (unlinkError) {
            console.error(`Failed to remove corrupted file ${file}:`, unlinkError.message);
          }
        }
      }
      
      return recovery;
    } catch (error) {
      console.error('Cache recovery failed:', error.message);
      return {
        error: error.message,
        totalFiles: 0,
        validFiles: 0,
        corruptedFiles: 0,
        removedFiles: [],
        errors: []
      };
    }
  }
}

module.exports = CacheManager;