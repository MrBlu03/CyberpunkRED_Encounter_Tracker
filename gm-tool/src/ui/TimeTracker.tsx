import React, { useState, useEffect } from 'react';

interface GameTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

interface TimeEvent {
  id: string;
  name: string;
  type: 'job' | 'recovery' | 'lifestyle' | 'custom';
  startTime: GameTime;
  duration: number; // in hours
  description?: string;
  completed: boolean;
}

interface WeatherCondition {
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'smog' | 'acid-rain';
  temperature: number; // Celsius
  visibility: 'clear' | 'limited' | 'poor';
}

export default function TimeTracker() {
  const [currentTime, setCurrentTime] = useState<GameTime>({
    year: 2045,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0
  });
  
  const [events, setEvents] = useState<TimeEvent[]>([]);
  const [weather, setWeather] = useState<WeatherCondition>({
    condition: 'clear',
    temperature: 20,
    visibility: 'clear'
  });
  
  const [newEvent, setNewEvent] = useState({
    name: '',
    type: 'custom' as TimeEvent['type'],
    duration: 1,
    description: ''
  });

  const [timeIncrement, setTimeIncrement] = useState(1); // hours
  const [autoWeather, setAutoWeather] = useState(true);

  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Advance time by specified amount
  const advanceTime = (hours: number) => {
    setCurrentTime(prev => {
      let newTime = { ...prev };
      newTime.minute += (hours % 1) * 60;
      newTime.hour += Math.floor(hours);
      
      // Handle minute overflow
      if (newTime.minute >= 60) {
        newTime.hour += Math.floor(newTime.minute / 60);
        newTime.minute = newTime.minute % 60;
      }
      
      // Handle hour overflow
      if (newTime.hour >= 24) {
        newTime.day += Math.floor(newTime.hour / 24);
        newTime.hour = newTime.hour % 24;
      }
      
      // Handle day overflow (simplified - assumes 30 days per month)
      if (newTime.day > 30) {
        newTime.month += Math.floor(newTime.day / 30);
        newTime.day = ((newTime.day - 1) % 30) + 1;
      }
      
      // Handle month overflow
      if (newTime.month > 12) {
        newTime.year += Math.floor((newTime.month - 1) / 12);
        newTime.month = ((newTime.month - 1) % 12) + 1;
      }
      
      return newTime;
    });
    
    // Update weather if enabled
    if (autoWeather && hours >= 6) {
      generateWeather();
    }
    
    // Process events
    processEvents(hours);
  };

  // Process ongoing events and recovery
  const processEvents = (hoursAdvanced: number) => {
    setEvents(prev => prev.map(event => {
      if (!event.completed) {
        const eventProgress = hoursAdvanced;
        if (eventProgress >= event.duration) {
          return { ...event, completed: true };
        }
      }
      return event;
    }));
  };

  // Generate random weather
  const generateWeather = () => {
    const conditions: WeatherCondition['condition'][] = [
      'clear', 'cloudy', 'rain', 'storm', 'smog', 'acid-rain'
    ];
    
    const weights = [0.3, 0.25, 0.2, 0.1, 0.1, 0.05]; // Night City is polluted
    let random = Math.random();
    let selectedCondition = conditions[0];
    
    for (let i = 0; i < conditions.length; i++) {
      if (random < weights[i]) {
        selectedCondition = conditions[i];
        break;
      }
      random -= weights[i];
    }
    
    setWeather({
      condition: selectedCondition,
      temperature: Math.floor(Math.random() * 30) + 5, // 5-35°C
      visibility: selectedCondition === 'storm' || selectedCondition === 'acid-rain' ? 'poor' :
                 selectedCondition === 'smog' || selectedCondition === 'rain' ? 'limited' : 'clear'
    });
  };

  // Add new event
  const addEvent = () => {
    if (!newEvent.name.trim()) return;
    
    const event: TimeEvent = {
      id: Date.now().toString(),
      name: newEvent.name,
      type: newEvent.type,
      startTime: { ...currentTime },
      duration: newEvent.duration,
      description: newEvent.description,
      completed: false
    };
    
    setEvents(prev => [...prev, event]);
    setNewEvent({ name: '', type: 'custom', duration: 1, description: '' });
  };

  // Remove event
  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  };

  // Quick recovery event
  const addRecoveryEvent = (type: 'natural' | 'medical') => {
    const duration = type === 'natural' ? 24 : 12; // 1 day natural, 12 hours with medical
    const hpRecovered = type === 'natural' ? 1 : 2;
    
    const event: TimeEvent = {
      id: Date.now().toString(),
      name: `Recovery (${hpRecovered} HP)`,
      type: 'recovery',
      startTime: { ...currentTime },
      duration,
      description: type === 'natural' ? 
        'Natural healing: 1 HP recovered per day' : 
        'Medical treatment: 2 HP recovered per day',
      completed: false
    };
    
    setEvents(prev => [...prev, event]);
  };

  // Format time display
  const formatTime = (time: GameTime) => {
    const period = time.hour >= 12 ? 'PM' : 'AM';
    const displayHour = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
    const minute = time.minute.toString().padStart(2, '0');
    
    return `${displayHour}:${minute} ${period}`;
  };

  // Get day/night status
  const getDayNightStatus = () => {
    if (currentTime.hour >= 6 && currentTime.hour < 18) return 'Day';
    if (currentTime.hour >= 18 && currentTime.hour < 22) return 'Evening';
    return 'Night';
  };

  return (
    <div className="time-tracker">
      <div className="time-display">
        <h2>Night City Time</h2>
        <div className="current-time">
          <div className="date">
            {months[currentTime.month - 1]} {currentTime.day}, {currentTime.year}
          </div>
          <div className="time">{formatTime(currentTime)}</div>
          <div className="period">{getDayNightStatus()}</div>
        </div>
        
        <div className="weather-display">
          <h3>Weather</h3>
          <div className="weather-info">
            <span className="condition">{weather.condition.replace('-', ' ').toUpperCase()}</span>
            <span className="temperature">{weather.temperature}°C</span>
            <span className="visibility">Visibility: {weather.visibility}</span>
          </div>
          <button onClick={generateWeather} className="weather-btn">
            Randomize Weather
          </button>
        </div>
      </div>

      <div className="time-controls">
        <h3>Time Controls</h3>
        <div className="increment-controls">
          <label>
            Advance by:
            <select value={timeIncrement} onChange={(e) => setTimeIncrement(Number(e.target.value))}>
              <option value={0.25}>15 minutes</option>
              <option value={0.5}>30 minutes</option>
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>1 day</option>
              <option value={168}>1 week</option>
            </select>
          </label>
          <button onClick={() => advanceTime(timeIncrement)} className="advance-btn">
            Advance Time
          </button>
        </div>
        
        <div className="auto-weather">
          <label>
            <input 
              type="checkbox" 
              checked={autoWeather}
              onChange={(e) => setAutoWeather(e.target.checked)}
            />
            Auto-generate weather
          </label>
        </div>
      </div>

      <div className="events-section">
        <h3>Events & Recovery</h3>
        
        <div className="add-event">
          <div className="event-form">
            <input 
              type="text" 
              placeholder="Event name" 
              value={newEvent.name}
              onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
            />
            <select 
              value={newEvent.type}
              onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as TimeEvent['type'] }))}
            >
              <option value="custom">Custom</option>
              <option value="job">Job</option>
              <option value="recovery">Recovery</option>
              <option value="lifestyle">Lifestyle</option>
            </select>
            <input 
              type="number" 
              placeholder="Duration (hours)" 
              value={newEvent.duration}
              onChange={(e) => setNewEvent(prev => ({ ...prev, duration: Number(e.target.value) }))}
            />
            <button onClick={addEvent} className="add-btn">Add Event</button>
          </div>
          
          <div className="quick-recovery">
            <button onClick={() => addRecoveryEvent('natural')} className="recovery-btn natural">
              Natural Recovery (1 HP/day)
            </button>
            <button onClick={() => addRecoveryEvent('medical')} className="recovery-btn medical">
              Medical Recovery (2 HP/day)
            </button>
          </div>
        </div>

        <div className="events-list">
          {events.length === 0 ? (
            <p className="no-events">No active events</p>
          ) : (
            events.map(event => (
              <div key={event.id} className={`event-item ${event.completed ? 'completed' : 'active'}`}>
                <div className="event-header">
                  <h4>{event.name}</h4>
                  <span className="event-type">{event.type}</span>
                  <button onClick={() => removeEvent(event.id)} className="remove-btn">×</button>
                </div>
                <div className="event-details">
                  <span>Duration: {event.duration} hours</span>
                  <span>Status: {event.completed ? 'Completed' : 'In Progress'}</span>
                  {event.description && <p>{event.description}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
