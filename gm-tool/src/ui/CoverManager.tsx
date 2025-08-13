import React, { useState } from 'react';
import { Cover, createCover, damageCover, applyCoverToAttack } from '../data/cover';

interface CoverManagerProps {
  onCoverDamaged?: (cover: Cover) => void;
}

export default function CoverManager({ onCoverDamaged }: CoverManagerProps) {
  const [activeCover, setActiveCover] = useState<Cover[]>([]);
  const [testDamage, setTestDamage] = useState(10);

  const addCover = (type: 'light' | 'medium' | 'heavy' | 'human-shield') => {
    const newCover = createCover(type);
    setActiveCover(prev => [...prev, newCover]);
  };

  const removeCover = (index: number) => {
    setActiveCover(prev => prev.filter((_, i) => i !== index));
  };

  const testCoverDamage = (cover: Cover, index: number) => {
    const result = applyCoverToAttack(cover, testDamage);
    
    if (result.coverDamaged) {
      const updatedCover = [...activeCover];
      updatedCover[index] = result.coverDamaged;
      setActiveCover(updatedCover);
      
      if (onCoverDamaged) {
        onCoverDamaged(result.coverDamaged);
      }
    }
  };

  const resetCover = () => {
    setActiveCover([]);
  };

  return (
    <div className="cover-manager">
      <div className="cover-controls">
        <h3>Cover Management</h3>
        
        <div className="cover-types">
          <h4>Add Cover</h4>
          <div className="cover-buttons">
            <button onClick={() => addCover('light')} className="cover-btn light">
              Light Cover (10 HP/SP)
            </button>
            <button onClick={() => addCover('medium')} className="cover-btn medium">
              Medium Cover (15 HP/SP)
            </button>
            <button onClick={() => addCover('heavy')} className="cover-btn heavy">
              Heavy Cover (20 HP/SP)
            </button>
            <button onClick={() => addCover('human-shield')} className="cover-btn human">
              Human Shield (40 HP)
            </button>
          </div>
        </div>

        <div className="damage-test">
          <h4>Test Cover Damage</h4>
          <div className="test-controls">
            <label>
              Test Damage:
              <input 
                type="number" 
                min="1" 
                max="50" 
                value={testDamage}
                onChange={(e) => setTestDamage(parseInt(e.target.value))}
              />
            </label>
          </div>
        </div>

        <button onClick={resetCover} className="reset-btn">
          Clear All Cover
        </button>
      </div>

      <div className="active-cover">
        <h3>Active Cover ({activeCover.length})</h3>
        
        {activeCover.length === 0 ? (
          <p className="no-cover">No cover present</p>
        ) : (
          <div className="cover-list">
            {activeCover.map((cover, index) => (
              <div key={`${cover.type}-${index}`} className={`cover-item ${cover.type} ${cover.destroyed ? 'destroyed' : ''}`}>
                <div className="cover-header">
                  <h4>{cover.name}</h4>
                  <button onClick={() => removeCover(index)} className="remove-btn">×</button>
                </div>
                
                <div className="cover-stats">
                  <div className="stat">
                    <span className="label">HP:</span>
                    <span className={`value ${cover.hp <= 0 ? 'critical' : ''}`}>
                      {cover.hp}/{cover.maxHp}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">SP:</span>
                    <span className={`value ${cover.sp <= 0 ? 'critical' : ''}`}>
                      {cover.sp}/{cover.maxSp}
                    </span>
                  </div>
                </div>

                {cover.destroyed && (
                  <div className="destroyed-notice">
                    ⚠️ DESTROYED
                  </div>
                )}

                {!cover.destroyed && (
                  <div className="cover-actions">
                    <button 
                      onClick={() => testCoverDamage(cover, index)} 
                      className="test-damage-btn"
                    >
                      Test {testDamage} Damage
                    </button>
                  </div>
                )}

                {cover.type === 'human-shield' && (
                  <div className="human-shield-note">
                    <small>⚡ Body hits only, 50% miss redirection</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cover-rules">
        <h3>Cover Rules (RAW p. 192-193)</h3>
        <ul className="rules-list">
          <li><strong>Light Cover:</strong> 10 HP, 10 SP - Chairs, small trees</li>
          <li><strong>Medium Cover:</strong> 15 HP, 15 SP - Cars, large furniture</li>
          <li><strong>Heavy Cover:</strong> 20 HP, 20 SP - Concrete walls, vehicles</li>
          <li><strong>Human Shield:</strong> 40 HP, 0 SP - Living person (body hits only)</li>
          <li><strong>Damage Order:</strong> Cover SP → Armor SP → HP</li>
          <li><strong>Destruction:</strong> Cover destroyed at 0 HP</li>
          <li><strong>Miss Redirection:</strong> If miss ≤4 vs human shield, 50% chance to hit shield</li>
        </ul>
      </div>
    </div>
  );
}
