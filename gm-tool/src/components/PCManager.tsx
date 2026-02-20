import { useState } from 'react';
import { Users, Plus, User, Trash2, Shield, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { PC } from '@/types';

interface PCManagerProps {
  onAddToEncounter?: (pc: PC) => void;
}

export function PCManager({ onAddToEncounter }: PCManagerProps) {
  const [pcs, setPcs] = useLocalStorage<PC[]>('cyberpunk-pcs', []);
  const [isAdding, setIsAdding] = useState(false);
  const [newPC, setNewPC] = useState<Partial<PC>>({
    name: '',
    ref: 6,
    hp: 30,
    maxHp: 30,
    armorHead: 0,
    armorBody: 0,
    shieldSp: 0
  });
  
  const handleAdd = () => {
    if (!newPC.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    
    const pc: PC = {
      id: crypto.randomUUID(),
      name: newPC.name,
      ref: newPC.ref || 6,
      hp: newPC.hp || 30,
      maxHp: newPC.maxHp || 30,
      armorHead: newPC.armorHead || 0,
      armorBody: newPC.armorBody || 0,
      shieldSp: newPC.shieldSp || 0
    };
    
    setPcs(prev => [...prev, pc]);
    setIsAdding(false);
    setNewPC({
      name: '',
      ref: 6,
      hp: 30,
      maxHp: 30,
      armorHead: 0,
      armorBody: 0,
      shieldSp: 0
    });
    toast.success(`${pc.name} added to PCs`);
  };
  
  const handleDelete = (id: string) => {
    setPcs(prev => prev.filter(pc => pc.id !== id));
    toast.info('PC deleted');
  };
  
  const handleUpdate = (id: string, updates: Partial<PC>) => {
    setPcs(prev => prev.map(pc => pc.id === id ? { ...pc, ...updates } : pc));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            PC Manager
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage player characters
          </p>
        </div>
      </div>
      
      {/* Add PC Button */}
      <div className="flex justify-center">
        <Button onClick={() => setIsAdding(!isAdding)} className="cyber-btn">
          <Plus className="w-4 h-4 mr-2" />
          {isAdding ? 'Cancel' : 'Add New PC'}
        </Button>
      </div>
      
      {/* Add PC Form */}
      {isAdding && (
        <div className="glass-card rounded-xl p-6 animate-in">
          <h3 className="font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>New PC</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
              <Input
                value={newPC.name}
                onChange={e => setNewPC(p => ({ ...p, name: e.target.value }))}
                placeholder="Character name"
                className="cyber-input"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">REF</label>
              <Input
                type="number"
                value={newPC.ref}
                onChange={e => setNewPC(p => ({ ...p, ref: parseInt(e.target.value) || 0 }))}
                className="cyber-input"
                min={1}
                max={10}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Max HP</label>
              <Input
                type="number"
                value={newPC.maxHp}
                onChange={e => setNewPC(p => ({ 
                  ...p, 
                  maxHp: parseInt(e.target.value) || 1,
                  hp: parseInt(e.target.value) || 1
                }))}
                className="cyber-input"
                min={1}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Head Armor SP</label>
              <Input
                type="number"
                value={newPC.armorHead}
                onChange={e => setNewPC(p => ({ ...p, armorHead: parseInt(e.target.value) || 0 }))}
                className="cyber-input"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Body Armor SP</label>
              <Input
                type="number"
                value={newPC.armorBody}
                onChange={e => setNewPC(p => ({ ...p, armorBody: parseInt(e.target.value) || 0 }))}
                className="cyber-input"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Shield SP</label>
              <Input
                type="number"
                value={newPC.shieldSp}
                onChange={e => setNewPC(p => ({ ...p, shieldSp: parseInt(e.target.value) || 0 }))}
                className="cyber-input"
                min={0}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setIsAdding(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAdd} className="cyber-btn flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Add PC
            </Button>
          </div>
        </div>
      )}
      
      {/* PC List */}
      <div className="grid md:grid-cols-2 gap-4">
        {pcs.map(pc => (
          <div key={pc.id} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">{pc.name}</h3>
                  <p className="text-sm text-muted-foreground">REF: {pc.ref}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {onAddToEncounter && (
                  <Button 
                    onClick={() => onAddToEncounter(pc)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  onClick={() => handleDelete(pc.id)}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                <Heart className="w-4 h-4 text-destructive" />
                <div>
                  <div className="text-xs text-muted-foreground">HP</div>
                  <Input
                    type="number"
                    value={pc.hp}
                    onChange={e => handleUpdate(pc.id, { hp: parseInt(e.target.value) || 0 })}
                    className="w-20 h-6 text-sm cyber-input py-0"
                  />
                  <span className="text-xs text-muted-foreground">/ {pc.maxHp}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                <Shield className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Armor</div>
                  <div className="text-sm font-mono">{pc.armorHead}/{pc.armorBody}</div>
                </div>
              </div>
            </div>
            
            {/* Quick Edit */}
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Head SP</label>
                <Input
                  type="number"
                  value={pc.armorHead}
                  onChange={e => handleUpdate(pc.id, { armorHead: parseInt(e.target.value) || 0 })}
                  className="cyber-input h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Body SP</label>
                <Input
                  type="number"
                  value={pc.armorBody}
                  onChange={e => handleUpdate(pc.id, { armorBody: parseInt(e.target.value) || 0 })}
                  className="cyber-input h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Shield</label>
                <Input
                  type="number"
                  value={pc.shieldSp}
                  onChange={e => handleUpdate(pc.id, { shieldSp: parseInt(e.target.value) || 0 })}
                  className="cyber-input h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {pcs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No PCs saved yet</p>
          <p className="text-sm mt-2">Add player characters to quickly add them to encounters</p>
        </div>
      )}
    </div>
  );
}
