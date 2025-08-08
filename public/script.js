// Court Aggregator Frontend JavaScript

class CalendarApp {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.today = new Date();

        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        this.dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        this.shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // View state
        this.currentView = this.loadViewFromStorage() || 'weekly';
        this.currentWeekStart = this.getWeekStart(this.currentDate);
        this.currentDayDate = new Date(this.currentDate);

        // Park filtering state
        this.parks = [];
        this.selectedParkNames = new Set();
        this.isSidebarOpen = false;

        // Calendar data
        this.calendarData = null;

        // Time slots for weekly/daily views - will be dynamically generated based on data
        this.timeSlots = this.generateTimeSlots();

        // Interactive features state
        this.isLoading = false;
        this.lastError = null;
        this.activeTooltip = null;
        this.expandedDayModal = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.createTooltipElement();
        this.createLoadingOverlay();
        this.createErrorDisplay();
        this.loadParks();
        this.setActiveView(this.currentView);
        this.renderCalendar();
        this.healthCheck();
    }

    bindEvents() {
        // View toggle buttons
        const viewButtons = document.querySelectorAll('.view-toggle-button');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.dataset.view;
                this.switchView(view);
            });
        });

        // Calendar navigation
        const prevButton = document.getElementById('prev-period');
        const nextButton = document.getElementById('next-period');

        prevButton.addEventListener('click', () => this.previousPeriod());
        nextButton.addEventListener('click', () => this.nextPeriod());

        // Sidebar controls
        const sidebarOpenButton = document.getElementById('sidebar-open');
        const sidebarToggleButton = document.getElementById('sidebar-toggle');
        const selectAllButton = document.getElementById('select-all-parks');
        const deselectAllButton = document.getElementById('deselect-all-parks');

        sidebarOpenButton.addEventListener('click', () => this.openSidebar());
        sidebarToggleButton.addEventListener('click', () => this.closeSidebar());
        selectAllButton.addEventListener('click', () => this.selectAllParks());
        deselectAllButton.addEventListener('click', () => this.deselectAllParks());

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('park-sidebar');
            const sidebarOpen = document.getElementById('sidebar-open');

            if (this.isSidebarOpen &&
                !sidebar.contains(e.target) &&
                !sidebarOpen.contains(e.target)) {
                this.closeSidebar();
            }
        });

        // Global event listeners for interactive features
        document.addEventListener('mouseover', (e) => this.handleMouseOver(e));
        document.addEventListener('mouseout', (e) => this.handleMouseOut(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('click', (e) => this.handleClick(e));
    }

    // View management methods
    switchView(view) {
        if (this.currentView === view) return;

        this.currentView = view;
        this.saveViewToStorage(view);
        this.setActiveView(view);
        this.renderCalendar();
    }

    setActiveView(view) {
        // Update button states
        document.querySelectorAll('.view-toggle-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Update calendar view visibility
        document.querySelectorAll('.calendar-view').forEach(viewEl => {
            viewEl.classList.remove('active');
        });
        document.getElementById(`${view}-calendar`).classList.add('active');
    }

    loadViewFromStorage() {
        return localStorage.getItem('court-aggregator-view');
    }

    saveViewToStorage(view) {
        localStorage.setItem('court-aggregator-view', view);
    }

    // Navigation methods
    previousPeriod() {
        switch (this.currentView) {
            case 'monthly':
                this.previousMonth();
                break;
            case 'weekly':
                this.previousWeek();
                break;
            case 'daily':
                this.previousDay();
                break;
        }
    }

    nextPeriod() {
        switch (this.currentView) {
            case 'monthly':
                this.nextMonth();
                break;
            case 'weekly':
                this.nextWeek();
                break;
            case 'daily':
                this.nextDay();
                break;
        }
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.renderCalendar();
    }

    previousWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        this.renderCalendar();
    }

    nextWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.renderCalendar();
    }

    previousDay() {
        this.currentDayDate.setDate(this.currentDayDate.getDate() - 1);
        this.renderCalendar();
    }

    nextDay() {
        this.currentDayDate.setDate(this.currentDayDate.getDate() + 1);
        this.renderCalendar();
    }

    async renderCalendar() {
        this.updateHeader();
        await this.loadCalendarData();

        // Update time slots based on actual data
        this.timeSlots = this.generateDynamicTimeSlots();

        switch (this.currentView) {
            case 'monthly':
                this.renderMonthlyView();
                break;
            case 'weekly':
                this.renderWeeklyView();
                break;
            case 'daily':
                this.renderDailyView();
                break;
        }
    }

    updateHeader() {
        const headerElement = document.getElementById('current-period');

        switch (this.currentView) {
            case 'monthly':
                headerElement.textContent = `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
                break;
            case 'weekly':
                const weekEnd = new Date(this.currentWeekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const startMonth = this.monthNames[this.currentWeekStart.getMonth()];
                const endMonth = this.monthNames[weekEnd.getMonth()];

                if (this.currentWeekStart.getMonth() === weekEnd.getMonth()) {
                    headerElement.textContent = `${startMonth} ${this.currentWeekStart.getDate()}-${weekEnd.getDate()}, ${this.currentWeekStart.getFullYear()}`;
                } else {
                    headerElement.textContent = `${startMonth} ${this.currentWeekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${this.currentWeekStart.getFullYear()}`;
                }
                break;
            case 'daily':
                const dayName = this.dayNames[this.currentDayDate.getDay()];
                const monthName = this.monthNames[this.currentDayDate.getMonth()];
                headerElement.textContent = `${dayName}, ${monthName} ${this.currentDayDate.getDate()}, ${this.currentDayDate.getFullYear()}`;
                break;
        }
    }

    // Helper methods
    generateTimeSlots() {
        const slots = [];
        // Generate hourly grid lines from 9:00 AM to 10:00 PM
        // This creates 13 hour periods (9-10, 10-11, ..., 21-22) with 14 grid lines
        // Bookings can extend beyond 10 PM but we only show time labels up to 10 PM

        let currentTime = new Date();
        currentTime.setHours(9, 0, 0, 0); // Start at 9:00 AM

        const endTime = new Date();
        endTime.setHours(22, 0, 0, 0); // End at 10:00 PM (last visible hour)

        while (currentTime <= endTime) {
            const hours = currentTime.getHours();

            // Format 24-hour time (hourly)
            const hour24 = `${hours.toString().padStart(2, '0')}:00`;

            // Format 12-hour time (hourly)
            let hour12;
            if (hours === 0) {
                hour12 = '12:00 AM';
            } else if (hours < 12) {
                hour12 = `${hours}:00 AM`;
            } else if (hours === 12) {
                hour12 = '12:00 PM';
            } else {
                hour12 = `${hours - 12}:00 PM`;
            }

            slots.push({
                hour24: hour24,
                hour12: hour12,
                hourNum: hours
            });

            // Add 1 hour
            currentTime.setHours(currentTime.getHours() + 1);
        }

        return slots;
    }

    // Generate dynamic time slots based on actual court data
    generateDynamicTimeSlots() {
        // For now, use the fixed 8:30 AM to 10 PM schedule since all parks have the same hours
        // In the future, this could be enhanced to use actual operating hours from the API
        return this.generateTimeSlots();
    }

    getWeekStart(date) {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart;
    }

    // Monthly view rendering
    renderMonthlyView() {
        const calendarDays = document.getElementById('monthly-days');
        calendarDays.innerHTML = '';

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Check if we have any data for this month
        const hasDataForMonth = this.calendarData && Object.keys(this.calendarData.days).some(dateStr => {
            const date = new Date(dateStr);
            return date.getMonth() === this.currentMonth && date.getFullYear() === this.currentYear;
        });

        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dayElement = this.createMonthlyDayElement(date, hasDataForMonth);
            calendarDays.appendChild(dayElement);
        }

        // Show empty state message if no data for current month
        if (!hasDataForMonth && this.calendarData) {
            this.showEmptyMonthMessage();
        }
    }

    createMonthlyDayElement(date, hasDataForMonth = true) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';

        const isCurrentMonth = date.getMonth() === this.currentMonth;
        const isToday = this.isSameDay(date, this.today);

        if (!isCurrentMonth) {
            dayDiv.classList.add('other-month');
        }

        if (isToday) {
            dayDiv.classList.add('today');
        }

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();

        const dayContent = document.createElement('div');
        dayContent.className = 'day-content';

        dayDiv.appendChild(dayNumber);
        dayDiv.appendChild(dayContent);

        // Store date data for future use
        const dateString = date.toISOString().split('T')[0];
        dayDiv.dataset.date = dateString;

        // Add time blocks if data is available, or show empty state
        if (hasDataForMonth) {
            this.renderTimeBlocks(dayContent, dateString);
        } else if (isCurrentMonth) {
            // Show empty state for current month days when no data is available
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-day-state';
            emptyState.textContent = 'No data';
            dayContent.appendChild(emptyState);
        }

        return dayDiv;
    }

    // Weekly view rendering
    renderWeeklyView() {
        this.renderWeeklyTimeSlots();
        this.renderWeeklyDays();
    }

    renderWeeklyTimeSlots() {
        const timeSlotsContainer = document.getElementById('weekly-time-slots');
        timeSlotsContainer.innerHTML = '';

        this.timeSlots.forEach((slot, index) => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'weekly-time-slot';
            timeSlot.textContent = slot.hour12;

            // Position the time label at the grid line (percentage of total height)
            const totalPeriods = this.timeSlots.length - 1; // 13 periods between 14 time labels
            const position = (index / totalPeriods) * 100;
            timeSlot.style.top = `${position}%`;

            timeSlotsContainer.appendChild(timeSlot);
        });
    }

    renderWeeklyDays() {
        // Update weekday headers
        const weeklyWeekdays = document.querySelectorAll('.weekly-weekday');
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(this.currentWeekStart.getDate() + i);
            weeklyWeekdays[i].textContent = `${this.shortDayNames[i]} ${date.getDate()}`;
        }

        const weeklyDays = document.getElementById('weekly-days');
        weeklyDays.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(this.currentWeekStart.getDate() + i);

            const dayColumn = document.createElement('div');
            dayColumn.className = 'weekly-day-column';

            if (this.isSameDay(date, this.today)) {
                dayColumn.classList.add('today');
            }

            // Create time grid for this day
            const timeGrid = document.createElement('div');
            timeGrid.className = 'weekly-time-grid';

            // Create time grid rows for hour periods (one less than time slots)
            const numHourPeriods = this.timeSlots.length - 1; // 13 periods between 14 time labels
            for (let i = 0; i < numHourPeriods; i++) {
                const timeRow = document.createElement('div');
                timeRow.className = 'weekly-time-row';
                timeGrid.appendChild(timeRow);
            }

            dayColumn.appendChild(timeGrid);

            // Add booking blocks for this day
            const dateString = date.toISOString().split('T')[0];
            this.renderWeeklyBookings(dayColumn, dateString);

            weeklyDays.appendChild(dayColumn);
        }
    }

    renderWeeklyBookings(dayColumn, dateString) {
        if (!this.calendarData || !this.calendarData.days || !this.calendarData.days[dateString]) {
            return;
        }

        const dayData = this.calendarData.days[dateString];
        const filteredParks = dayData.parks.filter(park =>
            this.selectedParkNames.has(park.name) && park.status !== 'available'
        );

        // Calculate horizontal positioning for multiple parks
        const totalParks = filteredParks.length;

        filteredParks.forEach((park, parkIndex) => {
            const timeBlocks = this.parseBookingDetails(park);
            timeBlocks.forEach(block => {
                const bookingBlock = this.createWeeklyBookingBlock(park, block, parkIndex, totalParks);
                dayColumn.appendChild(bookingBlock);
            });
        });
    }

    createWeeklyBookingBlock(park, timeBlock, parkIndex, totalParks) {
        const block = document.createElement('div');
        block.className = 'weekly-booking-block';
        block.style.backgroundColor = this.getAccessibleParkColor(park.name);

        // Create more concise text for better wrapping
        const parkShortName = this.getShortParkName(park.name);
        const shortTimeLabel = this.getShortTimeLabel(timeBlock.timeLabel);

        block.innerHTML = `<div class="park-name">${parkShortName}</div><div class="time-label">${shortTimeLabel}</div>`;

        // Enhanced tooltip with court information (same as monthly view)
        let tooltipText = `${park.name}: ${timeBlock.timeLabel}`;
        if (timeBlock.courts && timeBlock.courts.length > 0) {
            const courtList = timeBlock.courts.join(', ');
            tooltipText += `\nCourts: ${courtList}`;
            if (timeBlock.courtCount && timeBlock.courtCount > 1) {
                tooltipText += ` (${timeBlock.courtCount} courts)`;
            }
        }
        block.title = tooltipText;

        // Add hover effect data (same as monthly view)
        block.dataset.parkName = park.name;
        block.dataset.timeRange = timeBlock.timeLabel;
        if (timeBlock.courts) {
            block.dataset.courts = JSON.stringify(timeBlock.courts);
            block.dataset.courtCount = timeBlock.courtCount || timeBlock.courts.length;
        }

        // Calculate horizontal positioning for multiple parks
        const blockWidth = totalParks > 1 ? 100 / totalParks : 100;
        const leftPosition = parkIndex * blockWidth;

        block.style.left = `${leftPosition}%`;
        block.style.width = `${blockWidth}%`;

        // Handle fully booked or partially booked parks without specific times
        if (!timeBlock.startTime || !timeBlock.endTime) {
            // For fully booked parks, show a block spanning the entire day
            block.style.top = '0%';
            block.style.height = '100%';
            block.classList.add('fully-booked');
        } else {
            // Position the block based on precise time aligned to grid lines
            const startPosition = this.timeToGridPosition(timeBlock.startTime);
            const endPosition = this.timeToGridPosition(timeBlock.endTime);
            const height = Math.max(3.85, endPosition - startPosition); // Minimum 30 minutes (3.85% of 13-hour grid)

            block.style.top = `${startPosition}%`;
            block.style.height = `${height}%`;
        }

        return block;
    }

    // Daily view rendering
    renderDailyView() {
        this.renderDailyTimeSlots();
        this.renderDailySchedule();
        this.updateDailyHeader();
    }

    renderDailyTimeSlots() {
        const timeSlotsContainer = document.getElementById('daily-time-slots');
        timeSlotsContainer.innerHTML = '';

        this.timeSlots.forEach((slot, index) => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'daily-time-slot';
            timeSlot.textContent = slot.hour12;

            // Position the time label at the grid line (percentage of total height)
            const totalPeriods = this.timeSlots.length - 1; // 13 periods between 14 time labels
            const position = (index / totalPeriods) * 100;
            timeSlot.style.top = `${position}%`;

            timeSlotsContainer.appendChild(timeSlot);
        });
    }

    updateDailyHeader() {
        const dailyDate = document.getElementById('daily-date');
        const dayName = this.dayNames[this.currentDayDate.getDay()];
        const monthName = this.monthNames[this.currentDayDate.getMonth()];
        dailyDate.textContent = `${dayName}, ${monthName} ${this.currentDayDate.getDate()}`;
    }

    renderDailySchedule() {
        const dailySchedule = document.getElementById('daily-schedule');
        dailySchedule.innerHTML = '';

        // Create time grid
        const timeGrid = document.createElement('div');
        timeGrid.className = 'daily-time-grid';

        // Create time grid rows for hour periods (one less than time slots)
        const numHourPeriods = this.timeSlots.length - 1; // 13 periods between 14 time labels
        for (let i = 0; i < numHourPeriods; i++) {
            const timeRow = document.createElement('div');
            timeRow.className = 'daily-time-row';
            timeGrid.appendChild(timeRow);
        }

        dailySchedule.appendChild(timeGrid);

        // Add booking blocks
        const dateString = this.currentDayDate.toISOString().split('T')[0];
        this.renderDailyBookings(dailySchedule, dateString);
    }

    renderDailyBookings(container, dateString) {
        if (!this.calendarData || !this.calendarData.days || !this.calendarData.days[dateString]) {
            return;
        }

        const dayData = this.calendarData.days[dateString];
        const filteredParks = dayData.parks.filter(park =>
            this.selectedParkNames.has(park.name) && park.status !== 'available'
        );

        // Calculate horizontal positioning for multiple parks
        const totalParks = filteredParks.length;

        filteredParks.forEach((park, parkIndex) => {
            const timeBlocks = this.parseBookingDetails(park);
            timeBlocks.forEach(block => {
                const bookingBlock = this.createDailyBookingBlock(park, block, parkIndex, totalParks);
                container.appendChild(bookingBlock);
            });
        });
    }

    createDailyBookingBlock(park, timeBlock, parkIndex, totalParks) {
        const block = document.createElement('div');
        block.className = 'daily-booking-block';
        block.style.backgroundColor = this.getAccessibleParkColor(park.name);

        const parkLabel = document.createElement('div');
        parkLabel.className = 'daily-park-label';
        parkLabel.textContent = this.getShortParkName(park.name);

        const timeLabel = document.createElement('div');
        timeLabel.textContent = this.getShortTimeLabel(timeBlock.timeLabel);

        block.appendChild(parkLabel);
        block.appendChild(timeLabel);

        // Enhanced tooltip with court information (same as monthly view)
        let tooltipText = `${park.name}: ${timeBlock.timeLabel}`;
        if (timeBlock.courts && timeBlock.courts.length > 0) {
            const courtList = timeBlock.courts.join(', ');
            tooltipText += `\nCourts: ${courtList}`;
            if (timeBlock.courtCount && timeBlock.courtCount > 1) {
                tooltipText += ` (${timeBlock.courtCount} courts)`;
            }
        }
        block.title = tooltipText;

        // Add hover effect data (same as monthly view)
        block.dataset.parkName = park.name;
        block.dataset.timeRange = timeBlock.timeLabel;
        if (timeBlock.courts) {
            block.dataset.courts = JSON.stringify(timeBlock.courts);
            block.dataset.courtCount = timeBlock.courtCount || timeBlock.courts.length;
        }

        // Calculate horizontal positioning for multiple parks
        const containerWidth = 100; // Use percentage-based positioning
        const blockWidth = Math.max(15, containerWidth / totalParks - 2); // Minimum 15% width with 2% gap
        const leftPosition = parkIndex * (containerWidth / totalParks);

        block.style.position = 'absolute';
        block.style.left = `${leftPosition}%`;
        block.style.width = `${blockWidth}%`;

        // Handle fully booked or partially booked parks without specific times
        if (!timeBlock.startTime || !timeBlock.endTime) {
            // For fully booked parks, show a block spanning the entire day
            block.style.top = '0%';
            block.style.height = '100%';
            block.classList.add('fully-booked');
        } else {
            // Position the block based on precise time aligned to grid lines
            const startPosition = this.timeToGridPosition(timeBlock.startTime);
            const endPosition = this.timeToGridPosition(timeBlock.endTime);
            const height = Math.max(3.85, endPosition - startPosition); // Minimum 30 minutes (3.85% of 13-hour grid)

            block.style.top = `${startPosition}%`;
            block.style.height = `${height}%`;
        }

        return block;
    }

    parseTimeToHour(timeString) {
        if (!timeString) return 9.0; // Default to 9:00 AM
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours + (minutes / 60);
    }

    // Convert time to slot index (hourly intervals starting from 9:00 AM)
    timeToSlotIndex(timeString) {
        if (!timeString) return 0;

        const timeHour = this.parseTimeToHour(timeString);
        const startHour = 9.0; // 9:00 AM

        // Calculate the number of hourly intervals from start
        const intervalFromStart = timeHour - startHour;
        return Math.max(0, Math.floor(intervalFromStart));
    }

    // Convert time to precise position within the grid (for 30-minute granularity)
    timeToGridPosition(timeString) {
        if (!timeString) return 0;

        const timeHour = this.parseTimeToHour(timeString);
        const startHour = 9.0; // 9:00 AM (first grid line)
        const endHour = 22.0; // 10:00 PM (last grid line)
        const totalHours = endHour - startHour; // 13 hours total

        // Calculate position as percentage of total grid height
        const hoursFromStart = timeHour - startHour;
        const positionPercent = (hoursFromStart / totalHours) * 100;

        return Math.max(0, Math.min(100, positionPercent));
    }

    getShortParkName(parkName) {
        // Create shorter park names for better display
        const shortNames = {
            'Kleinman Park': 'Kleinman',
            'Gene Autry Park': 'Gene Autry',
            'Red Mountain Park': 'Red Mtn',
            'Monterey Park': 'Monterey'
        };
        return shortNames[parkName] || parkName;
    }

    getShortTimeLabel(timeLabel) {
        // Shorten time labels for better display
        if (timeLabel === 'Fully Booked') return 'Full';
        if (timeLabel === 'Partially Booked') return 'Partial';

        // For time ranges, try to make them more compact
        return timeLabel.replace(' PM', 'p').replace(' AM', 'a');
    }

    getAccessibleParkColor(parkName) {
        // Return accessible colors with high contrast for white text
        const accessibleColors = {
            'Kleinman Park': '#1976d2',     // Blue
            'Gene Autry Park': '#388e3c',   // Green  
            'Red Mountain Park': '#f57c00', // Orange
            'Monterey Park': '#8e24aa',     // Purple
            'Christopher J Brady': '#8e24aa', // Purple (alternate name)
        };

        return accessibleColors[parkName] || '#1976d2'; // Default to blue
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }

    /**
     * Load parks data from API with enhanced error handling
     */
    async loadParks() {
        try {
            const response = await fetch('/api/parks');
            if (response.ok) {
                const data = await response.json();
                this.parks = data.parks || [];

                // Initialize all parks as selected
                this.selectedParkNames = new Set(this.parks.map(park => park.name));

                this.renderParkList();

                // Show warnings for fallback data
                if (data.metadata) {
                    if (data.metadata.fallbackUsed) {
                        console.warn('Using fallback park data:', data.metadata.message);
                    }
                    if (data.metadata.isStale) {
                        console.warn('Park data is stale:', `${data.metadata.dataAgeHours} hours old`);
                    }
                    if (data.metadata.warning) {
                        console.warn('Park data warning:', data.metadata.warning);
                    }
                }
            } else {
                console.warn('Parks API returned error:', response.status);

                // Try to parse error response for better messaging
                try {
                    const errorData = await response.json();
                    if (errorData.suggestion) {
                        this.showError(`Unable to load park information. ${errorData.suggestion}`);
                    } else {
                        this.showError(errorData.message || 'Unable to load park information.');
                    }
                } catch (parseError) {
                    this.showError('Unable to load park information. Server may be temporarily unavailable.');
                }

                // Use default parks as fallback
                this.parks = [
                    {
                        name: 'Kleinman Park',
                        color: '#1976d2',
                        pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf'
                    },
                    {
                        name: 'Gene Autry Park',
                        color: '#388e3c',
                        pdfLink: null
                    },
                    {
                        name: 'Monterey Park',
                        color: '#8e24aa',
                        pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/244/activities-culture/prcf/facilities/pickleball-public-court-calendars/brady-pickleball-court.pdf'
                    }
                ];
                this.selectedParkNames = new Set(this.parks.map(park => park.name));
                this.renderParkList();
            }
        } catch (error) {
            console.error('Error loading parks:', error);

            // Provide specific error messages based on error type
            let errorMessage = 'Failed to load park information.';
            if (error.message.includes('fetch')) {
                errorMessage += ' Network connection issue detected.';
            } else if (error.message.includes('timeout')) {
                errorMessage += ' Request timed out.';
            }
            errorMessage += ' Using default park list.';

            this.showError(errorMessage);

            // Use default parks as ultimate fallback
            this.parks = [
                {
                    name: 'Kleinman Park',
                    color: '#1976d2',
                    pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/237/activities-culture/prcf/facilities/pickleball-public-court-calendars/kleinman-pickleball-court.pdf'
                },
                {
                    name: 'Gene Autry Park',
                    color: '#388e3c',
                    pdfLink: null
                },
                {
                    name: 'Monterey Park',
                    color: '#8e24aa',
                    pdfLink: 'https://www.mesaaz.gov/files/assets/public/v/244/activities-culture/prcf/facilities/pickleball-public-court-calendars/brady-pickleball-court.pdf'
                }
            ];
            this.selectedParkNames = new Set(this.parks.map(park => park.name));
            this.renderParkList();
        }
    }

    /**
     * Render the park filter list
     */
    renderParkList() {
        const parkList = document.getElementById('park-list');
        parkList.innerHTML = '';

        this.parks.forEach(park => {
            const parkItem = document.createElement('div');
            parkItem.className = 'park-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'park-checkbox';
            checkbox.id = `park-${park.name.replace(/\s+/g, '-').toLowerCase()}`;
            checkbox.checked = this.selectedParkNames.has(park.name);
            checkbox.addEventListener('change', () => this.togglePark(park.name));

            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'park-color-indicator';
            colorIndicator.style.backgroundColor = this.getAccessibleParkColor(park.name);

            const label = document.createElement('label');
            label.className = 'park-name';
            label.htmlFor = checkbox.id;
            label.textContent = park.name;

            parkItem.appendChild(checkbox);
            parkItem.appendChild(colorIndicator);
            parkItem.appendChild(label);

            // Add PDF helper link if available
            if (park.pdfLink) {
                const pdfLink = document.createElement('a');
                pdfLink.href = park.pdfLink;
                pdfLink.target = '_blank';
                pdfLink.rel = 'noopener noreferrer';
                pdfLink.className = 'pdf-helper-link';
                pdfLink.title = `View official PDF calendar for ${park.name}`;
                pdfLink.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                `;

                // Prevent the park item click from triggering when clicking the PDF link
                pdfLink.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                parkItem.appendChild(pdfLink);
            }

            // Make the entire item clickable (except for PDF link)
            parkItem.addEventListener('click', (e) => {
                if (e.target !== checkbox && !e.target.closest('.pdf-helper-link')) {
                    checkbox.checked = !checkbox.checked;
                    this.togglePark(park.name);
                }
            });

            parkList.appendChild(parkItem);
        });
    }

    /**
     * Toggle park visibility with immediate feedback
     */
    togglePark(parkName) {
        const checkbox = document.getElementById(`park-${parkName.replace(/\s+/g, '-').toLowerCase()}`);

        if (this.selectedParkNames.has(parkName)) {
            this.selectedParkNames.delete(parkName);
        } else {
            this.selectedParkNames.add(parkName);
        }

        // Provide immediate visual feedback
        if (checkbox) {
            checkbox.style.transform = 'scale(1.1)';
            setTimeout(() => {
                checkbox.style.transform = 'scale(1)';
            }, 150);
        }

        this.applyParkFilters();
    }

    /**
     * Select all parks with animation
     */
    selectAllParks() {
        this.selectedParkNames = new Set(this.parks.map(park => park.name));
        this.updateCheckboxesWithAnimation();
        this.applyParkFilters();
    }

    /**
     * Deselect all parks with animation
     */
    deselectAllParks() {
        this.selectedParkNames.clear();
        this.updateCheckboxesWithAnimation();
        this.applyParkFilters();
    }

    /**
     * Update checkboxes with staggered animation
     */
    updateCheckboxesWithAnimation() {
        this.parks.forEach((park, index) => {
            const checkbox = document.getElementById(`park-${park.name.replace(/\s+/g, '-').toLowerCase()}`);
            if (checkbox) {
                setTimeout(() => {
                    checkbox.checked = this.selectedParkNames.has(park.name);
                    checkbox.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        checkbox.style.transform = 'scale(1)';
                    }, 150);
                }, index * 50); // Stagger the animations
            }
        });
    }

    /**
     * Update checkbox states
     */
    updateCheckboxes() {
        this.parks.forEach(park => {
            const checkbox = document.getElementById(`park-${park.name.replace(/\s+/g, '-').toLowerCase()}`);
            if (checkbox) {
                checkbox.checked = this.selectedParkNames.has(park.name);
            }
        });
    }

    /**
     * Load calendar data for current view period with comprehensive error handling
     */
    async loadCalendarData() {
        try {
            this.showLoading();
            this.hideError(); // Clear any previous errors

            let monthsToLoad = [];

            switch (this.currentView) {
                case 'monthly':
                    monthsToLoad = [`${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}`];
                    break;
                case 'weekly':
                    // Load data for months that the week spans
                    const weekEnd = new Date(this.currentWeekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);

                    const startMonth = `${this.currentWeekStart.getFullYear()}-${String(this.currentWeekStart.getMonth() + 1).padStart(2, '0')}`;
                    const endMonth = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}`;

                    monthsToLoad = [startMonth];
                    if (startMonth !== endMonth) {
                        monthsToLoad.push(endMonth);
                    }
                    break;
                case 'daily':
                    monthsToLoad = [`${this.currentDayDate.getFullYear()}-${String(this.currentDayDate.getMonth() + 1).padStart(2, '0')}`];
                    break;
            }

            // Load all required months and merge data
            this.calendarData = { days: {}, parkList: [], lastUpdated: null };
            let hasAnyData = false;
            let failedRequests = 0;
            let networkErrors = 0;
            let serverErrors = 0;
            let oldestDataTimestamp = null;
            let newestDataTimestamp = null;

            for (const monthString of monthsToLoad) {
                try {
                    const response = await fetch(`/api/calendar/${monthString}`, {
                        timeout: 10000 // 10 second timeout
                    });

                    if (response.ok) {
                        const monthData = await response.json();
                        if (monthData && monthData.days) {
                            // Merge days data
                            Object.assign(this.calendarData.days, monthData.days || {});

                            // Use park list from first successful response
                            if (this.calendarData.parkList.length === 0 && monthData.parkList) {
                                this.calendarData.parkList = monthData.parkList;
                            }

                            // Track data freshness
                            if (monthData.lastUpdated) {
                                const updateTime = new Date(monthData.lastUpdated);
                                if (!oldestDataTimestamp || updateTime < oldestDataTimestamp) {
                                    oldestDataTimestamp = updateTime;
                                }
                                if (!newestDataTimestamp || updateTime > newestDataTimestamp) {
                                    newestDataTimestamp = updateTime;
                                }
                            }

                            hasAnyData = true;
                        } else {
                            console.warn(`Empty or invalid data structure for ${monthString}`);
                            failedRequests++;
                        }
                    } else if (response.status >= 500) {
                        serverErrors++;
                        failedRequests++;
                        console.error(`Server error loading ${monthString}: ${response.status} ${response.statusText}`);
                    } else if (response.status === 404) {
                        // 404 is expected for future months with no data yet
                        console.info(`No data available for ${monthString} (404)`);
                        failedRequests++;
                    } else {
                        failedRequests++;
                        console.error(`Failed to load data for ${monthString}: ${response.status} ${response.statusText}`);
                    }
                } catch (fetchError) {
                    failedRequests++;
                    if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
                        networkErrors++;
                        console.error(`Timeout loading ${monthString}:`, fetchError.message);
                    } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
                        networkErrors++;
                        console.error(`Network error loading ${monthString}:`, fetchError.message);
                    } else {
                        console.error(`Unexpected error loading ${monthString}:`, fetchError);
                    }
                }
            }

            // Set the most recent update timestamp
            if (newestDataTimestamp) {
                this.calendarData.lastUpdated = newestDataTimestamp.toISOString();
            }

            // Handle different error scenarios with appropriate messaging
            if (!hasAnyData) {
                this.calendarData = null;

                if (networkErrors > 0) {
                    this.showError('Network connection issues detected. Please check your internet connection and try again.');
                } else if (serverErrors > 0) {
                    this.showError('Server is temporarily unavailable. Please try again in a few minutes.');
                } else if (failedRequests > 0) {
                    this.showError('No court data available for the selected time period. Data may not have been collected yet.');
                } else {
                    this.showError('Unable to load court data. Please try refreshing the page.');
                }
            } else if (failedRequests > 0) {
                // Partial data loaded - show warning with data age info
                let warningMessage = 'Some court data could not be loaded. Showing available information.';

                if (oldestDataTimestamp) {
                    const dataAge = this.getDataAgeDescription(oldestDataTimestamp);
                    warningMessage += ` Data last updated: ${dataAge}.`;
                }

                this.showError(warningMessage);
            }

            // Check for stale data and warn user
            if (hasAnyData && oldestDataTimestamp) {
                const hoursOld = (new Date() - oldestDataTimestamp) / (1000 * 60 * 60);
                if (hoursOld > 48) { // Warn if data is more than 2 days old
                    const dataAge = this.getDataAgeDescription(oldestDataTimestamp);
                    this.showError(`Court data may be outdated. Last updated: ${dataAge}.`);
                }
            }

            // Update the last updated display
            this.updateLastUpdatedDisplay(newestDataTimestamp);

        } catch (error) {
            console.error('Error loading calendar data:', error);
            this.calendarData = null;

            // Provide specific error messages based on error type
            if (error.message.includes('JSON')) {
                this.showError('Received invalid data from server. Please try refreshing the page.');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                this.showError('Network error occurred. Please check your connection and try again.');
            } else {
                this.showError('An unexpected error occurred while loading court data. Please try refreshing the page.');
            }
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Apply park filters to calendar display with smooth animations
     */
    applyParkFilters() {
        // Add fade-out animation to existing blocks
        const existingBlocks = document.querySelectorAll('.time-block, .weekly-booking-block, .daily-booking-block');
        existingBlocks.forEach(block => {
            block.style.transition = 'opacity 0.2s ease';
            block.style.opacity = '0';
        });

        // Re-render after animation completes
        setTimeout(() => {
            switch (this.currentView) {
                case 'monthly':
                    this.renderMonthlyView();
                    break;
                case 'weekly':
                    this.renderWeeklyView();
                    break;
                case 'daily':
                    this.renderDailyView();
                    break;
            }

            // Add fade-in animation to new blocks
            setTimeout(() => {
                const newBlocks = document.querySelectorAll('.time-block, .weekly-booking-block, .daily-booking-block');
                newBlocks.forEach(block => {
                    block.style.transition = 'opacity 0.3s ease';
                    block.style.opacity = '1';
                });
            }, 50);
        }, 200);
    }

    /**
     * Open sidebar (mobile)
     */
    openSidebar() {
        const sidebar = document.getElementById('park-sidebar');
        sidebar.classList.add('open');
        this.isSidebarOpen = true;
    }

    /**
     * Close sidebar (mobile)
     */
    closeSidebar() {
        const sidebar = document.getElementById('park-sidebar');
        sidebar.classList.remove('open');
        this.isSidebarOpen = false;
    }

    /**
     * Render time blocks for a specific day
     */
    renderTimeBlocks(dayContent, dateString) {
        // Clear existing content
        dayContent.innerHTML = '';

        if (!this.calendarData || !this.calendarData.days || !this.calendarData.days[dateString]) {
            return;
        }

        const dayData = this.calendarData.days[dateString];
        const filteredParks = dayData.parks.filter(park =>
            this.selectedParkNames.has(park.name) && park.status !== 'available'
        );

        if (filteredParks.length === 0) {
            return;
        }

        // Create time blocks container
        const timeBlocksContainer = document.createElement('div');
        timeBlocksContainer.className = 'time-blocks-container';

        filteredParks.forEach((park, index) => {
            this.renderParkTimeBlocks(timeBlocksContainer, park, index, filteredParks.length);
        });

        dayContent.appendChild(timeBlocksContainer);
    }

    /**
     * Render time blocks for a specific park
     */
    renderParkTimeBlocks(container, park, parkIndex, totalParks) {
        // Parse booking details to extract time periods
        const timeBlocks = this.parseBookingDetails(park);

        timeBlocks.forEach((block, blockIndex) => {
            const timeBlock = document.createElement('div');
            timeBlock.className = 'time-block';
            timeBlock.style.backgroundColor = this.getAccessibleParkColor(park.name);

            // Position blocks vertically when multiple parks have bookings
            if (totalParks > 1) {
                const blockHeight = 100 / totalParks;
                timeBlock.style.top = `${parkIndex * blockHeight}%`;
                timeBlock.style.height = `${blockHeight}%`;
                // Reset default positioning
                timeBlock.style.left = '1px';
                timeBlock.style.right = '1px';
                timeBlock.style.width = 'calc(100% - 2px)';
            }

            // For multiple time blocks from same park, stack them horizontally
            if (timeBlocks.length > 1) {
                const blockWidth = 100 / timeBlocks.length;
                timeBlock.style.left = `${blockIndex * blockWidth}%`;
                timeBlock.style.right = 'auto';
                timeBlock.style.width = `${blockWidth}%`;
            }

            // Add time label
            const timeLabel = document.createElement('span');
            timeLabel.className = 'time-label';
            timeLabel.textContent = block.timeLabel;
            timeBlock.appendChild(timeLabel);

            // Enhanced tooltip with court information
            let tooltipText = `${park.name}: ${block.timeLabel}`;
            if (block.courts && block.courts.length > 0) {
                const courtList = block.courts.join(', ');
                tooltipText += `\nCourts: ${courtList}`;
                if (block.courtCount && block.courtCount > 1) {
                    tooltipText += ` (${block.courtCount} courts)`;
                }
            }
            timeBlock.title = tooltipText;

            // Add hover effect data
            timeBlock.dataset.parkName = park.name;
            timeBlock.dataset.timeRange = block.timeLabel;
            if (block.courts) {
                timeBlock.dataset.courts = JSON.stringify(block.courts);
            }
            if (block.courtCount) {
                timeBlock.dataset.courtCount = block.courtCount;
            }

            container.appendChild(timeBlock);
        });
    }

    /**
     * Parse booking details to extract time periods
     * Enhanced to handle detailed court booking information
     */
    parseBookingDetails(park) {
        const timeBlocks = [];

        // Use the new timeWindows array structure
        if (park.timeWindows && park.timeWindows.length > 0) {
            park.timeWindows.forEach(window => {
                timeBlocks.push({
                    timeLabel: window.displayTime,
                    startTime: window.startTime,
                    endTime: window.endTime,
                    courts: window.courts,
                    courtCount: window.courts ? window.courts.length : 0
                });
            });
        } else if (park.status === 'booked') {
            // Handle fully booked parks without specific time windows
            timeBlocks.push({
                timeLabel: 'Fully Booked',
                startTime: null,
                endTime: null,
                courts: ['All courts'],
                courtCount: park.totalCourts || 0
            });
        } else if (park.status === 'partial' && (!park.timeWindows || park.timeWindows.length === 0)) {
            // Handle partially booked parks without specific time windows
            timeBlocks.push({
                timeLabel: 'Partially Booked',
                startTime: null,
                endTime: null,
                courts: [],
                courtCount: park.bookedCourts || 0
            });
        }

        return timeBlocks;
    }





    /**
     * Perform comprehensive health check
     */
    async healthCheck() {
        try {
            // Basic health check first
            const basicResponse = await fetch('/health');
            if (!basicResponse.ok) {
                throw new Error(`Basic health check failed: ${basicResponse.status}`);
            }

            // Detailed health check
            const detailedResponse = await fetch('/api/health');
            if (detailedResponse.ok) {
                const healthData = await detailedResponse.json();
                console.log('System health:', healthData);

                // Show warnings for system issues
                if (healthData.status === 'degraded' && healthData.warnings) {
                    console.warn('System health warnings:', healthData.warnings);

                    // Show user-friendly warnings for critical issues
                    if (healthData.warnings.includes('No cached data available')) {
                        this.showError('System is initializing. Court data will be available shortly.');
                    } else if (healthData.warnings.includes('Most cached data is stale')) {
                        this.showError('Court data may be outdated. Automatic updates may be delayed.');
                    }
                }

                // Log cache health for debugging
                if (healthData.cache) {
                    console.log(`Cache health: ${healthData.cache.healthyFiles} healthy, ${healthData.cache.staleFiles} stale files`);
                }
            } else {
                console.warn('Detailed health check unavailable, using basic health check');
            }

        } catch (error) {
            console.error('Health check failed:', error);

            // Don't show error to user for health check failures unless it's a critical connectivity issue
            if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
                console.warn('Network connectivity issues detected during health check');
            }
        }
    }

    /**
     * Create tooltip element for enhanced hover information
     */
    createTooltipElement() {
        const tooltip = document.createElement('div');
        tooltip.id = 'enhanced-tooltip';
        tooltip.className = 'enhanced-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.4;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            max-width: 250px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            white-space: pre-line;
        `;
        document.body.appendChild(tooltip);
        this.activeTooltip = tooltip;
    }

    /**
     * Create loading overlay for data fetching states
     */
    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            backdrop-filter: blur(2px);
        `;

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #1976d2;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;

        const loadingText = document.createElement('div');
        loadingText.textContent = 'Loading court data...';
        loadingText.style.cssText = `
            margin-top: 16px;
            color: #1976d2;
            font-weight: 500;
        `;

        const loadingContent = document.createElement('div');
        loadingContent.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
        `;

        loadingContent.appendChild(spinner);
        loadingContent.appendChild(loadingText);
        overlay.appendChild(loadingContent);
        document.body.appendChild(overlay);

        // Add CSS animation for spinner
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create error display for user-friendly error messages
     */
    createErrorDisplay() {
        const errorDisplay = document.createElement('div');
        errorDisplay.id = 'error-display';
        errorDisplay.className = 'error-display';
        errorDisplay.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #ffebee;
            border: 1px solid #e57373;
            border-radius: 6px;
            padding: 12px 16px;
            color: #c62828;
            font-size: 14px;
            max-width: 400px;
            z-index: 1500;
            display: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        const errorIcon = document.createElement('span');
        errorIcon.innerHTML = '⚠️ ';
        errorIcon.style.marginRight = '8px';

        const errorText = document.createElement('span');
        errorText.id = 'error-text';

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: #c62828;
            font-size: 18px;
            cursor: pointer;
            margin-left: 12px;
            padding: 0;
            line-height: 1;
        `;
        closeButton.addEventListener('click', () => this.hideError());

        errorDisplay.appendChild(errorIcon);
        errorDisplay.appendChild(errorText);
        errorDisplay.appendChild(closeButton);
        document.body.appendChild(errorDisplay);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.lastError = message;
        const errorDisplay = document.getElementById('error-display');
        const errorText = document.getElementById('error-text');

        if (errorDisplay && errorText) {
            errorText.textContent = message;
            errorDisplay.style.display = 'block';

            // Auto-hide after 5 seconds
            setTimeout(() => this.hideError(), 5000);
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        const errorDisplay = document.getElementById('error-display');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }
        this.lastError = null;
    }

    /**
     * Get human-readable description of data age
     * @param {Date} timestamp - The timestamp to describe
     * @returns {string} Human-readable age description
     */
    getDataAgeDescription(timestamp) {
        const now = new Date();
        const diffMs = now - timestamp;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 60) {
            return diffMinutes <= 1 ? 'just now' : `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays === 1) {
            return 'yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return timestamp.toLocaleDateString();
        }
    }

    /**
     * Update the last updated timestamp display
     * @param {Date} timestamp - The timestamp to display
     */
    updateLastUpdatedDisplay(timestamp) {
        const lastUpdatedElement = document.getElementById('last-updated');
        const lastUpdatedTimeElement = document.getElementById('last-updated-time');

        if (timestamp && lastUpdatedElement && lastUpdatedTimeElement) {
            const ageDescription = this.getDataAgeDescription(timestamp);
            lastUpdatedTimeElement.textContent = ageDescription;
            lastUpdatedElement.style.display = 'flex';
        } else if (lastUpdatedElement) {
            lastUpdatedElement.style.display = 'none';
        }
    }

    /**
     * Show empty month message when no data is available
     */
    showEmptyMonthMessage() {
        // Remove any existing empty message
        const existingMessage = document.querySelector('.empty-month-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const calendarContainer = document.getElementById('monthly-calendar');
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-month-message';
        emptyMessage.innerHTML = `
            <div class="empty-icon">📅</div>
            <div class="empty-title">No court data available</div>
            <div class="empty-description">
                Data for ${this.monthNames[this.currentMonth]} ${this.currentYear} has not been collected yet.
                <br>Please try a different month or check back later.
            </div>
        `;

        calendarContainer.appendChild(emptyMessage);
    }

    /**
     * Show enhanced tooltip with detailed court information
     */
    showTooltip(element, content, event) {
        if (!this.activeTooltip) return;

        this.activeTooltip.innerHTML = content;
        this.activeTooltip.style.opacity = '1';

        // Position tooltip near mouse cursor
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.activeTooltip.getBoundingClientRect();

        let left = event.clientX + 10;
        let top = event.clientY - 10;

        // Adjust position if tooltip would go off screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = event.clientX - tooltipRect.width - 10;
        }
        if (top < 0) {
            top = event.clientY + 20;
        }

        this.activeTooltip.style.left = left + 'px';
        this.activeTooltip.style.top = top + 'px';
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.activeTooltip) {
            this.activeTooltip.style.opacity = '0';
        }
    }

    /**
     * Create and show expanded day details modal
     */
    showDayDetails(dateString, dayData) {
        // Remove existing modal if present
        this.hideDayDetails();

        const modal = document.createElement('div');
        modal.id = 'day-details-modal';
        modal.className = 'day-details-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            backdrop-filter: blur(2px);
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'day-details-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            position: relative;
        `;

        // Create modal header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e0e0e0;
        `;

        const date = new Date(dateString);
        const title = document.createElement('h2');
        title.textContent = `${this.dayNames[date.getDay()]}, ${this.monthNames[date.getMonth()]} ${date.getDate()}`;
        title.style.cssText = `
            margin: 0;
            font-size: 20px;
            font-weight: 500;
            color: #1976d2;
        `;

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            line-height: 1;
        `;
        closeButton.addEventListener('click', () => this.hideDayDetails());

        header.appendChild(title);
        header.appendChild(closeButton);
        modalContent.appendChild(header);

        // Create park details
        if (dayData && dayData.parks && dayData.parks.length > 0) {
            const filteredParks = dayData.parks.filter(park =>
                this.selectedParkNames.has(park.name)
            );

            if (filteredParks.length > 0) {
                filteredParks.forEach(park => {
                    const parkSection = this.createParkDetailsSection(park);
                    modalContent.appendChild(parkSection);
                });
            } else {
                const noData = document.createElement('p');
                noData.textContent = 'No parks selected for display.';
                noData.style.cssText = `
                    color: #666;
                    font-style: italic;
                    text-align: center;
                    margin: 20px 0;
                `;
                modalContent.appendChild(noData);
            }
        } else {
            const noData = document.createElement('p');
            noData.textContent = 'No court data available for this day.';
            noData.style.cssText = `
                color: #666;
                font-style: italic;
                text-align: center;
                margin: 20px 0;
            `;
            modalContent.appendChild(noData);
        }

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        this.expandedDayModal = modal;

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideDayDetails();
            }
        });

        // Close modal with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.hideDayDetails();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Create detailed park section for modal
     */
    createParkDetailsSection(park) {
        const section = document.createElement('div');
        section.style.cssText = `
            margin-bottom: 20px;
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            background: #fafafa;
        `;

        // Park header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        `;

        const colorIndicator = document.createElement('div');
        colorIndicator.style.cssText = `
            width: 16px;
            height: 16px;
            border-radius: 3px;
            background-color: ${this.getAccessibleParkColor(park.name)};
            margin-right: 10px;
            border: 1px solid #ccc;
        `;

        const parkName = document.createElement('h3');
        parkName.textContent = park.name;
        parkName.style.cssText = `
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: #333;
        `;

        header.appendChild(colorIndicator);
        header.appendChild(parkName);
        section.appendChild(header);

        // Court availability summary
        const summary = document.createElement('div');
        summary.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 12px;
        `;

        const totalCourts = document.createElement('div');
        totalCourts.innerHTML = `<strong>Total Courts:</strong><br>${park.totalCourts || 0}`;
        totalCourts.style.cssText = `
            text-align: center;
            padding: 8px;
            background: white;
            border-radius: 4px;
            font-size: 13px;
        `;

        const bookedCourts = document.createElement('div');
        bookedCourts.innerHTML = `<strong>Booked:</strong><br>${park.bookedCourts || 0}`;
        bookedCourts.style.cssText = `
            text-align: center;
            padding: 8px;
            background: white;
            border-radius: 4px;
            font-size: 13px;
        `;

        const availableCourts = document.createElement('div');
        availableCourts.innerHTML = `<strong>Available:</strong><br>${park.availableCourts || 0}`;
        availableCourts.style.cssText = `
            text-align: center;
            padding: 8px;
            background: white;
            border-radius: 4px;
            font-size: 13px;
        `;

        summary.appendChild(totalCourts);
        summary.appendChild(bookedCourts);
        summary.appendChild(availableCourts);
        section.appendChild(summary);

        // Time windows details
        if (park.timeWindows && park.timeWindows.length > 0) {
            const timeWindowsHeader = document.createElement('h4');
            timeWindowsHeader.textContent = 'Booking Details:';
            timeWindowsHeader.style.cssText = `
                margin: 12px 0 8px 0;
                font-size: 14px;
                font-weight: 500;
                color: #333;
            `;
            section.appendChild(timeWindowsHeader);

            park.timeWindows.forEach(window => {
                const windowDiv = document.createElement('div');
                windowDiv.style.cssText = `
                    background: white;
                    padding: 8px 12px;
                    margin-bottom: 6px;
                    border-radius: 4px;
                    border-left: 4px solid ${this.getAccessibleParkColor(park.name)};
                `;

                const timeRange = document.createElement('div');
                timeRange.textContent = window.displayTime;
                timeRange.style.cssText = `
                    font-weight: 500;
                    color: #1976d2;
                    margin-bottom: 4px;
                `;

                const courts = document.createElement('div');
                courts.textContent = `Courts: ${window.courts.join(', ')}`;
                courts.style.cssText = `
                    font-size: 13px;
                    color: #666;
                `;

                windowDiv.appendChild(timeRange);
                windowDiv.appendChild(courts);
                section.appendChild(windowDiv);
            });
        } else if (park.status === 'booked') {
            const statusDiv = document.createElement('div');
            statusDiv.textContent = 'All courts are fully booked for this day.';
            statusDiv.style.cssText = `
                background: #ffebee;
                color: #c62828;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 13px;
                text-align: center;
            `;
            section.appendChild(statusDiv);
        } else if (park.status === 'available') {
            const statusDiv = document.createElement('div');
            statusDiv.textContent = 'All courts are available for this day.';
            statusDiv.style.cssText = `
                background: #e8f5e8;
                color: #1b5e20;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 13px;
                text-align: center;
            `;
            section.appendChild(statusDiv);
        }

        return section;
    }

    /**
     * Hide day details modal
     */
    hideDayDetails() {
        if (this.expandedDayModal) {
            document.body.removeChild(this.expandedDayModal);
            this.expandedDayModal = null;
        }
    }

    /**
     * Handle mouse over events for tooltips
     */
    handleMouseOver(event) {
        const target = event.target;

        // Enhanced tooltips for time blocks
        if (target.classList.contains('time-block') ||
            target.classList.contains('weekly-booking-block') ||
            target.classList.contains('daily-booking-block')) {

            const parkName = target.dataset.parkName || target.title.split(':')[0];
            const timeRange = target.dataset.timeRange || target.title.split(':')[1]?.trim();
            const courts = target.dataset.courts ? JSON.parse(target.dataset.courts) : [];
            const courtCount = target.dataset.courtCount || courts.length;

            let tooltipContent = `<strong>${parkName}</strong>`;
            if (timeRange) {
                tooltipContent += `\n${timeRange}`;
            }
            if (courts.length > 0) {
                tooltipContent += `\n\nCourts: ${courts.join(', ')}`;
                if (courtCount > 1) {
                    tooltipContent += ` (${courtCount} courts)`;
                }
            }

            this.showTooltip(target, tooltipContent, event);
        }
    }

    /**
     * Handle mouse out events for tooltips
     */
    handleMouseOut(event) {
        const target = event.target;

        if (target.classList.contains('time-block') ||
            target.classList.contains('weekly-booking-block') ||
            target.classList.contains('daily-booking-block')) {
            this.hideTooltip();
        }
    }

    /**
     * Handle mouse move events for tooltip positioning
     */
    handleMouseMove(event) {
        if (this.activeTooltip && this.activeTooltip.style.opacity === '1') {
            const tooltipRect = this.activeTooltip.getBoundingClientRect();

            let left = event.clientX + 10;
            let top = event.clientY - 10;

            // Adjust position if tooltip would go off screen
            if (left + tooltipRect.width > window.innerWidth) {
                left = event.clientX - tooltipRect.width - 10;
            }
            if (top < 0) {
                top = event.clientY + 20;
            }

            this.activeTooltip.style.left = left + 'px';
            this.activeTooltip.style.top = top + 'px';
        }
    }

    /**
     * Handle click events for day details
     */
    handleClick(event) {
        const target = event.target;

        // Handle day cell clicks for expanded details
        if (target.classList.contains('calendar-day') || target.closest('.calendar-day')) {
            const dayElement = target.classList.contains('calendar-day') ? target : target.closest('.calendar-day');
            const dateString = dayElement.dataset.date;

            if (dateString && this.calendarData && this.calendarData.days && this.calendarData.days[dateString]) {
                event.preventDefault();
                this.showDayDetails(dateString, this.calendarData.days[dateString]);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('Court Aggregator loaded');
    new CalendarApp();
});