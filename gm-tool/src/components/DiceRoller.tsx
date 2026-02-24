import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Dices, X, Minimize2, Maximize2, History, Trash2, Sparkles, LayoutPanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { rollDie, rollDiceDetailed } from '@/lib/dice';
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
}

interface DiceRollerProps {
  critMode?: CritMode;
  tarotDeck?: TarotDeckState;
}

export function DiceRoller({ critMode = 'raw', tarotDeck }: DiceRollerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [customRoll, setCustomRoll] = useState('');
  const [history, setHistory] = useState<RollResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
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
    localStorage.setItem('cyberpunk-dice-history', JSON.stringify(history.slice(0, 20)));
  }, [history]);
  
  const addToHistory = (result: RollResult) => {
    setHistory(prev => [result, ...prev].slice(0, 20));
  };
  
  const rollD = (sides: number, count: number = 1) => {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(rollDie(sides));
    }
    const total = rolls.reduce((a, b) => a + b, 0);
    
    // Check for critical hits (6s on d6)
    const critCount = sides === 6 ? rolls.filter(r => r === 6).length : 0;
    const isCritical = critCount >= 2;
    const isTarotCrit = critMode === 'tarot' && critCount >= 3;
    
    const result: RollResult = {
      id: crypto.randomUUID(),
      expression: count === 1 ? `d${sides}` : `${count}d${sides}`,
      total,
      rolls,
      modifier: 0,
      timestamp: Date.now(),
      isCritical,
      critCount,
      isTarotCrit
    };
    
    addToHistory(result);
    
    // Animate
    if (diceRef.current) {
      gsap.from(diceRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.2,
        ease: 'back.out(1.7)'
      });
    }
    
    if (isTarotCrit) {
      if (tarotDeck?.drawnThisSession) {
        toast.success(`🎲 CRITICAL! Rolled ${critCount} sixes! (Tarot limit reached for session - use RAW crit)`, {
          icon: <Sparkles className="w-5 h-5 text-warning" />
        });
      } else {
        toast.success(`🎴 NIGHT CITY TAROT! Rolled ${critCount} sixes! Draw a card!`, {
          icon: <LayoutPanelTop className="w-5 h-5 text-primary" />,
          duration: 10000
        });
      }
    } else if (isCritical) {
      toast.success(`🎲 CRITICAL! Rolled ${critCount} sixes! (+5 damage)`, {
        icon: <Sparkles className="w-5 h-5 text-warning" />
      });
    } else {
      toast.success(`Rolled ${result.expression}: ${total}`);
    }
  };
  
  const rollCustom = () => {
    if (!customRoll.trim()) return;
    
    const result = rollDiceDetailed(customRoll);
    
    // Check for critical hits (6s on d6)
    const critCount = result.rolls.filter(r => r === 6).length;
    const isCritical = critCount >= 2;
    const isTarotCrit = critMode === 'tarot' && critCount >= 3;
    
    const rollResult: RollResult = {
      id: crypto.randomUUID(),
      expression: customRoll,
      total: result.total,
      rolls: result.rolls,
      modifier: result.modifier,
      timestamp: Date.now(),
      isCritical,
      critCount,
      isTarotCrit
    };
    
    addToHistory(rollResult);
    // Removed setCustomRoll('') to keep input persistent
    
    if (isTarotCrit) {
      if (tarotDeck?.drawnThisSession) {
        toast.success(`🎲 CRITICAL! Rolled ${critCount} sixes! (Tarot limit reached for session)`, {
          icon: <Sparkles className="w-5 h-5 text-warning" />
        });
      } else {
        toast.success(`🎴 NIGHT CITY TAROT! Rolled ${critCount} sixes! Draw a card!`, {
          icon: <LayoutPanelTop className="w-5 h-5 text-primary" />,
          duration: 10000
        });
      }
    } else if (isCritical) {
      toast.success(`🎲 CRITICAL! Rolled ${critCount} sixes! (+5 damage)`, {
        icon: <Sparkles className="w-5 h-5 text-warning" />
      });
    } else {
      toast.success(`Rolled ${customRoll}: ${result.total}`);
    }
  };
  
  const clearHistory = () => {
    setHistory([]);
    toast.info('History cleared');
  };
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all z-50 flex items-center justify-center"
      >
        <Dices className="w-6 h-6" />
      </button>
    );
  }
  
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 px-4 py-2 rounded-full bg-card border border-border shadow-lg hover:shadow-xl transition-all z-50 flex items-center gap-2"
      >
        <Dices className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Dice Roller</span>
        <Maximize2 className="w-4 h-4" />
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-80 glass-card rounded-xl shadow-2xl z-50 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Dices className="w-5 h-5 text-primary" />
          <span className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Dice Roller</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded hover:bg-secondary transition-colors ${showHistory ? 'text-primary' : ''}`}
            title="History"
          >
            <History className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded hover:bg-secondary transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {showHistory ? (
          /* History View */
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Recent Rolls</span>
              <button 
                onClick={clearHistory}
                className="p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No rolls yet</p>
            ) : (
              history.map(roll => (
                <div key={roll.id} className={`p-2 rounded-lg text-sm ${roll.isCritical ? 'bg-warning/20 border border-warning/50' : 'bg-secondary/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-primary flex items-center gap-1">
                      {roll.expression}
                      {roll.isCritical && <Sparkles className="w-3 h-3 text-warning" />}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTime(roll.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`font-bold text-lg ${roll.isCritical ? 'text-warning' : ''}`}>{roll.total}</span>
                    {roll.rolls.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({roll.rolls.map((r, i) => (
                          <span key={i} className={r === 6 ? 'text-warning font-bold bg-warning/20 px-1 rounded' : ''}>
                            {r}
                          </span>
                        )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[])}
                        {roll.modifier !== 0 && `${roll.modifier > 0 ? '+' : ''}${roll.modifier}`})
                      </span>
                    )}
                  </div>
                  {roll.isCritical && (
                    <div className="text-xs text-warning mt-1 font-medium">
                      🎲 {roll.critCount} Critical Hit{roll.critCount && roll.critCount > 1 ? 's' : ''}!
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Dice View */
          <div className="space-y-4">
            {/* Quick Dice */}
            <div ref={diceRef}>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button onClick={() => rollD(4)} className="p-2 bg-secondary rounded-lg hover:bg-primary/20 hover:text-primary transition-colors font-mono font-bold">
                  d4
                </button>
                <button onClick={() => rollD(6)} className="p-2 bg-secondary rounded-lg hover:bg-primary/20 hover:text-primary transition-colors font-mono font-bold">
                  d6
                </button>
                <button onClick={() => rollD(8)} className="p-2 bg-secondary rounded-lg hover:bg-primary/20 hover:text-primary transition-colors font-mono font-bold">
                  d8
                </button>
                <button onClick={() => rollD(10)} className="p-2 bg-secondary rounded-lg hover:bg-primary/20 hover:text-primary transition-colors font-mono font-bold">
                  d10
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => rollD(12)} className="p-2 bg-secondary rounded-lg hover:bg-primary/20 hover:text-primary transition-colors font-mono font-bold">
                  d12
                </button>
                <button onClick={() => rollD(20)} className="p-2 bg-secondary rounded-lg hover:bg-primary/20 hover:text-primary transition-colors font-mono font-bold">
                  d20
                </button>
                <button onClick={() => rollD(100)} className="p-2 bg-secondary rounded-lg hover:bg-primary/20 hover:text-primary transition-colors font-mono font-bold">
                  d100
                </button>
              </div>
            </div>
            
            {/* Custom Roll */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customRoll}
                onChange={e => setCustomRoll(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && rollCustom()}
                placeholder="e.g., 2d6+3"
                className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={rollCustom} size="sm" className="cyber-btn">
                Roll
              </Button>
            </div>
            
            {/* Recent Rolls (Last 5) */}
            {history.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Recent Rolls
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {history.slice(0, 5).map((roll, idx) => (
                    <div 
                      key={roll.id} 
                      className={`p-2 rounded-lg border transition-all ${
                        idx === 0 
                          ? (roll.isTarotCrit ? 'bg-primary/20 border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]' : roll.isCritical ? 'bg-warning/20 border-warning shadow-[0_0_10px_rgba(var(--warning),0.3)]' : 'bg-primary/10 border-primary/50') 
                          : 'bg-secondary/30 border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-primary">{roll.expression}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(roll.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${idx === 0 ? 'text-lg' : 'text-base'} ${roll.isTarotCrit ? 'text-primary' : roll.isCritical ? 'text-warning' : ''}`}>
                          {roll.total}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {roll.rolls.map((r, i) => (
                            <span key={i} className={`text-[10px] px-1 rounded ${r === 6 ? 'text-warning font-bold bg-warning/20' : 'text-muted-foreground bg-background/50'}`}>
                              {r}
                            </span>
                          ))}
                          {roll.modifier !== 0 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              {roll.modifier > 0 ? '+' : ''}{roll.modifier}
                            </span>
                          )}
                        </div>
                      </div>
                      {idx === 0 && (roll.isTarotCrit || roll.isCritical) && (
                        <div className={`text-[10px] mt-1 font-medium flex items-center gap-1 ${roll.isTarotCrit ? 'text-primary' : 'text-warning'}`}>
                          {roll.isTarotCrit ? <LayoutPanelTop className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                          {roll.isTarotCrit ? 'NIGHT CITY TAROT!' : `Critical Hit (${roll.critCount} sixes)!`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
