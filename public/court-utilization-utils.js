/**
 * Court Utilization Utilities for Frontend
 * Lightweight version of the utilization calculator for client-side use
 */
class CourtUtilizationCalculator {
    constructor() {
        this.parkCourtCounts = new Map();
    }

    /**
     * Calculate court utilization for a specific time window with view-specific formatting
     * @param {Object} parkData - Park data object
     * @param {Object} timeWindow - Time window object with courts array
     * @param {string} viewType - View type ('weekly', 'daily', 'monthly')
     * @returns {Object} Utilization data object
     */
    calculateUtilization(parkData, timeWindow, viewType = 'weekly') {
        try {
            if (!parkData || !timeWindow) {
                console.warn('Invalid data provided to calculateUtilization');
                return this.getEmptyUtilization(viewType);
            }

            const totalCourts = this.getTotalCourtsForPark(parkData);
            const bookedCourts = timeWindow.courts ? timeWindow.courts.length : 0;
            
            return {
                bookedCount: bookedCourts,
                totalCount: totalCourts,
                displayText: this.formatForView(bookedCourts, totalCourts, viewType),
                utilizationPercentage: totalCourts > 0 ? Math.round((bookedCourts / totalCourts) * 100) : 0,
                isEmpty: bookedCourts === 0,
                isFull: bookedCourts === totalCourts,
                viewType: viewType,
                cssClasses: this.getUtilizationCssClasses(viewType, bookedCourts, totalCourts)
            };
        } catch (error) {
            console.error('Error calculating utilization:', error);
            return this.getEmptyUtilization(viewType);
        }
    }

    /**
     * Optimize display format based on available space and view type
     * @param {number} bookedCourts - Number of booked courts
     * @param {number} totalCourts - Total number of courts
     * @param {string} viewType - View type for optimization
     * @returns {string} Optimized display text
     */
    formatForView(bookedCourts, totalCourts, viewType) {
        if (viewType === 'weekly') {
            // Ultra-compact format for ~100px width constraint
            return `${bookedCourts}/${totalCourts}`;
        } else if (viewType === 'daily') {
            // Enhanced format with more available width
            return `${bookedCourts}/${totalCourts} courts`;
        } else if (viewType === 'monthly') {
            // Compact format for monthly overview
            return `${bookedCourts}/${totalCourts}`;
        }
        return `${bookedCourts}/${totalCourts}`;
    }

    /**
     * Generate CSS classes for utilization display based on view type
     * @param {string} viewType - View type
     * @param {number} bookedCourts - Number of booked courts
     * @param {number} totalCourts - Total number of courts
     * @returns {string} CSS class names
     */
    getUtilizationCssClasses(viewType, bookedCourts, totalCourts) {
        const baseClass = 'court-utilization';
        const viewClass = `${baseClass}--${viewType}`;
        
        let statusClass;
        if (bookedCourts === 0) {
            statusClass = `${baseClass}--empty`;
        } else if (bookedCourts === totalCourts) {
            statusClass = `${baseClass}--full`;
        } else {
            statusClass = `${baseClass}--partial`;
        }
        
        return `${baseClass} ${viewClass} ${statusClass}`;
    }

    /**
     * Get empty utilization object for error cases
     * @param {string} viewType - View type for formatting
     * @returns {Object} Empty utilization data
     */
    getEmptyUtilization(viewType = 'weekly') {
        return {
            bookedCount: 0,
            totalCount: 0,
            displayText: this.formatForView(0, 0, viewType),
            utilizationPercentage: 0,
            isEmpty: true,
            isFull: false,
            viewType: viewType,
            cssClasses: this.getUtilizationCssClasses(viewType, 0, 0)
        };
    }

    /**
     * Get total court count for a park (cached)
     * @param {Object} parkData - Park data object
     * @returns {number} Total number of courts
     */
    getTotalCourtsForPark(parkData) {
        if (this.parkCourtCounts.has(parkData.name)) {
            return this.parkCourtCounts.get(parkData.name);
        }

        let totalCourts = 0;

        if (parkData.totalCourts && typeof parkData.totalCourts === 'number') {
            totalCourts = parkData.totalCourts;
        } else if (parkData.courts && Array.isArray(parkData.courts)) {
            const uniqueCourts = new Set();
            parkData.courts.forEach(court => {
                if (court.resourceName) {
                    uniqueCourts.add(court.resourceName);
                }
            });
            totalCourts = uniqueCourts.size;
        } else {
            totalCourts = this.calculateMaxConcurrentCourts(parkData);
        }

        this.parkCourtCounts.set(parkData.name, totalCourts);
        return totalCourts;
    }

    /**
     * Calculate maximum concurrent courts from time windows
     * @param {Object} parkData - Park data object
     * @returns {number} Maximum number of concurrent courts
     */
    calculateMaxConcurrentCourts(parkData) {
        if (!parkData.timeWindows || !Array.isArray(parkData.timeWindows)) {
            return 0;
        }

        let maxCourts = 0;
        parkData.timeWindows.forEach(window => {
            if (window.courts && Array.isArray(window.courts)) {
                maxCourts = Math.max(maxCourts, window.courts.length);
            }
        });

        return maxCourts;
    }

    /**
     * Calculate overall park utilization
     * @param {Object} parkData - Park data object
     * @returns {Object} Overall utilization data
     */
    calculateParkUtilization(parkData) {
        const totalCourts = this.getTotalCourtsForPark(parkData);
        
        if (!parkData.timeWindows || parkData.timeWindows.length === 0) {
            const bookedCourts = parkData.bookedCourts || 0;
            return {
                bookedCount: bookedCourts,
                totalCount: totalCourts,
                displayText: `${bookedCourts}/${totalCourts}`,
                utilizationPercentage: totalCourts > 0 ? Math.round((bookedCourts / totalCourts) * 100) : 0,
                isEmpty: bookedCourts === 0,
                isFull: bookedCourts === totalCourts
            };
        }

        let peakBookedCourts = 0;
        parkData.timeWindows.forEach(window => {
            const bookedCourts = window.courts ? window.courts.length : 0;
            if (bookedCourts > peakBookedCourts) {
                peakBookedCourts = bookedCourts;
            }
        });

        return {
            bookedCount: peakBookedCourts,
            totalCount: totalCourts,
            displayText: `${peakBookedCourts}/${totalCourts}`,
            utilizationPercentage: totalCourts > 0 ? Math.round((peakBookedCourts / totalCourts) * 100) : 0,
            isEmpty: peakBookedCourts === 0,
            isFull: peakBookedCourts === totalCourts,
            isPeakUtilization: true
        };
    }
}