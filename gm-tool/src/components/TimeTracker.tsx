import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Clock, Play, Pause, RotateCcw, SkipForward, Sun, Moon, 
  Calendar, Heart, ShieldAlert, DollarSign, Home,
  Bell, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// Housing costs per Cyberpunk RED Core Rulebook (p. 377)
const HOUSING_TIERS = [
  { id: 'cube', name: 'Cube Hotel', cost: 500, desc: 'A coffin-sized bunk with communal sanitation.' },
  { id: 'cargo', name: 'Cargo Container', cost: 1000, desc: 'A 20-foot metal box retrofitted with minimal power.' },
  { id: 'studio', name: 'Studio Apartment', cost: 1500, desc: 'A small 1-room flat with private shower and lock.' },
  { id: 'twobed', name: 'Two-Bedroom Apartment', cost: 2500, desc: 'Decent apartment with defensive reinforced door.' },
  { id: 'penthouse', name: 'Corporate Penthouse', cost: 15000, desc: 'High-security luxury high-rise with rooftop AV pad.' }
];

// Lifestyle costs per Cyberpunk RED Core Rulebook (p. 378)
const LIFESTYLE_TIERS = [
  { id: 'kibble', name: 'Kibble Lifestyle', cost: 100, desc: 'Dry nutritional pellets. Taste like chalk.' },
  { id: 'prepak', name: 'Generic Prepak', cost: 600, desc: 'Canned noodles and microwaved protein trays.' },
  { id: 'goodprepak', name: 'Good Prepak', cost: 1200, desc: 'Quality synthetic meat, fruit paste, and clean water.' },
  { id: 'fresh', name: 'Fresh Food Lifestyle', cost: 1500, desc: 'Real vegetables, farm-grown beef, real coffee.' }
];

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

  // --- Natural Healing Calculator State ---
  const [healingCharName, setHealingCharName] = useState('V');
  const [healingBodyStat, setHealingBodyStat] = useState<number>(6);
  const [healingWillStat, setHealingWillStat] = useState<number>(6);
  const [healingCurrentHP, setHealingCurrentHP] = useState<number>(12);
  const [healingMaxHP, setHealingMaxHP] = useState<number>(35);
  const [hasMedtechCare, setHasMedtechCare] = useState<boolean>(false);
  const [hasCryotank, setHasCryotank] = useState<boolean>(false);
  const [usedSpeedheal, setUsedSpeedheal] = useState<boolean>(false);

  // --- Trauma Team Countdown Timer State ---
  const [ttTier, setTtTier] = useState<'silver' | 'high' | 'standard'>('standard');
  const [ttTimerSeconds, setTtTimerSeconds] = useState<number>(600); // 10 min default
  const [ttTimerRunning, setTtTimerRunning] = useState<boolean>(false);
  const ttIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Rent & Lifestyle Tracker State ---
  const [selectedHousing, setSelectedHousing] = useState<string>('cargo');
  const [selectedLifestyle, setSelectedLifestyle] = useState<string>('prepak');
  const [numCrewMembers, setNumCrewMembers] = useState<number>(4);

  // Synthesize audio tone using Web Audio API
  const playSirenTone = (freq1 = 880, freq2 = 660, duration = 0.6) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq1, ctx.currentTime);
      osc.frequency.setValueAtTime(freq2, ctx.currentTime + duration / 2);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Main game clock interval
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

  // Trauma Team Countdown Timer Interval
  useEffect(() => {
    if (!ttTimerRunning) {
      if (ttIntervalRef.current) clearInterval(ttIntervalRef.current);
      return;
    }

    ttIntervalRef.current = setInterval(() => {
      setTtTimerSeconds(prev => {
        if (prev <= 1) {
          setTtTimerRunning(false);
          playSirenTone(990, 770, 1.2);
          toast.error('🚨 TRAUMA TEAM AV-4 ON SCENE! Heavy suppressive fire initiated!', { duration: 10000 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (ttIntervalRef.current) clearInterval(ttIntervalRef.current);
    };
  }, [ttTimerRunning]);

  const setTraumaTeamTier = (tier: 'silver' | 'high' | 'standard') => {
    setTtTier(tier);
    setTtTimerRunning(false);
    const secs = tier === 'silver' ? 180 : (tier === 'high' ? 420 : 600);
    setTtTimerSeconds(secs);
  };

  const toggleTraumaTimer = () => {
    if (!ttTimerRunning && ttTimerSeconds > 0) {
      playSirenTone(660, 880, 0.4);
      toast.warning('📡 Trauma Team emergency transponder activated! AV-4 en route.');
    }
    setTtTimerRunning(!ttTimerRunning);
  };

  const resetTraumaTimer = () => {
    setTtTimerRunning(false);
    const secs = ttTier === 'silver' ? 180 : (ttTier === 'high' ? 420 : 600);
    setTtTimerSeconds(secs);
  };

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

  // Natural Healing Rate Calculation per RAW
  const missingHP = Math.max(0, healingMaxHP - healingCurrentHP);
  let hpRecoveredPerDay = Math.max(1, healingBodyStat);
  if (hasCryotank) {
    hpRecoveredPerDay *= 2; // Cryotank doubles natural healing rate
  }
  if (hasMedtechCare) {
    hpRecoveredPerDay += 2; // Medtech assistance bonus
  }
  const speedhealBonus = usedSpeedheal ? (healingBodyStat + healingWillStat) : 0;
  const hpToHealAfterSpeedheal = Math.max(0, missingHP - speedhealBonus);
  const daysToFullHealth = hpToHealAfterSpeedheal > 0 ? Math.ceil(hpToHealAfterSpeedheal / hpRecoveredPerDay) : 0;

  // Advance time by days to heal
  const handleRestToFullHealth = () => {
    if (missingHP === 0) {
      toast.info('Character is already at full health!');
      return;
    }
    const days = Math.max(1, daysToFullHealth);
    advanceTime(days * 24 * 60);
    setHealingCurrentHP(healingMaxHP);
    toast.success(`Rested for ${days} day(s). ${healingCharName} restored to full HP (${healingMaxHP}/${healingMaxHP})!`);
  };

  // Rent Calculation
  const daysInCurrentMonth = new Date(time.year, time.month, 0).getDate();
  const daysUntilRent = daysInCurrentMonth - time.day + 1;
  const housingObj = HOUSING_TIERS.find(h => h.id === selectedHousing) || HOUSING_TIERS[1];
  const lifestyleObj = LIFESTYLE_TIERS.find(l => l.id === selectedLifestyle) || LIFESTYLE_TIERS[1];
  const monthlyTotal = housingObj.cost + (lifestyleObj.cost * numCrewMembers);

  const handlePayRentAndAdvance = () => {
    const minutesToNextFirst = (daysUntilRent * 24 * 60) - (time.hour * 60 + time.minute);
    advanceTime(Math.max(60, minutesToNextFirst));
    toast.success(`Paid €$${monthlyTotal.toLocaleString()} for ${housingObj.name} and ${numCrewMembers}x ${lifestyleObj.name}. Advanced to 1st of next month!`);
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
    toast.info('Time reset to default (Jan 1, 2045 12:00 PM)');
  };
  
  const isDaytime = time.hour >= 6 && time.hour < 18;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold neon-text-orange" style={{ fontFamily: 'var(--font-display)' }}>
            Campaign Time & Survival Tracker
          </h2>
          <p className="text-xs text-muted-foreground">
            Official Cyberpunk RED Calendar, Natural Healing Rates, Trauma Team AV-4 Timer, and Monthly Rent Billing
          </p>
        </div>
      </div>
      
      {/* Top Grid: Clock Display & Speed Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Clock Display */}
        <div className="glass-card rounded-xl p-6 text-center flex flex-col justify-center items-center border border-primary/30">
          <div className="mb-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDaytime ? 'bg-warning/20' : 'bg-primary/20'}`}>
              {isDaytime ? (
                <Sun className="w-8 h-8 text-warning" />
              ) : (
                <Moon className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
          
          <div className="text-5xl font-mono font-bold mb-1 tracking-wider text-primary">
            {formatTime()}
          </div>
          
          <div className="text-sm font-semibold text-muted-foreground capitalize mb-2">
            {getTimeOfDay()} In Night City
          </div>
          
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            <span>{getDayOfWeek()}, {MONTHS[time.month - 1]} {time.day}, {time.year}</span>
          </div>
        </div>

        {/* Master Clock Controls */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              <Play className="w-4 h-4 text-primary" />
              Clock Playback & Speed
            </h3>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsRunning(!isRunning)} 
                className={isRunning ? 'cyber-btn-secondary w-1/2 text-xs' : 'cyber-btn w-1/2 text-xs'}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                {isRunning ? 'Pause Clock' : 'Start Clock'}
              </Button>
              
              <Button onClick={resetTime} variant="outline" size="sm" className="w-1/2 text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset 2045
              </Button>
            </div>

            {/* Speed Control */}
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-1 block">Playback Speed</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 5, 10, 30].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`py-1 rounded text-xs font-mono font-bold border transition-all ${
                      speed === s
                        ? 'border-primary bg-primary text-black'
                        : 'border-border bg-secondary/40 hover:border-primary/50'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground pt-2 border-t border-border">
            1 Round = 3 seconds | 1 Minute = 20 rounds | 1 Hour = 1,200 rounds
          </div>
        </div>

        {/* Quick Advance Controls */}
        <div className="glass-card rounded-xl p-6 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <SkipForward className="w-4 h-4 text-primary" />
            Quick Time Skips
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => advanceTime(5)} variant="outline" size="sm" className="text-xs">
              +5 min
            </Button>
            <Button onClick={() => advanceTime(15)} variant="outline" size="sm" className="text-xs">
              +15 min
            </Button>
            <Button onClick={() => advanceTime(30)} variant="outline" size="sm" className="text-xs">
              +30 min
            </Button>
            <Button onClick={() => advanceTime(60)} variant="outline" size="sm" className="text-xs">
              +1 hour
            </Button>
            <Button onClick={() => advanceTime(4 * 60)} variant="outline" size="sm" className="text-xs">
              +4 hours
            </Button>
            <Button onClick={() => advanceTime(8 * 60)} variant="outline" size="sm" className="text-xs">
              +8 hours
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button onClick={() => advanceTime(24 * 60)} variant="outline" size="sm" className="text-xs font-bold border-primary/40">
              +1 Day (24h)
            </Button>
            <Button onClick={() => advanceTime(7 * 24 * 60)} variant="outline" size="sm" className="text-xs font-bold border-primary/40">
              +1 Week (7d)
            </Button>
          </div>
        </div>
      </div>

      {/* Second Row: Natural Healing Calculator & Trauma Team AV-4 Countdown Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Natural Healing Calculator (RAW Core p. 222) */}
        <div className="glass-card rounded-xl p-6 border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>
                Natural Healing Rate Calculator
              </h3>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              RAW Rules (p. 222)
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Resting characters recover HP equal to their <strong>BODY stat</strong> per full day (24 hours) of rest. Cryotank treatment doubles recovery. Medtech care provides +2 HP/day bonus.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Character</label>
              <Input
                value={healingCharName}
                onChange={e => setHealingCharName(e.target.value)}
                className="cyber-input text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">BODY Stat</label>
              <Input
                type="number"
                value={healingBodyStat}
                onChange={e => setHealingBodyStat(Math.max(1, parseInt(e.target.value) || 1))}
                className="cyber-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">WILL Stat</label>
              <Input
                type="number"
                value={healingWillStat}
                onChange={e => setHealingWillStat(Math.max(1, parseInt(e.target.value) || 1))}
                className="cyber-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Current HP</label>
              <Input
                type="number"
                value={healingCurrentHP}
                onChange={e => setHealingCurrentHP(Math.max(0, parseInt(e.target.value) || 0))}
                className="cyber-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Max HP</label>
              <Input
                type="number"
                value={healingMaxHP}
                onChange={e => setHealingMaxHP(Math.max(1, parseInt(e.target.value) || 1))}
                className="cyber-input text-xs font-mono"
              />
            </div>
          </div>

          {/* Medical Buff Toggles */}
          <div className="flex flex-wrap gap-4 pt-1 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasMedtechCare}
                onChange={e => setHasMedtechCare(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span>Medtech Care (+2 HP/Day)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasCryotank}
                onChange={e => setHasCryotank(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span>Cryotank (2x Healing Rate)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={usedSpeedheal}
                onChange={e => setUsedSpeedheal(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span>Speedheal Dose (+{healingBodyStat + healingWillStat} HP Once)</span>
            </label>
          </div>

          {/* Healing Rate Output Summary */}
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Recovery Rate:</div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                +{hpRecoveredPerDay} HP / Full Day
              </div>
              <div className="text-[11px] text-muted-foreground">
                Needs {missingHP} HP to full ({daysToFullHealth} day{daysToFullHealth !== 1 ? 's' : ''} of rest)
              </div>
            </div>

            <Button
              onClick={handleRestToFullHealth}
              disabled={missingHP === 0}
              className="cyber-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Rest Until Full Health (+{daysToFullHealth}d)
            </Button>
          </div>
        </div>

        {/* Trauma Team AV-4 Countdown Timer */}
        <div className="glass-card rounded-xl p-6 border border-destructive/40 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              <h3 className="font-bold text-base text-destructive" style={{ fontFamily: 'var(--font-display)' }}>
                Trauma Team Dispatch & AV-4 ETA
              </h3>
            </div>
            {ttTimerRunning && (
              <span className="animate-pulse flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-destructive text-white font-bold uppercase">
                <Bell className="w-3 h-3" /> En Route
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Trauma Team emergency transponder triggers rapid medical extraction. Standard: 10m (200 rds), High Priority: 7m (140 rds), Executive Silver: 3m (60 rds).
          </p>

          {/* Membership Tier Selectors */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'silver' as const, label: 'Executive Silver', time: '3 min (60 rds)' },
              { id: 'high' as const, label: 'High Priority', time: '7 min (140 rds)' },
              { id: 'standard' as const, label: 'Standard Tier', time: '10 min (200 rds)' }
            ].map(tier => (
              <button
                key={tier.id}
                onClick={() => setTraumaTeamTier(tier.id)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  ttTier === tier.id 
                    ? 'border-destructive bg-destructive/20 text-destructive font-bold' 
                    : 'border-border bg-secondary/30 text-muted-foreground hover:border-destructive/50'
                }`}
              >
                <div className="text-xs font-bold">{tier.label}</div>
                <div className="text-[10px] font-mono mt-0.5">{tier.time}</div>
              </button>
            ))}
          </div>

          {/* Timer Clock Display */}
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                AV-4 Touchdown ETA:
              </div>
              <div className="text-4xl font-mono font-bold text-destructive tracking-widest mt-1">
                {Math.floor(ttTimerSeconds / 60).toString().padStart(2, '0')}:{(ttTimerSeconds % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                {Math.ceil(ttTimerSeconds / 3)} combat rounds remaining
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={toggleTraumaTimer}
                className={ttTimerRunning ? 'cyber-btn-secondary text-xs h-9' : 'cyber-btn bg-destructive hover:bg-destructive/80 text-white font-bold text-xs h-9'}
              >
                {ttTimerRunning ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                {ttTimerRunning ? 'Pause ETA' : 'Deploy AV-4'}
              </Button>
              <Button onClick={resetTraumaTimer} variant="outline" size="sm" className="text-xs h-8">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset ETA
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Third Row: Rent & Monthly Lifestyle Expenses (Core p. 377-378) */}
      <div className="glass-card rounded-xl p-6 border border-primary/30 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base text-primary" style={{ fontFamily: 'var(--font-display)' }}>
              Monthly Rent & Lifestyle Overhead Tracker
            </h3>
          </div>
          <div className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
            Due in {daysUntilRent} Day{daysUntilRent !== 1 ? 's' : ''} (1st of Next Month)
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Rent and Lifestyle costs are automatically due on the <strong>1st day of every month</strong>. Failure to pay rent forces eviction into a Cargo Container or the street.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Housing Tier */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Crew Housing</label>
            <select
              value={selectedHousing}
              onChange={e => setSelectedHousing(e.target.value)}
              className="cyber-input text-xs"
            >
              {HOUSING_TIERS.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} (€${h.cost.toLocaleString()}/mo)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">{housingObj.desc}</p>
          </div>

          {/* Lifestyle Tier */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Food & Quality of Life</label>
            <select
              value={selectedLifestyle}
              onChange={e => setSelectedLifestyle(e.target.value)}
              className="cyber-input text-xs"
            >
              {LIFESTYLE_TIERS.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} (€${l.cost.toLocaleString()}/mo per person)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">{lifestyleObj.desc}</p>
          </div>

          {/* Crew Size & Total */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Number in Party</label>
            <Input
              type="number"
              value={numCrewMembers}
              onChange={e => setNumCrewMembers(Math.max(1, parseInt(e.target.value) || 1))}
              className="cyber-input text-xs font-mono"
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Monthly Total:</span>
              <span className="font-mono font-bold text-primary text-base">
                €${monthlyTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            onClick={handlePayRentAndAdvance}
            className="cyber-btn text-xs font-bold"
          >
            <DollarSign className="w-3.5 h-3.5 mr-1.5" />
            Pay €${monthlyTotal.toLocaleString()} & Advance to 1st of Next Month
          </Button>
        </div>
      </div>
    </div>
  );
}
