// Helpers to transform catalog items into runtime-friendly data
// and to generate NPCs from archetypes exclusively using packs

function getWeaponsFromCatalog(catalog) {
  const list = catalog.items['weapons'] || [];
  return list.map(w => ({
    id: w.id,
    name: w.name,
    damage: w.data?.system?.damage || '',
    rof: w.data?.system?.rof ?? null,
    weaponType: w.data?.system?.weaponType || '',
    quality: w.data?.system?.quality || '',
    source: w.source
  }));
}

function getArchetypesFromCatalog(catalog) {
  const list = catalog.items['archetypes'] || [];
  return list.map(a => ({
    id: a.id,
    name: a.name,
    baseInitiative: a.data?.system?.baseInitiative || 0,
    maxHealth: a.data?.system?.maxHealth || 0,
    bodyArmor: a.data?.system?.armor?.body || 0,
    headArmor: a.data?.system?.armor?.head || 0,
    shield: a.data?.system?.shield || 0,
    weaponIds: (a.data?.system?.weapons || []).map(w => w.id),
    tags: a.data?.system?.tags || [],
    source: a.source
  }));
}

function resolveWeaponIds(catalog, ids) {
  return ids.map(id => catalog.byId[id]).filter(Boolean).map(w => ({
    name: w.name,
    damage: w.data?.system?.damage || ''
  }));
}

function generateNPCFromArchetype(catalog, archetype, index = 1) {
  const weapons = resolveWeaponIds(catalog, archetype.weaponIds);
  return {
    name: `${archetype.name} ${index}`,
    base: archetype.baseInitiative,
    maxHealth: archetype.maxHealth,
    roll: 0,
    total: archetype.baseInitiative,
    health: archetype.maxHealth,
    hasRolled: false,
    bodyArmor: archetype.bodyArmor,
    headArmor: archetype.headArmor,
    shield: archetype.shield,
    shieldActive: false,
    weapons,
    criticalInjuries: []
  };
}

window.CatalogAdapters = {
  getWeaponsFromCatalog,
  getArchetypesFromCatalog,
  generateNPCFromArchetype,
};

// Additional helpers for covers and critical injuries
function getCoversFromCatalog(catalog) {
  const list = catalog.items['cover'] || [];
  const entries = [];
  list.forEach(c => {
    const arr = c.data?.system?.entries || [];
    arr.forEach(e => entries.push({ name: e.name, hp: e.hp }));
  });
  return entries;
}

function getCriticalInjuriesFromCatalog(catalog) {
  const body = (catalog.items['critical-injuries-body'] || []).map(i => ({ name: i.name, description: i.data?.system?.description?.value || '' }));
  const head = (catalog.items['critical-injuries-head'] || []).map(i => ({ name: i.name, description: i.data?.system?.description?.value || '' }));
  return { body, head };
}

window.CatalogAdapters.getCoversFromCatalog = getCoversFromCatalog;
window.CatalogAdapters.getCriticalInjuriesFromCatalog = getCriticalInjuriesFromCatalog;

// Roles and Skills
function getRolesFromCatalog(catalog) {
  const list = catalog.items['roles'] || [];
  return list.map(r => ({ id: r.id, name: r.name, source: r.source }));
}

function getSkillsFromCatalog(catalog) {
  const skillsCats = Object.keys(catalog.items || {}).filter(k => k.startsWith('skills-'));
  const flat = skillsCats.flatMap(cat => catalog.items[cat] || []);
  // Ensure unique by name
  const map = new Map();
  flat.forEach(s => {
    const name = s.name || s.data?.name;
    if (!name) return;
    if (!map.has(name)) map.set(name, { id: s.id, name, stat: s.data?.system?.stat || s.data?.system?.stat?.value || '--', source: s.source });
  });
  return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
}

window.CatalogAdapters.getRolesFromCatalog = getRolesFromCatalog;
window.CatalogAdapters.getSkillsFromCatalog = getSkillsFromCatalog;
