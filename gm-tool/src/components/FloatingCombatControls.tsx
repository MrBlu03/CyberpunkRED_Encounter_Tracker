import { useState } from 'react';
import { 
  Play, Pause, SkipForward, RotateCcw, ChevronDown, ChevronUp,
  Skull, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canAct } from '@/lib/damage';
import type { EncounterState, Participant } from '@/types';

interface FloatingCombatControlsProps {
  encounter: EncounterState;
  participants: Participant[];
  activeTurnParticipant: Participant | null;
  onNextTurn: (targetTurnIndex?: number, targetRound?: number) => void;
  onPauseEncounter: () => void;
  onResumeEncounter: () => void;
  onEndEncounter: () => void;
  onResetEncounter: () => void;
}

export function FloatingCombatControls({
  encounter,
  participants,
  activeTurnParticipant,
  onNextTurn,
  onPauseEncounter,
  onResumeEncounter,
  onEndEncounter,
  onResetEncounter
}: FloatingCombatControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter acting participants ordered by initiative
  const acting = participants
    .filter(p => canAct(p.woundState) && !p.dead && p.hp > 0 && p.total !== undefined)
    .sort((a, b) => (b.total || 0) - (a.total || 0));

  const activeIdx = activeTurnParticipant ? acting.findIndex(p => p.id === activeTurnParticipant.id) : -1;
  const onDeckParticipant = acting.length > 1 && activeIdx !== -1
    ? acting[(activeIdx + 1) % acting.length]
    : null;

  const deadCount = participants.filter(p => p.dead || p.woundState === 'dead').length;

  if (!encounter.active && participants.length === 0) {
    return null;
  }

  const isActivePC = activeTurnParticipant?.isPC || activeTurnParticipant?.affiliation === 'player';
  const isOnDeckPC = onDeckParticipant?.isPC || onDeckParticipant?.affiliation === 'player';

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 pointer-events-auto">
      <div className="flex flex-col items-center">
        {/* Expanded Drawer (Drop-up mini tray) */}
        {isExpanded && (
          <div className="mb-2 p-3 rounded-2xl bg-card/95 border border-primary/40 shadow-2xl backdrop-blur-xl w-80 sm:w-96 text-xs font-mono space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Header & Stats */}
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-foreground font-bold uppercase">Combat Queue</span>
                <span>•</span>
                <span>{acting.length} Active</span>
                {deadCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-destructive flex items-center gap-1">
                      <Skull className="w-3 h-3" /> {deadCount}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:text-foreground text-[11px] p-0.5 cursor-pointer"
                title="Close drawer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Initiative Queue Horizontal Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {acting.map((p, idx) => {
                const isCurrent = activeTurnParticipant?.id === p.id;
                const isOnDeck = onDeckParticipant?.id === p.id;
                const isPC = p.isPC || p.affiliation === 'player';

                return (
                  <div
                    key={p.id}
                    className={`flex-shrink-0 px-2 py-1 rounded-md text-[11px] flex items-center gap-1 border transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                        : isOnDeck
                          ? 'bg-secondary/70 text-foreground border-primary/50'
                          : 'bg-secondary/30 text-muted-foreground border-border/40'
                    }`}
                  >
                    <span className="opacity-70 text-[9px]">#{idx + 1}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPC ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="truncate max-w-[80px]">{p.name}</span>
                    <span className="opacity-75 font-bold">{p.total}</span>
                  </div>
                );
              })}
            </div>

            {/* Combat Lifecycle Controls */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
              {encounter.active ? (
                <Button
                  onClick={onPauseEncounter}
                  variant="outline"
                  size="sm"
                  className="cyber-btn h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground border-border"
                >
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={onResumeEncounter}
                  size="sm"
                  className="cyber-btn h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              )}

              <Button
                onClick={onResetEncounter}
                variant="outline"
                size="sm"
                className="cyber-btn h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground border-border"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>

              {encounter.active && (
                <Button
                  onClick={onEndEncounter}
                  variant="outline"
                  size="sm"
                  className="cyber-btn h-7 px-2.5 text-[11px] text-destructive hover:bg-destructive/15 border-destructive/40"
                >
                  <Skull className="w-3 h-3 mr-1" />
                  End
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Main Sleek Floating Pill Bar (Always Visible, Compact, Non-Obtrusive) */}
        <div className="flex items-center gap-2 p-1 px-2.5 rounded-xl bg-card/85 border border-primary/30 shadow-lg backdrop-blur-md text-xs font-mono select-none hover:border-primary/60 transition-all">
          {/* Round Indicator */}
          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-black text-[11px] border border-primary/30">
            R{encounter.round}
          </span>

          {/* Active Turn */}
          <div className="flex items-center gap-1.5 max-w-[150px] truncate" title={`Active Turn: ${activeTurnParticipant?.name ?? 'None'}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActivePC ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Turn:</span>
            <span className="font-bold text-foreground truncate text-[11px]">
              {activeTurnParticipant?.name || 'Standby'}
            </span>
          </div>

          {/* On Deck Indicator */}
          {onDeckParticipant && (
            <div className="hidden sm:flex items-center gap-1.5 border-l border-border/60 pl-2 max-w-[150px] truncate" title={`On Deck (Next): ${onDeckParticipant.name}`}>
              <UserCheck className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Deck:</span>
              <span className={`text-[11px] truncate ${isOnDeckPC ? 'text-emerald-400/90' : 'text-foreground/80'}`}>
                {onDeckParticipant.name}
              </span>
            </div>
          )}

          {/* Next Turn Button */}
          {encounter.active && (
            <Button
              onClick={() => onNextTurn()}
              size="sm"
              className="cyber-btn h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold font-mono flex items-center gap-1 shadow-sm cursor-pointer ml-1"
              title="Advance to next turn"
            >
              <span>Next</span>
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title={isExpanded ? 'Hide combat queue & controls' : 'Show combat queue & controls'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
