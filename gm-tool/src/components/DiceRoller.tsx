import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import { gsap } from 'gsap';
import { 
  Dices, X, Minimize2, Maximize2, History, Trash2, Sparkles, 
  LayoutPanelTop, Target, Flame, AlertTriangle, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { rollDie, rollDiceDetailed, getHitLocation } from '@/lib/dice';
import { rollD10Exploding, rollDamage, rollCriticalInjury } from '@/lib/combatEngine';
import { drawRandomTarotCard, type TarotCard } from '@/lib/tarot';
import type { CritMode, TarotDeckState } from '@/types';

interface RollResult {
  id: string;
  expression: string;
  total: number;
  rolls: number[];
  modifier: number;
  timestamp: number;
  isCritical?: boolean;
  critCount?: number;
  isTarotCrit?: boolean;
  tarotCard?: TarotCard;
  isExploding10?: boolean;
  isBotch1?: boolean;
  breakdown?: string;
  criticalInjuryName?: string;
}

interface DiceRollerProps {
  critMode?: CritMode;
  tarotDeck?: TarotDeckState;
}

export const DiceRoller = React.forwardRef<{ rollCustom: (expr: string) => void }, DiceRollerProps>(({ critMode = 'raw', tarotDeck }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [rollerMode, setRollerMode] = useState<'cyberpunk' | 'polyhedral' | 'history'>('cyberpunk');
  const [customRoll, setCustomRoll] = useState('');
  const [statSkillMod, setStatSkillMod] = useState<number>(10);
  const [contestPlayerRoll, setContestPlayerRoll] = useState<number | ''>('');
  const [history, setHistory] = useState<RollResult[]>([]);
  const [latestRoll, setLatestRoll] = useState<RollResult | null>(null);
  
  const diceRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cyberpunk-dice-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem('cyberpunk-dice-history', JSON.stringify(history.slice(0, 30)));
  }, [history]);

  const addToHistory = (result: RollResult) => {
    setLatestRoll(result);
    setHistory(prev => [result, ...prev].slice(0, 30));

    // GSAP pop animation
    if (diceRef.current) {
      gsap.fromTo(
        diceRef.current,
        { scale: 0.92, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)' }
      );
    }
  };

  // Roll Cyberpunk RED Stat/Skill Check: 1d10 exploding/botching + Modifier
  const rollCyberpunkCheck = (mod: number = statSkillMod, label: string = 'Stat/Skill Check') => {
    const d10Result = rollD10Exploding();
    const total = d10Result.total + mod;
    const isExploding10 = d10Result.baseRoll === 10;
    const isBotch1 = d10Result.baseRoll === 1;

    const breakdown = `d10(${d10Result.breakdown}) + Mod(${mod}) = ${total}`;

    const result: RollResult = {
      id: crypto.randomUUID(),
      expression: `${label} (1d10+${mod})`,
      total,
      rolls: isExploding10 && d10Result.explosion ? [10, d10Result.explosion] : isBotch1 && d10Result.botch ? [1, -d10Result.botch] : [d10Result.baseRoll],
      modifier: mod,
      timestamp: Date.now(),
      isExploding10,
      isBotch1,
      breakdown
    };

    addToHistory(result);

    if (isExploding10) {
      toast.success(`🎲 CRITICAL SUCCESS! Exploded on 10! Total: ${total}`, {
        icon: <Sparkles className="w-5 h-5 text-warning" />
      });
    } else if (isBotch1) {
      toast.error(`💥 CRITICAL FAILURE! Botched on 1! Total: ${total}`, {
        icon: <AlertTriangle className="w-5 h-5 text-rose-500" />
      });
    } else {
      toast.success(`${label}: ${total}`);
    }
  };

  // Roll Cyberpunk RED Opposed / Contest Check with Single Modifier
  const rollContestCheck = (statMod: number = statSkillMod, label: string = 'Opposed Check') => {
    const d10Result = rollD10Exploding();
    const total = d10Result.total + statMod;
    const isExploding10 = d10Result.baseRoll === 10;
    const isBotch1 = d10Result.baseRoll === 1;

    let contestOutcome = '';
    if (typeof contestPlayerRoll === 'number') {
      if (total > contestPlayerRoll) {
        contestOutcome = ` (NPC Wins by ${total - contestPlayerRoll}!)`;
      } else if (contestPlayerRoll > total) {
        contestOutcome = ` (Player Wins by ${contestPlayerRoll - total}!)`;
      } else {
        contestOutcome = ` (Tie at ${total} - Status Quo holds)`;
      }
    }

    const breakdown = `1d10(${d10Result.breakdown}) + Stat Mod(${statMod}) = ${total}${contestOutcome}`;

    const result: RollResult = {
      id: crypto.randomUUID(),
      expression: `${label} vs Player${contestOutcome}`,
      total,
      rolls: isExploding10 && d10Result.explosion ? [10, d10Result.explosion] : isBotch1 && d10Result.botch ? [1, -d10Result.botch] : [d10Result.baseRoll],
      modifier: statMod,
      timestamp: Date.now(),
      isExploding10,
      isBotch1,
      breakdown
    };

    addToHistory(result);
    toast.success(`🎲 ${label}: ${total}${contestOutcome}`);
  };

  // Roll Cyberpunk RED Damage Formula (Xd6) with Critical Injury auto-detection
  const rollDamagePool = (diceCount: number, bonus: number = 0, label?: string) => {
    const formula = `${diceCount}d6${bonus ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : ''}`;
    const rolled = rollDamage(formula);
    const sixCount = rolled.sixCount;
    const isCritical = rolled.isCritical;
    const isTarotCrit = critMode === 'tarot' && sixCount >= 3;

    let critInjuryName: string | undefined;
    let drawnCard: TarotCard | undefined;
    if (isTarotCrit) {
      drawnCard = drawRandomTarotCard();
    } else if (isCritical) {
      const crit = rollCriticalInjury('body');
      critInjuryName = crit.injury.name;
    }

    const result: RollResult = {
      id: crypto.randomUUID(),
      expression: label || `${diceCount}d6 Damage`,
      total: rolled.total,
      rolls: rolled.dice,
      modifier: bonus,
      timestamp: Date.now(),
      isCritical,
      critCount: sixCount,
      isTarotCrit,
      tarotCard: drawnCard,
      criticalInjuryName: critInjuryName,
      breakdown: `Dice: [${rolled.dice.join(', ')}] = ${rolled.total}${isCritical ? ' (+5 bonus HP damage!)' : ''}`
    };

    addToHistory(result);

    if (isTarotCrit && drawnCard) {
      if (tarotDeck?.drawnThisSession) {
        toast.success(`🎴 TAROT CRIT: Rolled ${sixCount} sixes! Card: ${drawnCard.name} (${drawnCard.roman})`, {
          icon: <Sparkles className="w-5 h-5 text-warning" />
        });
      } else {
        toast.success(`🎴 NIGHT CITY TAROT TRIGGERED! (${sixCount} sixes): Drawn ${drawnCard.name}!`, {
          icon: <LayoutPanelTop className="w-5 h-5 text-primary" />,
          duration: 8000
        });
      }
    } else if (isCritical) {
      toast.success(`🎲 CRITICAL INJURY! Rolled ${sixCount} sixes: ${critInjuryName}! (+5 Damage)`, {
        icon: <Sparkles className="w-5 h-5 text-warning" />
      });
    } else {
      toast.success(`Damage ${formula}: ${rolled.total}`);
    }
  };

  // Roll Random Hit Location (1d10)
  const rollHitLocationCheck = () => {
    const roll = rollDie(10);
    const location = getHitLocation(roll);
    const result: RollResult = {
      id: crypto.randomUUID(),
      expression: `Hit Location (d10)`,
      total: roll,
      rolls: [roll],
      modifier: 0,
      timestamp: Date.now(),
      breakdown: `Rolled ${roll} -> ${location}`
    };
    addToHistory(result);
    toast.success(`Hit Location: ${location} (d10 = ${roll})`, {
      icon: <Target className="w-5 h-5 text-primary" />
    });
  };

  // Roll standard single die
  const rollStandardDie = (sides: number, count: number = 1) => {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(rollDie(sides));
    }
    const total = rolls.reduce((a, b) => a + b, 0);

    const result: RollResult = {
      id: crypto.randomUUID(),
      expression: count === 1 ? `d${sides}` : `${count}d${sides}`,
      total,
      rolls,
      modifier: 0,
      timestamp: Date.now(),
      breakdown: `[${rolls.join(', ')}] = ${total}`
    };

    addToHistory(result);
    toast.success(`Rolled ${result.expression}: ${total}`);
  };

  // Custom Expression Roll
  const rollCustomExpr = (expr: string) => {
    if (!expr.trim()) return;

    // Check if it's an Xd6 damage roll
    const d6Match = expr.trim().match(/^(\d+)d6(?:\+(\d+))?$/i);
    if (d6Match) {
      const count = parseInt(d6Match[1]);
      const bonus = d6Match[2] ? parseInt(d6Match[2]) : 0;
      rollDamagePool(count, bonus, expr);
      return;
    }

    const result = rollDiceDetailed(expr);
    const sixCount = result.rolls.filter(r => r === 6).length;
    const isCritical = sixCount >= 2;
    const isTarotCrit = critMode === 'tarot' && sixCount >= 3;

    let drawnCard: TarotCard | undefined;
    if (isTarotCrit) {
      drawnCard = drawRandomTarotCard();
    }

    const rollResult: RollResult = {
      id: crypto.randomUUID(),
      expression: expr,
      total: result.total,
      rolls: result.rolls,
      modifier: result.modifier,
      timestamp: Date.now(),
      isCritical,
      critCount: sixCount,
      isTarotCrit,
      tarotCard: drawnCard,
      breakdown: `[${result.rolls.join(', ')}]${result.modifier ? ` + ${result.modifier}` : ''} = ${result.total}`
    };

    addToHistory(rollResult);
    toast.success(`Rolled ${expr}: ${result.total}`);
  };

  useImperativeHandle(ref, () => ({
    rollCustom: (expr: string) => {
      setCustomRoll(expr);
      setIsOpen(true);
      setIsMinimized(false);
      rollCustomExpr(expr);
    }
  }));

  const clearHistory = () => {
    setHistory([]);
    setLatestRoll(null);
    toast.info('Dice history cleared');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Closed floating trigger button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border-2 border-primary-foreground/20 cursor-pointer group"
        title="Open Cyberpunk Dice Roller"
      >
        <Dices className="w-7 h-7 transition-transform group-hover:rotate-45" />
      </button>
    );
  }

  // Minimized floating pill
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-5 right-5 px-4 py-2.5 rounded-full bg-card/90 border-2 border-primary/40 shadow-2xl backdrop-blur-md hover:border-primary transition-all z-50 flex items-center gap-2.5 cursor-pointer"
      >
        <Dices className="w-5 h-5 text-primary animate-pulse" />
        <span className="text-xs font-mono font-bold text-foreground">
          {latestRoll ? `${latestRoll.expression}: ${latestRoll.total}` : 'Dice Roller'}
        </span>
        <Maximize2 className="w-4 h-4 text-muted-foreground ml-1" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 w-96 rounded-2xl bg-card/95 border-2 border-primary/40 shadow-2xl z-50 backdrop-blur-xl animate-in overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 px-4 bg-gradient-to-r from-card via-card/80 to-primary/10 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Dices className="w-4 h-4" />
          </div>
          <span className="font-black text-sm uppercase tracking-wider text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Cyberpunk Dice Roller
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between px-3 pt-2 bg-secondary/20 border-b border-border/50 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRollerMode('cyberpunk')}
            className={`px-3 py-1.5 rounded-t-lg font-bold transition-colors cursor-pointer border-b-2 ${
              rollerMode === 'cyberpunk' ? 'border-primary text-primary bg-card/60' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Cyberpunk RED
          </button>
          <button
            onClick={() => setRollerMode('polyhedral')}
            className={`px-3 py-1.5 rounded-t-lg font-bold transition-colors cursor-pointer border-b-2 ${
              rollerMode === 'polyhedral' ? 'border-primary text-primary bg-card/60' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Standard Poly
          </button>
        </div>

        <button
          onClick={() => setRollerMode(rollerMode === 'history' ? 'cyberpunk' : 'history')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
            rollerMode === 'history' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Log ({history.length})
        </button>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* LATEST RESULT DISPLAY */}
        {latestRoll && rollerMode !== 'history' && (
          <div 
            ref={diceRef}
            className={`p-3.5 rounded-xl border-2 transition-all shadow-md ${
              latestRoll.isTarotCrit ? 'bg-primary/20 border-primary shadow-primary/30' :
              latestRoll.isCritical ? 'bg-amber-500/20 border-amber-500/50 shadow-amber-500/20' :
              latestRoll.isExploding10 ? 'bg-emerald-500/20 border-emerald-500/50' :
              latestRoll.isBotch1 ? 'bg-rose-500/20 border-rose-500/50' :
              'bg-secondary/30 border-border'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1 font-mono">
              <span className="font-bold text-foreground truncate max-w-[200px]">{latestRoll.expression}</span>
              <span className="text-[10px] text-muted-foreground">{formatTime(latestRoll.timestamp)}</span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black font-mono leading-none ${
                  latestRoll.isTarotCrit ? 'text-primary' :
                  latestRoll.isCritical ? 'text-amber-400' :
                  latestRoll.isExploding10 ? 'text-emerald-400' :
                  latestRoll.isBotch1 ? 'text-rose-400' :
                  'text-foreground'
                }`}>
                  {latestRoll.total}
                </span>
                {typeof latestRoll.critCount === 'number' && latestRoll.critCount > 0 && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    latestRoll.critCount >= 3 
                      ? 'bg-primary/20 text-primary border-primary/50' 
                      : latestRoll.critCount >= 2 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                        : 'bg-secondary text-muted-foreground border-border'
                  }`}>
                    {latestRoll.critCount}x [6]s
                  </span>
                )}
              </div>

              {/* Individual dice chips */}
              <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                {latestRoll.rolls.map((r, i) => (
                  <span 
                    key={i} 
                    className={`w-6 h-6 flex items-center justify-center rounded-md font-mono text-xs font-bold border ${
                      r === 6 ? 'bg-amber-500/30 border-amber-500 text-amber-300 shadow-sm' :
                      r === 10 ? 'bg-emerald-500/30 border-emerald-500 text-emerald-300 shadow-sm' :
                      r < 0 ? 'bg-rose-500/30 border-rose-500 text-rose-300' :
                      'bg-background/80 border-border text-foreground'
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Night City Tarot Card Banner (3+ Sixes) */}
            {latestRoll.isTarotCrit && latestRoll.tarotCard && (
              <div className="mt-2.5 pt-2 border-t border-primary/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-primary">
                    <LayoutPanelTop className="w-3.5 h-3.5 text-primary" />
                    🎴 NIGHT CITY TAROT CRIT ({latestRoll.critCount}x 6s)
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-bold">
                    {latestRoll.tarotCard.roman}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-xs">
                  <span className="font-bold text-primary block">{latestRoll.tarotCard.name}</span>
                  <p className="text-[11px] text-foreground/90 font-sans mt-0.5 leading-snug">
                    {latestRoll.tarotCard.effect}
                  </p>
                </div>
              </div>
            )}

            {/* Standard Critical Injury Badge (2 Sixes, or when not tarot crit) */}
            {latestRoll.isCritical && !latestRoll.isTarotCrit && (
              <div className="mt-2 pt-2 border-t border-amber-500/30 text-xs font-bold text-amber-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  CRITICAL INJURY (+5 HP Damage)
                </span>
                {latestRoll.criticalInjuryName && (
                  <span className="text-[11px] font-mono text-foreground underline">
                    {latestRoll.criticalInjuryName}
                  </span>
                )}
              </div>
            )}

            {latestRoll.isExploding10 && (
              <div className="mt-1 text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Natural 10! Critical Success (Exploded!)
              </div>
            )}

            {latestRoll.isBotch1 && (
              <div className="mt-1 text-xs font-bold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Natural 1! Critical Failure (Botched!)
              </div>
            )}
          </div>
        )}

        {/* MODE A: CYBERPUNK RED DEDICATED ROLLER */}
        {rollerMode === 'cyberpunk' && (
          <div className="space-y-4">
            {/* Stat + Skill 1d10 Exploding Check */}
            <div className="p-3.5 rounded-xl bg-secondary/20 border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  Stat/Skill Check (1d10 Exploding)
                </span>
                <span className="text-[10px] text-primary font-mono font-bold">10 Explodes / 1 Botches</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-background border border-input rounded-lg px-2.5 py-1.5 flex-1">
                  <span className="text-xs font-mono text-muted-foreground font-bold">+Mod:</span>
                  <Input
                    type="number"
                    value={statSkillMod}
                    onChange={e => setStatSkillMod(parseInt(e.target.value) || 0)}
                    className="border-none h-6 p-0 text-sm font-mono font-black text-center focus-visible:ring-0"
                  />
                </div>

                <Button
                  onClick={() => rollCyberpunkCheck(statSkillMod, 'Skill Check')}
                  className="cyber-btn bg-primary text-primary-foreground font-bold text-xs flex-1 shadow-sm"
                >
                  <Dices className="w-4 h-4 mr-1.5" />
                  Roll 1d10 + {statSkillMod}
                </Button>
              </div>

              {/* Quick Modifier Pills */}
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  { label: '+10', val: 10 },
                  { label: '+12', val: 12 },
                  { label: '+14', val: 14 },
                  { label: '+16', val: 16 },
                  { label: '-8 (Aimed Head)', val: statSkillMod - 8 }
                ].map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStatSkillMod(pill.val)}
                    className="px-2 py-0.5 rounded bg-secondary hover:bg-primary/20 hover:text-primary text-[10px] font-mono border border-border transition-colors cursor-pointer"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Single Modifier Opposed / Contest Check Section */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Opposed Contest vs Player (1d10 + Stat#)
                </span>
                <span className="text-[10px] text-amber-300 font-mono font-bold">Single Stat# Contests</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-background border border-input rounded-lg px-2 py-1.5 flex-1" title="NPC Single Stat Modifier (e.g. 11, 14)">
                  <span className="text-[10px] font-mono text-muted-foreground font-bold whitespace-nowrap">NPC Stat#:</span>
                  <Input
                    type="number"
                    value={statSkillMod}
                    onChange={e => setStatSkillMod(parseInt(e.target.value) || 0)}
                    className="border-none h-6 p-0 text-sm font-mono font-black text-center focus-visible:ring-0"
                  />
                </div>

                <div className="flex items-center gap-1 bg-background border border-input rounded-lg px-2 py-1.5 flex-1" title="Player's roll total to compare against">
                  <span className="text-[10px] font-mono text-muted-foreground font-bold whitespace-nowrap">PC Roll:</span>
                  <Input
                    type="number"
                    placeholder="e.g. 15"
                    value={contestPlayerRoll}
                    onChange={e => setContestPlayerRoll(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="border-none h-6 p-0 text-sm font-mono font-black text-center focus-visible:ring-0"
                  />
                </div>

                <Button
                  onClick={() => rollContestCheck(statSkillMod, 'Opposed Check')}
                  className="cyber-btn bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-sm h-9 px-3"
                >
                  <Dices className="w-3.5 h-3.5 mr-1 text-black" />
                  Oppose
                </Button>
              </div>
            </div>

            {/* Weapon Damage Presets (Xd6) */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                Weapon Damage Pools (Xd6)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => rollDamagePool(2, 0, 'Medium Pistol / SMG')}
                  className="cyber-btn text-xs font-mono h-10 flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold text-primary">2d6</span>
                  <span className="text-[9px] text-muted-foreground">Med Pistol/SMG</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => rollDamagePool(3, 0, 'Heavy Pistol / Shotgun')}
                  className="cyber-btn text-xs font-mono h-10 flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold text-primary">3d6</span>
                  <span className="text-[9px] text-muted-foreground">Heavy Pistol/Shotgun</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => rollDamagePool(4, 0, 'Very Heavy Pistol')}
                  className="cyber-btn text-xs font-mono h-10 flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold text-primary">4d6</span>
                  <span className="text-[9px] text-muted-foreground">V. Heavy Pistol</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => rollDamagePool(5, 0, 'Assault / Sniper Rifle')}
                  className="cyber-btn text-xs font-mono h-10 flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold text-primary">5d6</span>
                  <span className="text-[9px] text-muted-foreground">Assault/Sniper</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => rollDamagePool(6, 0, 'Heavy Explosive')}
                  className="cyber-btn text-xs font-mono h-10 flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold text-primary">6d6</span>
                  <span className="text-[9px] text-muted-foreground">Explosive/Grenade</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => rollDamagePool(8, 0, 'Rocket Launcher')}
                  className="cyber-btn text-xs font-mono h-10 flex flex-col items-center justify-center p-1"
                >
                  <span className="font-bold text-primary">8d6</span>
                  <span className="text-[9px] text-muted-foreground">Rocket Launcher</span>
                </Button>
              </div>
            </div>

            {/* Hit Location 1d10 button */}
            <div className="pt-1">
              <Button
                variant="outline"
                onClick={rollHitLocationCheck}
                className="cyber-btn text-xs w-full border-border/80 hover:border-primary flex items-center justify-center gap-1.5 font-mono"
              >
                <Target className="w-4 h-4 text-primary" />
                Roll Hit Location (1d10)
              </Button>
            </div>
          </div>
        )}

        {/* MODE B: STANDARD POLYHEDRAL DICE */}
        {rollerMode === 'polyhedral' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[4, 6, 8, 10].map(sides => (
                <button
                  key={sides}
                  onClick={() => rollStandardDie(sides)}
                  className="p-3 bg-secondary/50 rounded-xl hover:bg-primary/20 hover:text-primary transition-all font-mono font-bold text-sm border border-border cursor-pointer active:scale-95 shadow-sm"
                >
                  d{sides}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[12, 20, 100].map(sides => (
                <button
                  key={sides}
                  onClick={() => rollStandardDie(sides)}
                  className="p-3 bg-secondary/50 rounded-xl hover:bg-primary/20 hover:text-primary transition-all font-mono font-bold text-sm border border-border cursor-pointer active:scale-95 shadow-sm"
                >
                  d{sides}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MODE C: FULL HISTORY LOG */}
        {rollerMode === 'history' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border/50">
              <span className="text-xs font-bold text-muted-foreground uppercase">Roll History ({history.length})</span>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {history.map(roll => (
                <div 
                  key={roll.id} 
                  className={`p-2.5 rounded-xl border text-xs font-mono transition-all ${
                    roll.isCritical ? 'bg-amber-500/10 border-amber-500/30' :
                    roll.isExploding10 ? 'bg-emerald-500/10 border-emerald-500/30' :
                    'bg-secondary/20 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground">{roll.expression}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(roll.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-primary">{roll.total}</span>
                    <span className="text-[11px] text-muted-foreground">{roll.breakdown}</span>
                  </div>
                  {roll.isCritical && (
                    <div className="text-[10px] text-amber-400 font-bold mt-1">
                      💥 CRITICAL INJURY (+5 HP Damage) {roll.criticalInjuryName && `• ${roll.criticalInjuryName}`}
                    </div>
                  )}
                </div>
              ))}

              {history.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No rolls in history.</p>
              )}
            </div>
          </div>
        )}

        {/* Custom Expression Bar (Always available) */}
        <div className="pt-2 border-t border-border">
          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
            Custom Formula Bar
          </label>
          <div className="flex gap-2">
            <Input
              value={customRoll}
              onChange={e => setCustomRoll(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && rollCustomExpr(customRoll)}
              placeholder="e.g. 3d6+4, 1d10+12, 5d6"
              className="cyber-input font-mono text-xs h-9 flex-1"
            />
            <Button 
              size="sm"
              onClick={() => rollCustomExpr(customRoll)}
              className="cyber-btn bg-primary text-primary-foreground font-bold text-xs h-9 px-3"
            >
              Roll
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
