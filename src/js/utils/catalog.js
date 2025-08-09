// Renderer-side catalog utilities that fetch from main via preload
// All rulesets come from packs/*.yaml

async function loadCatalog({ reload = false } = {}) {
  if (window.api && window.api.catalog && typeof window.api.catalog.get === 'function') {
    return window.api.catalog.get(reload);
  }
  console.warn('Catalog API not available; running in browser fallback mode.');
  return { meta: { loadedAt: Date.now(), baseDir: 'packs' }, items: {}, byId: {} };
}

function filterItems(catalog, { category, text, source } = {}) {
  const items = category ? (catalog.items[category] || []) : Object.values(catalog.items).flat();
  let out = items;
  if (text && text.trim()) {
    const q = text.trim().toLowerCase();
    out = out.filter(i => (i.name || '').toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }
  if (source && source.trim()) {
    const s = source.trim().toLowerCase();
    out = out.filter(i => (i.source || '').toLowerCase().includes(s));
  }
  return out;
}

// Compact share code: JSON -> Uint8Array -> base64url (no padding) for easy copy/paste
function encodeShareCode(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/,'');
  return b64;
}

function decodeShareCode(code) {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    const str = atob(b64 + pad);
    const bytes = Uint8Array.from(str, c => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (e) {
    console.error('Invalid share code', e);
    return null;
  }
}

window.Catalog = { loadCatalog, filterItems, encodeShareCode, decodeShareCode };
