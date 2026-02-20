import { useState, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, RotateCcw, ChevronDown, ChevronUp,
  Clock, Users, Target, Skull
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EncounterState, Participant } from '@/types';

interface FloatingCombatControlsProps {
  encounter: EncounterState;
  participants: Participant[];
  activeTurnParticipant: Participant | null;
  onNextTurn: () => void;
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
  
  // Count active (non-dead, non-seriously wounded) participants
  const activeParticipants = participants.filter(p => 
    p.woundState !== 'dead' && p.woundState !== 'mortally-wounded'
  );
  
  const deadParticipants = participants.filter(p => p.woundState === 'dead');
  
  if (!encounter.active && participants.length === 0) {
    return null;
  }
  
  return (
    <div 
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="glass-card rounded-2xl shadow-2xl border border-primary/30 overflow-hidden min-w-[400px]">
        {/* Header - Always visible */}
        <div 
          className="flex items-center justify-between px-4 py-2 bg-primary/10 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-mono font-bold">Round {encounter.round}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm">{activeParticipants.length}/{participants.length}</span>
            </div>
            {deadParticipants.length > 0 && (
              <>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1 text-destructive">
                  <Skull className="w-3 h-3" />
                  <span className="text-xs">{deadParticipants.length}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {encounter.active && (
              <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded-full animate-pulse">
                Active
              </span>
            )}
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4">
            {/* Current Turn Info */}
            {encounter.active && activeTurnParticipant && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Current Turn
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="font-bold text-lg">{activeTurnParticipant.name}</span>
                  <span className="text-sm text-muted-foreground">
                    (Init: {activeTurnParticipant.total})
                  </span>
                </div>
              </div>
            )}
            
            {/* Controls */}
            <div className="flex flex-wrap gap-2 justify-center">
              {encounter.active ? (
                <>
                  <Button 
                    onClick={onNextTurn}
                    className="cyber-btn gap-2"
                    size="sm"
                  >
                    <SkipForward className="w-4 h-4" />
                    Next Turn
                  </Button>
                  <Button 
                    onClick={onPauseEncounter}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                </>
              ) : (
                <>
                  {participants.length > 0 && (
                    <Button 
                      onClick={onResumeEncounter}
                      className="cyber-btn gap-2"
                      size="sm"
                    >
                      <Play className="w-4 h-4" />
                      Resume
                    </Button>
                  )}
                </>
              )}
              
              <Button 
                onClick={onResetEncounter}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              
              {encounter.active && (
                <Button 
                  onClick={onEndEncounter}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <Skull className="w-4 h-4" />
                  End
                </Button>
              )}
            </div>
            
            {/* Turn Order Preview */}
            {encounter.active && participants.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Turn Order
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {participants
                    .filter(p => p.total !== undefined)
                    .sort((a, b) => (b.total || 0) - (a.total || 0))
                    .slice(0, 5)
                    .map((p) => (
                      <div 
                        key={p.id}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm ${
                          activeTurnParticipant?.id === p.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary'
                        }`}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 font-mono opacity-70">{p.total}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
