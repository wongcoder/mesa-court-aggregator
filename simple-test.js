#!/usr/bin/env node

/**
 * Simple integration test for the scheduler
 * Tests the scheduler with a 10-second interval to actually see it work
 */

const Scheduler = require('./services/scheduler');

async function runIntegrationTest() {
  console.log('=== Scheduler Integration Test ===');
  console.log('Current time:', new Date().toLocaleString());
  console.log('');
  
  const scheduler = new Scheduler();
  
  // Show initial status
  console.log('Initial status:', scheduler.getStatus());
  console.log('');
  
  // Start a test schedule that runs every 10 seconds
  console.log('Starting test schedule (every 10 seconds)...');
  const started = scheduler.startTestSchedule('*/10 * * * * *'); // Every 10 seconds
  
  if (!started) {
    console.log('Failed to start test schedule');
    process.exit(1);
  }
  
  console.log('✅ Test schedule started successfully!');
  console.log('The scheduler will now attempt to update data every 10 seconds.');
  console.log('Watch for update logs below...');
  console.log('Test will run for 45 seconds then stop automatically.');
  console.log('');
  
  // Let it run for 45 seconds to see a few cycles
  let secondsLeft = 45;
  const countdown = setInterval(() => {
    process.stdout.write(`\rTest stopping in ${secondsLeft} seconds...`);
    secondsLeft--;
    
    if (secondsLeft <= 0) {
      clearInterval(countdown);
      console.log('\n');
      
      // Stop the scheduler
      const stopped = scheduler.stopScheduledUpdates();
      console.log('✅ Scheduler stopped:', stopped);
      
      // Show final status
      const finalStatus = scheduler.getStatus();
      console.log('Final status:', {
        isRunning: finalStatus.isRunning,
        lastUpdateSuccess: finalStatus.lastUpdateStatus?.success,
        lastUpdateDate: finalStatus.lastUpdateStatus?.date,
        lastUpdateDuration: finalStatus.lastUpdateStatus?.duration
      });
      
      console.log('\n=== Integration Test Complete ===');
      process.exit(0);
    }
  }, 1000);
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    clearInterval(countdown);
    console.log('\n\nStopping scheduler...');
    scheduler.stopScheduledUpdates();
    console.log('Test interrupted by user');
    process.exit(0);
  });
}

runIntegrationTest().catch(error => {
  console.error('Integration test failed:', error);
  process.exit(1);
});