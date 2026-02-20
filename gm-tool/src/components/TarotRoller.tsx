import { useState } from 'react';
import { Dices, Sparkles, RefreshCw, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { d100 } from '@/lib/dice';
import type { TarotCard } from '@/types';

const TAROT_CARDS: TarotCard[] = [
  // Major Arcana
  { id: '0', name: 'The Fool', number: 0, suit: 'major', description: 'New beginnings, innocence, spontaneity', effect: 'The next roll is made with Advantage' },
  { id: '1', name: 'The Magician', number: 1, suit: 'major', description: 'Manifestation, resourcefulness, power', effect: 'Gain a temporary +2 to any one skill for 1 hour' },
  { id: '2', name: 'The High Priestess', number: 2, suit: 'major', description: 'Intuition, sacred knowledge, divine feminine', effect: 'Learn one secret about the current situation' },
  { id: '3', name: 'The Empress', number: 3, suit: 'major', description: 'Femininity, beauty, nature, abundance', effect: 'Recover 1d6 HP immediately' },
  { id: '4', name: 'The Emperor', number: 4, suit: 'major', description: 'Authority, establishment, structure', effect: 'Gain +2 to COOL-based skills for 1 hour' },
  { id: '5', name: 'The Hierophant', number: 5, suit: 'major', description: 'Spiritual wisdom, religious beliefs', effect: 'A contact offers help or information' },
  { id: '6', name: 'The Lovers', number: 6, suit: 'major', description: 'Love, harmony, relationships, choices', effect: 'An NPC becomes friendly or helpful' },
  { id: '7', name: 'The Chariot', number: 7, suit: 'major', description: 'Control, willpower, success, action', effect: 'Movement speed doubled for 10 minutes' },
  { id: '8', name: 'Strength', number: 8, suit: 'major', description: 'Strength, courage, persuasion, influence', effect: 'Gain +2 to BODY for 1 hour' },
  { id: '9', name: 'The Hermit', number: 9, suit: 'major', description: 'Soul-searching, introspection, solitude', effect: 'Become invisible to electronic detection for 10 minutes' },
  { id: '10', name: 'Wheel of Fortune', number: 10, suit: 'major', description: 'Good luck, karma, life cycles, destiny', effect: 'Reroll any one roll immediately' },
  { id: '11', name: 'Justice', number: 11, suit: 'major', description: 'Justice, fairness, truth, law', effect: 'A legal problem is resolved in your favor' },
  { id: '12', name: 'The Hanged Man', number: 12, suit: 'major', description: 'Pause, surrender, letting go, new perspectives', effect: 'Take no action this round, but gain +4 to next initiative' },
  { id: '13', name: 'Death', number: 13, suit: 'major', description: 'Endings, change, transformation, transition', effect: 'Something must end for something new to begin' },
  { id: '14', name: 'Temperance', number: 14, suit: 'major', description: 'Balance, moderation, patience, purpose', effect: 'Stabilize a dying character automatically' },
  { id: '15', name: 'The Devil', number: 15, suit: 'major', description: 'Shadow self, attachment, addiction, restriction', effect: 'An enemy gains Advantage against you once' },
  { id: '16', name: 'The Tower', number: 16, suit: 'major', description: 'Sudden change, upheaval, chaos, revelation', effect: 'A plan fails catastrophically' },
  { id: '17', name: 'The Star', number: 17, suit: 'major', description: 'Hope, faith, purpose, renewal, spirituality', effect: 'Inspiration strikes - gain a creative solution' },
  { id: '18', name: 'The Moon', number: 18, suit: 'major', description: 'Illusion, fear, anxiety, subconscious, intuition', effect: 'Something is not as it appears' },
  { id: '19', name: 'The Sun', number: 19, suit: 'major', description: 'Positivity, fun, warmth, success, vitality', effect: 'All rolls gain +1 for the next hour' },
  { id: '20', name: 'Judgement', number: 20, suit: 'major', description: 'Judgement, rebirth, inner calling, absolution', effect: 'A past action returns to help or haunt you' },
  { id: '21', name: 'The World', number: 21, suit: 'major', description: 'Completion, integration, accomplishment, travel', effect: 'A long-term goal is achieved' }
];

export function TarotRoller() {
  const [drawnCard, setDrawnCard] = useState<TarotCard | null>(null);
  const [isReversed, setIsReversed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHistory, setDrawHistory] = useState<{ card: TarotCard; reversed: boolean }[]>([]);
  
  const drawCard = () => {
    setIsDrawing(true);
    setDrawnCard(null);
    
    // Animate the draw
    setTimeout(() => {
      const roll = d100();
      // Map 1-100 to 0-21 (Major Arcana only for now)
      const cardIndex = Math.floor((roll - 1) / 4.76) % 22;
      const card = TAROT_CARDS[cardIndex];
      const reversed = Math.random() < 0.15; // 15% chance of reversed
      
      setDrawnCard(card);
      setIsReversed(reversed);
      setDrawHistory(prev => [{ card, reversed }, ...prev].slice(0, 10));
      setIsDrawing(false);
      
      toast.success(`Drew ${card.name}${reversed ? ' (Reversed)' : ''}!`);
    }, 800);
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
            Draw cards for narrative inspiration and random events
          </p>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button 
          onClick={drawCard} 
          disabled={isDrawing}
          className="cyber-btn text-lg px-8 py-6"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${isDrawing ? 'animate-spin' : ''}`} />
          {isDrawing ? 'Drawing...' : 'Draw a Card'}
        </Button>
      </div>
      
      {/* Drawn Card */}
      {drawnCard && (
        <div className={`glass-card rounded-xl p-6 border-2 bg-gradient-to-br ${getCardColor(drawnCard.suit)} animate-in`}>
          <div className="flex items-start gap-4">
            {/* Card Visual */}
            <div className={`w-24 h-36 rounded-lg bg-card border-2 flex flex-col items-center justify-center p-2 ${isReversed ? 'rotate-180' : ''}`}>
              <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                {drawnCard.number}
              </div>
              <div className="text-xs text-center mt-1 text-muted-foreground uppercase">
                {drawnCard.suit}
              </div>
              {isReversed && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center">
                  <Moon className="w-3 h-3" />
                </div>
              )}
            </div>
            
            {/* Card Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {drawnCard.name}
                </h3>
                {isReversed && (
                  <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-xs rounded-full">
                    Reversed
                  </span>
                )}
              </div>
              
              <p className="text-muted-foreground mb-4">{drawnCard.description}</p>
              
              <div className="p-4 bg-background/50 rounded-lg">
                <h4 className="font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Game Effect
                </h4>
                <p>{isReversed ? `Reversed: ${drawnCard.effect} (with negative twist)` : drawnCard.effect}</p>
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
            {drawHistory.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setDrawnCard(item.card);
                  setIsReversed(item.reversed);
                }}
                className={`px-3 py-2 rounded-lg border text-sm transition-all hover:border-primary ${
                  item.reversed ? 'border-destructive/50 bg-destructive/10' : 'border-border bg-secondary/50'
                }`}
              >
                <span className={item.reversed ? 'text-destructive' : ''}>
                  {item.card.name}
                </span>
                {item.reversed && <Moon className="w-3 h-3 inline ml-1" />}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>How to Use</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Draw a card when you need narrative inspiration</li>
          <li>• Use the game effect as a guide for random events</li>
          <li>• Reversed cards (15% chance) indicate complications or negative twists</li>
          <li>• The Major Arcana represent significant events and turning points</li>
        </ul>
      </div>
    </div>
  );
}
