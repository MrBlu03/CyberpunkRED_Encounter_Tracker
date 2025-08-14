import React, { useEffect, useMemo, useState } from 'react';

type TarotCard = {
  number: number;
  roman: string;
  alt_roman?: string;
  name: string;
  effect: string;
  additional_penalty?: string;
  no_cyberware_case?: string;
  notes?: string;
  cost?: string;
  melee_bonus?: string;
  ranged_case?: string;
  melee_case?: string;
  weapon_side_effect?: string;
  aftereffect?: string;
  buff?: string;
  melee_weapon_rider?: string;
};

type TarotRules = {
  source: string;
  deck_rules: {
    trigger: string;
    single_target_only: boolean;
    no_aoe: boolean;
    both_can_suffer_crits: boolean;
    multi_injury_bonus_damage: string;
    post_resolution: string;
    campaign_shuffle_rule: string;
  };
  alternate_numbering: {
    strength: string[];
    justice: string[];
  };
  cards: TarotCard[];
};

export default function Tarot() {
  const [tarotData, setTarotData] = useState<TarotRules | null>(null);
  const [deck, setDeck] = useState<TarotCard[]>(() => {
    try { const raw = localStorage.getItem('cpr-tarot-deck'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [drawn, setDrawn] = useState<{ card: TarotCard; time: string }[]>(() => {
    try { const raw = localStorage.getItem('cpr-tarot-drawn'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [allowReshuffle, setAllowReshuffle] = useState<boolean>(() => {
    try { const raw = localStorage.getItem('cpr-tarot-reshuffle'); return raw ? JSON.parse(raw) : false; } catch { return false; }
  });
  const [showRules, setShowRules] = useState<boolean>(false);

  const remaining = useMemo(() => deck.length, [deck]);

  useEffect(() => {
    async function loadOfficialTarotRules() {
      try {
        const response = await fetch('/tarot-rules.json');
        if (!response.ok) throw new Error('Failed to load tarot rules');
        const data: TarotRules = await response.json();
        setTarotData(data);
        
        // If we had a persisted deck, keep it; otherwise seed it with official cards
        setDeck(prev => {
          if (prev && prev.length > 0) {
            // Validate that the persisted deck uses the current card structure
            const isValidDeck = prev.every(card => 
              typeof card.number === 'number' && 
              typeof card.name === 'string' && 
              typeof card.effect === 'string'
            );
            return isValidDeck ? prev : shuffle(data.cards);
          }
          return shuffle(data.cards);
        });
      } catch (error) {
        console.error('Failed to load official tarot rules:', error);
        // No fallback - require the official rules file
      }
    }

    loadOfficialTarotRules();
  }, []);

  function shuffle<T>(list: T[]) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const drawCard = () => {
    if (deck.length === 0) {
      if (allowReshuffle && tarotData) setDeck(shuffle(tarotData.cards));
      return;
    }
    const [card, ...rest] = deck;
    setDeck(rest);
    setDrawn(prev => [{ card, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
  };

  const resetDeck = () => {
    if (tarotData) setDeck(shuffle(tarotData.cards));
    setDrawn([]);
  };

  // Persist across navigation
  useEffect(() => {
    try {
      localStorage.setItem('cpr-tarot-deck', JSON.stringify(deck));
      localStorage.setItem('cpr-tarot-drawn', JSON.stringify(drawn));
      localStorage.setItem('cpr-tarot-reshuffle', JSON.stringify(allowReshuffle));
    } catch {}
  }, [deck, drawn, allowReshuffle]);

  const formatCardText = (card: TarotCard): string => {
    let text = card.effect;
    
    if (card.ranged_case && card.melee_case) {
      text += ` (Ranged: ${card.ranged_case}) (Melee: ${card.melee_case})`;
    } else if (card.ranged_case) {
      text += ` (Ranged: ${card.ranged_case})`;
    } else if (card.melee_case) {
      text += ` (Melee: ${card.melee_case})`;
    }
    
    if (card.melee_bonus) text += ` (Melee bonus: ${card.melee_bonus})`;
    if (card.additional_penalty) text += ` Additional: ${card.additional_penalty}`;
    if (card.no_cyberware_case) text += ` (No cyberware: ${card.no_cyberware_case})`;
    if (card.cost) text += ` Cost: ${card.cost}`;
    if (card.weapon_side_effect) text += ` Weapon effect: ${card.weapon_side_effect}`;
    if (card.aftereffect) text += ` After: ${card.aftereffect}`;
    if (card.buff) text += ` Bonus: ${card.buff}`;
    if (card.melee_weapon_rider) text += ` Melee weapon: ${card.melee_weapon_rider}`;
    if (card.notes) text += ` Note: ${card.notes}`;
    
    return text;
  };

  if (!tarotData) {
    return (
      <div className="section">
        <h2>Night City Tarot</h2>
        <div className="no-results">Loading official Night City Tarot rules...</div>
      </div>
    );
  }

  return (
    <div className="section">
      <h2>Night City Tarot</h2>
      <p style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        {tarotData.source}
      </p>
      
      <div className="controls">
        <button onClick={drawCard} disabled={deck.length === 0 && !allowReshuffle}>
          Draw Card
        </button>
        <button onClick={resetDeck}>Reset Deck</button>
        <button onClick={() => setShowRules(!showRules)}>
          {showRules ? 'Hide' : 'Show'} Rules
        </button>
        <label>
          <div>Allow auto-reshuffle on empty deck</div>
          <input type="checkbox" checked={allowReshuffle} onChange={e => setAllowReshuffle(e.target.checked)} />
        </label>
        <div style={{ marginLeft: 'auto' }}>Remaining: <strong>{remaining}</strong></div>
      </div>

      {showRules && (
        <div className="rules-section" style={{ 
          background: 'var(--bg-secondary)', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          fontSize: '0.9em'
        }}>
          <h3>Official Rules</h3>
          <p><strong>Trigger:</strong> {tarotData.deck_rules.trigger}</p>
          <ul style={{ marginLeft: '1rem' }}>
            <li>{tarotData.deck_rules.multi_injury_bonus_damage}</li>
            <li>{tarotData.deck_rules.post_resolution}</li>
            <li>{tarotData.deck_rules.campaign_shuffle_rule}</li>
            {tarotData.deck_rules.single_target_only && <li>Single target only (no AoE)</li>}
            {tarotData.deck_rules.both_can_suffer_crits && <li>Both attacker and target can suffer crits</li>}
          </ul>
        </div>
      )}

      <div className="results-list">
        {drawn.length === 0 ? (
          <div className="no-results">No cards drawn yet</div>
        ) : (
          drawn.map((d, i) => (
            <div key={i} className="result-item" style={{ 
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1em' }}>
                    {d.card.roman} - {d.card.name}
                    {d.card.alt_roman && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (alt: {d.card.alt_roman})</span>}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>{d.time}</div>
              </div>
              <div style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}>
                {formatCardText(d.card)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


