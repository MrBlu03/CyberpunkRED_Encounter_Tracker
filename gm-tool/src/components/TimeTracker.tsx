import { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Pause, RotateCcw, SkipForward, Sun, Moon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface TimeState {
  hour: number;
  minute: number;
  day: number;
  month: number;
  year: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TimeTracker() {
  const [time, setTime] = useLocalStorage<TimeState>('cyberpunk-time', {
    hour: 12,
    minute: 0,
    day: 1,
    month: 1,
    year: 2045
  });
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  // Time advancement
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setTime(prev => {
        let newMinute = prev.minute + speed;
        let newHour = prev.hour;
        let newDay = prev.day;
        let newMonth = prev.month;
        let newYear = prev.year;
        
        if (newMinute >= 60) {
          newMinute = 0;
          newHour++;
        }
        
        if (newHour >= 24) {
          newHour = 0;
          newDay++;
        }
        
        const daysInMonth = new Date(newYear, newMonth, 0).getDate();
        if (newDay > daysInMonth) {
          newDay = 1;
          newMonth++;
        }
        
        if (newMonth > 12) {
          newMonth = 1;
          newYear++;
        }
        
        return {
          hour: newHour,
          minute: newMinute,
          day: newDay,
          month: newMonth,
          year: newYear
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning, speed, setTime]);
  
  const formatTime = useCallback(() => {
    const minute = time.minute.toString().padStart(2, '0');
    const ampm = time.hour >= 12 ? 'PM' : 'AM';
    const displayHour = time.hour % 12 || 12;
    return `${displayHour}:${minute} ${ampm}`;
  }, [time]);
  
  const getTimeOfDay = useCallback(() => {
    if (time.hour >= 5 && time.hour < 12) return 'morning';
    if (time.hour >= 12 && time.hour < 17) return 'afternoon';
    if (time.hour >= 17 && time.hour < 21) return 'evening';
    return 'night';
  }, [time.hour]);
  
  const getDayOfWeek = useCallback(() => {
    // Simple calculation based on day of month (not accurate but sufficient for game)
    return DAYS_OF_WEEK[time.day % 7];
  }, [time.day]);
  
  const advanceTime = (minutes: number) => {
    setTime(prev => {
      let newMinute = prev.minute + minutes;
      let newHour = prev.hour;
      let newDay = prev.day;
      let newMonth = prev.month;
      let newYear = prev.year;
      
      while (newMinute >= 60) {
        newMinute -= 60;
        newHour++;
      }
      
      while (newHour >= 24) {
        newHour -= 24;
        newDay++;
      }
      
      const daysInMonth = new Date(newYear, newMonth, 0).getDate();
      while (newDay > daysInMonth) {
        newDay -= daysInMonth;
        newMonth++;
      }
      
      while (newMonth > 12) {
        newMonth -= 12;
        newYear++;
      }
      
      return {
        hour: newHour,
        minute: newMinute,
        day: newDay,
        month: newMonth,
        year: newYear
      };
    });
    
    toast.success(`Advanced ${minutes} minutes`);
  };
  
  const resetTime = () => {
    setTime({
      hour: 12,
      minute: 0,
      day: 1,
      month: 1,
      year: 2045
    });
    setIsRunning(false);
    toast.info('Time reset to default');
  };
  
  const isDaytime = time.hour >= 6 && time.hour < 18;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Time Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Track in-game time and date
          </p>
        </div>
      </div>
      
      {/* Main Clock Display */}
      <div className="glass-card rounded-xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDaytime ? 'bg-warning/20' : 'bg-primary/20'}`}>
            {isDaytime ? (
              <Sun className="w-10 h-10 text-warning" />
            ) : (
              <Moon className="w-10 h-10 text-primary" />
            )}
          </div>
        </div>
        
        <div className="text-6xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {formatTime()}
        </div>
        
        <div className="text-xl text-muted-foreground capitalize mb-4">
          {getTimeOfDay()}
        </div>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{getDayOfWeek()}, {MONTHS[time.month - 1]} {time.day}, {time.year}</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Play className="w-4 h-4 text-primary" />
          Controls
        </h3>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setIsRunning(!isRunning)} 
            className={isRunning ? 'cyber-btn-secondary' : 'cyber-btn'}
          >
            {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          
          <Button onClick={resetTime} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
        
        {/* Speed Control */}
        <div className="mt-4">
          <label className="text-sm text-muted-foreground mb-2 block">Time Speed</label>
          <div className="flex gap-2">
            {[1, 5, 10, 30].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  speed === s
                    ? 'border-primary bg-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {speed === 1 ? '1 minute per second' : `${speed} minutes per second`}
          </p>
        </div>
      </div>
      
      {/* Quick Advance */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <SkipForward className="w-4 h-4 text-primary" />
          Quick Advance
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button onClick={() => advanceTime(5)} variant="outline" size="sm">
            +5 min
          </Button>
          <Button onClick={() => advanceTime(15)} variant="outline" size="sm">
            +15 min
          </Button>
          <Button onClick={() => advanceTime(30)} variant="outline" size="sm">
            +30 min
          </Button>
          <Button onClick={() => advanceTime(60)} variant="outline" size="sm">
            +1 hour
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Button onClick={() => advanceTime(4 * 60)} variant="outline" size="sm">
            +4 hours
          </Button>
          <Button onClick={() => advanceTime(8 * 60)} variant="outline" size="sm">
            +8 hours
          </Button>
          <Button onClick={() => advanceTime(24 * 60)} variant="outline" size="sm">
            +1 day
          </Button>
        </div>
      </div>
      
      {/* Time Reference */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Time Reference</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2 text-primary">Time of Day</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>05:00 - 12:00: Morning</li>
              <li>12:00 - 17:00: Afternoon</li>
              <li>17:00 - 21:00: Evening</li>
              <li>21:00 - 05:00: Night</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-primary">Combat Rounds</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>1 Round = 3 seconds</li>
              <li>1 Turn = 10 rounds (30 sec)</li>
              <li>1 Minute = 20 rounds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
