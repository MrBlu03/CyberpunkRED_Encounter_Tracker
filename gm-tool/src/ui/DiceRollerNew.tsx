import React, { useState } from 'react';
import { detectCritical, rollHitLocation, rollDeathSave } from '../data/damage';

interface DiceResult {
  id: string;
  type: string;
  roll: number[];
  total: number;
  timestamp: Date;
  details?: any;
}

export default function DiceRoller() {
  const [results, setResults] = useState<DiceResult[]>([]);
  const [customInput, setCustomInput] = useState('1d10');
  const [modifier, setModifier] = useState(0);

  const addResult = (type: string, roll: number[], details?: any) => {
    const rollTotal = roll.reduce((sum, die) => sum + die, 0);
    const total = rollTotal + (details?.modifier || modifier);
    const result: DiceResult = {
      id: Date.now().toString(),
      type,
      roll,
      total,
      timestamp: new Date(),
      details: { ...details, modifier: details?.modifier || modifier }
    };
    setResults(prev => [result, ...prev.slice(0, 19)]); // Keep last 20 results
  };

  const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1;

  const parseDiceExpression = (expression: string) => {
    // Parse expressions like "2d6", "1d10", "3d6+2", "1d20-1"
    const match = expression.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!match) return null;
    
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;
    
    return { count, sides, modifier };
  };

  const rollCustomDice = () => {
    const parsed = parseDiceExpression(customInput);
    if (!parsed) {
      alert('Invalid dice expression. Use format like "2d6" or "1d10+5"');
      return;
    }

    const { count, sides, modifier: expressionModifier } = parsed;
    if (count > 20) {
      alert('Maximum 20 dice at once');
      return;
    }

    const roll = Array.from({ length: count }, () => rollDie(sides));
    const finalModifier = expressionModifier + modifier;
    
    addResult(`Custom: ${customInput}${finalModifier !== expressionModifier ? `+${modifier}` : ''}`, roll, { 
      sides,
      modifier: finalModifier,
      description: `${count}d${sides}${finalModifier !== 0 ? (finalModifier > 0 ? `+${finalModifier}` : finalModifier) : ''}`
    });
  };

  // Quick roll functions
  const rollInitiative = () => {
    const roll = [rollDie(10)];
    addResult('Initiative', roll, { description: '1d10 for Initiative' });
  };

  const rollSkillCheck = () => {
    const roll = [rollDie(10)];
    addResult('Skill Check', roll, { description: '1d10 for Skill Check' });
  };

  const rollDamage = (diceCount: number) => {
    const roll = Array.from({ length: diceCount }, () => rollDie(6));
    const isCritical = detectCritical(roll);
    addResult('Damage', roll, { 
      description: `${diceCount}d6 Damage`, 
      critical: isCritical,
      criticalBonus: isCritical ? 5 : 0,
      modifier: 0
    });
  };

  const rollHitLocationDice = () => {
    const roll = [rollDie(10)];
    const location = rollHitLocation();
    addResult('Hit Location', roll, { 
      description: '1d10 for Hit Location',
      location,
      modifier: 0
    });
  };

  const rollDeathSaveDice = () => {
    const roll = [rollDie(10)];
    const success = rollDeathSave(roll[0]);
    addResult('Death Save', roll, { 
      description: '1d10 for Death Save',
      success,
      modifier: 0
    });
  };

  const clearResults = () => {
    setResults([]);
  };

  const renderDieResult = (value: number, sides: number) => {
    let className = 'die-result';
    
    // Highlight 1s and 6s for d6, 1s and 10s for d10, etc.
    if (value === 1) {
      className += ' critical-fail'; // Always highlight 1s
    } else if (value === 6 && sides === 6) {
      className += ' critical-success'; // Highlight 6s on d6
    } else if (value === sides && sides >= 10) {
      className += ' critical-success'; // Highlight max roll on d10+
    }
    
    return <span key={Math.random()} className={className}>{value}</span>;
  };

  return (
    <div className="dice-roller">
      <div className="dice-controls">
        <h2>Dice Roller</h2>
        
        {/* Custom Dice Input */}
        <div className="custom-dice-section">
          <h3>Custom Dice</h3>
          <div className="custom-dice-controls">
            <div className="input-group">
              <label>Dice Expression:</label>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g., 2d6, 1d10+5, 3d6-1"
                className="dice-input"
              />
            </div>
            <div className="input-group">
              <label>Extra Modifier:</label>
              <input
                type="number"
                value={modifier}
                onChange={(e) => setModifier(Number(e.target.value))}
                placeholder="0"
                className="modifier-input"
              />
            </div>
            <button onClick={rollCustomDice} className="roll-custom-btn">
              Roll {customInput}
            </button>
          </div>
          <div className="dice-examples">
            <small>Examples: 1d10, 2d6, 1d20+5, 3d6-2</small>
          </div>
        </div>

        {/* Quick Roll Buttons */}
        <div className="quick-rolls-section">
          <h3>Quick Rolls</h3>
          <div className="quick-roll-grid">
            <button onClick={rollInitiative} className="quick-roll-btn">
              Initiative<br/><small>1d10</small>
            </button>
            <button onClick={rollSkillCheck} className="quick-roll-btn">
              Skill Check<br/><small>1d10</small>
            </button>
            <button onClick={() => rollDamage(1)} className="quick-roll-btn">
              Light Damage<br/><small>1d6</small>
            </button>
            <button onClick={() => rollDamage(2)} className="quick-roll-btn">
              Medium Damage<br/><small>2d6</small>
            </button>
            <button onClick={() => rollDamage(3)} className="quick-roll-btn">
              Heavy Damage<br/><small>3d6</small>
            </button>
            <button onClick={() => rollDamage(4)} className="quick-roll-btn">
              Very Heavy<br/><small>4d6</small>
            </button>
            <button onClick={rollHitLocationDice} className="quick-roll-btn">
              Hit Location<br/><small>1d10</small>
            </button>
            <button onClick={rollDeathSaveDice} className="quick-roll-btn">
              Death Save<br/><small>1d10</small>
            </button>
          </div>
        </div>

        <div className="results-controls">
          <button onClick={clearResults} className="clear-results-btn">
            Clear Results
          </button>
        </div>
      </div>

      {/* Results Display */}
      <div className="dice-results">
        <h3>Roll Results ({results.length})</h3>
        <div className="results-list">
          {results.map(result => (
            <div key={result.id} className="result-item">
              <div className="result-header">
                <span className="result-type">{result.type}</span>
                <span className="result-time">
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="result-dice">
                <div className="dice-display">
                  {result.roll.map((die, index) => 
                    renderDieResult(die, result.details?.sides || (result.type.includes('Damage') ? 6 : 10))
                  )}
                </div>
                <div className="result-total">
                  Total: <strong>{result.total}</strong>
                  {result.details?.modifier !== 0 && (
                    <span className="modifier">
                      {result.details.modifier > 0 ? '+' : ''}{result.details.modifier}
                    </span>
                  )}
                </div>
              </div>
              {result.details?.critical && (
                <div className="critical-hit">🎯 CRITICAL HIT! +5 damage</div>
              )}
              {result.details?.location && (
                <div className="hit-location">📍 Hit Location: {result.details.location}</div>
              )}
              {result.details?.success !== undefined && (
                <div className={`death-save ${result.details.success ? 'success' : 'failure'}`}>
                  {result.details.success ? '✅ Death Save Success' : '❌ Death Save Failed'}
                </div>
              )}
              {result.details?.description && (
                <div className="result-description">{result.details.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
