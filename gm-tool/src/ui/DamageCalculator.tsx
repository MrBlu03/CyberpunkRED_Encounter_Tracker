import React, { useState } from 'react'
import { resolveDamage, rollHitLocation, DamageType, HitLocation, ArmorLayer, DamageResult } from '../data/damage'

interface DamageCalculatorProps {
  onApplyDamage?: (participantId: string, damage: number, location: HitLocation) => void
}

export function DamageCalculator({ onApplyDamage }: DamageCalculatorProps) {
  const [damage, setDamage] = useState<number>(10)
  const [damageType, setDamageType] = useState<DamageType>('normal')
  const [location, setLocation] = useState<HitLocation>('body')
  const [armorSP, setArmorSP] = useState<number>(11)
  const [coverSP, setCoverSP] = useState<number>(0)
  const [isCritical, setIsCritical] = useState(false)
  const [result, setResult] = useState<DamageResult | null>(null)

  const calculate = () => {
    const armor: ArmorLayer[] = [
      { sp: armorSP, location, name: 'Body Armor' }
    ]
    
    const cover = coverSP > 0 ? { sp: coverSP, hp: 20, destroyed: false } : undefined
    
    const damageResult = resolveDamage(damage, location, damageType, armor, cover, isCritical)
    setResult(damageResult)
  }

  const rollLocation = () => {
    setLocation(rollHitLocation())
  }

  return (
    <div className="section">
      <h2>Damage Calculator</h2>
      
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <label>
          <div>Base Damage</div>
          <input type="number" value={damage} onChange={e => setDamage(Number(e.target.value))} />
        </label>
        
        <label>
          <div>Damage Type</div>
          <select value={damageType} onChange={e => setDamageType(e.target.value as DamageType)}>
            <option value="normal">Normal</option>
            <option value="armor-piercing">Armor-Piercing</option>
            <option value="half-armor">Half Armor (Melee)</option>
            <option value="ignore-armor">Ignore Armor</option>
          </select>
        </label>
        
        <label>
          <div>Hit Location</div>
          <select value={location} onChange={e => setLocation(e.target.value as HitLocation)}>
            <option value="body">Body</option>
            <option value="head">Head</option>
          </select>
        </label>
        
        <button onClick={rollLocation}>Roll Location</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 12 }}>
        <label>
          <div>Armor SP</div>
          <input type="number" value={armorSP} onChange={e => setArmorSP(Number(e.target.value))} />
        </label>
        
        <label>
          <div>Cover SP</div>
          <input type="number" value={coverSP} onChange={e => setCoverSP(Number(e.target.value))} />
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} />
          Critical Hit (+5 dmg)
        </label>
      </div>

      <div className="controls" style={{ marginTop: 12 }}>
        <button onClick={calculate}>Calculate Damage</button>
      </div>

      {result && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-2)', borderRadius: 4, border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>Damage Result</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 14 }}>
            <div>Total Damage: <strong>{result.totalDamage}</strong></div>
            <div>Cover SP Applied: <strong>{result.coverSPApplied}</strong></div>
            <div>Armor SP Applied: <strong>{result.armorSPApplied}</strong></div>
            <div>Armor Ablation: <strong>-{result.armorAblation} SP</strong></div>
            <div>HP Damage: <strong style={{ color: 'var(--accent)' }}>{result.damageToHP}</strong></div>
            <div>Headshot: <strong>{result.isHeadshot ? 'Yes (x2)' : 'No'}</strong></div>
          </div>
          {result.criticalDamage > 0 && (
            <div style={{ marginTop: 8, color: 'var(--accent)' }}>
              Critical hit detected! +{result.criticalDamage} damage applied.
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
        RAW Order: Cover SP → Armor SP → HP → Headshot x2 → Critical +5. 
        Ablation: -1 SP (normal), -2 SP (AP) when penetrated.
      </p>
    </div>
  )
}
