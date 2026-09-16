import React, { useState, useCallback } from 'react';
import { 
  Network, Plus, Trash2, Save, Play, 
  Skull, FileText, Lock, 
  Cpu, Zap, Terminal, Eye, EyeOff,
  Dice5, Download, Upload, LogOut,
  Info, Edit3, X, Key, RefreshCw, Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { d6, d10, rollDice } from '@/lib/dice';
import { rollD10Exploding } from '@/lib/combatEngine';
import type { 
  NETArchitecture, 
  ArchitectureFloor, 
  FloorContent,
  ArchitectureDifficulty,
  BlackICEType,
  ActiveNetrun,
  NetrunnerState,
  NetrunLogEntry
} from '@/types/netrunning';
import {
  difficultySettings,
  blackICEDefinitions,
  demonDefinitions,
  lobbyTable,
  architectureBodyTables,
  controlNodeTypes,
  fileContentExamples
} from '@/types/netrunning';

// ICE Detail Dialog
const ICEDetailDialog = ({ 
  content, 
  onClose 
}: { 
  content: FloorContent; 
  onClose: () => void;
}) => {
  if (!content.blackICE && !content.demon) return null;
  
  const ice = content.blackICE || content.demon;
  if (!ice) return null;
  
  const isBlackICE = content.type === 'black-ice';
  const blackICE = content.blackICE;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isBlackICE ? <Skull className="w-6 h-6 text-destructive" /> : <Zap className="w-6 h-6 text-destructive" />}
            <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {ice.name}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {isBlackICE && blackICE && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded text-xs ${blackICE.class === 'anti-personnel' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>
                {blackICE.class === 'anti-personnel' ? 'Anti-Personnel' : 'Anti-Program'}
              </span>
              <span className="px-2 py-1 rounded text-xs bg-secondary">
                REZ: {blackICE.rez}
              </span>
              <span className="px-2 py-1 rounded text-xs bg-secondary">
                {blackICE.cost}eb
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-xs text-muted-foreground">PER</div>
                <div className="font-mono font-bold">{blackICE.perception}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-xs text-muted-foreground">SPD</div>
                <div className="font-mono font-bold">{blackICE.speed}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-xs text-muted-foreground">ATK</div>
                <div className="font-mono font-bold">{blackICE.attack}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-xs text-muted-foreground">DEF</div>
                <div className="font-mono font-bold">{blackICE.defense}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1 text-sm">Description</h4>
              <p className="text-sm text-muted-foreground">{blackICE.description}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1 text-sm">Effect</h4>
              <p className="text-sm bg-destructive/10 border border-destructive/30 rounded p-3">
                {blackICE.effect}
              </p>
            </div>
            
            {blackICE.flavorText && (
              <div>
                <h4 className="font-semibold mb-1 text-sm">Flavor</h4>
                <p className="text-sm text-muted-foreground italic">"{blackICE.flavorText}"</p>
              </div>
            )}
          </div>
        )}
        
        {!isBlackICE && content.demon && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded text-xs bg-destructive/20 text-destructive">Demon</span>
              <span className="px-2 py-1 rounded text-xs bg-secondary">REZ: {content.demon.rez}</span>
              <span className="px-2 py-1 rounded text-xs bg-secondary">Interface: {content.demon.interface}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-xs text-muted-foreground">NET Actions</div>
                <div className="font-mono font-bold">{content.demon.netActions}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-xs text-muted-foreground">Combat #</div>
                <div className="font-mono font-bold">{content.demon.combatNumber}</div>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <div className="text-xs text-muted-foreground">Cost</div>
                <div className="font-mono font-bold">{content.demon.cost}eb</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-1 text-sm">Description</h4>
              <p className="text-sm text-muted-foreground">{content.demon.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Floor content component with ICE details
const FloorContentItem = ({ 
  content, 
  onToggleDefeated, 
  onToggleAccessed,
  onShowDetails
}: { 
  content: FloorContent; 
  onToggleDefeated?: () => void;
  onToggleAccessed?: () => void;
  onShowDetails?: () => void;
}) => {
  const getIcon = () => {
    switch (content.type) {
      case 'file': return <FileText className="w-4 h-4 text-primary" />;
      case 'password': return <Lock className="w-4 h-4 text-warning" />;
      case 'control-node': return <Cpu className="w-4 h-4 text-success" />;
      case 'black-ice': return <Skull className="w-4 h-4 text-destructive" />;
      case 'demon': return <Zap className="w-4 h-4 text-destructive" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  const getName = () => {
    if (content.blackICE) return content.blackICE.name;
    if (content.demon) return content.demon.name;
    if (content.controlNodeType) return `Control: ${content.controlNodeType}`;
    if (content.fileContent) return `File: ${content.fileContent}`;
    return content.name;
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded ${content.defeated ? 'opacity-50' : ''} ${content.accessed ? 'bg-success/20' : 'bg-secondary/50'}`}>
      {getIcon()}
      <span className="flex-1 text-sm">{getName()}</span>
      <span className="text-xs text-muted-foreground font-mono">DV{content.dv}</span>
      {(content.type === 'black-ice' || content.type === 'demon') && onShowDetails && (
        <button
          onClick={onShowDetails}
          className="p-1 rounded bg-info/20 text-info hover:bg-info/30"
          title="View Details"
        >
          <Info className="w-3 h-3" />
        </button>
      )}
      {content.type === 'black-ice' && onToggleDefeated && (
        <button
          onClick={onToggleDefeated}
          className={`p-1 rounded ${content.defeated ? 'bg-success text-success-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
          title={content.defeated ? 'Reactivate' : 'Defeat'}
        >
          <Skull className="w-3 h-3" />
        </button>
      )}
      {(content.type === 'password' || content.type === 'file' || content.type === 'control-node') && onToggleAccessed && (
        <button
          onClick={onToggleAccessed}
          className={`p-1 rounded ${content.accessed ? 'bg-success text-success-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
          title={content.accessed ? 'Lock' : 'Access'}
        >
          {content.accessed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};

// Floor component
const FloorCard = ({ 
  floor, 
  isCurrentFloor,
  isRevealed,
  onToggleRevealed,
  onContentUpdate,
  onShowICEDetails,
  isEditing,
  onEditFloor
}: { 
  floor: ArchitectureFloor; 
  isCurrentFloor?: boolean;
  isRevealed?: boolean;
  onToggleRevealed?: () => void;
  onContentUpdate?: (contentId: string, updates: Partial<FloorContent>) => void;
  onShowICEDetails?: (content: FloorContent) => void;
  isEditing?: boolean;
  onEditFloor?: (floor: ArchitectureFloor) => void;
}) => {
  const hasBlackICE = floor.contents.some(c => c.type === 'black-ice' && !c.defeated);
  const hasDemon = floor.contents.some(c => c.type === 'demon');

  return (
    <div className={`glass-card rounded-lg p-4 ${isCurrentFloor ? 'border-primary border-2 pulse-glow' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Floor {floor.floorNumber}
          </span>
          {floor.branch !== 'main' && (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded">Branch {floor.branch}</span>
          )}
          {hasBlackICE && <Skull className="w-4 h-4 text-destructive" />}
          {hasDemon && <Zap className="w-4 h-4 text-destructive" />}
        </div>
        <div className="flex items-center gap-1">
          {isEditing && onEditFloor && (
            <button
              onClick={() => onEditFloor(floor)}
              className="p-1 hover:bg-secondary rounded"
              title="Edit Floor"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onToggleRevealed && (
            <button
              onClick={onToggleRevealed}
              className="p-1 hover:bg-secondary rounded"
              title={isRevealed ? 'Hide' : 'Reveal'}
            >
              {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      
      {(!onToggleRevealed || isRevealed || isEditing) && (
        <div className="space-y-2">
          {floor.contents.map(content => (
            <FloorContentItem
              key={content.id}
              content={content}
              onToggleDefeated={onContentUpdate ? () => onContentUpdate(content.id, { defeated: !content.defeated }) : undefined}
              onToggleAccessed={onContentUpdate ? () => onContentUpdate(content.id, { accessed: !content.accessed }) : undefined}
              onShowDetails={onShowICEDetails ? () => onShowICEDetails(content) : undefined}
            />
          ))}
        </div>
      )}
      
      {onToggleRevealed && !isRevealed && !isEditing && (
        <div className="text-center py-4 text-muted-foreground">
          <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Hidden from Netrunner</p>
        </div>
      )}
    </div>
  );
};

// Manual Floor Editor
const FloorEditor = ({
  floor,
  onSave,
  onCancel
}: {
  floor: ArchitectureFloor;
  onSave: (floor: ArchitectureFloor) => void;
  onCancel: () => void;
}) => {
  const [editedFloor, setEditedFloor] = useState<ArchitectureFloor>({ ...floor });
  
  const addContent = (type: FloorContent['type']) => {
    const settings = difficultySettings.standard;
    let newContent: FloorContent;
    
    switch (type) {
      case 'file':
        newContent = {
          id: crypto.randomUUID(),
          type: 'file',
          name: 'File',
          dv: settings.fileDV,
          fileContent: fileContentExamples[0]
        };
        break;
      case 'password':
        newContent = {
          id: crypto.randomUUID(),
          type: 'password',
          name: 'Password',
          dv: settings.passwordDV
        };
        break;
      case 'control-node':
        newContent = {
          id: crypto.randomUUID(),
          type: 'control-node',
          name: 'Control Node',
          dv: settings.controlDV,
          controlNodeType: controlNodeTypes[0]
        };
        break;
      case 'black-ice':
        const iceTypes = Object.keys(blackICEDefinitions) as BlackICEType[];
        const randomICE = iceTypes[Math.floor(Math.random() * iceTypes.length)];
        const iceDef = blackICEDefinitions[randomICE];
        newContent = {
          id: crypto.randomUUID(),
          type: 'black-ice',
          name: iceDef.name,
          dv: iceDef.rez,
          blackICE: { ...iceDef }
        };
        break;
      default:
        return;
    }
    
    setEditedFloor(prev => ({
      ...prev,
      contents: [...prev.contents, newContent]
    }));
  };
  
  const removeContent = (contentId: string) => {
    setEditedFloor(prev => ({
      ...prev,
      contents: prev.contents.filter(c => c.id !== contentId)
    }));
  };
  
  const updateContent = (contentId: string, updates: Partial<FloorContent>) => {
    setEditedFloor(prev => ({
      ...prev,
      contents: prev.contents.map(c => c.id === contentId ? { ...c, ...updates } : c)
    }));
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Edit Floor {floor.floorNumber}
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {editedFloor.contents.map((content) => (
            <div key={content.id} className="bg-secondary/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{content.name || content.type}</span>
                <button
                  onClick={() => removeContent(content.id)}
                  className="p-1 hover:bg-destructive/20 text-destructive rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">DV</label>
                  <Input
                    type="number"
                    value={content.dv}
                    onChange={e => updateContent(content.id, { dv: parseInt(e.target.value) || 0 })}
                    className="cyber-input"
                  />
                </div>
                
                {content.type === 'file' && (
                  <div>
                    <label className="text-xs text-muted-foreground">Content</label>
                    <select
                      value={content.fileContent}
                      onChange={e => updateContent(content.id, { fileContent: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md"
                    >
                      {fileContentExamples.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {content.type === 'control-node' && (
                  <div>
                    <label className="text-xs text-muted-foreground">Control Type</label>
                    <select
                      value={content.controlNodeType}
                      onChange={e => updateContent(content.id, { controlNodeType: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md"
                    >
                      {controlNodeTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {content.type === 'black-ice' && content.blackICE && (
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Black ICE Type</label>
                    <select
                      value={content.blackICE.type}
                      onChange={e => {
                        const newICE = blackICEDefinitions[e.target.value as BlackICEType];
                        updateContent(content.id, { 
                          blackICE: { ...newICE },
                          name: newICE.name,
                          dv: newICE.rez
                        });
                      }}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md"
                    >
                      {Object.values(blackICEDefinitions).map(ice => (
                        <option key={ice.type} value={ice.type}>
                          {ice.name} ({ice.class}) - REZ {ice.rez}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {editedFloor.contents.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No content on this floor</p>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Add Content:</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => addContent('file')} variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-1" /> File
            </Button>
            <Button onClick={() => addContent('password')} variant="outline" size="sm">
              <Lock className="w-4 h-4 mr-1" /> Password
            </Button>
            <Button onClick={() => addContent('control-node')} variant="outline" size="sm">
              <Cpu className="w-4 h-4 mr-1" /> Control
            </Button>
            <Button onClick={() => addContent('black-ice')} variant="outline" size="sm">
              <Skull className="w-4 h-4 mr-1" /> Black ICE
            </Button>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          <Button onClick={() => onSave(editedFloor)} className="cyber-btn flex-1">
            <Save className="w-4 h-4 mr-2" /> Save Floor
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// Generate random architecture
const generateArchitecture = (
  name: string,
  description: string,
  difficulty: ArchitectureDifficulty
): NETArchitecture => {
  const totalFloors = rollDice(3, 6);
  
  // Determine branches
  const branches: number[] = [];
  let roll = d10();
  while (roll >= 7) {
    branches.push(branches.length + 1);
    roll = d10();
  }
  
  // Distribute floors
  const mainFloors = Math.max(2, totalFloors - branches.length * 2);
  const branchFloors = branches.map(() => 2);
  
  const floors: ArchitectureFloor[] = [];
  let floorNumber = 1;
  
  // Generate main branch
  for (let i = 0; i < mainFloors; i++) {
    const isLobby = i < 2;
    const floor = generateFloor(floorNumber, 'main', isLobby, difficulty, i === mainFloors - 1);
    floors.push(floor);
    floorNumber++;
  }
  
  // Generate branches
  branches.forEach((branchNum, branchIdx) => {
    for (let i = 0; i < (branchFloors[branchIdx] || 2); i++) {
      const floor = generateFloor(floorNumber, branchNum, false, difficulty, false);
      floors.push(floor);
      floorNumber++;
    }
  });
  
  return {
    id: crypto.randomUUID(),
    name,
    description,
    difficulty,
    totalFloors: floors.length,
    floors,
    createdAt: new Date().toISOString()
  };
};

const generateFloor = (
  floorNumber: number,
  branch: 'main' | number,
  isLobby: boolean,
  difficulty: ArchitectureDifficulty,
  isBottomFloor: boolean
): ArchitectureFloor => {
  const settings = difficultySettings[difficulty];
  const contents: FloorContent[] = [];
  
  if (isLobby) {
    // Roll on lobby table
    const lobbyRoll = d6() - 1;
    const lobbyEntry = lobbyTable[lobbyRoll];
    
    if (lobbyEntry.type === 'file') {
      contents.push({
        id: crypto.randomUUID(),
        type: 'file',
        name: 'File',
        dv: settings.fileDV,
        fileContent: fileContentExamples[Math.floor(Math.random() * fileContentExamples.length)]
      });
    } else if (lobbyEntry.type === 'password') {
      contents.push({
        id: crypto.randomUUID(),
        type: 'password',
        name: 'Password',
        dv: settings.passwordDV
      });
    } else if (lobbyEntry.iceType) {
      const iceDef = blackICEDefinitions[lobbyEntry.iceType];
      contents.push({
        id: crypto.randomUUID(),
        type: 'black-ice',
        name: iceDef.name,
        dv: iceDef.rez,
        blackICE: { ...iceDef }
      });
    }
  } else {
    // Roll on body table
    const bodyTable = architectureBodyTables[difficulty];
    const bodyRoll = Math.floor(Math.random() * bodyTable.length);
    const bodyEntry = bodyTable[bodyRoll];
    
    if (bodyEntry.type === 'file') {
      contents.push({
        id: crypto.randomUUID(),
        type: 'file',
        name: 'File',
        dv: settings.fileDV,
        fileContent: fileContentExamples[Math.floor(Math.random() * fileContentExamples.length)]
      });
    } else if (bodyEntry.type === 'password') {
      contents.push({
        id: crypto.randomUUID(),
        type: 'password',
        name: 'Password',
        dv: settings.passwordDV
      });
    } else if (bodyEntry.type === 'control-node') {
      contents.push({
        id: crypto.randomUUID(),
        type: 'control-node',
        name: 'Control Node',
        dv: settings.controlDV,
        controlNodeType: controlNodeTypes[Math.floor(Math.random() * controlNodeTypes.length)]
      });
    } else if (bodyEntry.type === 'black-ice' && bodyEntry.iceType) {
      const count = bodyEntry.count || 1;
      for (let i = 0; i < count; i++) {
        const iceDef = blackICEDefinitions[bodyEntry.iceType];
        contents.push({
          id: crypto.randomUUID(),
          type: 'black-ice',
          name: iceDef.name,
          dv: iceDef.rez,
          blackICE: { ...iceDef }
        });
      }
    }
  }
  
  // Add demon to bottom floor or random floor
  if (isBottomFloor || (floorNumber % 6 === 0 && Math.random() > 0.5)) {
    const demonTypes = ['imp', 'efreet', 'balron'] as const;
    const demonType = demonTypes[Math.random() > 0.7 ? 2 : Math.random() > 0.5 ? 1 : 0];
    const demonDef = demonDefinitions[demonType];
    contents.push({
      id: crypto.randomUUID(),
      type: 'demon',
      name: demonDef.name,
      dv: demonDef.rez,
      demon: { ...demonDef }
    });
  }
  
  return {
    id: crypto.randomUUID(),
    floorNumber,
    branch,
    contents
  };
};

export function NetrunningArchitecture() {
  const [savedArchitectures, setSavedArchitectures] = useLocalStorage<NETArchitecture[]>('cyberpunk-net-architectures', []);
  const [activeRun, setActiveRun] = useLocalStorage<ActiveNetrun | null>('cyberpunk-active-netrun', null);
  
  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [editingArchitecture, setEditingArchitecture] = useState<NETArchitecture | null>(null);
  const [newArchName, setNewArchName] = useState('');
  const [newArchDescription, setNewArchDescription] = useState('');
  const [newArchDifficulty, setNewArchDifficulty] = useState<ArchitectureDifficulty>('standard');
  const [previewArchitecture, setPreviewArchitecture] = useState<NETArchitecture | null>(null);
  
  // Running state
  const [netrunnerName, setNetrunnerName] = useState('');
  const [netrunnerInterface, setNetrunnerInterface] = useState(4);
  const [netrunnerHP, setNetrunnerHP] = useState(30);
  const [revealedFloors, setRevealedFloors] = useState<Set<string>>(new Set());
  const [currentFloorId, setCurrentFloorId] = useState<string | null>(null);
  const [netrunLog, setNetrunLog] = useState<NetrunLogEntry[]>([]);
  
  // RAW Action Point Tracking & Virus State
  const [netRound, setNetRound] = useState(1);
  const [netActionsRemaining, setNetActionsRemaining] = useState(3);
  const [showVirusModal, setShowVirusModal] = useState(false);
  const [virusInstructions, setVirusInstructions] = useState('');
  const [virusDV, setVirusDV] = useState(8);

  // RAW Cyberpunk RED NET Actions per turn based on Interface rank (p. 198)
  const getMaxNetActions = useCallback((iface: number) => {
    if (iface >= 10) return 5;
    if (iface >= 7) return 4;
    if (iface >= 4) return 3;
    return 2;
  }, []);
  
  // ICE details dialog
  const [selectedICE, setSelectedICE] = useState<FloorContent | null>(null);
  
  // Floor editor
  const [editingFloor, setEditingFloor] = useState<ArchitectureFloor | null>(null);
  
  // Generate preview
  const generatePreview = useCallback(() => {
    if (!newArchName) {
      toast.error('Enter a name first');
      return;
    }
    const preview = generateArchitecture(newArchName, newArchDescription, newArchDifficulty);
    setPreviewArchitecture(preview);
    setEditingArchitecture(preview);
  }, [newArchName, newArchDescription, newArchDifficulty]);
  
  // Create blank architecture for manual editing
  const createBlankArchitecture = useCallback(() => {
    if (!newArchName) {
      toast.error('Enter a name first');
      return;
    }
    const blank: NETArchitecture = {
      id: crypto.randomUUID(),
      name: newArchName,
      description: newArchDescription,
      difficulty: newArchDifficulty,
      totalFloors: 0,
      floors: [],
      createdAt: new Date().toISOString()
    };
    setPreviewArchitecture(blank);
    setEditingArchitecture(blank);
    setIsManualEditing(true);
  }, [newArchName, newArchDescription, newArchDifficulty]);
  
  // Add floor to manual architecture
  const addFloor = useCallback(() => {
    if (!editingArchitecture) return;
    
    const newFloor: ArchitectureFloor = {
      id: crypto.randomUUID(),
      floorNumber: editingArchitecture.floors.length + 1,
      branch: 'main',
      contents: []
    };
    
    const updated = {
      ...editingArchitecture,
      totalFloors: editingArchitecture.floors.length + 1,
      floors: [...editingArchitecture.floors, newFloor]
    };
    
    setEditingArchitecture(updated);
    setPreviewArchitecture(updated);
  }, [editingArchitecture]);
  
  // Update floor in manual architecture
  const updateFloor = useCallback((updatedFloor: ArchitectureFloor) => {
    if (!editingArchitecture) return;
    
    const updated = {
      ...editingArchitecture,
      floors: editingArchitecture.floors.map(f => 
        f.id === updatedFloor.id ? updatedFloor : f
      )
    };
    
    setEditingArchitecture(updated);
    setPreviewArchitecture(updated);
    setEditingFloor(null);
    toast.success('Floor updated');
  }, [editingArchitecture]);
  
  // Remove floor
  const removeFloor = useCallback((floorId: string) => {
    if (!editingArchitecture) return;
    
    const updatedFloors = editingArchitecture.floors.filter(f => f.id !== floorId);
    const renumbered = updatedFloors.map((f, idx) => ({ ...f, floorNumber: idx + 1 }));
    
    const updated = {
      ...editingArchitecture,
      totalFloors: renumbered.length,
      floors: renumbered
    };
    
    setEditingArchitecture(updated);
    setPreviewArchitecture(updated);
  }, [editingArchitecture]);
  
  // Save architecture
  const saveArchitecture = useCallback(() => {
    if (!editingArchitecture) return;
    
    if (editingArchitecture.floors.length === 0) {
      toast.error('Add at least one floor');
      return;
    }
    
    setSavedArchitectures(prev => [...prev, editingArchitecture]);
    toast.success(`Architecture "${editingArchitecture.name}" saved!`);
    setIsCreating(false);
    setIsManualEditing(false);
    setPreviewArchitecture(null);
    setEditingArchitecture(null);
    setNewArchName('');
    setNewArchDescription('');
  }, [editingArchitecture, setSavedArchitectures]);
  
  // Delete architecture
  const deleteArchitecture = useCallback((id: string) => {
    setSavedArchitectures(prev => prev.filter(a => a.id !== id));
    toast.info('Architecture deleted');
  }, [setSavedArchitectures]);
  
  // Start netrun
  const startNetrun = useCallback((architecture: NETArchitecture) => {
    if (!netrunnerName) {
      toast.error('Enter netrunner name first');
      return;
    }
    
    const netrunner: NetrunnerState = {
      name: netrunnerName,
      interface: netrunnerInterface,
      currentFloor: architecture.floors[0]?.id || null,
      rezzedPrograms: [],
      hp: netrunnerHP,
      maxHp: netrunnerHP,
      inCombat: false,
      encounteredICE: []
    };
    
    const newRun: ActiveNetrun = {
      architecture,
      netrunner,
      log: [{
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        floorNumber: 1,
        action: 'Jack In',
        result: `${netrunnerName} jacked into ${architecture.name}`,
        success: true
      }],
      startedAt: new Date().toISOString()
    };
    
    setActiveRun(newRun);
    setCurrentFloorId(architecture.floors[0]?.id || null);
    setRevealedFloors(new Set([architecture.floors[0]?.id || '']));
    setNetrunLog(newRun.log);
    const maxActs = getMaxNetActions(netrunnerInterface);
    setNetRound(1);
    setNetActionsRemaining(maxActs);
    toast.success(`Netrun started! ${netrunnerName} is now in the Architecture.`);
  }, [netrunnerName, netrunnerInterface, netrunnerHP, setActiveRun, getMaxNetActions]);
  
  // End netrun
  const endNetrun = useCallback(() => {
    if (activeRun) {
      const logEntry: NetrunLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        floorNumber: activeRun.architecture.floors.find(f => f.id === currentFloorId)?.floorNumber || 0,
        action: 'Jack Out',
        result: `${activeRun.netrunner.name} jacked out of the Architecture.`,
        success: true
      };
      setNetrunLog(prev => [...prev, logEntry]);
    }
    setActiveRun(null);
    setCurrentFloorId(null);
    setRevealedFloors(new Set());
    toast.info('Netrun ended');
  }, [activeRun, currentFloorId, setActiveRun]);
  
  // Reveal floor
  const revealFloor = useCallback((floorId: string) => {
    setRevealedFloors(prev => new Set([...prev, floorId]));
    
    if (activeRun) {
      const floor = activeRun.architecture.floors.find(f => f.id === floorId);
      if (floor) {
        const logEntry: NetrunLogEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          floorNumber: floor.floorNumber,
          action: 'Pathfinder',
          result: `Floor ${floor.floorNumber} revealed`,
          success: true
        };
        setNetrunLog(prev => [...prev, logEntry]);
      }
    }
  }, [activeRun]);
  
  // Move to floor
  const moveToFloor = useCallback((floorId: string) => {
    setCurrentFloorId(floorId);
    
    if (activeRun) {
      const floor = activeRun.architecture.floors.find(f => f.id === floorId);
      if (floor) {
        const logEntry: NetrunLogEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          floorNumber: floor.floorNumber,
          action: 'Move',
          result: `${activeRun.netrunner.name} moved to Floor ${floor.floorNumber}`,
          success: true
        };
        setNetrunLog(prev => [...prev, logEntry]);
      }
    }
  }, [activeRun]);
  
  // Update floor content
  const updateFloorContent = useCallback((floorId: string, contentId: string, updates: Partial<FloorContent>) => {
    if (!activeRun) return;
    
    const updatedArchitecture = { ...activeRun.architecture };
    const floor = updatedArchitecture.floors.find(f => f.id === floorId);
    if (!floor) return;
    
    const content = floor.contents.find(c => c.id === contentId);
    if (!content) return;
    
    Object.assign(content, updates);
    
    setActiveRun({
      ...activeRun,
      architecture: updatedArchitecture
    });
    
    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: floor.floorNumber,
      action: updates.defeated !== undefined ? 'Defeat ICE' : 'Access',
      result: updates.defeated ? `${content.name} defeated` : content.name + (updates.accessed ? ' accessed' : ' locked'),
      success: true
    };
    setNetrunLog(prev => [...prev, logEntry]);
  }, [activeRun, setActiveRun]);
  
  // Advance Round & Refresh Actions
  const advanceRound = useCallback(() => {
    if (!activeRun) return;
    const nextR = netRound + 1;
    const maxActs = getMaxNetActions(activeRun.netrunner.interface);
    setNetRound(nextR);
    setNetActionsRemaining(maxActs);
    
    const floor = activeRun.architecture.floors.find(f => f.id === currentFloorId);
    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: floor?.floorNumber || 1,
      action: 'Next Turn',
      result: `Turn ${nextR} started. NET Actions refreshed (${maxActs}/${maxActs}).`,
      success: true
    };
    setNetrunLog(prev => [...prev, logEntry]);
    toast.success(`Turn ${nextR} started! Refreshed to ${maxActs} NET Actions.`);
  }, [activeRun, netRound, getMaxNetActions, currentFloorId]);

  // Pathfinder Roll Action
  const handlePathfinder = useCallback((targetDV: number) => {
    if (!activeRun) return;
    if (netActionsRemaining <= 0) {
      toast.error('No NET Actions remaining this turn! Advance turn or reset actions.');
      return;
    }

    const iface = activeRun.netrunner.interface;
    const roll = rollD10Exploding();
    const total = roll.total + iface;
    const success = total >= targetDV;
    const margin = total - targetDV;

    setNetActionsRemaining(prev => Math.max(0, prev - 1));

    const currentFloor = activeRun.architecture.floors.find(f => f.id === currentFloorId);
    const currentNum = currentFloor?.floorNumber || 1;

    let resultMsg = '';
    if (success) {
      const floorsToReveal: string[] = [];
      const numToReveal = targetDV >= 10 ? 99 : (targetDV >= 8 ? 3 : 2);
      activeRun.architecture.floors.forEach(f => {
        if (f.floorNumber >= currentNum && f.floorNumber <= currentNum + numToReveal) {
          floorsToReveal.push(f.id);
        }
      });
      setRevealedFloors(prev => new Set([...prev, ...floorsToReveal]));

      resultMsg = `Pathfinder SUCCEEDED (Rolled ${roll.total} + ${iface} = ${total} vs DV ${targetDV}, margin +${margin}). Revealed ${floorsToReveal.length} floors ahead!`;
      toast.success(resultMsg);
    } else {
      resultMsg = `Pathfinder FAILED (Rolled ${roll.total} + ${iface} = ${total} vs DV ${targetDV}, missed by ${Math.abs(margin)}). Architecture topology remains obscured.`;
      toast.error(resultMsg);
    }

    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: currentNum,
      action: `Pathfinder (DV ${targetDV})`,
      result: resultMsg,
      success
    };
    setNetrunLog(prev => [...prev, logEntry]);
  }, [activeRun, netActionsRemaining, currentFloorId]);

  // Backdoor (Crack Password)
  const handleBackdoor = useCallback((content: FloorContent) => {
    if (!activeRun || !currentFloorId) return;
    if (netActionsRemaining <= 0) {
      toast.error('No NET Actions remaining this turn!');
      return;
    }

    const iface = activeRun.netrunner.interface;
    const roll = rollD10Exploding();
    const total = roll.total + iface;
    const dv = content.dv || 8;
    const success = total >= dv;
    const margin = total - dv;

    setNetActionsRemaining(prev => Math.max(0, prev - 1));
    const currentFloor = activeRun.architecture.floors.find(f => f.id === currentFloorId);
    const currentNum = currentFloor?.floorNumber || 1;

    let resultMsg = '';
    if (success) {
      updateFloorContent(currentFloorId, content.id, { accessed: true });
      resultMsg = `Backdoor SUCCEEDED on "${content.name}" (Rolled ${roll.total} + ${iface} = ${total} vs DV ${dv}, margin +${margin}). Password cracked!`;
      toast.success(resultMsg);
    } else {
      resultMsg = `Backdoor FAILED on "${content.name}" (Rolled ${roll.total} + ${iface} = ${total} vs DV ${dv}, missed by ${Math.abs(margin)}). Access denied.`;
      toast.error(resultMsg);
    }

    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: currentNum,
      action: 'Backdoor',
      result: resultMsg,
      success
    };
    setNetrunLog(prev => [...prev, logEntry]);
  }, [activeRun, currentFloorId, netActionsRemaining, updateFloorContent]);

  // Control Node Action
  const handleControl = useCallback((content: FloorContent) => {
    if (!activeRun || !currentFloorId) return;
    if (netActionsRemaining <= 0) {
      toast.error('No NET Actions remaining this turn!');
      return;
    }

    const iface = activeRun.netrunner.interface;
    const roll = rollD10Exploding();
    const total = roll.total + iface;
    const dv = content.dv || 8;
    const success = total >= dv;
    const margin = total - dv;

    setNetActionsRemaining(prev => Math.max(0, prev - 1));
    const currentFloor = activeRun.architecture.floors.find(f => f.id === currentFloorId);
    const currentNum = currentFloor?.floorNumber || 1;

    let resultMsg = '';
    if (success) {
      updateFloorContent(currentFloorId, content.id, { accessed: true });
      resultMsg = `Control SUCCEEDED on "${content.name}" (Rolled ${roll.total} + ${iface} = ${total} vs DV ${dv}, margin +${margin}). Node commanded!`;
      toast.success(resultMsg);
    } else {
      resultMsg = `Control FAILED on "${content.name}" (Rolled ${roll.total} + ${iface} = ${total} vs DV ${dv}, missed by ${Math.abs(margin)}). Node resisted.`;
      toast.error(resultMsg);
    }

    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: currentNum,
      action: 'Control Node',
      result: resultMsg,
      success
    };
    setNetrunLog(prev => [...prev, logEntry]);
  }, [activeRun, currentFloorId, netActionsRemaining, updateFloorContent]);

  // Eye-Dee (Decrypt File)
  const handleEyeDee = useCallback((content: FloorContent) => {
    if (!activeRun || !currentFloorId) return;
    if (netActionsRemaining <= 0) {
      toast.error('No NET Actions remaining this turn!');
      return;
    }

    const iface = activeRun.netrunner.interface;
    const roll = rollD10Exploding();
    const total = roll.total + iface;
    const dv = content.dv || 8;
    const success = total >= dv;
    const margin = total - dv;

    setNetActionsRemaining(prev => Math.max(0, prev - 1));
    const currentFloor = activeRun.architecture.floors.find(f => f.id === currentFloorId);
    const currentNum = currentFloor?.floorNumber || 1;

    let resultMsg = '';
    if (success) {
      updateFloorContent(currentFloorId, content.id, { accessed: true });
      resultMsg = `Eye-Dee SUCCEEDED on "${content.name}" (Rolled ${roll.total} + ${iface} = ${total} vs DV ${dv}, margin +${margin}). Decrypted: ${content.fileContent || content.description || 'Confidential Data File'}`;
      toast.success(`Decrypted "${content.name}"!`);
    } else {
      resultMsg = `Eye-Dee FAILED on "${content.name}" (Rolled ${roll.total} + ${iface} = ${total} vs DV ${dv}, missed by ${Math.abs(margin)}). Encryption intact.`;
      toast.error(resultMsg);
    }

    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: currentNum,
      action: 'Eye-Dee',
      result: resultMsg,
      success
    };
    setNetrunLog(prev => [...prev, logEntry]);
  }, [activeRun, currentFloorId, netActionsRemaining, updateFloorContent]);

  // Slide (Disengage & Flee from ICE)
  const handleSlide = useCallback((content: FloorContent) => {
    if (!activeRun || !currentFloorId) return;
    if (netActionsRemaining <= 0) {
      toast.error('No NET Actions remaining this turn!');
      return;
    }

    const ice = content.blackICE;
    const icePerception = ice?.perception || 4;
    const iface = activeRun.netrunner.interface;

    const netrunnerRoll = rollD10Exploding();
    const iceRoll = rollD10Exploding();
    const netrunnerTotal = netrunnerRoll.total + iface;
    const iceTotal = iceRoll.total + icePerception;
    const success = netrunnerTotal > iceTotal;

    setNetActionsRemaining(prev => Math.max(0, prev - 1));
    const currentFloor = activeRun.architecture.floors.find(f => f.id === currentFloorId);
    const currentNum = currentFloor?.floorNumber || 1;

    let resultMsg = '';
    if (success) {
      const prevFloor = activeRun.architecture.floors.find(f => f.floorNumber === currentNum - 1);
      if (prevFloor) {
        setCurrentFloorId(prevFloor.id);
      }
      resultMsg = `Slide SUCCEEDED vs ${content.name}! (Netrunner ${netrunnerTotal} vs ICE Perception ${iceTotal}). Slipped past Black ICE without taking damage!`;
      toast.success(resultMsg);
    } else {
      resultMsg = `Slide FAILED vs ${content.name}! (Netrunner ${netrunnerTotal} vs ICE Perception ${iceTotal}). The Black ICE corners the runner!`;
      toast.error(resultMsg);
    }

    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: currentNum,
      action: 'Slide',
      result: resultMsg,
      success
    };
    setNetrunLog(prev => [...prev, logEntry]);
  }, [activeRun, currentFloorId, netActionsRemaining]);

  // Zap (Direct Attack)
  const handleZap = useCallback((content: FloorContent) => {
    if (!activeRun || !currentFloorId) return;
    if (netActionsRemaining <= 0) {
      toast.error('No NET Actions remaining this turn!');
      return;
    }

    const ice = content.blackICE;
    const iceDef = ice?.defense || 4;
    const iface = activeRun.netrunner.interface;

    const netrunnerRoll = rollD10Exploding();
    const iceDefRoll = rollD10Exploding();
    const netrunnerTotal = netrunnerRoll.total + iface;
    const iceDefTotal = iceDefRoll.total + iceDef;
    const hits = netrunnerTotal > iceDefTotal;

    setNetActionsRemaining(prev => Math.max(0, prev - 1));
    const currentFloor = activeRun.architecture.floors.find(f => f.id === currentFloorId);
    const currentNum = currentFloor?.floorNumber || 1;

    let resultMsg = '';
    if (hits) {
      const dmg = Math.floor(Math.random() * 6) + 1;
      const currentRez = (content.blackICE?.rez ?? 10) - dmg;
      if (currentRez <= 0) {
        updateFloorContent(currentFloorId, content.id, { defeated: true });
        resultMsg = `Zap HIT ${content.name}! (${netrunnerTotal} vs Def ${iceDefTotal}). Dealt ${dmg} REZ damage! ${content.name} DEFEATED and derezzed!`;
        toast.success(resultMsg);
      } else {
        if (content.blackICE) {
          content.blackICE.rez = currentRez;
        }
        resultMsg = `Zap HIT ${content.name}! (${netrunnerTotal} vs Def ${iceDefTotal}). Dealt ${dmg} REZ damage (${currentRez} REZ remains).`;
        toast.success(resultMsg);
      }
    } else {
      resultMsg = `Zap MISSED ${content.name} (${netrunnerTotal} vs Def ${iceDefTotal}). Attack deflected!`;
      toast.error(resultMsg);
    }

    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: currentNum,
      action: 'Zap',
      result: resultMsg,
      success: hits
    };
    setNetrunLog(prev => [...prev, logEntry]);
  }, [activeRun, currentFloorId, netActionsRemaining, updateFloorContent]);

  // Virus Implantation
  const handleVirusSubmit = useCallback(() => {
    if (!activeRun || !currentFloorId) return;
    if (netActionsRemaining <= 0) {
      toast.error('No NET Actions remaining this turn!');
      return;
    }
    if (!virusInstructions.trim()) {
      toast.error('Enter virus programming instructions!');
      return;
    }

    const iface = activeRun.netrunner.interface;
    const roll = rollD10Exploding();
    const total = roll.total + iface;
    const success = total >= virusDV;
    const margin = total - virusDV;

    setNetActionsRemaining(prev => Math.max(0, prev - 1));
    const currentFloor = activeRun.architecture.floors.find(f => f.id === currentFloorId);
    const currentNum = currentFloor?.floorNumber || 1;

    let resultMsg = '';
    if (success) {
      resultMsg = `VIRUS PLANTED! (Rolled ${roll.total} + ${iface} = ${total} vs DV ${virusDV}, margin +${margin}). Payload: "${virusInstructions}"`;
      toast.success(resultMsg);
      setShowVirusModal(false);
      setVirusInstructions('');
    } else {
      resultMsg = `Virus creation failed (Rolled ${roll.total} + ${iface} = ${total} vs DV ${virusDV}, missed by ${Math.abs(margin)}). Payload rejected by system architecture.`;
      toast.error(resultMsg);
    }

    const logEntry: NetrunLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      floorNumber: currentNum,
      action: `Virus (DV ${virusDV})`,
      result: resultMsg,
      success
    };
    setNetrunLog(prev => [...prev, logEntry]);
  }, [activeRun, currentFloorId, netActionsRemaining, virusInstructions, virusDV]);
  
  // Export architectures
  const exportArchitectures = useCallback(() => {
    const dataStr = JSON.stringify(savedArchitectures, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyberpunk-net-architectures-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Architectures exported');
  }, [savedArchitectures]);
  
  // Import architectures
  const importArchitectures = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          setSavedArchitectures(prev => [...prev, ...imported]);
          toast.success(`Imported ${imported.length} architectures`);
        } else {
          toast.error('Invalid file format');
        }
      } catch {
        toast.error('Failed to import: Invalid JSON');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [setSavedArchitectures]);

  return (
    <div className="space-y-6">
      {/* ICE Detail Dialog */}
      {selectedICE && (
        <ICEDetailDialog 
          content={selectedICE} 
          onClose={() => setSelectedICE(null)} 
        />
      )}
      
      {/* Floor Editor */}
      {editingFloor && (
        <FloorEditor
          floor={editingFloor}
          onSave={updateFloor}
          onCancel={() => setEditingFloor(null)}
        />
      )}
      
      {/* Header */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              NET Architecture
            </h2>
            <p className="text-muted-foreground">Create and run netrunning encounters</p>
          </div>
        </div>
        
        {!activeRun && (
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setIsCreating(true)} 
              className="cyber-btn gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New
            </Button>
            <Button 
              onClick={exportArchitectures} 
              variant="outline" 
              className="gap-2"
              disabled={savedArchitectures.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={importArchitectures}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-md hover:bg-secondary transition-colors">
                <Upload className="w-4 h-4" />
                Import
              </span>
            </label>
          </div>
        )}
      </div>
      
      {/* Active Netrun */}
      {activeRun && (
        <div className="glass-card rounded-xl p-6 border-primary/50 border-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Active Netrun: {activeRun.architecture.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Netrunner: {activeRun.netrunner.name} | Interface: {activeRun.netrunner.interface} | HP: {activeRun.netrunner.hp}/{activeRun.netrunner.maxHp}
              </p>
            </div>
            <Button onClick={endNetrun} variant="destructive" className="gap-2">
              <LogOut className="w-4 h-4" />
              Jack Out
            </Button>
          </div>
          
          {/* Floor Navigation */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Current Floor</label>
            <div className="flex flex-wrap gap-2">
              {activeRun.architecture.floors.map(floor => (
                <button
                  key={floor.id}
                  onClick={() => moveToFloor(floor.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentFloorId === floor.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  F{floor.floorNumber}
                </button>
              ))}
            </div>
          </div>

          {/* RAW Netrunner Action HUD */}
          <div className="mb-5 p-4 rounded-xl border-2 border-cyan-500/40 bg-cyan-950/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1 rounded bg-cyan-500 text-black font-mono font-bold text-xs">
                  TURN {netRound}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-muted-foreground">NET Actions:</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: getMaxNetActions(activeRun.netrunner.interface) }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`w-3 h-3 rounded-full ${
                          idx < netActionsRemaining 
                            ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' 
                            : 'bg-secondary border border-border'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-cyan-400 ml-1">
                    {netActionsRemaining} / {getMaxNetActions(activeRun.netrunner.interface)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={advanceRound}
                  size="sm"
                  className="cyber-btn bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-8"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Next Turn (Refresh Actions)
                </Button>
                <Button
                  onClick={() => setShowVirusModal(true)}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  Plant Virus
                </Button>
              </div>
            </div>

            {/* Standard Netrunner Actions Panel */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Pathfinder Checks (Interface + 1d10 Exploding)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button
                  onClick={() => handlePathfinder(6)}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-between bg-secondary/30 hover:bg-cyan-500/20 hover:border-cyan-500/50"
                  disabled={netActionsRemaining <= 0}
                >
                  <span>Survey Layout</span>
                  <span className="font-mono font-bold text-cyan-400">DV 6</span>
                </Button>
                <Button
                  onClick={() => handlePathfinder(8)}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-between bg-secondary/30 hover:bg-cyan-500/20 hover:border-cyan-500/50"
                  disabled={netActionsRemaining <= 0}
                >
                  <span>Scan Next 3 Floors & ICE</span>
                  <span className="font-mono font-bold text-cyan-400">DV 8</span>
                </Button>
                <Button
                  onClick={() => handlePathfinder(10)}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-between bg-secondary/30 hover:bg-cyan-500/20 hover:border-cyan-500/50"
                  disabled={netActionsRemaining <= 0}
                >
                  <span>Reveal Full Blueprint</span>
                  <span className="font-mono font-bold text-cyan-400">DV 10</span>
                </Button>
              </div>
            </div>

            {/* Floor Target Actions */}
            {activeRun.architecture.floors.find(f => f.id === currentFloorId) && (
              <div className="space-y-2 pt-2 border-t border-cyan-500/20">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  Target Floor Actions (Floor {activeRun.architecture.floors.find(f => f.id === currentFloorId)?.floorNumber})
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeRun.architecture.floors.find(f => f.id === currentFloorId)?.contents.map(content => {
                    if (content.type === 'password') {
                      return (
                        <Button
                          key={content.id}
                          onClick={() => handleBackdoor(content)}
                          size="sm"
                          disabled={content.accessed || netActionsRemaining <= 0}
                          className={`text-xs ${
                            content.accessed 
                              ? 'bg-success/20 text-success border border-success/40' 
                              : 'cyber-btn-secondary'
                          }`}
                        >
                          <Key className="w-3.5 h-3.5 mr-1" />
                          {content.accessed ? `Unlocked: ${content.name}` : `Backdoor: ${content.name} (DV ${content.dv})`}
                        </Button>
                      );
                    }

                    if (content.type === 'control-node') {
                      return (
                        <Button
                          key={content.id}
                          onClick={() => handleControl(content)}
                          size="sm"
                          disabled={content.accessed || netActionsRemaining <= 0}
                          className={`text-xs ${
                            content.accessed 
                              ? 'bg-success/20 text-success border border-success/40' 
                              : 'cyber-btn-secondary'
                          }`}
                        >
                          <Cpu className="w-3.5 h-3.5 mr-1" />
                          {content.accessed ? `Seized: ${content.name}` : `Control: ${content.name} (DV ${content.dv})`}
                        </Button>
                      );
                    }

                    if (content.type === 'file') {
                      return (
                        <Button
                          key={content.id}
                          onClick={() => handleEyeDee(content)}
                          size="sm"
                          disabled={content.accessed || netActionsRemaining <= 0}
                          className={`text-xs ${
                            content.accessed 
                              ? 'bg-success/20 text-success border border-success/40' 
                              : 'cyber-btn-secondary'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          {content.accessed ? `Decrypted: ${content.name}` : `Eye-Dee: ${content.name} (DV ${content.dv})`}
                        </Button>
                      );
                    }

                    if (content.type === 'black-ice' && !content.defeated) {
                      return (
                        <div key={content.id} className="flex items-center gap-1">
                          <Button
                            onClick={() => handleSlide(content)}
                            size="sm"
                            disabled={netActionsRemaining <= 0}
                            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                          >
                            <LogOut className="w-3.5 h-3.5 mr-1" />
                            Slide vs {content.name} (PER {content.blackICE?.perception || 4})
                          </Button>
                          <Button
                            onClick={() => handleZap(content)}
                            size="sm"
                            disabled={netActionsRemaining <= 0}
                            className="text-xs bg-destructive hover:bg-destructive/80 text-white font-bold"
                          >
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            Zap {content.name} (DEF {content.blackICE?.defense || 4})
                          </Button>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Current Floor Display */}
          {currentFloorId && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  onClick={() => revealFloor(currentFloorId)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={revealedFloors.has(currentFloorId)}
                >
                  <Eye className="w-4 h-4" />
                  {revealedFloors.has(currentFloorId) ? 'Revealed' : 'Reveal Floor'}
                </Button>
              </div>
              
              {activeRun.architecture.floors.find(f => f.id === currentFloorId) && (
                <FloorCard
                  floor={activeRun.architecture.floors.find(f => f.id === currentFloorId)!}
                  isCurrentFloor={true}
                  isRevealed={revealedFloors.has(currentFloorId)}
                  onToggleRevealed={() => revealFloor(currentFloorId)}
                  onContentUpdate={(contentId, updates) => updateFloorContent(currentFloorId, contentId, updates)}
                  onShowICEDetails={setSelectedICE}
                />
              )}
            </div>
          )}
          
          {/* Netrun Log */}
          <div className="mt-4">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Netrun Log
            </h4>
            <div className="bg-black/50 rounded-lg p-3 font-mono text-sm max-h-48 overflow-y-auto">
              {netrunLog.map(entry => (
                <div key={entry.id} className="mb-1 text-xs">
                  <span className="text-muted-foreground">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                  <span className="text-primary ml-2">F{entry.floorNumber}</span>
                  <span className="text-cyan-400 ml-2">{entry.action}:</span>
                  <span className="ml-2">{entry.result}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Create New Architecture */}
      {isCreating && !activeRun && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Create NET Architecture
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
              <Input
                value={newArchName}
                onChange={e => setNewArchName(e.target.value)}
                placeholder="e.g., Arasaka Data Fortress"
                className="cyber-input"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Difficulty</label>
              <select
                value={newArchDifficulty}
                onChange={e => setNewArchDifficulty(e.target.value as ArchitectureDifficulty)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md"
              >
                <option value="basic">Basic (DV6)</option>
                <option value="standard">Standard (DV8)</option>
                <option value="uncommon">Uncommon (DV10)</option>
                <option value="advanced">Advanced (DV12)</option>
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Description</label>
            <Input
              value={newArchDescription}
              onChange={e => setNewArchDescription(e.target.value)}
              placeholder="What is this architecture protecting?"
              className="cyber-input"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={generatePreview} variant="outline" className="gap-2">
              <Dice5 className="w-4 h-4" />
              Generate Random
            </Button>
            <Button onClick={createBlankArchitecture} variant="outline" className="gap-2">
              <Edit3 className="w-4 h-4" />
              Create Manually
            </Button>
            {editingArchitecture && (
              <Button onClick={saveArchitecture} className="cyber-btn gap-2">
                <Save className="w-4 h-4" />
                Save Architecture
              </Button>
            )}
            <Button onClick={() => {
              setIsCreating(false);
              setIsManualEditing(false);
              setPreviewArchitecture(null);
              setEditingArchitecture(null);
            }} variant="ghost">
              Cancel
            </Button>
          </div>
          
          {/* Preview / Editor */}
          {previewArchitecture && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold">Preview: {previewArchitecture.name}</h4>
                {isManualEditing && (
                  <Button onClick={addFloor} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Add Floor
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {previewArchitecture.totalFloors} floors • {previewArchitecture.difficulty} difficulty
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewArchitecture.floors.map(floor => (
                  <div key={floor.id} className="relative">
                    <FloorCard 
                      floor={floor} 
                      isEditing={isManualEditing}
                      onEditFloor={setEditingFloor}
                      onShowICEDetails={setSelectedICE}
                    />
                    {isManualEditing && (
                      <button
                        onClick={() => removeFloor(floor.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Netrunner Setup */}
      {!activeRun && !isCreating && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Netrunner Setup
          </h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
              <Input
                value={netrunnerName}
                onChange={e => setNetrunnerName(e.target.value)}
                placeholder="Netrunner name"
                className="cyber-input"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Interface</label>
              <Input
                type="number"
                value={netrunnerInterface}
                onChange={e => setNetrunnerInterface(parseInt(e.target.value) || 0)}
                className="cyber-input"
                min={1}
                max={10}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">HP</label>
              <Input
                type="number"
                value={netrunnerHP}
                onChange={e => setNetrunnerHP(parseInt(e.target.value) || 1)}
                className="cyber-input"
                min={1}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Saved Architectures */}
      {!activeRun && !isCreating && savedArchitectures.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Saved Architectures ({savedArchitectures.length})
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedArchitectures.map(arch => (
              <div key={arch.id} className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold">{arch.name}</h4>
                    <p className="text-xs text-muted-foreground">{arch.totalFloors} floors • {arch.difficulty}</p>
                  </div>
                  <button
                    onClick={() => deleteArchitecture(arch.id)}
                    className="p-1 hover:bg-destructive/20 hover:text-destructive rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{arch.description}</p>
                <Button 
                  onClick={() => startNetrun(arch)}
                  className="cyber-btn w-full gap-2"
                  disabled={!netrunnerName}
                >
                  <Play className="w-4 h-4" />
                  Start Netrun
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* ICE Reference */}
      {!activeRun && !isCreating && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Black ICE Reference
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(blackICEDefinitions).map(ice => (
              <button
                key={ice.type}
                onClick={() => setSelectedICE({
                  id: ice.type,
                  type: 'black-ice',
                  name: ice.name,
                  dv: ice.rez,
                  blackICE: ice
                } as FloorContent)}
                className="text-left p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Skull className={`w-4 h-4 ${ice.class === 'anti-personnel' ? 'text-destructive' : 'text-warning'}`} />
                  <span className="font-medium">{ice.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {ice.class === 'anti-personnel' ? 'Anti-Personnel' : 'Anti-Program'} • REZ {ice.rez}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Help */}
      {!activeRun && !isCreating && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            How to Use
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2 text-primary">Creating Architectures</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Click "Create New" to generate a random architecture</li>
                <li>• Choose difficulty: Basic (DV6) to Advanced (DV12)</li>
                <li>• Floors are generated using 3d6 (9-18 floors)</li>
                <li>• Use "Create Manually" to build custom architectures</li>
                <li>• Click any Black ICE in the reference to see details</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-primary">Running Netruns</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Enter netrunner details in "Netrunner Setup"</li>
                <li>• Click "Start Netrun" on an architecture</li>
                <li>• Use "Reveal Floor" to show contents to netrunner</li>
                <li>• Click the info icon on ICE to see full details</li>
                <li>• Track defeated ICE and accessed nodes/files</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Virus Programming Modal */}
      {showVirusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border-2 border-destructive/50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-destructive" />
                <h3 className="font-bold text-lg text-destructive" style={{ fontFamily: 'var(--font-display)' }}>
                  Plant Virus in Architecture
                </h3>
              </div>
              <Button onClick={() => setShowVirusModal(false)} variant="ghost" size="sm" className="h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Cyberpunk RED Virus Action: The Netrunner writes and leaves behind a custom program to manipulate or sabotage the architecture. Requires 1 NET Action and an Interface check.
            </p>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Virus Complexity & Target DV</label>
              <select
                value={virusDV}
                onChange={e => setVirusDV(parseInt(e.target.value))}
                className="cyber-input text-xs"
              >
                <option value={6}>DV 6 - Simple (Activate fire sprinklers, unlock one maglock)</option>
                <option value={8}>DV 8 - Moderate (Loop security cameras, spoof alarm signals)</option>
                <option value={10}>DV 10 - Complex (Erase entire database, reformat mainframe)</option>
                <option value={12}>DV 12 - Extreme (Permanent catastrophic overload)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Virus Instructions / Payload</label>
              <Input
                value={virusInstructions}
                onChange={e => setVirusInstructions(e.target.value)}
                placeholder="e.g., Erase video logs, trigger fire suppression, shut down turret targeting"
                className="cyber-input text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setShowVirusModal(false)} variant="ghost" size="sm" className="text-xs">
                Cancel
              </Button>
              <Button 
                onClick={handleVirusSubmit} 
                className="cyber-btn bg-destructive hover:bg-destructive/80 text-white font-bold text-xs"
                size="sm"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Inject Virus (Roll Interface vs DV {virusDV})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
