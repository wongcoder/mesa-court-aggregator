const CourtDataProcessor = require('./court-data-processor');

describe('CourtDataProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new CourtDataProcessor();
  });

  describe('extractParkName', () => {
    test('should map Kleinman Park courts correctly', () => {
      expect(processor.extractParkName('Kleinman Park Pickleball Court 04')).toBe('Kleinman Park');
      expect(processor.extractParkName('Kleinman Park Pickleball Court 05')).toBe('Kleinman Park');
    });

    test('should map Gene Autry Park courts correctly', () => {
      expect(processor.extractParkName('Pickleball Court 17')).toBe('Gene Autry Park');
      expect(processor.extractParkName('Pickleball Court 18')).toBe('Gene Autry Park');
      expect(processor.extractParkName('Pickleball Court 24')).toBe('Gene Autry Park');
    });

    test('should map Monterey Park courts correctly', () => {
      expect(processor.extractParkName('Christopher J. Brady Pickleball Court 01')).toBe('Monterey Park');
      expect(processor.extractParkName('Christopher J. Brady Pickleball Court 04')).toBe('Monterey Park');
    });

    test('should filter out tennis courts', () => {
      expect(processor.extractParkName('Kleinman Park Tennis Court 01')).toBe(null);
      expect(processor.extractParkName('Tennis Court 01')).toBe(null);
    });

    test('should return "Unknown Park" for unmapped court names', () => {
      expect(processor.extractParkName('Unknown Court')).toBe('Unknown Park');
      expect(processor.extractParkName('Random Court Name')).toBe('Unknown Park');
    });
  });

  describe('analyzeTimeSlots', () => {
    test('should identify single booking period', () => {
      const timeSlots = [
        { time: '06:00:00', status: 0 }, // Available
        { time: '06:30:00', status: 1 }, // Booked
        { time: '07:00:00', status: 1 }, // Booked
        { time: '07:30:00', status: 0 }  // Available
      ];

      const periods = processor.analyzeTimeSlots(timeSlots);
      
      expect(periods).toHaveLength(1);
      expect(periods[0]).toEqual({
        startTime: '06:30:00',
        startIndex: 1,
        endTime: '07:30:00', // Fixed: should be the next available slot time
        endIndex: 2
      });
    });

    test('should identify multiple booking periods', () => {
      const timeSlots = [
        { time: '06:00:00', status: 1 }, // Booked
        { time: '06:30:00', status: 0 }, // Available
        { time: '07:00:00', status: 1 }, // Booked
        { time: '07:30:00', status: 1 }  // Booked
      ];

      const periods = processor.analyzeTimeSlots(timeSlots);
      
      expect(periods).toHaveLength(2);
      expect(periods[0]).toEqual({
        startTime: '06:00:00',
        startIndex: 0,
        endTime: '06:30:00', // Fixed: should be the next available slot time
        endIndex: 0
      });
      expect(periods[1]).toEqual({
        startTime: '07:00:00',
        startIndex: 2,
        endTime: '08:00:00', // Fixed: should be 30 minutes after last booked slot
        endIndex: 3
      });
    });

    test('should handle no booking periods', () => {
      const timeSlots = [
        { time: '06:00:00', status: 0 },
        { time: '06:30:00', status: 0 },
        { time: '07:00:00', status: 0 }
      ];

      const periods = processor.analyzeTimeSlots(timeSlots);
      expect(periods).toHaveLength(0);
    });

    test('should handle booking period extending to end of day', () => {
      const timeSlots = [
        { time: '06:00:00', status: 0 },
        { time: '06:30:00', status: 1 },
        { time: '07:00:00', status: 1 }
      ];

      const periods = processor.analyzeTimeSlots(timeSlots);
      
      expect(periods).toHaveLength(1);
      expect(periods[0]).toEqual({
        startTime: '06:30:00',
        startIndex: 1,
        endTime: '07:30:00', // Fixed: should be 30 minutes after last booked slot
        endIndex: 2
      });
    });

    test('should calculate correct end time for booking periods (bug fix)', () => {
      // Test case for the bug: 9:30-10:00 booking should show end time as 10:00, not 9:30
      const timeSlots = [
        { time: '09:00:00', status: 0 }, // Available
        { time: '09:30:00', status: 1 }, // Booked (start of booking)
        { time: '10:00:00', status: 0 }, // Available (end of booking period)
        { time: '10:30:00', status: 0 }  // Available
      ];

      const periods = processor.analyzeTimeSlots(timeSlots);
      
      expect(periods).toHaveLength(1);
      expect(periods[0]).toEqual({
        startTime: '09:30:00',
        startIndex: 1,
        endTime: '10:00:00', // Should be the next time slot, not the same as start
        endIndex: 1
      });
    });
  });

  describe('analyzeCourtBookings', () => {
    test('should analyze court with mixed availability', () => {
      const court = {
        resourceId: 611,
        resourceName: 'Pickleball Court 01',
        timeSlots: [
          { time: '06:00:00', status: 0 },
          { time: '06:30:00', status: 1 },
          { time: '07:00:00', status: 1 },
          { time: '07:30:00', status: 0 }
        ],
        warningMessages: ['Test warning']
      };

      const analysis = processor.analyzeCourtBookings(court);

      expect(analysis).toEqual({
        resourceId: 611,
        resourceName: 'Pickleball Court 01',
        parkName: 'Gene Autry Park',
        totalSlots: 4,
        bookedSlots: 2,
        availableSlots: 2,
        bookingPeriods: [{
          startTime: '06:30:00',
          startIndex: 1,
          endTime: '07:30:00', // Fixed: should be the next available slot time
          endIndex: 2
        }],
        isFullyBooked: false,
        isFullyAvailable: false,
        warningMessages: ['Test warning']
      });
    });

    test('should identify fully booked court', () => {
      const court = {
        resourceId: 611,
        resourceName: 'Pickleball Court 01',
        timeSlots: [
          { time: '06:00:00', status: 1 },
          { time: '06:30:00', status: 1 }
        ]
      };

      const analysis = processor.analyzeCourtBookings(court);
      
      expect(analysis.isFullyBooked).toBe(true);
      expect(analysis.isFullyAvailable).toBe(false);
      expect(analysis.availableSlots).toBe(0);
    });

    test('should identify fully available court', () => {
      const court = {
        resourceId: 611,
        resourceName: 'Pickleball Court 01',
        timeSlots: [
          { time: '06:00:00', status: 0 },
          { time: '06:30:00', status: 0 }
        ]
      };

      const analysis = processor.analyzeCourtBookings(court);
      
      expect(analysis.isFullyBooked).toBe(false);
      expect(analysis.isFullyAvailable).toBe(true);
      expect(analysis.bookedSlots).toBe(0);
    });
  });

  describe('aggregateByPark', () => {
    test('should aggregate courts by park correctly', () => {
      const courtResources = [
        {
          resourceId: 611,
          resourceName: 'Pickleball Court 17',
          timeSlots: [
            { time: '06:00:00', status: 0 },
            { time: '06:30:00', status: 0 }
          ]
        },
        {
          resourceId: 841,
          resourceName: 'Pickleball Court 18',
          timeSlots: [
            { time: '06:00:00', status: 1 },
            { time: '06:30:00', status: 1 }
          ]
        },
        {
          resourceId: 681,
          resourceName: 'Pickleball Court 19',
          timeSlots: [
            { time: '06:00:00', status: 1 },
            { time: '06:30:00', status: 0 }
          ]
        }
      ];

      const parkData = processor.aggregateByPark(courtResources);

      expect(Object.keys(parkData)).toHaveLength(1);
      
      // Check Gene Autry Park
      expect(parkData['Gene Autry Park']).toEqual({
        name: 'Gene Autry Park',
        color: '#a5b4a1',
        courts: expect.any(Array),
        totalCourts: 3,
        bookedCourts: 1,
        availableCourts: 1,
        partiallyBookedCourts: 1,
        status: 'partial'
      });
    });

    test('should set correct park status', () => {
      // Test fully available park
      const availableCourts = [
        {
          resourceId: 611,
          resourceName: 'Pickleball Court 17',
          timeSlots: [{ time: '06:00:00', status: 0 }]
        }
      ];

      let parkData = processor.aggregateByPark(availableCourts);
      expect(parkData['Gene Autry Park'].status).toBe('available');

      // Test fully booked park
      const bookedCourts = [
        {
          resourceId: 611,
          resourceName: 'Pickleball Court 17',
          timeSlots: [{ time: '06:00:00', status: 1 }]
        }
      ];

      parkData = processor.aggregateByPark(bookedCourts);
      expect(parkData['Gene Autry Park'].status).toBe('booked');
    });
  });

  describe('generateTimeWindows', () => {
    test('should generate time windows for park with no bookings', () => {
      const parkData = {
        courts: [
          {
            resourceName: 'Pickleball Court 01',
            bookingPeriods: []
          },
          {
            resourceName: 'Pickleball Court 01A',
            bookingPeriods: []
          }
        ]
      };

      const timeWindows = processor.generateTimeWindows(parkData);
      expect(timeWindows).toEqual([]);
    });

    test('should generate time windows for park with single booking period', () => {
      const parkData = {
        courts: [
          {
            resourceName: 'Pickleball Court 01',
            bookingPeriods: [
              {
                startTime: '14:30:00',
                endTime: '17:00:00'
              }
            ]
          }
        ]
      };

      const timeWindows = processor.generateTimeWindows(parkData);
      
      expect(timeWindows).toHaveLength(1);
      expect(timeWindows[0]).toEqual({
        startTime: '14:30:00',
        endTime: '17:00:00',
        courts: ['Pickleball Court 01'],
        displayTime: '2:30 PM-5:00 PM'
      });
    });

    test('should group courts with same booking period', () => {
      const parkData = {
        courts: [
          {
            resourceName: 'Pickleball Court 01',
            bookingPeriods: [
              {
                startTime: '14:30:00',
                endTime: '17:00:00'
              }
            ]
          },
          {
            resourceName: 'Pickleball Court 01A',
            bookingPeriods: [
              {
                startTime: '14:30:00',
                endTime: '17:00:00'
              }
            ]
          },
          {
            resourceName: 'Pickleball Court 01B',
            bookingPeriods: [
              {
                startTime: '14:30:00',
                endTime: '17:00:00'
              }
            ]
          }
        ]
      };

      const timeWindows = processor.generateTimeWindows(parkData);
      
      expect(timeWindows).toHaveLength(1);
      expect(timeWindows[0]).toEqual({
        startTime: '14:30:00',
        endTime: '17:00:00',
        courts: ['Pickleball Court 01', 'Pickleball Court 01A', 'Pickleball Court 01B'],
        displayTime: '2:30 PM-5:00 PM'
      });
    });

    test('should create separate time windows for different periods', () => {
      const parkData = {
        courts: [
          {
            resourceName: 'Pickleball Court 01',
            bookingPeriods: [
              {
                startTime: '14:30:00',
                endTime: '17:00:00'
              }
            ]
          },
          {
            resourceName: 'Pickleball Court 09A',
            bookingPeriods: [
              {
                startTime: '18:00:00',
                endTime: '20:00:00'
              }
            ]
          }
        ]
      };

      const timeWindows = processor.generateTimeWindows(parkData);
      
      expect(timeWindows).toHaveLength(2);
      expect(timeWindows[0]).toEqual({
        startTime: '14:30:00',
        endTime: '17:00:00',
        courts: ['Pickleball Court 01'],
        displayTime: '2:30 PM-5:00 PM'
      });
      expect(timeWindows[1]).toEqual({
        startTime: '18:00:00',
        endTime: '20:00:00',
        courts: ['Pickleball Court 09A'],
        displayTime: '6:00 PM-8:00 PM'
      });
    });

    test('should sort time windows by start time', () => {
      const parkData = {
        courts: [
          {
            resourceName: 'Pickleball Court 01',
            bookingPeriods: [
              {
                startTime: '18:00:00',
                endTime: '20:00:00'
              }
            ]
          },
          {
            resourceName: 'Pickleball Court 09A',
            bookingPeriods: [
              {
                startTime: '14:30:00',
                endTime: '17:00:00'
              }
            ]
          }
        ]
      };

      const timeWindows = processor.generateTimeWindows(parkData);
      
      expect(timeWindows).toHaveLength(2);
      // Should be sorted by start time
      expect(timeWindows[0].startTime).toBe('14:30:00');
      expect(timeWindows[1].startTime).toBe('18:00:00');
    });

    test('should handle courts with multiple booking periods', () => {
      const parkData = {
        courts: [
          {
            resourceName: 'Pickleball Court 01',
            bookingPeriods: [
              {
                startTime: '06:00:00',
                endTime: '08:00:00'
              },
              {
                startTime: '14:30:00',
                endTime: '17:00:00'
              }
            ]
          }
        ]
      };

      const timeWindows = processor.generateTimeWindows(parkData);
      
      expect(timeWindows).toHaveLength(2);
      expect(timeWindows[0]).toEqual({
        startTime: '06:00:00',
        endTime: '08:00:00',
        courts: ['Pickleball Court 01'],
        displayTime: '6:00 AM-8:00 AM'
      });
      expect(timeWindows[1]).toEqual({
        startTime: '14:30:00',
        endTime: '17:00:00',
        courts: ['Pickleball Court 01'],
        displayTime: '2:30 PM-5:00 PM'
      });
    });
  });

  describe('formatTimeRange', () => {
    test('should format time range correctly', () => {
      expect(processor.formatTimeRange('14:30:00', '17:00:00')).toBe('2:30 PM-5:00 PM');
      expect(processor.formatTimeRange('06:00:00', '08:00:00')).toBe('6:00 AM-8:00 AM');
      expect(processor.formatTimeRange('18:00:00', '20:00:00')).toBe('6:00 PM-8:00 PM');
      expect(processor.formatTimeRange('12:00:00', '13:30:00')).toBe('12:00 PM-1:30 PM');
    });
  });

  describe('formatTime', () => {
    test('should convert 24h to 12h format correctly', () => {
      expect(processor.formatTime('06:00:00')).toBe('6:00 AM');
      expect(processor.formatTime('12:00:00')).toBe('12:00 PM');
      expect(processor.formatTime('13:30:00')).toBe('1:30 PM');
      expect(processor.formatTime('00:00:00')).toBe('12:00 AM');
      expect(processor.formatTime('23:45:00')).toBe('11:45 PM');
    });
  });

  describe('generateCourtBookingDetails', () => {
    test('should generate details for available court', () => {
      const courtAnalysis = {
        bookingPeriods: []
      };

      const details = processor.generateCourtBookingDetails(courtAnalysis);
      expect(details).toEqual(['Available all day']);
    });

    test('should generate details for court with booking periods', () => {
      const courtAnalysis = {
        bookingPeriods: [
          {
            startTime: '06:00:00',
            endTime: '07:30:00'
          },
          {
            startTime: '14:00:00',
            endTime: '16:00:00'
          }
        ]
      };

      const details = processor.generateCourtBookingDetails(courtAnalysis);
      expect(details).toEqual([
        'Booked 6:00 AM-7:30 AM',
        'Booked 2:00 PM-4:00 PM'
      ]);
    });
  });

  describe('processApiResponse', () => {
    test('should process complete API response successfully', () => {
      // Mock API response structure
      const mockApiResponse = {
        headers: {
          response_code: '0000',
          response_message: 'Successful'
        },
        body: {
          availability: {
            time_slots: ['06:00:00', '06:30:00', '07:00:00'],
            resources: [
              {
                resource_id: 611,
                resource_name: 'Pickleball Court 01',
                time_slot_details: [
                  { status: 0, selected: false },
                  { status: 1, selected: false },
                  { status: 0, selected: false }
                ],
                warning_messages: []
              }
            ]
          }
        }
      };

      const result = processor.processApiResponse(mockApiResponse);

      expect(result.success).toBe(true);
      expect(result.totalParks).toBe(1);
      expect(result.parks['Gene Autry Park']).toBeDefined();
      expect(result.parks['Gene Autry Park'].timeWindows).toBeDefined();
      expect(result.processedAt).toBeDefined();
    });

    test('should correctly identify booking periods from actual sample data', () => {
      // Real sample data from Mesa API - Court 01 is booked 10:00 AM - 12:00 PM
      const realApiResponse = {
        headers: {
          response_code: '0000',
          response_message: 'Successful'
        },
        body: {
          availability: {
            time_slots: [
              "06:00:00", "06:30:00", "07:00:00", "07:30:00", "08:00:00", "08:30:00", 
              "09:00:00", "09:30:00", "10:00:00", "10:30:00", "11:00:00", "11:30:00", 
              "12:00:00", "12:30:00", "13:00:00", "13:30:00"
            ],
            resources: [
              {
                resource_id: 611,
                resource_name: 'Pickleball Court 01',
                time_slot_details: [
                  { status: 1, selected: false }, // 06:00:00 - Booked
                  { status: 1, selected: false }, // 06:30:00 - Booked
                  { status: 1, selected: false }, // 07:00:00 - Booked
                  { status: 1, selected: false }, // 07:30:00 - Booked
                  { status: 0, selected: false }, // 08:00:00 - Available
                  { status: 0, selected: false }, // 08:30:00 - Available
                  { status: 0, selected: false }, // 09:00:00 - Available
                  { status: 0, selected: false }, // 09:30:00 - Available
                  { status: 0, selected: false }, // 10:00:00 - Available
                  { status: 0, selected: false }, // 10:30:00 - Available
                  { status: 0, selected: false }, // 11:00:00 - Available
                  { status: 0, selected: false }, // 11:30:00 - Available
                  { status: 0, selected: false }, // 12:00:00 - Available
                  { status: 0, selected: false }, // 12:30:00 - Available
                  { status: 0, selected: false }, // 13:00:00 - Available
                  { status: 0, selected: false }  // 13:30:00 - Available
                ],
                warning_messages: []
              }
            ]
          }
        }
      };

      const result = processor.processApiResponse(realApiResponse);

      expect(result.success).toBe(true);
      expect(result.parks['Gene Autry Park']).toBeDefined();
      
      const court01 = result.parks['Gene Autry Park'].courts[0];
      expect(court01.resourceName).toBe('Pickleball Court 01');
      expect(court01.bookingPeriods).toHaveLength(1);
      expect(court01.bookingPeriods[0]).toEqual({
        startTime: '06:00:00',
        startIndex: 0,
        endTime: '08:00:00', // Fixed: should be 30 minutes after last booked slot
        endIndex: 3
      });
      
      expect(court01.bookingDetailStrings).toEqual(['Booked 6:00 AM-8:00 AM']);
    });

    test('should handle processing errors gracefully', () => {
      const invalidApiResponse = null;

      const result = processor.processApiResponse(invalidApiResponse);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.parks).toEqual({});
      expect(result.totalParks).toBe(0);
    });
  });

  describe('getParkList', () => {
    test('should return list of parks with colors', () => {
      const parkList = processor.getParkList();

      expect(parkList).toHaveLength(3);
      expect(parkList).toContainEqual({
        name: 'Kleinman Park',
        color: '#46f2b7'
      });
      expect(parkList).toContainEqual({
        name: 'Gene Autry Park',
        color: '#a5b4a1'
      });
      expect(parkList).toContainEqual({
        name: 'Monterey Park',
        color: '#45b78f'
      });
    });
  });
});