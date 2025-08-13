import React from 'react';
import './FloatingCombatControls.css';

interface Participant {
  id: string;
  name: string;
  total?: number;
  hp?: number;
  maxHp?: number;
  dead?: boolean;
  woundState?: string;
}

interface Encounter {
  active: boolean;
  round: number;
  turnIndex: number;
  archived: boolean;
}

interface FloatingCombatControlsProps {
  encounter: Encounter;
  activeTurnParticipant: Participant | null;
  nextTurn: () => void;
  endEncounter: () => void;
}

export default function FloatingCombatControls({ 
  encounter, 
  activeTurnParticipant, 
  nextTurn, 
  endEncounter 
}: FloatingCombatControlsProps) {
  // Debug logging
  console.log('FloatingCombatControls render:', { encounter, activeTurnParticipant });
  
  if (!encounter.active) return null;

  return (
    <div className="floating-combat-controls">
      <div className="combat-info">
        <div className="round-info">
          <span className="round-label">Round</span>
          <span className="round-number">{encounter.round}</span>
        </div>
        <div className="turn-info">
          <span className="turn-label">Current Turn:</span>
          <span className="turn-name">{activeTurnParticipant?.name || 'None'}</span>
        </div>
      </div>
      <div className="combat-controls">
        <button onClick={nextTurn} className="next-turn-btn">
          Next Turn
        </button>
        <button onClick={endEncounter} className="end-encounter-btn">
          End Combat
        </button>
      </div>
    </div>
  );
}
