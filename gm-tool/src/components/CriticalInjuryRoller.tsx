import { useState } from 'react';
import { Skull, RefreshCw, AlertTriangle, Sparkles, Heart, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { rollDie, CRITICAL_INJURIES_BODY, CRITICAL_INJURIES_HEAD } from '@/lib/combatEngine';

export function CriticalInjuryRoller() {
  const [targetLocation, setTargetLocation] = useState<'head' | 'body'>('body');
  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [currentInjury, setCurrentInjury] = useState<{
    name: string;
    description: string;
    effect: string;
    quickFix: string;
    treatment: string;
  } | null>(null);

  const rollCritical = () => {
    setIsRolling(true);
    setCurrentInjury(null);

    let rolls = 0;
    const interval = setInterval(() => {
      setDie1(rollDie(6));
      setDie2(rollDie(6));
      rolls++;

      if (rolls >= 10) {
        clearInterval(interval);
        const final1 = rollDie(6);
        const final2 = rollDie(6);
        const total = final1 + final2;

        setDie1(final1);
        setDie2(final2);

        const table = targetLocation === 'head' ? CRITICAL_INJURIES_HEAD : CRITICAL_INJURIES_BODY;
        const injury = table[total] || table[7];

        setCurrentInjury(injury);
        setIsRolling(false);
        toast.success(`Rolled ${injury.name} on ${targetLocation.toUpperCase()}! (+5 Bonus Damage)`, {
          icon: <Sparkles className="w-5 h-5 text-warning" />
        });
      }
    }, 80);
  };

  const totalRoll = (die1 || 0) + (die2 || 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-card/90 via-card/50 to-rose-500/10 border border-rose-500/20 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-inner">
            <Skull className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-wide text-foreground uppercase" style={{ fontFamily: 'var(--font-display)' }}>
              Critical Injury Roller
            </h2>
            <p className="text-xs text-muted-foreground">
              Official Cyberpunk RED Core Rulebook RAW (2d6 Head & Body Trauma Tables with Quick Fix DVs).
            </p>
          </div>
        </div>

        {/* Location selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/40 border border-border">
          <button
            onClick={() => setTargetLocation('body')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              targetLocation === 'body' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Body Criticals
          </button>
          <button
            onClick={() => setTargetLocation('head')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              targetLocation === 'head' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Head Criticals
          </button>
        </div>
      </div>

      {/* Main Roll Area */}
      <div className="p-8 rounded-2xl bg-card border border-border shadow-xl text-center space-y-6">
        <div className="flex justify-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-secondary/60 border-2 border-border flex items-center justify-center text-3xl font-black font-mono text-primary shadow-inner">
            {die1 ?? '?'}
          </div>
          <div className="flex items-center text-xl font-black text-muted-foreground">+</div>
          <div className="w-20 h-20 rounded-2xl bg-secondary/60 border-2 border-border flex items-center justify-center text-3xl font-black font-mono text-primary shadow-inner">
            {die2 ?? '?'}
          </div>
          <div className="flex items-center text-xl font-black text-muted-foreground">=</div>
          <div className="w-20 h-20 rounded-2xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-3xl font-black font-mono text-rose-400 shadow-lg shadow-rose-500/10">
            {die1 && die2 ? totalRoll : '?'}
          </div>
        </div>

        <Button
          onClick={rollCritical}
          disabled={isRolling}
          className="cyber-btn bg-rose-600 hover:bg-rose-500 text-white font-black text-base px-8 py-6 shadow-lg shadow-rose-600/30"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isRolling ? 'animate-spin' : ''}`} />
          {isRolling ? 'Rolling 2d6...' : `Roll ${targetLocation.toUpperCase()} Critical Injury`}
        </Button>
      </div>

      {/* Result Card */}
      {currentInjury && (
        <div className="p-6 rounded-2xl bg-card border-2 border-rose-500/40 shadow-2xl backdrop-blur-md animate-in space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
                2d6 ROLL: {totalRoll} ({targetLocation.toUpperCase()})
              </span>
              <h3 className="text-2xl font-black text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-warning" />
                {currentInjury.name}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              +5 Bonus Damage to HP
            </span>
          </div>

          <p className="text-sm text-foreground/90 font-medium">
            {currentInjury.description}
          </p>

          <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase block">Trauma Effect:</span>
              <p className="text-sm font-bold text-rose-300">{currentInjury.effect}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-secondary/20 border border-border">
              <span className="text-[11px] font-bold text-muted-foreground uppercase block flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Quick Fix
              </span>
              <p className="text-xs text-foreground font-mono mt-1">{currentInjury.quickFix}</p>
            </div>

            <div className="p-3 rounded-xl bg-secondary/20 border border-border">
              <span className="text-[11px] font-bold text-muted-foreground uppercase block flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-emerald-400" /> Treatment / Surgery
              </span>
              <p className="text-xs text-foreground font-mono mt-1">{currentInjury.treatment}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
