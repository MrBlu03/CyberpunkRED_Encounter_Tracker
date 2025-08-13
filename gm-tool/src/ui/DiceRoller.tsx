import React, { useState } from 'react';
import './DiceRoller.css';

interface DiceResult {
  value: number;
  isMax: boolean;
  isCriticalFail: boolean;
  isCriticalSuccess: boolean;
}

interface RollResult {
  type: string;
  dice: DiceResult[];
  modifier: number;
  total: number;
  timestamp: string;
  description?: string;
}

export default function DiceRoller() {
  const [customInput, setCustomInput] = useState('');
  const [modifier, setModifier] = useState(0);
  const [results, setResults] = useState<RollResult[]>([]);

  const parseDiceExpression = (expression: string): { count: number, sides: number, modifier: number } | null => {
    // Remove spaces and convert to lowercase
    const cleaned = expression.replace(/\s/g, '').toLowerCase();
    
    // Match patterns like "2d6+3", "1d20-2", "3d10", etc.
    const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    
    if (!match) return null;
    
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const mod = match[3] ? parseInt(match[3]) : 0;
    
    return { count, sides, modifier: mod };
  };

  const rollDice = (count: number, sides: number, mod: number = 0, description: string = '') => {
    const dice: DiceResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const value = Math.floor(Math.random() * sides) + 1;
      const isMax = value === sides;
      const isCriticalFail = value === 1;
      const isCriticalSuccess = (sides === 6 && value === 6) || (sides >= 10 && isMax);
      
      dice.push({
        value,
        isMax,
        isCriticalFail,
        isCriticalSuccess
      });
    }
    
    const total = dice.reduce((sum, die) => sum + die.value, 0) + mod;
    
    const result: RollResult = {
      type: `${count}d${sides}${mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : ''}`,
      dice,
      modifier: mod,
      total,
      timestamp: new Date().toLocaleTimeString(),
      description
    };
    
    setResults(prev => [result, ...prev]);
    return result;
  };

  const rollCustomDice = () => {
    if (!customInput.trim()) return;
    
    const parsed = parseDiceExpression(customInput);
    if (!parsed) {
      alert('Invalid dice format. Use format like "2d6+3" or "1d20"');
      return;
    }
    
    rollDice(parsed.count, parsed.sides, parsed.modifier, `Custom: ${customInput}`);
  };

  const rollQuick = (count: number, sides: number, mod: number = 0, desc: string = '') => {
    rollDice(count, sides, mod, desc);
  };

  const clearResults = () => {
    setResults([]);
  };

  const renderDieResult = (die: DiceResult, index: number) => {
    let className = 'die-result';
    if (die.isCriticalFail) className += ' critical-fail';
    else if (die.isCriticalSuccess) className += ' critical-success';
    
    return (
      <div key={index} className={className}>
        {die.value}
      </div>
    );
  };

  return (
    <div className="dice-roller">
      <h3>Dice Roller</h3>
      
      {/* Custom Dice Section */}
      <div className="custom-dice-section">
        <h4>Custom Roll</h4>
        <div className="custom-dice-controls">
          <input
            type="text"
            className="dice-input"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="e.g., 2d6+3, 1d20, 3d10-1"
            onKeyPress={(e) => e.key === 'Enter' && rollCustomDice()}
          />
          <button onClick={rollCustomDice} className="roll-button">
            Roll
          </button>
        </div>
        <div className="dice-examples">
          Examples: 2d6+3, 1d20, 3d10-2, 4d6
        </div>
      </div>

      {/* Quick Rolls Section */}
      <div className="quick-rolls-section">
        <h4>Quick Rolls</h4>
        <div className="dice-presets">
          <button onClick={() => rollQuick(1, 6, 0, 'D6')} className="preset-button">
            1d6
          </button>
          <button onClick={() => rollQuick(2, 6, 0, '2D6')} className="preset-button">
            2d6
          </button>
          <button onClick={() => rollQuick(1, 10, 0, 'D10')} className="preset-button">
            1d10
          </button>
          <button onClick={() => rollQuick(1, 6, 0, 'Initiative')} className="preset-button">
            Initiative
          </button>
          <button onClick={() => rollQuick(2, 6, 0, 'Crit Injury')} className="preset-button">
            Crit Injury
          </button>
          <button onClick={() => rollQuick(1, 10, 0, 'Death Save')} className="preset-button">
            Death Save
          </button>
        </div>
        <button onClick={clearResults} className="clear-results-btn">
          Clear History
        </button>
      </div>

      {/* Current Result Display */}
      {results.length > 0 && (
        <div className="dice-result">
          <h4>Latest Roll</h4>
          <div className="total">{results[0].total}</div>
          <div className="breakdown">
            {results[0].type} = {results[0].dice.map(d => d.value).join(' + ')}
            {results[0].modifier !== 0 && ` ${results[0].modifier > 0 ? '+' : ''}${results[0].modifier}`}
          </div>
        </div>
      )}

      {/* Roll History */}
      <div className="dice-history">
        <h4>Roll History</h4>
        <div className="history-list">
          {results.length === 0 ? (
            <div className="no-results">No rolls yet</div>
          ) : (
            results.slice(0, 10).map((result, index) => (
              <div key={index} className="history-item">
                <span className="roll-expression">{result.type}</span>
                <span className="roll-result">{result.total}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
