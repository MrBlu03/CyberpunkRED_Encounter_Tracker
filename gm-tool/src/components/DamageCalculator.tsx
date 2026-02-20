import { useState } from 'react';
import { Crosshair, Shield, Skull, Calculator, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { calculateDamage } from '@/lib/damage';
import type { DamageType, CoverType } from '@/types';

export function DamageCalculator() {
  const [baseDamage, setBaseDamage] = useState(15);
  const [armorSP, setArmorSP] = useState(11);
  const [damageType, setDamageType] = useState<DamageType>('normal');
  const [location, setLocation] = useState<'head' | 'body'>('body');
  const [isCritical, setIsCritical] = useState(false);
  const [coverType, setCoverType] = useState<CoverType | undefined>();
  const [coverHP, setCoverHP] = useState(15);
  const [shieldSP, setShieldSP] = useState(0);
  const [shieldEquipped, setShieldEquipped] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calculateDamage> | null>(null);
  
  const damageTypes: { value: DamageType; label: string; description: string }[] = [
    { value: 'normal', label: 'Normal', description: 'Standard damage, armor ablates by 1 SP' },
    { value: 'armor-piercing', label: 'Armor-Piercing', description: 'Half armor SP, ablates by 2 SP' },
    { value: 'half-armor', label: 'Half Armor', description: 'Melee only, half armor SP' },
    { value: 'ignore-armor', label: 'Ignore Armor', description: 'Ignores all armor SP' }
  ];
  
  const coverTypes: { value: CoverType; label: string; sp: number; hp: number }[] = [
    { value: 'light', label: 'Light Cover', sp: 10, hp: 10 },
    { value: 'medium', label: 'Medium Cover', sp: 15, hp: 15 },
    { value: 'heavy', label: 'Heavy Cover', sp: 20, hp: 20 },
    { value: 'human-shield', label: 'Human Shield', sp: 0, hp: 40 }
  ];
  
  const handleCalculate = () => {
    const calc = calculateDamage(
      baseDamage,
      armorSP,
      damageType,
      location,
      isCritical,
      coverType,
      coverHP,
      shieldSP,
      shieldEquipped
    );
    setResult(calc);
    toast.success(`Calculated: ${calc.finalDamage} damage`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Crosshair className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Damage Calculator
          </h2>
          <p className="text-sm text-muted-foreground">
            Calculate damage per Cyberpunk RED RAW
          </p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="glass-card rounded-xl p-6 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Calculator className="w-5 h-5 text-primary" />
            Input
          </h3>
          
          {/* Base Damage */}
          <div>
            <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
              Base Damage
            </label>
            <Input
              type="number"
              value={baseDamage}
              onChange={e => setBaseDamage(parseInt(e.target.value) || 0)}
              className="cyber-input text-lg"
              min={0}
            />
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
                  className={`p-3 rounded-lg border text-left transition-all ${
                    damageType === type.value
                      ? 'border-primary bg-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                </button>
              ))}
            </div>
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
              </button>
            </div>
          </div>
          
          {/* Critical Hit */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="critical"
              checked={isCritical}
              onChange={e => setIsCritical(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
            <label htmlFor="critical" className="cursor-pointer">
              <span className="font-medium">Critical Hit (+5 damage)</span>
            </label>
          </div>
          
          {/* Armor SP */}
          <div>
            <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
              Armor SP ({location === 'head' ? 'Head' : 'Body'})
            </label>
            <Input
              type="number"
              value={armorSP}
              onChange={e => setArmorSP(parseInt(e.target.value) || 0)}
              className="cyber-input"
              min={0}
            />
          </div>
          
          {/* Shield */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
                Shield SP
              </label>
              <Input
                type="number"
                value={shieldSP}
                onChange={e => setShieldSP(parseInt(e.target.value) || 0)}
                className="cyber-input"
                min={0}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shieldEquipped}
                  onChange={e => setShieldEquipped(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">Equipped</span>
              </label>
            </div>
          </div>
          
          {/* Cover */}
          <div>
            <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
              Cover (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCoverType(undefined)}
                className={`p-2 rounded-lg border text-sm transition-all ${
                  !coverType
                    ? 'border-primary bg-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                No Cover
              </button>
              {coverTypes.map(cover => (
                <button
                  key={cover.value}
                  onClick={() => {
                    setCoverType(cover.value);
                    setCoverHP(cover.hp);
                  }}
                  className={`p-2 rounded-lg border text-sm transition-all ${
                    coverType === cover.value
                      ? 'border-primary bg-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {cover.label}
                  <span className="text-xs text-muted-foreground block">SP:{cover.sp} HP:{cover.hp}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Calculate Button */}
          <Button onClick={handleCalculate} className="cyber-btn w-full">
            <Calculator className="w-4 h-4 mr-2" />
            Calculate Damage
          </Button>
        </div>
        
        {/* Result Panel */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            <Info className="w-5 h-5 text-primary" />
            Result
          </h3>
          
          {result ? (
            <div className="space-y-4">
              {/* Final Damage */}
              <div className="text-center p-6 bg-primary/10 rounded-xl border border-primary/30">
                <div className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                  Final Damage
                </div>
                <div className="text-6xl font-bold text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                  {result.finalDamage}
                </div>
              </div>
              
              {/* Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Base Damage</span>
                  <span className="font-mono">{result.baseDamage}</span>
                </div>
                
                {result.coverSP > 0 && (
                  <>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Cover SP</span>
                      <span className="font-mono text-warning">-{result.coverSP}</span>
                    </div>
                    {result.coverDamage > 0 && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Cover HP Damage</span>
                        <span className="font-mono text-warning">-{result.coverDamage}</span>
                      </div>
                    )}
                  </>
                )}
                
                {result.armorSP > 0 && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Armor SP ({damageType === 'armor-piercing' || damageType === 'half-armor' ? 'halved' : 'full'})</span>
                    <span className="font-mono text-warning">-{result.armorSP}</span>
                  </div>
                )}
                
                {result.penetration && result.armorAblation > 0 && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Armor Ablation</span>
                    <span className="font-mono text-destructive">-{result.armorAblation} SP</span>
                  </div>
                )}
                
                {result.location === 'head' && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Headshot Multiplier</span>
                    <span className="font-mono text-destructive">x2</span>
                  </div>
                )}
                
                {result.isCritical && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Critical Bonus</span>
                    <span className="font-mono text-destructive">+5</span>
                  </div>
                )}
                
                <div className="flex justify-between py-3 bg-primary/10 rounded-lg px-4 mt-4">
                  <span className="font-bold">Final Damage to HP</span>
                  <span className="font-mono font-bold text-primary text-xl">{result.finalDamage}</span>
                </div>
              </div>
              
              {/* Rules Reference */}
              <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-sm">
                <p className="font-medium mb-2">Damage Resolution Order (RAW):</p>
                <ol className="space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Cover SP reduces damage</li>
                  <li>Remaining damage hits Cover HP</li>
                  <li>Overflow hits Armor SP</li>
                  <li>If penetrated, armor ablates</li>
                  <li>Remaining damage to HP</li>
                  <li>Headshot doubles final damage</li>
                  <li>Critical adds +5 damage</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Enter damage values and click Calculate</p>
              <p className="text-sm mt-2">Results will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
