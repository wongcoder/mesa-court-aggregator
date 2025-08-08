const MesaApiClient = require('./mesa-api-client');

/**
 * Example usage of the Mesa API Client
 * This demonstrates how to fetch court data and handle responses
 */
async function demonstrateApiClient() {
  const client = new MesaApiClient();
  
  try {
    console.log('Fetching court data for today...');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch court data (without CSRF token and session ID for demo)
    const response = await client.fetchCourtData(today);
    
    console.log('API Response received successfully!');
    console.log('Response code:', response.headers.response_code);
    console.log('Response message:', response.headers.response_message);
    
    // Extract court resources
    const courtResources = client.extractCourtResources(response);
    
    console.log(`\nFound ${courtResources.length} court resources:`);
    
    courtResources.forEach((court, index) => {
      console.log(`\n${index + 1}. ${court.resourceName} (ID: ${court.resourceId})`);
      
      // Count available and booked slots
      const availableSlots = court.timeSlots.filter(slot => slot.status === 1);
      const bookedSlots = court.timeSlots.filter(slot => slot.status === 0);
      
      console.log(`   Available slots: ${availableSlots.length}`);
      console.log(`   Booked slots: ${bookedSlots.length}`);
      
      if (court.warningMessages.length > 0) {
        console.log(`   Warnings: ${court.warningMessages.join(', ')}`);
      }
      
      // Show first few booked time slots as example
      const firstBookedSlots = bookedSlots.slice(0, 3);
      if (firstBookedSlots.length > 0) {
        console.log(`   Sample booked times: ${firstBookedSlots.map(slot => slot.time).join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error fetching court data:', error.message);
    
    // Demonstrate error handling
    if (error.message.includes('timeout')) {
      console.log('Suggestion: Try again later or check network connection');
    } else if (error.message.includes('API error')) {
      console.log('Suggestion: Check CSRF token and session authentication');
    } else if (error.message.includes('Network error')) {
      console.log('Suggestion: Verify Mesa API endpoint is accessible');
    }
  }
}

// Only run the demo if this file is executed directly
if (require.main === module) {
  demonstrateApiClient();
}

module.exports = { demonstrateApiClient };