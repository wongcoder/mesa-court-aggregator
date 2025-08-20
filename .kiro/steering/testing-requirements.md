# Testing Requirements for Code Changes

## Critical Testing Rule

**NEVER mark tasks as complete without testing the changes first.**

## Testing Protocol

### Before Marking Any Task Complete:
1. **Test the server starts without errors**
   - Run `npm start` and verify no syntax errors or crashes
   - Check console for any JavaScript errors or warnings

2. **Test the functionality works**
   - Navigate to the affected UI components
   - Verify the changes work as expected
   - Test edge cases and error scenarios

3. **Test existing functionality still works**
   - Ensure changes don't break existing features
   - Test related components that might be affected

### Specific Testing for Court Aggregator:

#### Backend Changes:
- Test that the server starts: `npm start`
- Test API endpoints still work: `curl http://localhost:3000/api/health`
- Check console for any errors during startup

#### Frontend Changes:
- Open browser to `http://localhost:3000`
- Test all three views: Monthly, Weekly, Daily
- Verify court utilization displays correctly
- Check browser console for JavaScript errors
- Test responsive behavior on different screen sizes

#### CSS Changes:
- Verify styling looks correct in all views
- Test hover states and interactions
- Check mobile responsiveness

### Testing Commands:
```bash
# Start the server
npm start

# Run tests if they exist
npm test

# Check for syntax errors
node -c services/court-data-processor.js
node -c public/script.js
```

### Error Handling:
- If any errors are found, fix them before marking complete
- Document any issues discovered during testing
- Re-test after fixes are applied

### Documentation:
- Include testing results in task completion notes
- Mention any edge cases discovered
- Note any performance impacts observed

## Consequences of Not Testing:
- Broken functionality for users
- Wasted time debugging later
- Loss of confidence in the development process
- Potential system downtime

**Remember: It's better to catch issues during development than in production!**