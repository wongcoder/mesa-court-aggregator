const CourtDataProcessor = require('./court-data-processor');

/**
 * Example usage of the Court Data Processor
 * Demonstrates processing of sample Mesa API response data
 */
async function demonstrateCourtDataProcessor() {
  const processor = new CourtDataProcessor();
  
  console.log('Court Data Processor Demo');
  console.log('========================\n');

  // Sample API response data (based on actual Mesa API structure)
  const sampleApiResponse = {
    headers: {
      response_code: '0000',
      response_message: 'Successful'
    },
    body: {
      availability: {
        time_increment: 30,
        time_slots: [
          '06:00:00', '06:30:00', '07:00:00', '07:30:00', '08:00:00',
          '08:30:00', '09:00:00', '09:30:00', '10:00:00', '10:30:00',
          '11:00:00', '11:30:00', '12:00:00', '12:30:00', '13:00:00',
          '13:30:00', '14:00:00', '14:30:00', '15:00:00', '15:30:00'
        ],
        resources: [
          {
            resource_id: 611,
            resource_name: 'Pickleball Court 01',
            time_slot_details: [
              { status: 1, selected: false }, // 6:00 AM - Booked
              { status: 1, selected: false }, // 6:30 AM - Booked
              { status: 1, selected: false }, // 7:00 AM - Booked
              { status: 1, selected: false }, // 7:30 AM - Booked
              { status: 0, selected: false }, // 8:00 AM - Available
              { status: 0, selected: false }, // 8:30 AM - Available
              { status: 0, selected: false }, // 9:00 AM - Available
              { status: 0, selected: false }, // 9:30 AM - Available
              { status: 0, selected: false }, // 10:00 AM - Available
              { status: 0, selected: false }, // 10:30 AM - Available
              { status: 0, selected: false }, // 11:00 AM - Available
              { status: 0, selected: false }, // 11:30 AM - Available
              { status: 0, selected: false }, // 12:00 PM - Available
              { status: 0, selected: false }, // 12:30 PM - Available
              { status: 0, selected: false }, // 1:00 PM - Available
              { status: 0, selected: false }, // 1:30 PM - Available
              { status: 0, selected: false }, // 2:00 PM - Available
              { status: 0, selected: false }, // 2:30 PM - Available
              { status: 0, selected: false }, // 3:00 PM - Available
              { status: 0, selected: false }  // 3:30 PM - Available
            ],
            warning_messages: ['Residents cannot make reservations more than 14 day(s) in advance.']
          },
          {
            resource_id: 841,
            resource_name: 'Pickleball Court 01A',
            time_slot_details: [
              { status: 1, selected: false }, // 6:00 AM - Booked
              { status: 1, selected: false }, // 6:30 AM - Booked
              { status: 1, selected: false }, // 7:00 AM - Booked
              { status: 1, selected: false }, // 7:30 AM - Booked
              { status: 1, selected: false }, // 8:00 AM - Booked
              { status: 1, selected: false }, // 8:30 AM - Booked
              { status: 1, selected: false }, // 9:00 AM - Booked
              { status: 1, selected: false }, // 9:30 AM - Booked
              { status: 1, selected: false }, // 10:00 AM - Booked
              { status: 1, selected: false }, // 10:30 AM - Booked
              { status: 1, selected: false }, // 11:00 AM - Booked
              { status: 1, selected: false }, // 11:30 AM - Booked
              { status: 0, selected: false }, // 12:00 PM - Available
              { status: 0, selected: false }, // 12:30 PM - Available
              { status: 0, selected: false }, // 1:00 PM - Available
              { status: 0, selected: false }, // 1:30 PM - Available
              { status: 0, selected: false }, // 2:00 PM - Available
              { status: 0, selected: false }, // 2:30 PM - Available
              { status: 0, selected: false }, // 3:00 PM - Available
              { status: 0, selected: false }  // 3:30 PM - Available
            ],
            warning_messages: ['Residents cannot make reservations more than 14 day(s) in advance.']
          },
          {
            resource_id: 681,
            resource_name: 'Pickleball Court 09A',
            time_slot_details: [
              { status: 0, selected: false }, // 6:00 AM - Available
              { status: 0, selected: false }, // 6:30 AM - Available
              { status: 0, selected: false }, // 7:00 AM - Available
              { status: 0, selected: false }, // 7:30 AM - Available
              { status: 0, selected: false }, // 8:00 AM - Available
              { status: 0, selected: false }, // 8:30 AM - Available
              { status: 0, selected: false }, // 9:00 AM - Available
              { status: 0, selected: false }, // 9:30 AM - Available
              { status: 0, selected: false }, // 10:00 AM - Available
              { status: 0, selected: false }, // 10:30 AM - Available
              { status: 0, selected: false }, // 11:00 AM - Available
              { status: 0, selected: false }, // 11:30 AM - Available
              { status: 0, selected: false }, // 12:00 PM - Available
              { status: 0, selected: false }, // 12:30 PM - Available
              { status: 0, selected: false }, // 1:00 PM - Available
              { status: 0, selected: false }, // 1:30 PM - Available
              { status: 0, selected: false }, // 2:00 PM - Available
              { status: 0, selected: false }, // 2:30 PM - Available
              { status: 0, selected: false }, // 3:00 PM - Available
              { status: 0, selected: false }  // 3:30 PM - Available
            ],
            warning_messages: ['Residents cannot make reservations more than 14 day(s) in advance.']
          }
        ]
      }
    }
  };

  console.log('Processing sample API response...\n');
  
  // Process the API response
  const result = processor.processApiResponse(sampleApiResponse);
  
  if (result.success) {
    console.log(`✅ Successfully processed data for ${result.totalParks} parks`);
    console.log(`📅 Processed at: ${result.processedAt}\n`);
    
    // Display park summaries
    Object.values(result.parks).forEach(park => {
      console.log(`🏞️  ${park.name} (${park.color})`);
      console.log(`   Status: ${park.status.toUpperCase()}`);
      console.log(`   Courts: ${park.totalCourts} total, ${park.availableCourts} available, ${park.bookedCourts} fully booked, ${park.partiallyBookedCourts} partially booked`);
      console.log(`   Summary: ${park.bookingDetails}`);
      
      // Show detailed court information
      park.courts.forEach(court => {
        console.log(`   📍 ${court.resourceName}:`);
        console.log(`      Booking periods: ${court.bookingDetailStrings.join(', ')}`);
        console.log(`      Slots: ${court.availableSlots} available, ${court.bookedSlots} booked`);
      });
      console.log('');
    });
    
    // Demonstrate park list functionality
    console.log('Available parks for filtering:');
    const parkList = processor.getParkList();
    parkList.forEach(park => {
      console.log(`  • ${park.name} (${park.color})`);
    });
    
  } else {
    console.log('❌ Processing failed:', result.error);
  }
}

// Only run the demo if this file is executed directly
if (require.main === module) {
  demonstrateCourtDataProcessor();
}

module.exports = { demonstrateCourtDataProcessor };