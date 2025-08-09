document.addEventListener('DOMContentLoaded', function() {
    // Initialize weapon fields for new character form
    if (typeof addWeaponFields === 'function') {
        addWeaponFields('pc-weapon-fields');
    } else {
        console.error('addWeaponFields function not found');
    }
    
    // Load existing player characters 
    if (typeof loadPlayerCharacters === 'function') {
        loadPlayerCharacters();
    } else {
        console.error('loadPlayerCharacters function not found');
    }
    
    // Fix main.js window.onload error
    // Override the window.onload function from main.js to avoid the error
    window.originalOnload = window.onload;
    window.onload = function() {
        // Call the original onload function in a safe way
        try {
            // Create safe versions of functions called in the original onload
            const safeLoadEncounters = function() {
                if (document.getElementById('encounters')) {
                    loadEncounters();
                } else {
                    console.log('Encounters element not found, skipping loadEncounters');
                }
            };
            
            // Replace the loadEncounters function temporarily
            const originalLoadEncounters = window.loadEncounters;
            window.loadEncounters = safeLoadEncounters;
            
            // Call the original onload
            if (typeof window.originalOnload === 'function') {
                window.originalOnload.call(window);
            }
            
            // Restore the original function
            window.loadEncounters = originalLoadEncounters;
        } catch (error) {
            console.error('Error in window.onload:', error);
        }
    };
    
    // Add event listeners for buttons
    document.getElementById('add-weapon-btn').addEventListener('click', function() {
        addWeaponFields('pc-weapon-fields');
    });
    
    document.getElementById('save-character-btn').addEventListener('click', function() {
        savePlayerCharacter();
    });
    
    document.getElementById('export-characters-btn').addEventListener('click', function() {
        exportPlayerCharacters();
    });
    
    document.getElementById('import-btn').addEventListener('click', function() {
        document.getElementById('importPCFile').click();
    });
    
    document.getElementById('importPCFile').addEventListener('change', function(event) {
        importPlayerCharacters(event);
    });
    
    document.getElementById('pc-notes').addEventListener('input', function(event) {
        updateCharacterNotes(event);
    });

  // Populate weapon datalist from catalog
  (async () => {
    try {
  const catalog = await Catalog.loadCatalog();
  const weapons = CatalogAdapters.getWeaponsFromCatalog(catalog);
      const dl = document.getElementById('weapon-options');
      if (dl) {
        dl.innerHTML = '';
        weapons.forEach(w => {
          const opt = document.createElement('option');
          opt.value = w.name;
          opt.label = `${w.name} (${w.damage})`;
          dl.appendChild(opt);
        });
      }

      const addBtn = document.getElementById('add-weapon-from-catalog-btn');
      const search = document.getElementById('weapon-search');
      if (addBtn && search) {
        addBtn.addEventListener('click', () => {
          const name = search.value.trim();
          if (!name) return;
          const found = weapons.find(w => w.name.toLowerCase() === name.toLowerCase());
          if (!found) return;
          addWeaponFields('pc-weapon-fields', found.name, found.damage || '');
          search.value = '';
        });
      }
    } catch (e) {
      console.error('Failed to load catalog weapons', e);
    }
  })();

  // Populate roles and skills from catalog
  (async () => {
    try {
      const catalog = await Catalog.loadCatalog();
      // Roles
      const rolesSel = document.getElementById('pc-role');
      if (rolesSel) {
        const roles = CatalogAdapters.getRolesFromCatalog(catalog);
        rolesSel.innerHTML = '<option value="">Select Role</option>' + roles.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
      }
      // Skills datalist
      const skills = CatalogAdapters.getSkillsFromCatalog(catalog);
      const sdl = document.getElementById('skill-options');
      if (sdl) {
        sdl.innerHTML = '';
        skills.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.name;
          opt.label = `${s.name} [${s.stat || '--'}]`;
          sdl.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Failed to populate roles/skills', e);
    }
  })();

  // Skills UI handlers
  const addSkillBtn = document.getElementById('add-skill-btn');
  if (addSkillBtn) {
    addSkillBtn.addEventListener('click', () => {
      const name = (document.getElementById('skill-search')?.value || '').trim();
      const level = parseInt(document.getElementById('skill-level')?.value) || 0;
      if (!name) return;
      appendSkillToList(name, level);
      document.getElementById('skill-search').value = '';
      document.getElementById('skill-level').value = '';
    });
  }

  // Reload packs button
  const reloadPacksBtn = document.getElementById('reload-packs-btn');
  if (reloadPacksBtn) {
    reloadPacksBtn.addEventListener('click', async () => {
      try {
        await Catalog.loadCatalog({ reload: true });
        showNotification('Packs reloaded', 'success');
        // Re-populate dependent pickers
        const catalog = await Catalog.loadCatalog();
        const rolesSel = document.getElementById('pc-role');
        if (rolesSel) {
          const roles = CatalogAdapters.getRolesFromCatalog(catalog);
          rolesSel.innerHTML = '<option value="">Select Role</option>' + roles.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
        }
        const sdl = document.getElementById('skill-options');
        if (sdl) {
          const skills = CatalogAdapters.getSkillsFromCatalog(catalog);
          sdl.innerHTML = '';
          skills.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.label = `${s.name} [${s.stat || '--'}]`;
            sdl.appendChild(opt);
          });
        }
        const wdl = document.getElementById('weapon-options');
        if (wdl) {
          const weapons = CatalogAdapters.getWeaponsFromCatalog(catalog);
          wdl.innerHTML = '';
          weapons.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.name;
            opt.label = `${w.name} (${w.damage})`;
            wdl.appendChild(opt);
          });
        }
      } catch (e) {
        console.error('Reload packs failed', e);
        showNotification('Failed to reload packs', 'error');
      }
    });
  }
});

// Add a fallback implementation of addWeaponFields in case it's not defined in main.js
if (typeof window.addWeaponFields !== 'function') {
    window.addWeaponFields = function(containerId, name = '', damage = '') {
        console.log('Using fallback addWeaponFields with name:', name, 'damage:', damage);
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const fieldPair = document.createElement('div');
        fieldPair.className = 'weapon-field-pair';
        
        // Ensure name and damage are properly escaped for use in HTML attributes
        const escapedName = (name || '').replace(/"/g, '&quot;');
        const escapedDamage = (damage || '').replace(/"/g, '&quot;');
        
        fieldPair.innerHTML = `
            <input type="text" class="weapon-name-field" placeholder="Weapon Name" value="${escapedName}">
            <input type="text" class="weapon-damage-field" placeholder="Damage (e.g. 3d6)" value="${escapedDamage}">
            <button type="button" class="remove-weapon-btn">×</button>
        `;
        
        // Add event listener for the remove button
        const removeBtn = fieldPair.querySelector('.remove-weapon-btn');
        removeBtn.addEventListener('click', function() {
            fieldPair.remove();
        });
        
        container.appendChild(fieldPair);
        
        // For debugging
        console.log(`Fallback added weapon field with name: "${name}", damage: "${damage}"`);
    };
}

// (Removed) Duplicate weapon picker setup

function getCharacterFormData() {
  return {
    name: document.getElementById('pc-name').value || '',
    base: parseInt(document.getElementById('pc-base').value) || 0,
    maxHealth: parseInt(document.getElementById('pc-maxHealth').value) || 0,
    bodyArmor: parseInt(document.getElementById('pc-bodyArmor').value) || 0,
    headArmor: parseInt(document.getElementById('pc-headArmor').value) || 0,
    shield: parseInt(document.getElementById('pc-shield').value) || 0,
    interface: parseInt(document.getElementById('pc-interface').value) || 0,
    role: document.getElementById('pc-role')?.value || '',
    skills: Array.from(document.querySelectorAll('#pc-skill-list .skill-item')).map(el => ({
      name: el.querySelector('.skill-name')?.textContent || '',
      level: parseInt(el.querySelector('.skill-level')?.textContent) || 0
    })),
    notes: document.getElementById('pc-notes').value || '',
    weapons: Array.from(document.querySelectorAll('#pc-weapon-fields .weapon-field-pair')).map(p => ({
      name: p.querySelector('.weapon-name-field')?.value || '',
      damage: p.querySelector('.weapon-damage-field')?.value || ''
    }))
  };
}

function setCharacterFormData(c) {
  document.getElementById('pc-name').value = c.name || '';
  document.getElementById('pc-base').value = c.base ?? '';
  document.getElementById('pc-maxHealth').value = c.maxHealth ?? '';
  document.getElementById('pc-bodyArmor').value = c.bodyArmor ?? '';
  document.getElementById('pc-headArmor').value = c.headArmor ?? '';
  document.getElementById('pc-shield').value = c.shield ?? '';
  document.getElementById('pc-interface').value = c.interface ?? '';
  const roleSel = document.getElementById('pc-role');
  if (roleSel) roleSel.value = c.role || '';
  document.getElementById('pc-notes').value = c.notes || '';
  const container = document.getElementById('pc-weapon-fields');
  container.innerHTML = '';
  (c.weapons || []).forEach(w => addWeaponFields('pc-weapon-fields', w.name, w.damage));
  // Skills list
  const skillList = document.getElementById('pc-skill-list');
  if (skillList) {
    skillList.innerHTML = '';
    (c.skills || []).forEach(s => appendSkillToList(s.name, s.level));
  }
}

(function setupShareCodeUI(){
  const copyBtn = document.getElementById('copy-share-code-btn');
  const importBtn = document.getElementById('import-share-code-btn');
  const input = document.getElementById('share-code-input');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const data = getCharacterFormData();
      const code = Catalog.encodeShareCode({ v: 1, t: 'pc', data });
      try {
        await navigator.clipboard.writeText(code);
        showNotification('Share code copied to clipboard', 'success');
      } catch {
        input.value = code; // fallback
      }
    });
  }
  if (importBtn && input) {
    importBtn.addEventListener('click', () => {
      const code = input.value.trim();
      if (!code) return;
      const parsed = Catalog.decodeShareCode(code);
      if (!parsed || parsed.t !== 'pc') {
        showNotification('Invalid share code', 'error');
        return;
      }
      setCharacterFormData(parsed.data || {});
      showNotification('Character loaded from code', 'success');
    });
  }
})();

// Fallback notification if settings.js isn't loaded on this page
if (typeof window.showNotification !== 'function') {
  window.showNotification = function(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    try { alert(message); } catch {}
  };
}

// Helpers to manage skills list UI
function appendSkillToList(name, level) {
  const list = document.getElementById('pc-skill-list');
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'skill-item';
  item.innerHTML = `
    <span class="skill-name">${name}</span>
    <span class="skill-level">${level}</span>
    <button type="button" class="remove-skill-btn" title="Remove">×</button>
  `;
  item.querySelector('.remove-skill-btn').addEventListener('click', () => item.remove());
  list.appendChild(item);
}
