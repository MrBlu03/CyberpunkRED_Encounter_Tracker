import React, { useState } from 'react';
import { 
  Target, Crosshair, Info, ChevronRight, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { 
  formatWeaponCategory, 
  getWeaponRangeResolution, 
  RANGE_BANDS, 
  SINGLE_SHOT_DV_TABLE, 
  AUTOFIRE_DV_TABLE,
  THROWN_WEAPON_RULES,
  getRangeBandIndex
} from '@/lib/weaponRanges';
import type { Weapon } from '@/types';

interface WeaponRangeChartProps {
  weapon: Partial<Weapon> | null | undefined;
  currentDistance?: number;
  compact?: boolean;
}

/**
 * Compact horizontal range DV strip for a specific weapon.
 */
export function WeaponRangeChart({ weapon, currentDistance, compact = false }: WeaponRangeChartProps) {
  const resolution = getWeaponRangeResolution(weapon);

  if (!resolution.isRanged) {
    return (
      <div className="text-[11px] text-muted-foreground font-mono italic">
        Melee: Opposed check vs Defender Evasion / DEX
      </div>
    );
  }

  const activeBandIndex = currentDistance !== undefined ? getRangeBandIndex(currentDistance) : -1;

  return (
    <div className="space-y-1 text-xs">
      {/* Single Shot Ranges */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold mr-0.5">
          {compact ? 'DV:' : 'Single Shot DV:'}
        </span>
        {resolution.singleShotDVs.map((band, idx) => {
          const isActive = idx === activeBandIndex;
          const isNA = band.dv === null;

          return (
            <div
              key={band.label}
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] flex items-center gap-1 border transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                  : isNA
                  ? 'bg-secondary/20 text-muted-foreground/40 border-transparent'
                  : 'bg-secondary/50 text-foreground border-border/60 hover:border-primary/50'
              }`}
              title={`${band.label}: ${isNA ? 'N/A' : `DV ${band.dv}`}`}
            >
              <span className="text-[9px] text-muted-foreground opacity-80">{band.label}</span>
              <span className={`font-bold ${isActive ? 'text-primary-foreground' : isNA ? 'text-muted-foreground/40' : 'text-primary'}`}>
                {isNA ? '-' : band.dv}
              </span>
            </div>
          );
        })}
      </div>

      {/* Autofire Ranges (if applicable) */}
      {resolution.canAutofire && resolution.autofireDVs && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          <span className="text-[10px] font-mono uppercase text-amber-400 font-bold mr-0.5">
            {compact ? 'Auto:' : 'Autofire DV:'}
          </span>
          {resolution.autofireDVs.map(band => {
            const isNA = band.dv === null;
            return (
              <div
                key={band.label}
                className={`px-1.5 py-0.5 rounded font-mono text-[10px] flex items-center gap-1 border border-amber-500/30 bg-amber-500/10 text-amber-300`}
                title={`Autofire ${band.label}: DV ${band.dv}`}
              >
                <span className="text-[9px] text-muted-foreground">{band.label}</span>
                <span className="font-bold text-amber-400">{isNA ? '-' : band.dv}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface WeaponQuickBadgeProps {
  weapon: Weapon;
  onAttackClick?: () => void;
}

/**
 * Interactive badge displaying normalized category with popover range details.
 */
export function WeaponQuickBadge({ weapon, onAttackClick }: WeaponQuickBadgeProps) {
  const [distance, setDistance] = useState<number>(10);
  const category = formatWeaponCategory(weapon);
  const resolution = getWeaponRangeResolution(weapon);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/60 hover:bg-primary/20 hover:border-primary/50 border border-border text-foreground transition-all cursor-pointer group text-xs font-mono"
          title={`Click to view Range DV & stats for ${weapon.name}`}
        >
          <Target className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-bold truncate max-w-[110px]">{category}</span>
          <span className="text-[10px] text-muted-foreground">({weapon.system?.damage || '1d6'})</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-4 bg-card border-2 border-primary/40 shadow-2xl backdrop-blur-xl space-y-3 z-50">
        <div className="border-b border-border pb-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-primary font-mono">{weapon.name}</h4>
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-mono uppercase font-bold">
              {category}
            </span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-3 font-mono mt-1">
            <span>Dmg: <strong className="text-foreground">{weapon.system?.damage || 'N/A'}</strong></span>
            <span>ROF: <strong className="text-foreground">{weapon.system?.rof || 1}</strong></span>
            <span>Skill: <strong className="text-foreground">{weapon.system?.weaponSkill || 'Handgun'}</strong></span>
          </div>
        </div>

        {resolution.isRanged ? (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-mono">Distance Checker:</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={800}
                    value={distance}
                    onChange={e => setDistance(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 h-6 text-xs text-center font-mono py-0"
                  />
                  <span className="text-xs text-muted-foreground font-mono">m</span>
                </div>
              </div>

              <WeaponRangeChart weapon={weapon} currentDistance={distance} />
            </div>
          </>
        ) : (
          <div className="p-2.5 rounded bg-secondary/30 text-xs text-muted-foreground font-mono">
            Melee weapon. Does not use range DVs. Attacks are opposed checks resolved against Defender's Evasion (or Athletics vs Brawling).
          </div>
        )}

        {onAttackClick && (
          <Button
            size="sm"
            onClick={onAttackClick}
            className="w-full cyber-btn bg-primary text-primary-foreground font-bold text-xs h-8"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Attack With {weapon.name}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Full Cyberpunk RED Range DV Reference Modal dialog.
 */
export function RangeDVReferenceModal({ trigger }: { trigger?: React.ReactNode }) {
  const [selectedWeapon, setSelectedWeapon] = useState<string>('Assault Rifle');
  const [testDistance, setTestDistance] = useState<number>(15);

  const activeIdx = getRangeBandIndex(testDistance);
  const activeBand = RANGE_BANDS[activeIdx];
  const activeSingleDV = SINGLE_SHOT_DV_TABLE[selectedWeapon]?.[activeIdx] ?? null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/20 text-xs">
            <Info className="w-4 h-4" />
            Range DVs
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[88vh] overflow-y-auto bg-card border-2 border-primary/60 shadow-2xl backdrop-blur-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black font-mono text-primary flex items-center gap-2">
              <Crosshair className="w-6 h-6 text-primary" />
              CYBERPUNK RED RANGE DV REFERENCE
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2 text-sm">
          {/* Quick Explanation Banner */}
          <div className="p-3.5 rounded-xl bg-secondary/30 border border-border text-xs text-foreground/90 font-mono leading-relaxed">
            <strong className="text-primary">Ranged Combat Rule (RAW p. 173):</strong> Attacker rolls <span className="text-foreground font-bold">1d10 + REF + Weapon Skill</span>. To hit, the total must strictly <strong>beat (greater than)</strong> the Difficulty Value (DV) listed for that weapon category at the target's distance.
          </div>

          {/* Interactive Calculator Strip */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-primary font-mono flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary" />
                Live Distance DV Evaluator
              </span>
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground font-mono">Distance:</label>
                <Input
                  type="number"
                  min={0}
                  max={800}
                  value={testDistance}
                  onChange={e => setTestDistance(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 h-7 text-xs font-mono text-center bg-background"
                />
                <span className="text-xs text-muted-foreground font-mono">meters</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Range Band</span>
                <span className="font-bold text-foreground font-mono text-sm">
                  {activeBand.name} ({activeBand.rangeLabel})
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Selected Weapon</span>
                <select
                  value={selectedWeapon}
                  onChange={e => setSelectedWeapon(e.target.value)}
                  className="cyber-input text-xs h-7 bg-background border-border w-full font-mono mt-0.5"
                >
                  {Object.keys(SINGLE_SHOT_DV_TABLE).map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">Required DV</span>
                  <span className="font-black text-xl text-primary font-mono">
                    {activeSingleDV !== null ? `DV ${activeSingleDV}` : 'Out of Range'}
                  </span>
                </div>
                {activeSingleDV !== null && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Need &gt; {activeSingleDV}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Single Shot DV Matrix Table */}
          <div className="space-y-2">
            <h3 className="text-base font-bold font-mono text-primary flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-primary" />
              Single Shot DVs
            </h3>
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs bg-card font-mono">
                <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 border-b border-border font-bold">Weapon Category</th>
                    {RANGE_BANDS.map(band => (
                      <th key={band.id} className="p-2.5 border-b border-border text-center font-bold">
                        {band.rangeLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SINGLE_SHOT_DV_TABLE).map(([category, dvs]) => (
                    <tr key={category} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                      <td className="p-2.5 font-bold text-foreground">{category}</td>
                      {dvs.map((dv, i) => (
                        <td key={i} className="p-2.5 text-center">
                          {dv !== null ? (
                            <span className="px-2 py-0.5 rounded bg-secondary/50 font-bold text-primary">
                              {dv}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Autofire DVs Table */}
          <div className="space-y-2">
            <h3 className="text-base font-bold font-mono text-amber-400 flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-amber-400" />
              Autofire DVs (Edgerunners & Core RAW)
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              Roll 1d10 + REF + Autofire skill. Margin of success determines damage multiplier (up to weapon max multiplier).
            </p>
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs bg-card font-mono">
                <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 border-b border-border font-bold">Weapon Type</th>
                    <th className="p-2.5 border-b border-border text-center">0-6m</th>
                    <th className="p-2.5 border-b border-border text-center">7-12m</th>
                    <th className="p-2.5 border-b border-border text-center">13-25m</th>
                    <th className="p-2.5 border-b border-border text-center">26-50m</th>
                    <th className="p-2.5 border-b border-border text-center">51-100m</th>
                    <th className="p-2.5 border-b border-border text-center">&gt;100m</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(AUTOFIRE_DV_TABLE).map(([cat, dvs]) => (
                    <tr key={cat} className="border-b border-border/40 hover:bg-secondary/20">
                      <td className="p-2.5 font-bold text-foreground">{cat}</td>
                      {dvs.map((dv, i) => (
                        <td key={i} className="p-2.5 text-center">
                          {dv !== null ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                              {dv}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                      ))}
                      <td className="p-2.5 text-center text-muted-foreground/30">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Thrown Weapons Rules */}
          <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-2 font-mono">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              Thrown Weapons & Grenades
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Cannot be thrown further than <strong>{THROWN_WEAPON_RULES.maxRangeMeters}m</strong>.</p>
              <p>• Attack check is resolved using the <strong>Athletics</strong> skill (1d10 + DEX + Athletics).</p>
              <div className="flex gap-4 pt-1">
                {THROWN_WEAPON_RULES.bands.map(b => (
                  <div key={b.label} className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">{b.label}</span>
                    <span className="font-bold text-primary text-sm">DV {b.dv}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
