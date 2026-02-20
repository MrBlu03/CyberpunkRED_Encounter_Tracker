import { useState } from 'react';
import { Crosshair, Shield, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Participant, DamageType } from '@/types';

interface DamageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: Participant | null;
  onApply: (damage: number, options: {
    location: 'head' | 'body';
    damageType: DamageType;
    isCritical: boolean;
  }) => void;
}

export function DamageDialog({ open, onOpenChange, participant, onApply }: DamageDialogProps) {
  const [damage, setDamage] = useState(10);
  const [location, setLocation] = useState<'head' | 'body'>('body');
  const [damageType, setDamageType] = useState<DamageType>('normal');
  const [isCritical, setIsCritical] = useState(false);
  
  if (!participant) return null;
  
  const handleApply = () => {
    onApply(damage, { location, damageType, isCritical });
    // Reset
    setDamage(10);
    setLocation('body');
    setDamageType('normal');
    setIsCritical(false);
  };
  
  const damageTypes: { value: DamageType; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'armor-piercing', label: 'Armor-Piercing' },
    { value: 'half-armor', label: 'Half Armor' },
    { value: 'ignore-armor', label: 'Ignore Armor' }
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Crosshair className="w-5 h-5 text-primary" />
            Apply Damage to {participant.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Damage Amount */}
          <div>
            <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
              Damage Amount
            </label>
            <Input
              type="number"
              value={damage}
              onChange={e => setDamage(parseInt(e.target.value) || 0)}
              className="cyber-input text-lg"
              min={0}
              autoFocus
            />
          </div>
          
          {/* Location */}
          <div>
            <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
              Hit Location
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLocation('body')}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  location === 'body'
                    ? 'border-primary bg-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Shield className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm">Body</div>
                <div className="text-xs text-muted-foreground">
                  SP: {participant.armor?.body || 0}
                  {participant.armor?.shield && participant.armor.shieldEquipped && ` +${participant.armor.shield}`}
                </div>
              </button>
              <button
                onClick={() => setLocation('head')}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  location === 'head'
                    ? 'border-primary bg-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Skull className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm">Head (x2)</div>
                <div className="text-xs text-muted-foreground">
                  SP: {participant.armor?.head || 0}
                </div>
              </button>
            </div>
          </div>
          
          {/* Damage Type */}
          <div>
            <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
              Damage Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {damageTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setDamageType(type.value)}
                  className={`p-2 rounded-lg border text-sm transition-all ${
                    damageType === type.value
                      ? 'border-primary bg-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Critical */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="crit-damage"
              checked={isCritical}
              onChange={e => setIsCritical(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
            <label htmlFor="crit-damage" className="cursor-pointer">
              <span className="font-medium">Critical Hit (+5 damage)</span>
            </label>
          </div>
          
          {/* Cover Info */}
          {participant.cover && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span>Cover: {participant.cover.type} ({participant.cover.hp} HP)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cover will absorb damage first
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleApply} className="cyber-btn flex-1">
              <Crosshair className="w-4 h-4 mr-2" />
              Apply Damage
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
