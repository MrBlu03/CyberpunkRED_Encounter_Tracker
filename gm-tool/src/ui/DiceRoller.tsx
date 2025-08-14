import React, { useState } from 'react';
import './DiceRoller.css';

interface DiceRoll {
  value: number;
  sides: number;
  isCritical: boolean;
  isFail: boolean;
}

interface RollResult {
  type: string;
  total: number;
  breakdown: string;
  timestamp: string;
  rolls: DiceRoll[];
  modifier: number;
}

export default function DiceRoller() {
  const [customInput, setCustomInput] = useState('');
  const [results, setResults] = useState<RollResult[]>([]);
  const [currentResult, setCurrentResult] = useState<RollResult | null>(null);
  const critMode = (localStorage.getItem('crit-mode') ?? 'raw') as 'raw' | 'tarot';
  const rawCritEnabled = critMode === 'raw';
  const tarotCritEnabled = critMode === 'tarot';
  const [tarotWindowOpen, setTarotWindowOpen] = useState(false);

  const parseDiceExpression = (expression: string): { count: number, sides: number, modifier: number } | null => {
    const cleaned = expression.replace(/\s/g, '').toLowerCase();
    const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    
    if (!match) return null;
    
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const mod = match[3] ? parseInt(match[3]) : 0;
    
    return { count, sides, modifier: mod };
  };

  const rollDice = (count: number, sides: number, mod: number = 0, type: string = '') => {
    const rolls: DiceRoll[] = [];
    let total = 0;
    
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      const diceRoll: DiceRoll = {
        value: roll,
        sides: sides,
        isCritical: (sides === 6 && roll === 6) || (sides === 10 && roll === 10) || (sides === 20 && roll === 20),
        isFail: roll === 1
      };
      rolls.push(diceRoll);
      total += roll;
    }
    
    total += mod;

    // RAW crit injury detection: 2 or more sixes on damage dice
    const numSixes = rolls.filter(r => r.sides === 6 && r.value === 6).length;
    const isRawCrit = rawCritEnabled && numSixes >= 2;

    // Tarot crit: 3 or more sixes on d6s triggers Tarot draw
    const isTarotCrit = tarotCritEnabled && numSixes >= 3;
    
    const rollValues = rolls.map(r => r.value).join('+');
    const breakdown = `${rollValues}${mod !== 0 ? ` ${mod > 0 ? '+' : ''}${mod}` : ''} = ${total}`;
    const result: RollResult = {
      type: type || `${count}d${sides}${mod !== 0 ? (mod > 0 ? '+' : '') + mod : ''}`,
      total,
      breakdown,
      timestamp: new Date().toLocaleTimeString(),
      rolls,
      modifier: mod
    };
    
    setCurrentResult(result);
    setResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const rollCustomDice = () => {
    if (!customInput.trim()) return;
    
    const parsed = parseDiceExpression(customInput);
    if (parsed) {
      rollDice(parsed.count, parsed.sides, parsed.modifier, customInput);
    } else {
      alert('Invalid dice expression. Use format like: 2d6+3, 1d20, 3d10-1');
    }
  };

  const clearResults = () => {
    setResults([]);
    setCurrentResult(null);
  };

  return (
    <div className="dice-roller-compact">
      <h3>Dice Roller</h3>
      
      {/* Custom Roll Input */}
      <div className="custom-roll">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="2d6+3, 1d20, etc."
          onKeyPress={(e) => e.key === 'Enter' && rollCustomDice()}
        />
        <button onClick={rollCustomDice}>Roll</button>
      </div>

      {/* Quick Preset Buttons */}
      <div className="quick-buttons">
        <button onClick={() => rollDice(1, 6, 0, '1d6')}>1d6</button>
        <button onClick={() => rollDice(2, 6, 0, '2d6')}>2d6</button>
        <button onClick={() => rollDice(1, 10, 0, '1d10')}>1d10</button>
        <button onClick={() => rollDice(1, 10, 7, 'Initiative')}>Init</button>
        <button onClick={() => rollDice(2, 6, 0, 'Crit')}>Crit</button>
        <button onClick={() => rollDice(1, 10, 0, 'Death')}>Death</button>
      </div>

      {/* Current Result */}
      {currentResult && (() => {
        const resultSixes = currentResult.rolls.filter(r => r.sides === 6 && r.value === 6).length;
        const isRawCritResult = rawCritEnabled && resultSixes >= 2;
        const isTarotCritResult = tarotCritEnabled && resultSixes >= 3;
        const hasCrit = isRawCritResult || isTarotCritResult;
        
        return (
          <div className={`current-result ${hasCrit ? 'crit-highlight' : ''}`}>
            <div className="result-total">{currentResult.total}</div>
            <div className="dice-breakdown">
              {currentResult.rolls.map((dice, index) => (
                <span 
                  key={index}
                  className={`dice-value ${dice.isCritical ? 'critical' : ''} ${dice.isFail ? 'fail' : ''} ${((isRawCritResult || isTarotCritResult) && dice.sides===6 && dice.value===6) ? 'critical' : ''}`}
                >
                  {dice.value}
                </span>
              ))}
              {currentResult.modifier !== 0 && (
                <span className="modifier">
                  {currentResult.modifier > 0 ? '+' : ''}{currentResult.modifier}
                </span>
              )}
              <span className="equals">=</span>
              <span className="total-value">{currentResult.total}</span>
            </div>
            {hasCrit && (
              <div className="crit-result-text">
                {isRawCritResult ? '⚡ RAW CRITICAL!' : '🃏 TAROT CRITICAL!'}
              </div>
            )}
          </div>
        );
      })()}

      {/* Roll History */}
      <div className="roll-history">
        <div className="history-header">
          <span>History</span>
          {results.length > 0 && (
            <button onClick={clearResults} className="clear-btn">Clear</button>
          )}
        </div>
        <div className="history-list">
          {results.length === 0 ? (
            <div className="no-history">No rolls yet</div>
          ) : (
            results.map((result, index) => {
              const resultSixes = result.rolls.filter(r => r.sides === 6 && r.value === 6).length;
              const isRawCritResult = rawCritEnabled && resultSixes >= 2;
              const isTarotCritResult = tarotCritEnabled && resultSixes >= 3;
              
              return (
                <div key={index} className="history-item">
                  <span className="history-type">{result.type}</span>
                  <div className="history-dice">
                    {result.rolls.map((dice, diceIndex) => (
                      <span 
                        key={diceIndex}
                        className={`history-dice-value ${dice.isCritical ? 'critical' : ''} ${dice.isFail ? 'fail' : ''} ${((isRawCritResult || isTarotCritResult) && dice.sides===6 && dice.value===6) ? 'critical' : ''}`}
                      >
                        {dice.value}
                      </span>
                    ))}

                  </div>
                  <span className="history-result">{result.total}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}