import React, { useState } from 'react';

interface DamageDialogProps {
  participantName: string;
  onApplyDamage: (damage: number, options: {
    location: 'head' | 'body';
    damageType: 'normal' | 'armor-piercing' | 'half-armor' | 'ignore-armor';
    isCritical: boolean;
  }) => void;
  onClose: () => void;
}

export function DamageDialog({ participantName, onApplyDamage, onClose }: DamageDialogProps) {
  const [damage, setDamage] = useState(10);
  const [location, setLocation] = useState<'head' | 'body'>('body');
  const [damageType, setDamageType] = useState<'normal' | 'armor-piercing' | 'half-armor' | 'ignore-armor'>('normal');
  const [isCritical, setIsCritical] = useState(false);

  const handleApply = () => {
    onApplyDamage(damage, { location, damageType, isCritical });
    onClose();
  };

  return (
    <div className="damage-dialog-overlay">
      <div className="damage-dialog">
        <div className="damage-dialog-header">
          <h3>Apply Damage to {participantName}</h3>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        
        <div className="damage-dialog-content">
          <div className="damage-input-group">
            <label>
              <span>Damage Amount:</span>
              <input 
                type="number" 
                value={damage} 
                onChange={(e) => setDamage(Number(e.target.value))}
                min="0"
                step="1"
              />
            </label>
          </div>

          <div className="damage-input-group">
            <label>
              <span>Hit Location:</span>
              <select value={location} onChange={(e) => setLocation(e.target.value as 'head' | 'body')}>
                <option value="body">Body</option>
                <option value="head">Head (×2 damage after armor)</option>
              </select>
            </label>
          </div>

          <div className="damage-input-group">
            <label>
              <span>Damage Type:</span>
              <select value={damageType} onChange={(e) => setDamageType(e.target.value as any)}>
                <option value="normal">Normal</option>
                <option value="armor-piercing">Armor Piercing (½ armor, -2 SP ablation)</option>
                <option value="half-armor">Half Armor (melee/martial arts)</option>
                <option value="ignore-armor">Ignore Armor</option>
              </select>
            </label>
          </div>

          <div className="damage-input-group">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={isCritical} 
                onChange={(e) => setIsCritical(e.target.checked)}
              />
              <span>Critical Hit (+5 damage)</span>
            </label>
          </div>

          <div className="damage-preview">
            <h4>Damage Resolution Preview:</h4>
            <ol>
              <li>Cover SP applied first</li>
              <li>Armor SP for {location} location</li>
              <li>{damageType === 'armor-piercing' && 'Armor halved, '}
                  {damageType === 'half-armor' && 'Armor halved, '}
                  {damageType === 'ignore-armor' && 'Armor ignored, '}
                  Remaining damage → HP</li>
              {location === 'head' && <li>Headshot: ×2 damage after armor</li>}
              {isCritical && <li>Critical: +5 damage</li>}
              <li>Armor ablation: -{damageType === 'armor-piercing' ? '2' : '1'} SP if penetrated</li>
            </ol>
          </div>
        </div>

        <div className="damage-dialog-actions">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleApply} className="apply-btn">Apply Damage</button>
        </div>
      </div>
    </div>
  );
}
