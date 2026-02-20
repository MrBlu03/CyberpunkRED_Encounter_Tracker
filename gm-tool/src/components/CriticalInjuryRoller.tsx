import { useState } from 'react';
import { Skull, Dices, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { d6 } from '@/lib/dice';

interface CriticalInjury {
  location: string;
  severity: string;
  name: string;
  description: string;
  effect: string;
}

const CRITICAL_INJURIES: Record<string, Record<string, CriticalInjury>> = {
  '1': { // Head
    '1': { location: 'Head', severity: 'Mortal', name: 'Brain Injury', description: 'The target\'s brain is severely damaged.', effect: 'Target is unconscious and will die in 1d6 minutes without medical attention.' },
    '2': { location: 'Head', severity: 'Severe', name: 'Skull Fracture', description: 'The target\'s skull is cracked.', effect: 'Target is unconscious for 1d6 hours. -2 to all actions for 1 week.' },
    '3': { location: 'Head', severity: 'Severe', name: 'Eye Damage', description: 'The target loses an eye.', effect: 'Permanent loss of one eye. -4 to all sight-based actions.' },
    '4': { location: 'Head', severity: 'Moderate', name: 'Concussion', description: 'The target is severely concussed.', effect: 'Target is stunned for 1d6 rounds. -2 to all actions for 24 hours.' },
    '5': { location: 'Head', severity: 'Moderate', name: 'Broken Jaw', description: 'The target\'s jaw is broken.', effect: 'Cannot speak clearly. Eating requires liquids only. Heals in 4 weeks.' },
    '6': { location: 'Head', severity: 'Light', name: 'Ear Damage', description: 'The target\'s ear is damaged.', effect: 'Partial hearing loss in one ear. -2 to audio-based perception.' }
  },
  '2': { // Body
    '1': { location: 'Body', severity: 'Mortal', name: 'Spinal Injury', description: 'The target\'s spine is severed.', effect: 'Target is paralyzed from the waist down. Permanent without cybernetic replacement.' },
    '2': { location: 'Body', severity: 'Severe', name: 'Collapsed Lung', description: 'The target\'s lung collapses.', effect: 'Target cannot move faster than a walk. -4 to all physical actions.' },
    '3': { location: 'Body', severity: 'Severe', name: 'Ruptured Organ', description: 'A major organ is ruptured.', effect: 'Target will die in 1d6 hours without surgery.' },
    '4': { location: 'Body', severity: 'Moderate', name: 'Broken Ribs', description: 'Multiple ribs are broken.', effect: '-2 to all physical actions. Breathing is painful.' },
    '5': { location: 'Body', severity: 'Moderate', name: 'Internal Bleeding', description: 'The target is bleeding internally.', effect: 'Loses 1 HP per minute until treated.' },
    '6': { location: 'Body', severity: 'Light', name: 'Bruised Torso', description: 'Severe bruising across the torso.', effect: '-1 to all physical actions for 24 hours.' }
  },
  '3': { // Arm
    '1': { location: 'Arm', severity: 'Severe', name: 'Severed Arm', description: 'The arm is completely severed.', effect: 'Permanent loss of arm. Requires cybernetic replacement.' },
    '2': { location: 'Arm', severity: 'Severe', name: 'Shattered Elbow', description: 'The elbow joint is shattered.', effect: 'Arm unusable until repaired. Surgery required.' },
    '3': { location: 'Arm', severity: 'Moderate', name: 'Broken Arm', description: 'The arm bone is broken.', effect: 'Arm unusable for 6 weeks. -4 to actions using that arm.' },
    '4': { location: 'Arm', severity: 'Moderate', name: 'Dislocated Shoulder', description: 'The shoulder is dislocated.', effect: 'Arm unusable until reset. -2 to actions after reset for 2 weeks.' },
    '5': { location: 'Arm', severity: 'Light', name: 'Fractured Wrist', description: 'The wrist is fractured.', effect: '-2 to fine motor actions with that hand for 4 weeks.' },
    '6': { location: 'Arm', severity: 'Light', name: 'Sprained Arm', description: 'The arm is severely sprained.', effect: '-1 to actions using that arm for 1 week.' }
  },
  '4': { // Leg
    '1': { location: 'Leg', severity: 'Severe', name: 'Severed Leg', description: 'The leg is completely severed.', effect: 'Permanent loss of leg. Requires cybernetic replacement.' },
    '2': { location: 'Leg', severity: 'Severe', name: 'Shattered Knee', description: 'The knee is shattered.', effect: 'Cannot walk unassisted. Surgery required.' },
    '3': { location: 'Leg', severity: 'Moderate', name: 'Broken Leg', description: 'The leg bone is broken.', effect: 'Movement reduced by half for 8 weeks.' },
    '4': { location: 'Leg', severity: 'Moderate', name: 'Dislocated Hip', description: 'The hip is dislocated.', effect: 'Cannot walk until reset. -2 to movement for 3 weeks after.' },
    '5': { location: 'Leg', severity: 'Light', name: 'Fractured Ankle', description: 'The ankle is fractured.', effect: 'Movement reduced by half for 4 weeks.' },
    '6': { location: 'Leg', severity: 'Light', name: 'Sprained Leg', description: 'The leg is severely sprained.', effect: '-1 to movement for 1 week.' }
  }
};

const LOCATION_NAMES: Record<string, string> = {
  '1': 'Head',
  '2': 'Body',
  '3': 'Arm',
  '4': 'Leg'
};

export function CriticalInjuryRoller() {
  const [result, setResult] = useState<CriticalInjury | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [locationRoll, setLocationRoll] = useState<number | null>(null);
  const [severityRoll, setSeverityRoll] = useState<number | null>(null);
  
  const rollCritical = () => {
    setIsRolling(true);
    setResult(null);
    
    // Animate the roll
    let rolls = 0;
    const interval = setInterval(() => {
      setLocationRoll(d6());
      setSeverityRoll(d6());
      rolls++;
      
      if (rolls >= 10) {
        clearInterval(interval);
        const finalLocation = d6();
        const finalSeverity = d6();
        
        // Map 5-6 to 3-4 for location (arms and legs combined)
        const mappedLocation = finalLocation > 4 ? '4' : finalLocation > 2 ? '3' : finalLocation.toString();
        
        setLocationRoll(finalLocation);
        setSeverityRoll(finalSeverity);
        
        const injury = CRITICAL_INJURIES[mappedLocation]?.[finalSeverity.toString()];
        if (injury) {
          setResult(injury);
          toast.success(`Rolled ${injury.severity} critical injury!`);
        }
        setIsRolling(false);
      }
    }, 100);
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mortal': return 'text-destructive border-destructive';
      case 'Severe': return 'text-warning border-warning';
      case 'Moderate': return 'text-primary border-primary';
      case 'Light': return 'text-success border-success';
      default: return 'text-muted-foreground border-border';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
          <Skull className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Critical Injury Roller
          </h2>
          <p className="text-sm text-muted-foreground">
            Roll for critical injuries per Cyberpunk RED RAW
          </p>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button 
          onClick={rollCritical} 
          disabled={isRolling}
          className="cyber-btn text-lg px-8 py-6"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isRolling ? 'animate-spin' : ''}`} />
          {isRolling ? 'Rolling...' : 'Roll Critical Injury'}
        </Button>
      </div>
      
      {/* Dice Display */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Location</div>
          <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-4xl font-bold font-mono">
            {locationRoll || '?'}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {locationRoll ? LOCATION_NAMES[locationRoll > 4 ? '4' : locationRoll > 2 ? '3' : locationRoll.toString()] || 'Arm/Leg' : '-'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Severity</div>
          <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center text-4xl font-bold font-mono">
            {severityRoll || '?'}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {severityRoll ? ['', 'Mortal', 'Severe', 'Severe', 'Moderate', 'Moderate', 'Light'][severityRoll] : '-'}
          </div>
        </div>
      </div>
      
      {/* Result */}
      {result && (
        <div className={`glass-card rounded-xl p-6 border-2 animate-in ${getSeverityColor(result.severity)}`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {result.name}
              </h3>
              <p className="text-sm opacity-80">
                {result.severity} • {result.location}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Description</h4>
              <p className="text-muted-foreground">{result.description}</p>
            </div>
            
            <div className="p-4 bg-background/50 rounded-lg">
              <h4 className="font-bold text-sm uppercase tracking-wider mb-1">Game Effect</h4>
              <p>{result.effect}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Reference Table */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Dices className="w-5 h-5 text-primary" />
          Critical Injury Reference
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2 text-primary">Location (1d6)</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>1: Head</li>
              <li>2: Body</li>
              <li>3-4: Arm</li>
              <li>5-6: Leg</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-primary">Severity (1d6)</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>1: Mortal</li>
              <li>2-3: Severe</li>
              <li>4-5: Moderate</li>
              <li>6: Light</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
