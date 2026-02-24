import { useState, useMemo } from 'react';
import { Dices, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { TarotCard, TarotDeckState } from '@/types';

const TAROT_CARDS: TarotCard[] = [
  // Major Arcana
  { 
    id: '0', 
    name: 'The Fool', 
    number: 0, 
    roman: '0',
    suit: 'major', 
    description: 'Innocence, New Beginnings, Spontaneity', 
    effect: "All of the victim's Cyberware is rendered inoperable for one hour. Cyberlimbs that are rendered inoperable act as their meat counterparts do when they have been dismembered, but they still hang loosely. Should this leave a target without any ability to sense an opponent, any Check they make suffers an additional -4 modifier, as if obscured by smoke or darkness. If the victim has no Cyberware they instead suffer the Foreign Object Critical Injury and experience 3d6 Humanity Loss." 
  },
  { 
    id: '1', 
    name: 'The Magician', 
    number: 1, 
    roman: 'I',
    suit: 'major', 
    description: 'Manifestation, Resourcefulness, Power', 
    effect: "The GM selects one of the victim's pieces of cyberware. That piece of cyberware is destroyed (although not beyond repair). Additionally, the victim is now Deadly On Fire (CP:R page 180). If the victim has no Cyberware, they are now Deadly on Fire, and one of their worn or held weapons malfunctions, requiring an Action to reverse the malfunction before it can be used again." 
  },
  { 
    id: '2', 
    name: 'The High Priestess', 
    number: 2, 
    roman: 'II',
    suit: 'major', 
    description: 'Intuition, Sacred Knowledge, Divine Feminine', 
    effect: "The victim suffers the Foreign Object Critical Injury, except instead of re-suffering Bonus Damage whenever they move further than 4 m/yds on foot in a Turn, they must instead beat a DV 15 Resist Torture/Drugs Skill Check or suffer 3d6 damage directly to their Hit Points." 
  },
  { 
    id: '3', 
    name: 'The Empress', 
    number: 3, 
    roman: 'III',
    suit: 'major', 
    description: 'Femininity, Beauty, Nature, Abundance', 
    effect: "The music swells. The next three successful Attack Checks made against a single opponent in this combat are guaranteed to inflict Critical Injuries, no matter what the damage dice say. This applies to Light Melee Weapons but not Biotoxins, Poisons, Stun Batons, and other weapons normally incapable of causing a Critical Injury." 
  },
  { 
    id: '4', 
    name: 'The Emperor', 
    number: 4, 
    roman: 'IV',
    suit: 'major', 
    description: 'Authority, Structure, Control, Fatherhood', 
    effect: "The GM selects a Player to choose one Critical Injury from the Head table (CP:R page 188), and one from the Body table (CP:R page 187). The victim suffers both of those Critical Injuries." 
  },
  { 
    id: '5', 
    name: 'The Hierophant', 
    number: 5, 
    roman: 'V',
    suit: 'major', 
    description: 'Spiritual Wisdom, Religious Beliefs, Tradition', 
    effect: "The Attack deals twice the amount of damage it would have done, after armor and any multipliers are taken into account. However, if it was made by a weapon, that weapon is destroyed beyond repair." 
  },
  { 
    id: '6', 
    name: 'The Lovers', 
    number: 6, 
    roman: 'VI',
    suit: 'major', 
    description: 'Love, Harmony, Relationships, Choices', 
    effect: "This Attack now hits the head, even if it was originally aimed elsewhere. Additionally, if it was a Melee Attack that drew The Lovers, the victim is now considered to be defender in a grapple with the attacker." 
  },
  { 
    id: '7', 
    name: 'The Chariot', 
    number: 7, 
    roman: 'VII',
    suit: 'major', 
    description: 'Control, Willpower, Success, Action', 
    effect: "The Attack finds a fortuitous flaw in the target's armor, which forms a gaping hole. The victim's armor in the damaged location is ablated by an additional 5 points, even if it was not penetrated by the Attack." 
  },
  { 
    id: '8', 
    name: 'Strength', 
    number: 8, 
    roman: 'VIII',
    suit: 'major', 
    description: 'Strength, Courage, Persuasion, Influence', 
    effect: "The Attack deals an additional 25 damage. This additional damage is added to the rolled damage before armor SP is subtracted and/or any multipliers are calculated." 
  },
  { 
    id: '9', 
    name: 'The Hermit', 
    number: 9, 
    roman: 'IX',
    suit: 'major', 
    description: 'Soul-searching, Introspection, Solitude', 
    effect: "The victim suffers the Lost Eye Critical Injury twice, although the penalty for the injury is only applied once. Should this leave a target without any ability to sense an opponent, any Skill Check they make suffers an additional -4 modifier, as if obscured by smoke or darkness." 
  },
  { 
    id: '10', 
    name: 'Wheel of Fortune', 
    number: 10, 
    roman: 'X',
    suit: 'major', 
    description: 'Good Luck, Karma, Life Cycles, Destiny', 
    effect: "The Attack goes wild. If it was a Ranged Attack, the GM randomly determines a new target to replace the intended target. If it was a Melee Attack, the person who caused Wheel of Fortune to be drawn immediately falls prone, and the Attack is considered a miss instead of a hit. Either way, any weapon used to make the Attack malfunctions, requiring an Action to reverse the malfunction before it can be used again." 
  },
  { 
    id: '11', 
    name: 'Justice', 
    number: 11, 
    roman: 'XI',
    suit: 'major', 
    description: 'Justice, Fairness, Truth, Law', 
    effect: "The Attack knocks the wind out of the victim. For the next minute they suffer a -5 penalty to Evasion Skill Checks when attempting to avoid a Melee Attack and they cannot dodge Ranged Attacks at all." 
  },
  { 
    id: '12', 
    name: 'The Hanged Man', 
    number: 12, 
    roman: 'XII',
    suit: 'major', 
    description: 'Surrender, Letting Go, New Perspectives', 
    effect: "The victim is knocked prone and suffers the Spinal Injury and Whiplash Critical Injuries." 
  },
  { 
    id: '13', 
    name: 'Death', 
    number: 13, 
    roman: 'XIII',
    suit: 'major', 
    description: 'Endings, Change, Transformation, Transition', 
    effect: "The victim must immediately roll a single Death Save. If they fail, they are reduced to 0 HP and are knocked unconscious for one minute. Upon regaining consciousness, the victim regains 3d6 Humanity Points (up to their maximum Humanity) from the experience." 
  },
  { 
    id: '14', 
    name: 'Temperance', 
    number: 14, 
    roman: 'XIV',
    suit: 'major', 
    description: 'Balance, Moderation, Patience, Purpose', 
    effect: "The victim must choose one of their limbs to suffer a Dismembered Critical Injury, and then must choose a different one of their limbs to suffer a Broken Critical Injury." 
  },
  { 
    id: '15', 
    name: 'The Devil', 
    number: 15, 
    roman: 'XV',
    suit: 'major', 
    description: 'Shadow Self, Attachment, Addiction', 
    effect: "This Attack now hits the head, even if it was originally aimed elsewhere. Additionally, the victim suffers the Brain Injury and Lost Ear Critical Injuries." 
  },
  { 
    id: '16', 
    name: 'The Tower', 
    number: 16, 
    roman: 'XVI',
    suit: 'major', 
    description: 'Sudden Change, Upheaval, Chaos, Revelation', 
    effect: "The victim suffers the Cracked Skull, Crushed Windpipe, and Whiplash Critical Injuries. These Injuries deal no Bonus Damage. For one hour, the victim cannot feel pain and can ignore the effects of the Seriously Wounded Wound State." 
  },
  { 
    id: '17', 
    name: 'The Star', 
    number: 17, 
    roman: 'XVII',
    suit: 'major', 
    description: 'Hope, Faith, Purpose, Renewal, Spirituality', 
    effect: "If the Star was drawn due to a Ranged Attack, it hits the first target, passes through, and ricochets into a second enemy within 20 m/yards, chosen by the GM. If there is no additional enemy, the ricochet instead hits the original target a second time. This ricochet Attack always hits and does so in the body. Roll new damage dice for the ricochet Attack. If The Star was drawn due to a Melee Attack, the victim suffers the Broken Ribs and Collapsed Lung Critical Injuries." 
  },
  { 
    id: '18', 
    name: 'The Moon', 
    number: 18, 
    roman: 'XVIII',
    suit: 'major', 
    description: 'Illusion, Fear, Anxiety, Subconscious', 
    effect: "The victim suffers the Foreign Object Critical Injury twice, once in the body and once in the head. If The Moon was drawn by a Melee Attack made using a melee weapon, that weapon is now stuck in the victim's body, and the attacker is disarmed." 
  },
  { 
    id: '19', 
    name: 'The Sun', 
    number: 19, 
    roman: 'XIX',
    suit: 'major', 
    description: 'Positivity, Fun, Warmth, Success, Vitality', 
    effect: "If the victim is carrying any grenades or other explosives, the GM chooses one of them to explode immediately. If they weren't carrying any grenades, the GM chooses a non-weapon piece of equipment on the victim to destroy beyond repair." 
  },
  { 
    id: '20', 
    name: 'Judgement', 
    number: 20, 
    roman: 'XX',
    suit: 'major', 
    description: 'Judgement, Rebirth, Inner Calling, Absolution', 
    effect: "The victim suffers the Crushed Fingers Critical Injury on one of their hands, and the Dismembered Hand Critical Injury on another hand." 
  },
  { 
    id: '21', 
    name: 'The World', 
    number: 21, 
    roman: 'XXI',
    suit: 'major', 
    description: 'Completion, Integration, Accomplishment, Travel', 
    effect: "The character who caused The World to be drawn may take an additional Turn after this one. During this additional Turn they receive a +5 to any Skill Check, ignore the negative effects of all Wound States, and do not have to make a Death Save if Mortally Wounded." 
  }
];

interface TarotRollerProps {
  deckState: TarotDeckState;
  setDeckState: (state: TarotDeckState | ((prev: TarotDeckState) => TarotDeckState)) => void;
}

export function TarotRoller({ deckState, setDeckState }: TarotRollerProps) {
  const [drawnCard, setDrawnCard] = useState<TarotCard | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState<TarotCard[]>([]);
  
  // Get top card from current deck order
  const topCard = useMemo(() => {
    const topId = deckState.cardIds[0];
    return TAROT_CARDS.find(c => c.id === topId) || TAROT_CARDS[0];
  }, [deckState.cardIds]);

  const drawCard = () => {
    if (deckState.drawnThisSession) {
      toast.error('Only one Tarot card can be pulled per game session.');
      return;
    }

    setIsDrawing(true);
    setDrawnCard(null);
    
    // Animate the draw
    setTimeout(() => {
      const card = topCard;
      
      setDrawnCard(card);
      setDrawHistory(prev => [card, ...prev].slice(0, 10));
      setIsDrawing(false);
      
      // Update deck state: card goes to bottom, increment seen count, set session flag
      setDeckState(prev => {
        const newCardIds = [...prev.cardIds.slice(1), prev.cardIds[0]];
        const newSeenCount = prev.cardsSeenCount + 1;
        
        // Shuffle rule: after all 22 seen, shuffle
        if (newSeenCount >= 22) {
          const shuffledIds = [...newCardIds];
          for (let i = shuffledIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
          }
          return {
            cardIds: shuffledIds,
            drawnThisSession: true,
            cardsSeenCount: 0
          };
        }

        return {
          ...prev,
          cardIds: newCardIds,
          drawnThisSession: true,
          cardsSeenCount: newSeenCount
        };
      });
      
      toast.success(`Drew ${card.name}!`);
    }, 800);
  };
  
  const resetSessionLimit = () => {
    setDeckState(prev => ({ ...prev, drawnThisSession: false }));
    toast.success('Session limit reset. You can draw another card.');
  };

  const getCardColor = (suit: string) => {
    switch (suit) {
      case 'major': return 'from-amber-500/20 to-orange-600/20 border-amber-500/50';
      case 'cups': return 'from-blue-500/20 to-cyan-600/20 border-blue-500/50';
      case 'pentacles': return 'from-emerald-500/20 to-green-600/20 border-emerald-500/50';
      case 'swords': return 'from-slate-500/20 to-gray-600/20 border-slate-500/50';
      case 'wands': return 'from-red-500/20 to-rose-600/20 border-red-500/50';
      default: return 'from-primary/20 to-primary/10 border-primary/50';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Night City Tarot
          </h2>
          <p className="text-sm text-muted-foreground">
            {deckState.cardsSeenCount}/22 cards seen. One pull allowed per session.
          </p>
        </div>
      </div>
      
      {deckState.drawnThisSession && (
        <div className="bg-warning/20 border border-warning/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning">Session limit reached</p>
            <p className="text-xs text-muted-foreground mt-1">
              Only one card can be pulled per session. You can reset this manually if needed.
            </p>
            <Button onClick={resetSessionLimit} variant="outline" size="sm" className="mt-2 text-xs">
              Reset Session Limit
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={drawCard} 
          disabled={isDrawing || deckState.drawnThisSession}
          className="cyber-btn text-lg px-8 py-6"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isDrawing ? 'animate-spin' : ''}`} />
          {isDrawing ? 'Drawing...' : 'Draw Tarot Card'}
        </Button>
      </div>
      
      {/* Drawn Card */}
      {drawnCard && (
        <div className={`glass-card rounded-xl p-6 border-2 bg-gradient-to-br ${getCardColor(drawnCard.suit)} animate-in`}>
          <div className="flex items-start gap-4">
            {/* Card Visual */}
            <div className="w-24 h-36 rounded-lg bg-card border-2 flex flex-col items-center justify-center p-2 relative">
              <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {drawnCard.roman || drawnCard.number}
              </div>
              <div className="text-xs text-center mt-1 text-muted-foreground uppercase">
                {drawnCard.suit}
              </div>
            </div>
            
            {/* Card Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {drawnCard.name}
                </h3>
              </div>
              
              <p className="text-muted-foreground mb-4">{drawnCard.description}</p>
              
              <div className="p-4 bg-background/50 rounded-lg">
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Combat Effect
                </h4>
                <p className="text-sm md:text-base leading-relaxed">
                  {drawnCard.effect}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Draw History */}
      {drawHistory.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Dices className="w-5 h-5 text-primary" />
            Recent Draws
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {drawHistory.map((card, index) => (
              <button
                key={index}
                onClick={() => {
                  setDrawnCard(card);
                }}
                className="px-3 py-2 rounded-lg border text-sm transition-all hover:border-primary border-border bg-secondary/50"
              >
                {card.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Official Rules</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <strong>Trigger:</strong> Draw when 3+ damage dice show 6s on a single-target Melee/Ranged Attack.</li>
          <li>• <strong>Restriction:</strong> Both attacker and defender must be capable of sustaining Critical Injuries (e.g. no drones).</li>
          <li>• <strong>Limit:</strong> Only one Tarot card can be pulled per game session.</li>
          <li>• <strong>Deck:</strong> Cards go to the bottom. No shuffling until all 22 cards have appeared once.</li>
          <li>• <strong>Bonus Damage:</strong> Each Injury inflicted by a card deals +5 HP damage unless noted otherwise.</li>
        </ul>
      </div>
    </div>
  );
}
