const CacheManager = require('./cache-manager');

// Example usage of the CacheManager
async function demonstrateCacheManager() {
  const cacheManager = new CacheManager();
  
  console.log('=== Cache Manager Demo ===\n');
  
  // Example park data
  const sampleParkData = [
    {
      name: 'Kleinman Park',
      totalCourts: 4,
      bookedCourts: 3,
      availableCourts: 1,
      status: 'partial',
      bookingDetails: 'Courts 1,2,3 booked 2:30-5:00 PM'
    },
    {
      name: 'Gene Autry Park',
      totalCourts: 2,
      bookedCourts: 0,
      availableCourts: 2,
      status: 'available',
      bookingDetails: 'All courts available'
    },
    {
      name: 'Red Mountain Park',
      totalCourts: 6,
      bookedCourts: 6,
      availableCourts: 0,
      status: 'booked',
      bookingDetails: 'All courts booked'
    }
  ];
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  console.log('1. Checking if cache is valid for today...');
  const isValid = await cacheManager.isCacheValidForDate(today);
  console.log(`Cache valid: ${isValid}\n`);
  
  console.log('2. Updating cache with sample data...');
  const updateSuccess = await cacheManager.updateDayData(today, sampleParkData);
  console.log(`Update successful: ${updateSuccess}\n`);
  
  console.log('3. Reading cached data for today...');
  const dayData = await cacheManager.getDayData(today);
  console.log('Day data:', JSON.stringify(dayData, null, 2));
  console.log();
  
  console.log('4. Reading full monthly cache...');
  const monthlyCache = await cacheManager.readCache();
  if (monthlyCache) {
    console.log(`Month: ${monthlyCache.month}`);
    console.log(`Last updated: ${monthlyCache.lastUpdated}`);
    console.log(`Parks available: ${monthlyCache.parkList.length}`);
    console.log('Park colors:');
    monthlyCache.parkList.forEach(park => {
      console.log(`  - ${park.name}: ${park.color}`);
    });
    console.log(`Days with data: ${Object.keys(monthlyCache.days).length}`);
  }
  console.log();
  
  console.log('5. Demonstrating color consistency...');
  const color1 = cacheManager.generateParkColor('Kleinman Park');
  const color2 = cacheManager.generateParkColor('Kleinman Park');
  console.log(`Kleinman Park color (call 1): ${color1}`);
  console.log(`Kleinman Park color (call 2): ${color2}`);
  console.log(`Colors match: ${color1 === color2}`);
  console.log();
  
  console.log('6. Testing cache freshness...');
  const freshTime = new Date().toISOString();
  const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
  console.log(`Fresh timestamp (${freshTime}): ${cacheManager.isCacheFresh(freshTime)}`);
  console.log(`Old timestamp (${oldTime}): ${cacheManager.isCacheFresh(oldTime)}`);
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateCacheManager().catch(console.error);
}

module.exports = { demonstrateCacheManager };