// Time Tracker for Cyberpunk RED

// Main game state object
const gameTimeState = {
    currentDate: new Date('2045-01-01T12:00:00'),
    events: [],
    recoveryPeriods: [],
    weather: {
        condition: 'Acid Rain',
        temperature: 18,
        icon: 'acid-rain'
    },
    settings: {
        timeScale: 1,
        campaignStartDate: '2045-01-01T12:00:00',
        lastRealWorldTimestamp: Date.now(),
        autoTrackCombatTime: true,
        combatRoundSeconds: 3,
        dayPhases: {
            night: { start: 22, end: 5 },
            dawn: { start: 5, end: 8 },
            day: { start: 8, end: 18 },
            dusk: { start: 18, end: 22 }
        }
    }
};

// Weather conditions for Night City
const WEATHER_CONDITIONS = [
    {
        name: 'Clear Skies',
        icon: 'clear',
        tempRange: { min: 15, max: 25 },
        probability: 15
    },
    {
        name: 'Cloudy',
        icon: 'cloudy',
        tempRange: { min: 12, max: 22 },
        probability: 25
    },
    {
        name: 'Acid Rain',
        icon: 'acid-rain',
        tempRange: { min: 10, max: 18 },
        probability: 30
    },
    {
        name: 'Industrial Smog',
        icon: 'smog',
        tempRange: { min: 16, max: 28 },
        probability: 20
    },
    {
        name: 'Electrical Storm',
        icon: 'storm',
        tempRange: { min: 14, max: 20 },
        probability: 10
    }
];

// Event Categories and their colors
const EVENT_CATEGORIES = {
    job: { name: 'Job', color: '#30b341' },
    recovery: { name: 'Recovery/Healing', color: '#4c9be8' },
    lifestyle: { name: 'Lifestyle', color: '#e8a74c' },
    downtime: { name: 'Downtime', color: '#9c4ce8' },
    other: { name: 'Other', color: '#cccccc' }
};

// Recovery types and durations
const RECOVERY_TYPES = {
    wound: { 
        name: 'Wound Healing',
        baseDuration: { days: 1 },
        description: 'Natural healing of injuries'
    },
    surgery: { 
        name: 'Cybernetic Surgery',
        baseDuration: { days: 3 },
        description: 'Recovery from cybernetic implantation'
    },
    therapy: { 
        name: 'Therapy Session',
        baseDuration: { hours: 1 },
        description: 'Mental health treatment'
    },
    medication: { 
        name: 'Medication',
        baseDuration: { hours: 8 },
        description: 'Effects of medication'
    },
    other: { 
        name: 'Other Recovery',
        baseDuration: { days: 1 },
        description: 'Custom recovery period'
    }
};

// Track whether initialization has already happened to prevent double initialization
let isInitialized = false;

// Remove the earlier DOMContentLoaded listener and consolidate initialization
document.addEventListener('DOMContentLoaded', function() {
    // Prevent double initialization
    if (isInitialized) return;
    isInitialized = true;
    
    console.log('Initializing Time Tracker');
    
    applyCurrentTheme();
    initTimeTracker();
    updateNavigationLinks();
    
    // Listen for theme changes and update immediately
    window.addEventListener('storage', function(e) {
        if (e.key === 'theme' || e.key === 'largeText' || e.key === 'disableAnimations') {
            applyCurrentTheme();
        }
    });
});

// Function to apply the current theme from settings
function applyCurrentTheme() {
    const currentTheme = localStorage.getItem('theme') || 'default';
    document.body.className = `theme-${currentTheme}`;
    
    // Also apply any large text or animation preferences
    const largeText = localStorage.getItem('largeText') === 'true';
    const disableAnimations = localStorage.getItem('disableAnimations') === 'true';
    
    if (largeText) {
        document.body.classList.add('large-text');
    }
    
    if (disableAnimations) {
        document.body.classList.add('disable-animations');
    }
}

// Main initialization function
function initTimeTracker() {
    console.log('Running initTimeTracker');
    
    // Load saved state
    loadGameState();
    
    // Set up clock & calendar
    updateClockDisplay();
    updateCalendar();
    
    // Set up weather
    updateWeatherDisplay();
    
    // Set up events display
    renderEvents();
    renderRecoveryPeriods();
    
    // Set up player character select for recovery tracking
    populateRecoveryCharacterSelect();
    
    // Set up event listeners - ensure we only set these once
    setupEventListeners();
}

// Load game state from localStorage
function loadGameState() {
    const savedState = localStorage.getItem('cyberpunkTimeTracker');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Convert date strings back to Date objects
        gameTimeState.currentDate = new Date(parsedState.currentDate);
        gameTimeState.settings = parsedState.settings;
        
        // Convert event dates back to Date objects
        gameTimeState.events = parsedState.events.map(event => ({
            ...event,
            startDate: new Date(event.startDate),
            endDate: event.endDate ? new Date(event.endDate) : null
        }));
        
        // Convert recovery dates back to Date objects
        gameTimeState.recoveryPeriods = parsedState.recoveryPeriods.map(recovery => ({
            ...recovery,
            startDate: new Date(recovery.startDate),
            endDate: new Date(recovery.endDate)
        }));
        
        // Load weather
        gameTimeState.weather = parsedState.weather;
    }
    
    // Update lastRealWorldTimestamp to current time
    gameTimeState.settings.lastRealWorldTimestamp = Date.now();
}

// Save game state to localStorage
function saveGameState() {
    localStorage.setItem('cyberpunkTimeTracker', JSON.stringify(gameTimeState));
}

// Update the clock display
function updateClockDisplay() {
    const dateDisplay = document.getElementById('current-date');
    const timeDisplay = document.getElementById('current-time');
    const dayPhaseText = document.getElementById('day-phase-text');
    const dayNightIndicator = document.getElementById('day-night-indicator');
    
    // Format date: YYYY-MM-DD
    const dateString = gameTimeState.currentDate.toISOString().split('T')[0];
    
    // Format time: HH:MM
    const hours = String(gameTimeState.currentDate.getHours()).padStart(2, '0');
    const minutes = String(gameTimeState.currentDate.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    // Update DOM
    dateDisplay.textContent = dateString;
    timeDisplay.textContent = timeString;
    
    // Update day/night phase
    const currentHour = gameTimeState.currentDate.getHours();
    const { dayPhases } = gameTimeState.settings;
    
    // Determine current phase
    let currentPhase = 'day';
    if (currentHour >= dayPhases.night.start || currentHour < dayPhases.night.end) {
        currentPhase = 'night';
    } else if (currentHour >= dayPhases.dawn.start && currentHour < dayPhases.dawn.end) {
        currentPhase = 'dawn';
    } else if (currentHour >= dayPhases.dusk.start && currentHour < dayPhases.dusk.end) {
        currentPhase = 'dusk';
    }
    
    // Update phase display
    dayNightIndicator.className = 'day-indicator ' + currentPhase;
    
    // Set phase text
    let phaseText = 'Daytime';
    switch (currentPhase) {
        case 'night': phaseText = 'Night'; break;
        case 'dawn': phaseText = 'Dawn'; break;
        case 'dusk': phaseText = 'Dusk'; break;
    }
    dayPhaseText.textContent = phaseText;
    
    // Set initial date/time input values
    document.getElementById('set-date').value = dateString;
    document.getElementById('set-time').value = timeString;
}

// Fix the updateCalendar function
function updateCalendar() {
    // Initialize calendarViewDate if it doesn't exist
    if (!window.calendarViewDate) {
        window.calendarViewDate = new Date(gameTimeState.currentDate);
    }
    
    // Update the calendar display based on this date
    updateCalendarDisplay();
}

// Fix the navigateMonth function
function navigateMonth(direction) {
    // If calendarViewDate doesn't exist yet, initialize it with current date
    if (!window.calendarViewDate) {
        window.calendarViewDate = new Date(gameTimeState.currentDate);
    }
    
    // Create a new date object to avoid reference issues
    const newDate = new Date(window.calendarViewDate);
    
    // Get the current month and add the direction
    const newMonth = newDate.getMonth() + direction;
    
    // Set the new month - JavaScript handles the year rollover automatically
    newDate.setMonth(newMonth);
    
    // Update our global calendar view date
    window.calendarViewDate = newDate;
    
    // Update the calendar display
    updateCalendarDisplay();
}

// Fix the updateCalendarDisplay function
function updateCalendarDisplay() {
    // Get elements
    const calendarMonth = document.getElementById('calendar-month');
    const calendarDays = document.getElementById('calendar-days');
    
    if (!calendarMonth || !calendarDays) return;
    
    // Get displayed month data from the calendarViewDate
    const viewDate = window.calendarViewDate || new Date(gameTimeState.currentDate);
    const displayedYear = viewDate.getFullYear();
    const displayedMonth = viewDate.getMonth();
    
    // Current game date (for highlighting current day)
    const gameDate = gameTimeState.currentDate;
    const isCurrentMonth = (gameDate.getMonth() === displayedMonth && 
                           gameDate.getFullYear() === displayedYear);
    
    // Set month header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    calendarMonth.textContent = `${monthNames[displayedMonth]} ${displayedYear}`;
    
    // Clear calendar
    calendarDays.innerHTML = '';
    
    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDay = new Date(displayedYear, displayedMonth, 1);
    const firstDayOfMonth = firstDay.getDay();
    
    // Get number of days in current and previous month
    const daysInMonth = new Date(displayedYear, displayedMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(displayedYear, displayedMonth, 0).getDate();
    
    // Add days from previous month to fill the first row
    for (let i = 0; i < firstDayOfMonth; i++) {
        const dayElement = document.createElement('div');
        const prevMonthDay = daysInPrevMonth - firstDayOfMonth + i + 1;
        dayElement.textContent = prevMonthDay;
        dayElement.className = 'calendar-day other-month';
        
        // Calculate the correct date for the previous month
        const prevMonth = displayedMonth === 0 ? 11 : displayedMonth - 1;
        const prevYear = displayedMonth === 0 ? displayedYear - 1 : displayedYear;
        const prevMonthDate = new Date(prevYear, prevMonth, prevMonthDay);
        
        dayElement.addEventListener('click', () => selectDate(prevMonthDate));
        calendarDays.appendChild(dayElement);
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = i;
        dayElement.className = 'calendar-day';
        
        // Highlight current day if we're viewing the current month
        if (isCurrentMonth && i === gameDate.getDate()) {
            dayElement.classList.add('current');
        }
        
        // Check for events on this day
        const dateString = `${displayedYear}-${String(displayedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (hasEventsOnDate(dateString)) {
            dayElement.classList.add('has-events');
        }
        
        // Make day clickable to select that date
        const dayDate = new Date(displayedYear, displayedMonth, i);
        dayElement.addEventListener('click', () => selectDate(dayDate));
        
        calendarDays.appendChild(dayElement);
    }
    
    // Calculate how many days from next month to show to fill the grid
    const totalCells = 42; // 6 rows of 7 days
    const cellsUsed = firstDayOfMonth + daysInMonth;
    const remainingCells = totalCells - cellsUsed;
    
    // Add days from next month to fill the grid
    for (let i = 1; i <= remainingCells; i++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = i;
        dayElement.className = 'calendar-day other-month';
        
        // Calculate the correct date for the next month
        const nextMonth = displayedMonth === 11 ? 0 : displayedMonth + 1;
        const nextYear = displayedMonth === 11 ? displayedYear + 1 : displayedYear;
        const nextMonthDate = new Date(nextYear, nextMonth, i);
        
        dayElement.addEventListener('click', () => selectDate(nextMonthDate));
        calendarDays.appendChild(dayElement);
    }
}

// Fix the hasEventsOnDate function
function hasEventsOnDate(dateString) {
    return gameTimeState.events.some(event => {
        const eventDate = new Date(event.startDate);
        const eventDateString = eventDate.toISOString().split('T')[0];
        return eventDateString === dateString;
    });
}

// Fix the selectDate function
function selectDate(date) {
    if (!date) return;
    
    // Create a new date to avoid reference issues
    const newDate = new Date(date);
    
    // Preserve the current time
    newDate.setHours(
        gameTimeState.currentDate.getHours(),
        gameTimeState.currentDate.getMinutes(),
        gameTimeState.currentDate.getSeconds()
    );
    
    // Update game state
    gameTimeState.currentDate = newDate;
    
    // Update the calendar view date to stay on the selected month
    window.calendarViewDate = new Date(newDate);
    
    // Update displays
    updateClockDisplay();
    updateCalendarDisplay();
    renderEvents();
    
    // Save game state
    saveGameState();
}

// Check if a date has any events
function hasEventsOnDate(dateString) {
    return gameTimeState.events.some(event => {
        const eventDateString = event.startDate.toISOString().split('T')[0];
        return eventDateString === dateString;
    });
}

// Select a specific date for viewing
function selectDate(date) {
    console.log("Selecting date:", date);
    
    // Don't change the time, just the date
    const newDate = new Date(date);
    newDate.setHours(gameTimeState.currentDate.getHours());
    newDate.setMinutes(gameTimeState.currentDate.getMinutes());
    
    // Update game state
    gameTimeState.currentDate = newDate;
    
    // Also update the calendar view date to stay on the selected month
    window.calendarViewDate = new Date(newDate);
    
    // Update displays
    updateClockDisplay();
    updateCalendarDisplay();
    renderEvents();
    
    // Save game state
    saveGameState();
}

// Update weather display
function updateWeatherDisplay() {
    const weatherIcon = document.getElementById('weather-icon');
    const weatherCondition = document.getElementById('weather-condition');
    const weatherTemp = document.getElementById('weather-temp');
    
    // Set classes for the weather icon
    weatherIcon.className = `weather-icon ${gameTimeState.weather.icon}`;
    
    // Set weather condition and temperature
    weatherCondition.textContent = gameTimeState.weather.condition;
    const tempC = gameTimeState.weather.temperature;
    const tempF = Math.round(tempC * 9/5 + 32);
    weatherTemp.textContent = `${tempC}°C / ${tempF}°F`;
}

// Generate random weather
function generateRandomWeather() {
    // Get total probability sum
    const totalProbability = WEATHER_CONDITIONS.reduce((sum, condition) => sum + condition.probability, 0);
    
    // Get random value within probability range
    const roll = Math.random() * totalProbability;
    
    // Find which condition was rolled
    let cumulativeProbability = 0;
    let selectedCondition = WEATHER_CONDITIONS[0];
    
    for (const condition of WEATHER_CONDITIONS) {
        cumulativeProbability += condition.probability;
        if (roll <= cumulativeProbability) {
            selectedCondition = condition;
            break;
        }
    }
    
    // Generate random temperature within condition range
    const tempRange = selectedCondition.tempRange;
    const temperature = Math.floor(Math.random() * (tempRange.max - tempRange.min + 1)) + tempRange.min;
    
    // Update weather in game state
    gameTimeState.weather = {
        condition: selectedCondition.name,
        temperature: temperature,
        icon: selectedCondition.icon
    };
    
    // Update display
    updateWeatherDisplay();
    
    // Save game state
    saveGameState();
}

// Fix the advanceTime function to prevent the double-advancing bug
function advanceTime(amount, unit) {
    console.log(`advanceTime called with: ${amount} ${unit}`);
    
    // Get the current date as a timestamp to avoid Date object manipulation issues
    const currentTimestamp = gameTimeState.currentDate.getTime();
    let newDate = new Date(currentTimestamp);
    
    // Make the adjustment
    switch (unit) {
        case 'minute':
            newDate.setMinutes(newDate.getMinutes() + amount);
            break;
        case 'hour':
            newDate.setHours(newDate.getHours() + amount);
            break;
        case 'day':
            // Special handling for days to ensure accuracy
            const currentDay = newDate.getDate();
            newDate.setDate(currentDay + amount);
            break;
        case 'week':
            newDate.setDate(newDate.getDate() + (amount * 7));
            break;
        case 'month':
            // Get current details to manage month transitions properly
            const currentMonth = newDate.getMonth();
            const currentYear = newDate.getFullYear();
            const currentDayOfMonth = newDate.getDate();
            
            // Calculate new month and year
            let newMonth = currentMonth + amount;
            let newYear = currentYear;
            
            // Handle year rollover
            if (newMonth > 11) {
                newYear += Math.floor(newMonth / 12);
                newMonth = newMonth % 12;
            }
            
            // Set year and month first
            newDate.setFullYear(newYear);
            newDate.setMonth(newMonth);
            
            // Check if we need to adjust the day (e.g., Jan 31 -> Feb 28)
            const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
            if (currentDayOfMonth > daysInNewMonth) {
                newDate.setDate(daysInNewMonth);
            }
            break;
    }
    
    // Debug information
    console.log(`Current date: ${gameTimeState.currentDate.toISOString()}`);
    console.log(`New date: ${newDate.toISOString()}`);
    console.log(`Difference in days: ${(newDate - gameTimeState.currentDate) / (1000 * 60 * 60 * 24)}`);
    
    // Update game state with the new date
    gameTimeState.currentDate = newDate;
    
    // Update displays
    updateClockDisplay();
    updateCalendar();
    
    // Process events that may occur during time advancement
    processTimeAdvancement(amount, unit);
    
    // Save game state
    saveGameState();
}

// Process events that may occur during time advancement
function processTimeAdvancement(amount, unit) {
    // Check for expired recovery periods
    checkRecoveryPeriods();
    
    // Update event statuses
    updateEventStatuses();
    
    // Generate new weather if advancing by day or more
    if (unit === 'day' || unit === 'week' || unit === 'month' || 
        (unit === 'hour' && amount >= 12)) {
        generateRandomWeather();
    }
    
    // Render updated lists
    renderEvents();
    renderRecoveryPeriods();
}

// Check recovery periods and mark completed ones
function checkRecoveryPeriods() {
    const currentDate = gameTimeState.currentDate;
    let updated = false;
    
    gameTimeState.recoveryPeriods = gameTimeState.recoveryPeriods.map(recovery => {
        // If the recovery is already completed, just return it unchanged
        if (recovery.completed) {
            return recovery;
        }
        
        // Check if the end date has passed
        if (currentDate >= recovery.endDate) {
            recovery.completed = true;
            updated = true;
            
            // Create a completion event
            addEvent({
                title: `${recovery.type} Complete: ${recovery.characterName}`,
                startDate: recovery.endDate,
                endDate: null,
                location: 'N/A',
                category: 'recovery',
                recurrence: 'none',
                description: `${recovery.characterName} has completed their ${RECOVERY_TYPES[recovery.type].name} period.`,
                completed: true
            });
        }
        
        return recovery;
    });
    
    // If any recovery periods were updated, save state
    if (updated) {
        saveGameState();
    }
}

// Update event statuses (check for completed events)
function updateEventStatuses() {
    const currentDate = gameTimeState.currentDate;
    let updated = false;
    
    gameTimeState.events = gameTimeState.events.map(event => {
        // If the event is already completed or has no end date, return unchanged
        if (event.completed || !event.endDate) {
            return event;
        }
        
        // Check if the end date has passed
        if (currentDate >= event.endDate) {
            event.completed = true;
            updated = true;
            
            // Handle recurring events
            if (event.recurrence !== 'none') {
                const newEvent = createRecurringEvent(event);
                if (newEvent) {
                    // Add the new event
                    gameTimeState.events.push(newEvent);
                }
            }
        }
        
        return event;
    });
    
    // If any events were updated, save state
    if (updated) {
        saveGameState();
    }
}

// Create a new recurring event based on a completed event
function createRecurringEvent(completedEvent) {
    const newEvent = { ...completedEvent };
    newEvent.completed = false;
    
    // Calculate new dates based on recurrence pattern
    const startDate = new Date(completedEvent.startDate);
    const endDate = completedEvent.endDate ? new Date(completedEvent.endDate) : null;
    
    switch (completedEvent.recurrence) {
        case 'daily':
            startDate.setDate(startDate.getDate() + 1);
            if (endDate) endDate.setDate(endDate.getDate() + 1);
            break;
        case 'weekly':
            startDate.setDate(startDate.getDate() + 7);
            if (endDate) endDate.setDate(endDate.getDate() + 7);
            break;
        case 'monthly':
            startDate.setMonth(startDate.getMonth() + 1);
            if (endDate) endDate.setMonth(endDate.getMonth() + 1);
            break;
        default:
            return null; // Unknown recurrence pattern
    }
    
    newEvent.startDate = startDate;
    newEvent.endDate = endDate;
    
    return newEvent;
}

// Render the events list
function renderEvents() {
    renderEventsList('upcoming', getUpcomingEvents());
    renderEventsList('all', getAllEvents());
    renderEventsList('completed', getCompletedEvents());
    
    // Update the event form's default dates
    const startDateInput = document.getElementById('event-start-date');
    const startTimeInput = document.getElementById('event-start-time');
    
    const dateString = gameTimeState.currentDate.toISOString().split('T')[0];
    const hours = String(gameTimeState.currentDate.getHours()).padStart(2, '0');
    const minutes = String(gameTimeState.currentDate.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    startDateInput.value = dateString;
    startTimeInput.value = timeString;
}

// Render a specific events list
function renderEventsList(listId, events) {
    const listElement = document.getElementById(`${listId}-events`);
    
    if (events.length === 0) {
        listElement.innerHTML = `<div class="event-message">No ${listId} events.</div>`;
        return;
    }
    
    listElement.innerHTML = '';
    
    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = `event-card ${event.category}`;
        eventCard.dataset.eventId = event.id;
        
        // Format date and time
        const startDate = new Date(event.startDate);
        const startDateFormatted = startDate.toLocaleDateString();
        const startTimeFormatted = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let timeDisplay = `${startDateFormatted} at ${startTimeFormatted}`;
        
        if (event.endDate) {
            const endDate = new Date(event.endDate);
            const endDateFormatted = endDate.toLocaleDateString();
            const endTimeFormatted = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (startDateFormatted === endDateFormatted) {
                timeDisplay += ` - ${endTimeFormatted}`;
            } else {
                timeDisplay += ` - ${endDateFormatted} at ${endTimeFormatted}`;
            }
        }
        
        eventCard.innerHTML = `
            <h4>
                ${event.title}
                ${event.recurrence !== 'none' ? '<span class="recurrence-indicator">↻</span>' : ''}
            </h4>
            <div class="event-time">${timeDisplay}</div>
            ${event.location ? `<div class="event-location"><strong>Location:</strong> ${event.location}</div>` : ''}
        `;
        
        // Add click handler to show event details
        eventCard.addEventListener('click', () => {
            showEventDetails(event);
        });
        
        listElement.appendChild(eventCard);
    });
}

// Get upcoming events (not completed and starting in the future or ongoing)
function getUpcomingEvents() {
    const currentDate = gameTimeState.currentDate;
    return gameTimeState.events
        .filter(event => !event.completed && 
            (event.startDate > currentDate || 
             (event.endDate && event.startDate <= currentDate && event.endDate >= currentDate)))
        .sort((a, b) => a.startDate - b.startDate);
}

// Get all events sorted by date
function getAllEvents() {
    return [...gameTimeState.events].sort((a, b) => a.startDate - b.startDate);
}

// Get completed events
function getCompletedEvents() {
    return gameTimeState.events
        .filter(event => event.completed)
        .sort((a, b) => b.startDate - a.startDate); // Reverse chronological for completed events
}

// Show event details in a modal
function showEventDetails(event) {
    const modal = document.getElementById('event-modal');
    const titleElement = document.getElementById('modal-event-title');
    const detailsElement = document.getElementById('modal-event-details');
    const completeButton = document.getElementById('complete-event');
    const editButton = document.getElementById('edit-event');
    const deleteButton = document.getElementById('delete-event');
    
    // Set title
    titleElement.textContent = event.title;
    
    // Format date and time
    const startDate = new Date(event.startDate);
    const startDateFormatted = startDate.toLocaleDateString();
    const startTimeFormatted = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let timeDisplay = `${startDateFormatted} at ${startTimeFormatted}`;
    
    if (event.endDate) {
        const endDate = new Date(event.endDate);
        const endDateFormatted = endDate.toLocaleDateString();
        const endTimeFormatted = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (startDateFormatted === endDateFormatted) {
            timeDisplay += ` - ${endTimeFormatted}`;
        } else {
            timeDisplay += ` - ${endDateFormatted} at ${endTimeFormatted}`;
        }
    }
    
    // Build details HTML
    let detailsHTML = `
        <div class="detail-item">
            <span class="detail-label">Time:</span> ${timeDisplay}
        </div>
    `;
    
    if (event.location) {
        detailsHTML += `
            <div class="detail-item">
                <span class="detail-label">Location:</span> ${event.location}
            </div>
        `;
    }
    
    detailsHTML += `
        <div class="detail-item">
            <span class="detail-label">Category:</span> ${EVENT_CATEGORIES[event.category].name}
        </div>
    `;
    
    if (event.recurrence !== 'none') {
        const recurrenceText = event.recurrence.charAt(0).toUpperCase() + event.recurrence.slice(1);
        detailsHTML += `
            <div class="detail-item">
                <span class="detail-label">Recurrence:</span> ${recurrenceText}
            </div>
        `;
    }
    
    if (event.description) {
        detailsHTML += `
            <div class="detail-item">
                <span class="detail-label">Description:</span>
                <p>${event.description}</p>
            </div>
        `;
    }
    
    // Add status
    detailsHTML += `
        <div class="detail-item">
            <span class="detail-label">Status:</span>
            ${event.completed ? 'Completed' : 'Active'}
        </div>
    `;
    
    detailsElement.innerHTML = detailsHTML;
    
    // Configure buttons based on event state
    completeButton.style.display = event.completed ? 'none' : 'block';
    completeButton.onclick = () => {
        markEventComplete(event.id);
        modal.style.display = 'none';
    };
    
    editButton.onclick = () => {
        editEvent(event);
        modal.style.display = 'none';
    };
    
    deleteButton.onclick = () => {
        if (confirm('Are you sure you want to delete this event?')) {
            deleteEvent(event.id);
            modal.style.display = 'none';
        }
    };
    
    // Show the modal
    modal.style.display = 'block';
}

// Mark an event as complete
function markEventComplete(eventId) {
    const eventIndex = gameTimeState.events.findIndex(event => event.id === eventId);
    if (eventIndex === -1) return;
    
    gameTimeState.events[eventIndex].completed = true;
    
    // Handle recurring events
    if (gameTimeState.events[eventIndex].recurrence !== 'none') {
        const newEvent = createRecurringEvent(gameTimeState.events[eventIndex]);
        if (newEvent) {
            gameTimeState.events.push(newEvent);
        }
    }
    
    saveGameState();
    renderEvents();
}

// Delete an event
function deleteEvent(eventId) {
    gameTimeState.events = gameTimeState.events.filter(event => event.id !== eventId);
    saveGameState();
    renderEvents();
}

// Add a new event to the game state
function addEvent(eventData) {
    // Generate a unique ID
    const id = `event_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const event = {
        id,
        ...eventData
    };
    
    gameTimeState.events.push(event);
    saveGameState();
    renderEvents();
    
    return event;
}

// Edit an existing event
function editEvent(event) {
    // TODO: Implement event editing functionality
    // For now, just log that we're editing
    console.log('Editing event:', event);
}

// Render recovery periods
function renderRecoveryPeriods() {
    const recoveryList = document.getElementById('character-recovery-list');
    const currentDate = gameTimeState.currentDate;
    
    // Filter to active (non-completed) recovery periods
    const activeRecoveries = gameTimeState.recoveryPeriods
        .filter(recovery => !recovery.completed)
        .sort((a, b) => a.endDate - b.endDate);
    
    if (activeRecoveries.length === 0) {
        recoveryList.innerHTML = `<div class="recovery-message">No active recovery periods.</div>`;
        return;
    }
    
    recoveryList.innerHTML = '';
    
    activeRecoveries.forEach(recovery => {
        const recoveryCard = document.createElement('div');
        recoveryCard.className = 'recovery-card';
        
        // Calculate progress
        const totalDuration = recovery.endDate - recovery.startDate;
        const elapsed = currentDate - recovery.startDate;
        const progress = Math.min(100, Math.max(0, Math.floor((elapsed / totalDuration) * 100)));
        
        // Format dates
        const startDateFormatted = recovery.startDate.toLocaleDateString();
        const endDateFormatted = recovery.endDate.toLocaleDateString();
        
        // Determine days/hours remaining
        const msRemaining = recovery.endDate - currentDate;
        let timeRemaining = '';
        
        if (msRemaining <= 0) {
            timeRemaining = 'Complete';
        } else {
            const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
            const hoursRemaining = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            if (daysRemaining > 0) {
                timeRemaining = `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
                if (hoursRemaining > 0) {
                    timeRemaining += `, ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
                }
            } else if (hoursRemaining > 0) {
                timeRemaining = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
            } else {
                const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
                timeRemaining = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`;
            }
            
            timeRemaining += ' remaining';
        }
        
        recoveryCard.innerHTML = `
            <h4>${recovery.characterName}</h4>
            <div>${RECOVERY_TYPES[recovery.type].name}</div>
            ${recovery.notes ? `<div class="recovery-notes">${recovery.notes}</div>` : ''}
            <div class="recovery-progress">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <div class="recovery-time">
                <span>Started: ${startDateFormatted}</span>
                <span>Ends: ${endDateFormatted}</span>
            </div>
            <div class="recovery-time">
                <span>${timeRemaining}</span>
                <span>${progress}% complete</span>
            </div>
            <button class="remove-recovery" data-id="${recovery.id}">×</button>
        `;
        
        recoveryList.appendChild(recoveryCard);
    });
    
    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-recovery').forEach(button => {
        button.addEventListener('click', (event) => {
            const recoveryId = event.target.dataset.id;
            removeRecoveryPeriod(recoveryId);
        });
    });
}

// Remove a recovery period
function removeRecoveryPeriod(recoveryId) {
    if (confirm('Are you sure you want to remove this recovery period?')) {
        gameTimeState.recoveryPeriods = gameTimeState.recoveryPeriods.filter(
            recovery => recovery.id !== recoveryId
        );
        saveGameState();
        renderRecoveryPeriods();
    }
}

// Add a new recovery period
function addRecoveryPeriod(recoveryData) {
    // Generate a unique ID
    const id = `recovery_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const recovery = {
        id,
        ...recoveryData,
        completed: false
    };
    
    gameTimeState.recoveryPeriods.push(recovery);
    saveGameState();
    renderRecoveryPeriods();
    
    return recovery;
}

// Calculate end date for recovery period
function calculateRecoveryEndDate(startDate, duration, unit) {
    const endDate = new Date(startDate);
    
    switch (unit) {
        case 'hour':
            endDate.setHours(endDate.getHours() + duration);
            break;
        case 'day':
            endDate.setDate(endDate.getDate() + duration);
            break;
        case 'week':
            endDate.setDate(endDate.getDate() + (duration * 7));
            break;
        default:
            endDate.setDate(endDate.getDate() + duration);
    }
    
    return endDate;
}

// Populate the player character select dropdown for recovery tracking
function populateRecoveryCharacterSelect() {
    const characterSelect = document.getElementById('recovery-character');
    if (!characterSelect) return;
    
    // Clear existing options except the default
    characterSelect.innerHTML = '<option value="">Select Character...</option>';
    
    // Try to get player characters from localStorage
    try {
        const playerCharacters = JSON.parse(localStorage.getItem('playerCharacters') || '[]');
        
        playerCharacters.forEach(character => {
            const option = document.createElement('option');
            option.value = character.name;
            option.textContent = character.name;
            characterSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading player characters:', error);
    }
}

// Setup event listeners with a flag to prevent double registration
const eventListenersSet = {
    timeIncrementButtons: false,
    customTimeIncrement: false,
    monthNavigation: false
};

// Set up all event listeners for the time tracker
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Month navigation
    if (!eventListenersSet.monthNavigation) {
        document.getElementById('prev-month').addEventListener('click', navigateMonth.bind(null, -1));
        document.getElementById('next-month').addEventListener('click', navigateMonth.bind(null, 1));
        eventListenersSet.monthNavigation = true;
    }
    
    // Time increment buttons - Fix each button individually to eliminate any potential issues
    if (!eventListenersSet.timeIncrementButtons) {
        console.log('Setting time increment button listeners');
        
        // Clear existing event listeners by cloning each button
        document.querySelectorAll('.increment-controls button').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the specific listener with isolated scope
            const increment = newButton.dataset.increment;
            const value = parseInt(newButton.dataset.value);
            
            // Add special debug logging for +1 Day button
            if (increment === 'day' && value === 1) {
                console.log("Setting up +1 Day button specifically");
                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("*** +1 Day button clicked ***");
                    
                    // Create a direct copy of the current date
                    const currentDate = new Date(gameTimeState.currentDate.getTime());
                    console.log("Current date before:", currentDate);
                    
                    // Add exactly one day
                    const newDate = new Date(currentDate);
                    newDate.setDate(currentDate.getDate() + 1);
                    console.log("New date after:", newDate);
                    
                    // Update game state directly
                    gameTimeState.currentDate = newDate;
                    
                    // Update displays
                    updateClockDisplay();
                    updateCalendar();
                    
                    // Process events that may occur during time advancement
                    processTimeAdvancement(1, 'day');
                    
                    // Save game state
                    saveGameState();
                });
            } else {
                // For other buttons, use the regular pattern
                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Clicked: +${value} ${increment}`);
                    advanceTime(value, increment);
                });
            }
        });
        
        eventListenersSet.timeIncrementButtons = true;
    }
    
    // Custom time increment - Only set once to prevent double-advancing
    if (!eventListenersSet.customTimeIncrement) {
        console.log('Setting custom time increment listener');
        const addCustomTimeBtn = document.getElementById('add-custom-time');
        
        // Remove any existing listeners first
        const newBtn = addCustomTimeBtn.cloneNode(true);
        addCustomTimeBtn.parentNode.replaceChild(newBtn, addCustomTimeBtn);
        
        newBtn.addEventListener('click', (e) => {
            // Prevent any default form submission behavior
            e.preventDefault();
            e.stopPropagation();
            
            const amount = parseInt(document.getElementById('custom-amount').value);
            const unit = document.getElementById('custom-unit').value;
            
            console.log(`Custom time increment: ${amount} ${unit}`);
            
            if (amount && unit) {
                // Call our fixed advanceTime function
                advanceTime(amount, unit);
            }
        });
        eventListenersSet.customTimeIncrement = true;
    }
    
    // Other event listeners - Add similar checks for other listeners
    // Set specific date/time
    document.getElementById('set-datetime').addEventListener('click', setSpecificDateTime);
    
    // Reset to campaign start
    document.getElementById('reset-time').addEventListener('click', resetToStart);
    
    // Event tabs
    document.querySelectorAll('.event-tab').forEach(tab => {
        tab.addEventListener('click', switchEventTab);
    });
    
    // Add event form
    document.getElementById('add-event-form').addEventListener('submit', handleAddEvent);
    
    // Event modal close button
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('event-modal').style.display = 'none';
    });
    
    // Click outside modal to close
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('event-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Generate random weather
    document.getElementById('generate-weather').addEventListener('click', generateRandomWeather);
    
    // Add recovery form
    document.getElementById('add-recovery-form').addEventListener('submit', handleAddRecovery);
    
    // Recovery type change - updates duration based on type
    document.getElementById('recovery-type').addEventListener('change', updateRecoveryDuration);
}

// Fix the month navigation issue in the navigateMonth function
function navigateMonth(direction) {
    console.log("Starting navigateMonth with direction:", direction);
    
    // If calendarViewDate doesn't exist yet, initialize it with current date
    if (!window.calendarViewDate) {
        window.calendarViewDate = new Date(gameTimeState.currentDate);
    }
    
    console.log("Before navigation - Current view date:", window.calendarViewDate.toISOString());
    
    // Get current month and year
    const currentMonth = window.calendarViewDate.getMonth();
    const currentYear = window.calendarViewDate.getFullYear();
    
    // Calculate new month/year
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    
    // Handle year wrap-around
    if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    }
    
    console.log(`Navigating from ${currentMonth}/${currentYear} to ${newMonth}/${newYear}`);
    
    // Create new date with same day, but new month/year
    const newDate = new Date(window.calendarViewDate);
    
    // Set year first, then month to avoid potential date issues
    newDate.setFullYear(newYear);
    newDate.setMonth(newMonth);
    
    // Store this as our current view
    window.calendarViewDate = newDate;
    
    console.log("After navigation - New view date:", window.calendarViewDate.toISOString());
    
    // Update the calendar display with the new month
    updateCalendarDisplay();
}

// New function to update just the calendar display without changing the current game date
function updateCalendarDisplay() {
    // Get elements
    const calendarMonth = document.getElementById('calendar-month');
    const calendarDays = document.getElementById('calendar-days');
    
    if (!calendarMonth || !calendarDays) return;
    
    // Get displayed month data
    const viewDate = window.calendarViewDate;
    const displayedYear = viewDate.getFullYear();
    const displayedMonth = viewDate.getMonth();
    
    // Current game date (for highlighting current day)
    const gameDate = gameTimeState.currentDate;
    const isCurrentMonth = (gameDate.getMonth() === displayedMonth && 
                           gameDate.getFullYear() === displayedYear);
    
    // Set month header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    calendarMonth.textContent = `${monthNames[displayedMonth]} ${displayedYear}`;
    
    // Clear calendar
    calendarDays.innerHTML = '';
    
    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = new Date(displayedYear, displayedMonth, 1).getDay();
    
    // Get number of days in current and previous month
    const daysInMonth = new Date(displayedYear, displayedMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(displayedYear, displayedMonth, 0).getDate();
    
    console.log(`Calendar: ${monthNames[displayedMonth]} ${displayedYear}, First day: ${firstDayOfMonth}, Days: ${daysInMonth}`);
    
    // Add days from previous month to fill the first row
    for (let i = 0; i < firstDayOfMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = daysInPrevMonth - firstDayOfMonth + i + 1;
        dayElement.className = 'calendar-day other-month';
        
        // Make previous month days clickable too
        const prevMonthDate = new Date(displayedYear, displayedMonth - 1, daysInPrevMonth - firstDayOfMonth + i + 1);
        dayElement.addEventListener('click', () => selectDate(prevMonthDate));
        
        calendarDays.appendChild(dayElement);
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = i;
        dayElement.className = 'calendar-day';
        
        // Highlight current day if we're viewing the current month
        if (isCurrentMonth && i === gameDate.getDate()) {
            dayElement.classList.add('current');
        }
        
        // Check for events on this day
        const dateString = `${displayedYear}-${String(displayedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (hasEventsOnDate(dateString)) {
            dayElement.classList.add('has-events');
        }
        
        // Make day clickable to select that date
        const dayDate = new Date(displayedYear, displayedMonth, i);
        dayElement.addEventListener('click', () => selectDate(dayDate));
        
        calendarDays.appendChild(dayElement);
    }
    
    // Calculate how many days from next month to show to fill the grid
    const totalCells = 42; // 6 rows of 7 days
    const cellsUsed = firstDayOfMonth + daysInMonth;
    const remainingCells = totalCells - cellsUsed;
    
    // Add days from next month to fill the grid
    for (let i = 1; i <= remainingCells; i++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = i;
        dayElement.className = 'calendar-day other-month';
        
        // Make next month days clickable
        const nextMonthDate = new Date(displayedYear, displayedMonth + 1, i);
        dayElement.addEventListener('click', () => selectDate(nextMonthDate));
        
        calendarDays.appendChild(dayElement);
    }
}

// Set specific date and time
function setSpecificDateTime() {
    const dateInput = document.getElementById('set-date').value;
    const timeInput = document.getElementById('set-time').value;
    
    if (!dateInput || !timeInput) {
        alert('Please provide both date and time');
        return;
    }
    
    const [hours, minutes] = timeInput.split(':').map(Number);
    const newDate = new Date(dateInput);
    newDate.setHours(hours, minutes);
    
    gameTimeState.currentDate = newDate;
    updateClockDisplay();
    updateCalendar();
    renderEvents();
    renderRecoveryPeriods();
    
    saveGameState();
}

// Reset to campaign start
function resetToStart() {
    if (confirm('Are you sure you want to reset the date and time to the campaign start? This will not affect events or recovery periods.')) {
        gameTimeState.currentDate = new Date(gameTimeState.settings.campaignStartDate);
        updateClockDisplay();
        updateCalendar();
        renderEvents();
        renderRecoveryPeriods();
        
        saveGameState();
    }
}

// Switch between event tabs
function switchEventTab(event) {
    const selectedTab = event.target;
    const tabName = selectedTab.dataset.tab;
    
    // Update tab highlights
    document.querySelectorAll('.event-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    selectedTab.classList.add('active');
    
    // Show selected tab content
    document.querySelectorAll('.events-list').forEach(list => {
        list.classList.remove('active-tab');
    });
    document.getElementById(`${tabName}-events`).classList.add('active-tab');
}

// Handle adding a new event
function handleAddEvent(event) {
    event.preventDefault();
    
    const title = document.getElementById('event-title').value;
    const startDate = document.getElementById('event-start-date').value;
    const startTime = document.getElementById('event-start-time').value;
    const endDate = document.getElementById('event-end-date').value;
    const endTime = document.getElementById('event-end-time').value;
    const location = document.getElementById('event-location').value;
    const category = document.getElementById('event-category').value;
    const recurrence = document.getElementById('event-recurrence').value;
    const description = document.getElementById('event-description').value;
    
    if (!title || !startDate || !startTime) {
        alert('Please provide at least a title, start date, and start time');
        return;
    }
    
    // Create Date objects
    const startDateTime = new Date(`${startDate}T${startTime}`);
    let endDateTime = null;
    
    if (endDate && endTime) {
        endDateTime = new Date(`${endDate}T${endTime}`);
        if (endDateTime <= startDateTime) {
            alert('End date/time must be after start date/time');
            return;
        }
    }
    
    // Create event object
    const newEvent = {
        title,
        startDate: startDateTime,
        endDate: endDateTime,
        location,
        category,
        recurrence,
        description,
        completed: false
    };
    
    addEvent(newEvent);
    
    // Reset form
    document.getElementById('add-event-form').reset();
    
    // Set default values for next event
    const dateString = gameTimeState.currentDate.toISOString().split('T')[0];
    const hours = String(gameTimeState.currentDate.getHours()).padStart(2, '0');
    const minutes = String(gameTimeState.currentDate.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    document.getElementById('event-start-date').value = dateString;
    document.getElementById('event-start-time').value = timeString;
    
    // Show success message
    alert('Event added successfully!');
}

// Update recovery duration based on selected recovery type
function updateRecoveryDuration() {
    const recoveryType = document.getElementById('recovery-type').value;
    const durationAmount = document.getElementById('recovery-duration-amount');
    const durationUnit = document.getElementById('recovery-duration-unit');
    
    if (recoveryType && RECOVERY_TYPES[recoveryType]) {
        const baseDuration = RECOVERY_TYPES[recoveryType].baseDuration;
        
        // Set default duration based on recovery type
        if (baseDuration.hours) {
            durationAmount.value = baseDuration.hours;
            durationUnit.value = 'hour';
        } else if (baseDuration.days) {
            durationAmount.value = baseDuration.days;
            durationUnit.value = 'day';
        } else if (baseDuration.weeks) {
            durationAmount.value = baseDuration.weeks;
            durationUnit.value = 'week';
        }
    }
}

// Handle adding a new recovery period
function handleAddRecovery(event) {
    event.preventDefault();
    
    const characterName = document.getElementById('recovery-character').value;
    const recoveryType = document.getElementById('recovery-type').value;
    const durationAmount = parseInt(document.getElementById('recovery-duration-amount').value);
    const durationUnit = document.getElementById('recovery-duration-unit').value;
    const notes = document.getElementById('recovery-notes').value;
    
    if (!characterName) {
        alert('Please select a character');
        return;
    }
    
    if (!recoveryType || !durationAmount || isNaN(durationAmount) || durationAmount < 1) {
        alert('Please provide a valid recovery type and duration');
        return;
    }
    
    // Create dates
    const startDate = new Date(gameTimeState.currentDate);
    const endDate = calculateRecoveryEndDate(startDate, durationAmount, durationUnit);
    
    // Create recovery object
    const newRecovery = {
        characterName,
        type: recoveryType,
        startDate,
        endDate,
        notes
    };
    
    addRecoveryPeriod(newRecovery);
    
    // Reset form
    document.getElementById('add-recovery-form').reset();
    
    // Show success message
    alert('Recovery period added successfully!');
}

// Update navigation links to include the time tracker
function updateNavigationLinks() {
    const navContent = document.querySelector('.nav-content');
    if (!navContent) return;
    
    // Check if time tracker link already exists
    let hasTimeTrackerLink = false;
    navContent.querySelectorAll('a').forEach(link => {
        if (link.href.includes('timetracker.html')) {
            hasTimeTrackerLink = true;
        }
    });
    
    // Add time tracker link if it doesn't exist
    if (!hasTimeTrackerLink) {
        const settingsLink = Array.from(navContent.querySelectorAll('a')).find(link => 
            link.href.includes('settings.html')
        );
        
        const timeTrackerLink = document.createElement('a');
        timeTrackerLink.href = 'timetracker.html';
        timeTrackerLink.textContent = 'Time Tracker';
        
        if (settingsLink) {
            navContent.insertBefore(timeTrackerLink, settingsLink);
        } else {
            navContent.appendChild(timeTrackerLink);
        }
    }
}

// Helper function to format date for display
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
}

// Helper function to format time for display
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
