const fs = require('fs').promises;
const path = require('path');
const CacheManager = require('./cache-manager');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

describe('CacheManager', () => {
  let cacheManager;
  const testDataDir = 'test-data';

  beforeEach(() => {
    cacheManager = new CacheManager(testDataDir);
    jest.clearAllMocks();
  });

  describe('getFilePath', () => {
    it('should return correct file path for given month', () => {
      const month = '2025-01';
      const expected = path.join(testDataDir, '2025-01.json');
      expect(cacheManager.getFilePath(month)).toBe(expected);
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(cacheManager.getCurrentMonth()).toBe(expected);
    });
  });

  describe('generateParkColor', () => {
    it('should generate consistent colors for same park name', () => {
      const parkName = 'Kleinman Park';
      const color1 = cacheManager.generateParkColor(parkName);
      const color2 = cacheManager.generateParkColor(parkName);
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should generate different colors for different park names', () => {
      const color1 = cacheManager.generateParkColor('Kleinman Park');
      const color2 = cacheManager.generateParkColor('Gene Autry Park');
      expect(color1).not.toBe(color2);
    });
  });

  describe('createParkList', () => {
    it('should create park list with colors', () => {
      const parkNames = ['Kleinman Park', 'Gene Autry Park'];
      const parkList = cacheManager.createParkList(parkNames);
      
      expect(parkList).toHaveLength(2);
      expect(parkList[0]).toHaveProperty('name', 'Kleinman Park');
      expect(parkList[0]).toHaveProperty('color');
      expect(parkList[0].color).toMatch(/^#[0-9a-f]{6}$/);
      expect(parkList[1]).toHaveProperty('name', 'Gene Autry Park');
      expect(parkList[1]).toHaveProperty('color');
    });
  });

  describe('isCacheFresh', () => {
    it('should return true for recent timestamp', () => {
      const recentTime = new Date(Date.now() - 1000 * 60 * 60 * 12); // 12 hours ago
      expect(cacheManager.isCacheFresh(recentTime.toISOString())).toBe(true);
    });

    it('should return false for old timestamp', () => {
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
      expect(cacheManager.isCacheFresh(oldTime.toISOString())).toBe(false);
    });

    it('should return false for null/undefined timestamp', () => {
      expect(cacheManager.isCacheFresh(null)).toBe(false);
      expect(cacheManager.isCacheFresh(undefined)).toBe(false);
    });
  });  
describe('readCache', () => {
    it('should read and parse valid cache file', async () => {
      const mockData = {
        month: '2025-01',
        lastUpdated: '2025-01-08T17:00:00Z',
        parkList: [{ name: 'Kleinman Park', color: '#4285f4' }],
        days: {}
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      
      const result = await cacheManager.readCache('2025-01');
      expect(result).toEqual(mockData);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(testDataDir, '2025-01.json'),
        'utf8'
      );
    });

    it('should return null for non-existent file', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);
      
      const result = await cacheManager.readCache('2025-01');
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON structure', async () => {
      const invalidData = { invalid: 'structure' };
      fs.readFile.mockResolvedValue(JSON.stringify(invalidData));
      
      const result = await cacheManager.readCache('2025-01');
      expect(result).toBeNull();
    });

    it('should use current month when no month specified', async () => {
      const currentMonth = cacheManager.getCurrentMonth();
      const mockData = {
        month: currentMonth,
        lastUpdated: '2025-01-08T17:00:00Z',
        parkList: [],
        days: {}
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(mockData));
      
      await cacheManager.readCache();
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(testDataDir, `${currentMonth}.json`),
        'utf8'
      );
    });
  });

  describe('writeCache', () => {
    it('should write valid cache data to file', async () => {
      const month = '2025-01';
      const data = {
        month: '2025-01',
        lastUpdated: '2025-01-08T17:00:00Z',
        parkList: [{ name: 'Kleinman Park', color: '#4285f4' }],
        days: {}
      };
      
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      const result = await cacheManager.writeCache(month, data);
      
      expect(result).toBe(true);
      expect(fs.mkdir).toHaveBeenCalledWith(testDataDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(testDataDir, '2025-01.json'),
        JSON.stringify(data, null, 2),
        'utf8'
      );
    });

    it('should return false for invalid data structure', async () => {
      const month = '2025-01';
      const invalidData = { invalid: 'structure' };
      
      const result = await cacheManager.writeCache(month, invalidData);
      expect(result).toBe(false);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle write errors gracefully', async () => {
      const month = '2025-01';
      const data = {
        month: '2025-01',
        lastUpdated: '2025-01-08T17:00:00Z',
        parkList: [],
        days: {}
      };
      
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('Write failed'));
      
      const result = await cacheManager.writeCache(month, data);
      expect(result).toBe(false);
    });
  });  
describe('updateDayData', () => {
    it('should create new cache when none exists', async () => {
      const date = '2025-01-08';
      const parkData = [
        {
          name: 'Kleinman Park',
          totalCourts: 4,
          bookedCourts: 2,
          availableCourts: 2,
          status: 'partial',
          timeWindows: [
            {
              startTime: '14:30',
              endTime: '17:00',
              courts: ['Court 1', 'Court 2'],
              displayTime: '2:30-5:00 PM'
            }
          ]
        }
      ];
      
      // Mock readCache to return null (no existing cache)
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      const result = await cacheManager.updateDayData(date, parkData);
      
      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
      
      // Verify the structure of written data
      const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenData.month).toBe('2025-01');
      expect(writtenData.parkList).toHaveLength(1);
      expect(writtenData.parkList[0].name).toBe('Kleinman Park');
      expect(writtenData.parkList[0].color).toMatch(/^#[0-9a-f]{6}$/);
      expect(writtenData.days[date].parks).toHaveLength(1);
      expect(writtenData.days[date].parks[0].color).toBeDefined();
      expect(writtenData.days[date].parks[0].timeWindows).toHaveLength(1);
      expect(writtenData.days[date].parks[0].timeWindows[0].startTime).toBe('14:30');
    });

    it('should update existing cache with new day data', async () => {
      const date = '2025-01-08';
      const parkData = [
        {
          name: 'Gene Autry Park',
          totalCourts: 2,
          bookedCourts: 1,
          availableCourts: 1,
          status: 'partial',
          timeWindows: [
            {
              startTime: '15:00',
              endTime: '16:30',
              courts: ['Court 1'],
              displayTime: '3:00-4:30 PM'
            }
          ]
        }
      ];
      
      const existingCache = {
        month: '2025-01',
        lastUpdated: '2025-01-07T17:00:00Z',
        parkList: [{ name: 'Kleinman Park', color: '#4285f4' }],
        days: {
          '2025-01-07': { parks: [] }
        }
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(existingCache));
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      const result = await cacheManager.updateDayData(date, parkData);
      
      expect(result).toBe(true);
      
      // Verify the updated data includes new park
      const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenData.parkList).toHaveLength(2);
      expect(writtenData.parkList.map(p => p.name)).toContain('Gene Autry Park');
      expect(writtenData.days[date]).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const date = '2025-01-08';
      const parkData = [
        {
          name: 'Test Park',
          totalCourts: 1,
          bookedCourts: 0,
          availableCourts: 1,
          status: 'available',
          timeWindows: []
        }
      ];
      
      // Mock readCache to return null (no existing cache)
      fs.readFile.mockRejectedValue({ code: 'ENOENT' });
      fs.mkdir.mockResolvedValue();
      // Mock writeFile to fail
      fs.writeFile.mockRejectedValue(new Error('Write failed'));
      
      const result = await cacheManager.updateDayData(date, parkData);
      expect(result).toBe(false);
    });
  });

  describe('getDayData', () => {
    it('should return day data when it exists', async () => {
      const date = '2025-01-08';
      const dayData = { parks: [{ name: 'Kleinman Park' }] };
      const cacheData = {
        month: '2025-01',
        lastUpdated: '2025-01-08T17:00:00Z',
        parkList: [],
        days: {
          [date]: dayData
        }
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(cacheData));
      
      const result = await cacheManager.getDayData(date);
      expect(result).toEqual(dayData);
    });

    it('should return null when day data does not exist', async () => {
      const date = '2025-01-08';
      const cacheData = {
        month: '2025-01',
        lastUpdated: '2025-01-08T17:00:00Z',
        parkList: [],
        days: {}
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(cacheData));
      
      const result = await cacheManager.getDayData(date);
      expect(result).toBeNull();
    });

    it('should return null when cache does not exist', async () => {
      const date = '2025-01-08';
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);
      
      const result = await cacheManager.getDayData(date);
      expect(result).toBeNull();
    });
  });

  describe('isCacheValidForDate', () => {
    it('should return true for fresh cache with existing day data', async () => {
      const date = '2025-01-08';
      const recentTime = new Date(Date.now() - 1000 * 60 * 60 * 12); // 12 hours ago
      const cacheData = {
        month: '2025-01',
        lastUpdated: recentTime.toISOString(),
        parkList: [],
        days: {
          [date]: { parks: [] }
        }
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(cacheData));
      
      const result = await cacheManager.isCacheValidForDate(date);
      expect(result).toBe(true);
    });

    it('should return false for stale cache', async () => {
      const date = '2025-01-08';
      const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
      const cacheData = {
        month: '2025-01',
        lastUpdated: oldTime.toISOString(),
        parkList: [],
        days: {
          [date]: { parks: [] }
        }
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(cacheData));
      
      const result = await cacheManager.isCacheValidForDate(date);
      expect(result).toBe(false);
    });

    it('should return false when day data does not exist', async () => {
      const date = '2025-01-08';
      const cacheData = {
        month: '2025-01',
        lastUpdated: new Date().toISOString(),
        parkList: [],
        days: {}
      };
      
      fs.readFile.mockResolvedValue(JSON.stringify(cacheData));
      
      const result = await cacheManager.isCacheValidForDate(date);
      expect(result).toBe(false);
    });

    it('should return false when cache does not exist', async () => {
      const date = '2025-01-08';
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.readFile.mockRejectedValue(error);
      
      const result = await cacheManager.isCacheValidForDate(date);
      expect(result).toBe(false);
    });
  });

  describe('migrateToNewFormat', () => {
    it('should migrate old format with bookingDetails to new format with timeWindows', async () => {
      const oldFormatData = {
        month: '2025-01',
        lastUpdated: '2025-01-08T17:00:00Z',
        parkList: [{ name: 'Kleinman Park', color: '#4285f4' }],
        days: {
          '2025-01-08': {
            parks: [
              {
                name: 'Kleinman Park',
                totalCourts: 4,
                bookedCourts: 2,
                availableCourts: 2,
                status: 'partial',
                bookingDetails: 'Courts 1,2 booked 2:30-5:00 PM',
                color: '#4285f4'
              }
            ]
          }
        }
      };

      fs.writeFile.mockResolvedValue();
      
      const result = await cacheManager.migrateToNewFormat(oldFormatData);
      
      expect(result.days['2025-01-08'].parks[0].timeWindows).toBeDefined();
      expect(result.days['2025-01-08'].parks[0].timeWindows).toHaveLength(1);
      expect(result.days['2025-01-08'].parks[0].timeWindows[0].startTime).toBe('14:30');
      expect(result.days['2025-01-08'].parks[0].timeWindows[0].endTime).toBe('17:00');
      expect(result.days['2025-01-08'].parks[0].timeWindows[0].displayTime).toBe('2:30-5:00 PM');
      expect(result.days['2025-01-08'].parks[0].bookingDetails).toBeUndefined();
    });

    it('should not migrate data that is already in new format', async () => {
      const newFormatData = {
        month: '2025-01',
        lastUpdated: '2025-01-08T17:00:00Z',
        parkList: [{ name: 'Kleinman Park', color: '#4285f4' }],
        days: {
          '2025-01-08': {
            parks: [
              {
                name: 'Kleinman Park',
                totalCourts: 4,
                bookedCourts: 2,
                availableCourts: 2,
                status: 'partial',
                timeWindows: [
                  {
                    startTime: '14:30',
                    endTime: '17:00',
                    courts: ['Court 1', 'Court 2'],
                    displayTime: '2:30-5:00 PM'
                  }
                ],
                color: '#4285f4'
              }
            ]
          }
        }
      };
      
      const result = await cacheManager.migrateToNewFormat(newFormatData);
      
      expect(result).toEqual(newFormatData);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('convertBookingDetailsToTimeWindows', () => {
    it('should convert booking details with time range to time windows', () => {
      const bookingDetails = 'Courts 1,2,3 booked 2:30-5:00 PM';
      
      const result = cacheManager.convertBookingDetailsToTimeWindows(bookingDetails);
      
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe('14:30');
      expect(result[0].endTime).toBe('17:00');
      expect(result[0].courts).toEqual(['Court 1', 'Court 2', 'Court 3']);
      expect(result[0].displayTime).toBe('2:30-5:00 PM');
    });

    it('should handle "All courts available" case', () => {
      const bookingDetails = 'All courts available';
      
      const result = cacheManager.convertBookingDetailsToTimeWindows(bookingDetails);
      
      expect(result).toHaveLength(0);
    });

    it('should handle "All courts booked" case', () => {
      const bookingDetails = 'All courts booked';
      
      const result = cacheManager.convertBookingDetailsToTimeWindows(bookingDetails);
      
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe('06:00');
      expect(result[0].endTime).toBe('22:00');
      expect(result[0].courts).toEqual(['All courts']);
      expect(result[0].displayTime).toBe('6:00 AM-10:00 PM');
    });

    it('should handle empty or null booking details', () => {
      expect(cacheManager.convertBookingDetailsToTimeWindows('')).toHaveLength(0);
      expect(cacheManager.convertBookingDetailsToTimeWindows(null)).toHaveLength(0);
      expect(cacheManager.convertBookingDetailsToTimeWindows(undefined)).toHaveLength(0);
    });
  });

  describe('convertTo24Hour', () => {
    it('should convert AM times correctly', () => {
      expect(cacheManager.convertTo24Hour('6:00', 'AM')).toBe('06:00');
      expect(cacheManager.convertTo24Hour('12:00', 'AM')).toBe('00:00');
      expect(cacheManager.convertTo24Hour('11:30', 'AM')).toBe('11:30');
    });

    it('should convert PM times correctly', () => {
      expect(cacheManager.convertTo24Hour('12:00', 'PM')).toBe('12:00');
      expect(cacheManager.convertTo24Hour('1:00', 'PM')).toBe('13:00');
      expect(cacheManager.convertTo24Hour('11:30', 'PM')).toBe('23:30');
    });
  });
});