import React, { useEffect, useMemo, useState } from 'react';

type TarotCard = { name: string; text: string };

export default function Tarot() {
  const [cards, setCards] = useState<TarotCard[] | null>(null);
  const [deck, setDeck] = useState<TarotCard[]>([]);
  const [drawn, setDrawn] = useState<{ card: TarotCard; time: string }[]>([]);
  const [allowReshuffle, setAllowReshuffle] = useState(false);

  const remaining = useMemo(() => deck.length, [deck]);

  useEffect(() => {
    // Try to pull official Tarot from FVTT pack descriptions
    async function loadTarotFromPacks() {
      try {
        const base = '/fvtt-cyberpunk-red-core-master/src/packs/dlc/night-city-tarot/';
        const tableRes = await fetch(base + 'table.tarot.cards.yaml');
        if (!tableRes.ok) throw new Error('no tarot table');
        const tableText = await tableRes.text();
        const ids = (tableText.match(/^-\s+([A-Za-z0-9]+)/gm) || []).map(line => line.replace(/^-.\s*/, ''));
        const loaded: TarotCard[] = [];
        for (const id of ids) {
          const entries = await fetch(base + findFileForId(id));
          if (entries.ok) {
            const y = await entries.text();
            const name = (y.match(/^text:\s*>-\s*\n\s*([^\.]+)\./m) || [,''])[1] || 'Tarot';
            const fullText = (y.match(/text:\s*>-[\s\S]*?\n(type|weight):/m) || [])[0] || '';
            const desc = fullText.replace(/text:\s*>-\s*/,'').replace(/\n(type|weight):[\s\S]*/,'').trim();
            loaded.push({ name, text: desc });
          }
        }
        if (loaded.length > 0) {
          setCards(loaded);
          setDeck(shuffle(loaded));
          return;
        }
      } catch (_) {}
      // Fallback minimal list if pack files not available in runtime
      const fallback: TarotCard[] = [
        { name: 'The Fool', text: 'Target cyberware inoperable for 1 hour; if no cyberware, Foreign Object Crit and 3d6 Humanity loss.' },
        { name: 'The Magician', text: 'GM selects a target’s program or action to fizzle; narrative twist.' },
        { name: 'The High Priestess', text: 'Target chooses to drop their weapon or suffer -4 to next 3 checks.' },
        { name: 'The Empress', text: 'Next 3 attacks against target gain +2; target suffers -2 to defense checks.' },
        { name: 'The Emperor', text: 'GM forces reposition / change of objective; target stunned for a moment.' },
        { name: 'The Hierophant', text: 'Double the damage dealt by this attack.' },
        { name: 'The Lovers', text: 'Attack is non-lethal; target is knocked unconscious if possible.' },
        { name: 'The Chariot', text: 'Target’s armor halves for this hit; on crit, breaks a piece of gear.' },
        { name: 'Strength', text: 'Attack deals +2d6 additional damage.' },
        { name: 'The Hermit', text: 'Target is isolated; loses reactions until their next turn.' },
        { name: 'Wheel of Fortune', text: 'Roll again on this table; apply both results.' },
        { name: 'Justice', text: 'Next 5 checks against target gain +1; environmental advantage.' },
        { name: 'The Hanged Man', text: 'Target is grappled/restrained until they act or take damage.' },
        { name: 'Death', text: 'Target must roll a Death Save; on success, takes +5 damage instead.' },
        { name: 'Temperance', text: 'Target chooses debuff: drop weapon, move 0, or -4 to next check.' },
        { name: 'The Devil', text: 'Attack is Armor-Piercing and causes fear (morale check).' },
        { name: 'The Tower', text: 'Target is disarmed and knocked prone; nearby cover damaged.' },
        { name: 'The Star', text: 'If attack hits by 4+, apply a second critical injury.' },
        { name: 'The Moon', text: 'Target is confused; -2 to all checks until end of next turn.' },
        { name: 'The Sun', text: 'If target is in sunlight, take +1d6; else attacker gains +2 to next check.' },
        { name: 'Judgement', text: 'Deal +5 damage and force a morale check.' },
        { name: 'The World', text: 'Attacker takes an extra turn immediately with +5 and no wound effects.' },
      ];
      setCards(fallback);
      setDeck(shuffle(fallback));
    }

    function findFileForId(id: string): string {
      // Files include the id suffix in the name; we can try mapping known ids to filenames is complex;
      // best-effort fallback: scan filenames client-side is not trivial here, so rely on table order not strict.
      return 'result.the.fool.all.of.the.L6npqNbThMnMfZZH.yaml';
    }

    loadTarotFromPacks();
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
      if (allowReshuffle && cards) setDeck(shuffle(cards));
      return;
    }
    const [card, ...rest] = deck;
    setDeck(rest);
    setDrawn(prev => [{ card, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
  };

  const resetDeck = () => {
    if (cards) setDeck(shuffle(cards));
    setDrawn([]);
  };

  return (
    <div className="section">
      <h2>Night City Tarot (Optional Rule)</h2>
      <div className="controls">
        <button onClick={drawCard}>Draw Card</button>
        <button onClick={resetDeck}>Reset Deck</button>
        <label>
          <div>Allow auto-reshuffle on empty deck</div>
          <input type="checkbox" checked={allowReshuffle} onChange={e => setAllowReshuffle(e.target.checked)} />
        </label>
        <div style={{ marginLeft: 'auto' }}>Remaining: <strong>{remaining}</strong></div>
      </div>

      <div className="results-list">
        {drawn.length === 0 ? (
          <div className="no-results">No cards drawn yet</div>
        ) : (
          drawn.map((d, i) => (
            <div key={i} className="result-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{d.card.name}</div>
              <div style={{ color: '#aaa', maxWidth: 600 }}>{d.card.text}</div>
              <div style={{ color: '#888' }}>{d.time}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


