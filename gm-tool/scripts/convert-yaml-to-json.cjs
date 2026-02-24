// Node.js script to convert all YAML files in FVTT packs to JSON
// Run this from the gm-tool directory: `node scripts/convert-yaml-to-json.cjs`

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');


const PACKS_ROOT = path.join(__dirname, '../public/fvtt/packs');
const OUTPUT_ROOT = path.join(__dirname, '../public/fvtt/packs_json');
const MANIFEST_PATH = path.join(OUTPUT_ROOT, 'manifest.json');
const ALL_ITEMS_PATH = path.join(OUTPUT_ROOT, 'all-items.json');

const SHOP_ITEM_TYPES = ['weapon', 'armor', 'cyberware', 'gear', 'drug', 'ammo', 'clothing', 'itemUpgrade', 'vehicle'];

function walkDir(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (dirent.isFile() && dirent.name.endsWith('.yaml')) {
      callback(fullPath);
    }
  });
}

function convertAllYamlToJson() {
  if (!fs.existsSync(OUTPUT_ROOT)) fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const manifest = [];
  const allItems = [];
  
  // Recursively walk all subfolders of PACKS_ROOT
  walkDir(PACKS_ROOT, yamlFile => {
    if (!yamlFile.endsWith('.yaml')) return;
    const relPath = path.relative(PACKS_ROOT, yamlFile);
    const outPath = path.join(OUTPUT_ROOT, relPath.replace(/\.yaml$/, '.json'));
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const yamlContent = fs.readFileSync(yamlFile, 'utf8');
    let jsonData;
    try {
      jsonData = yaml.load(yamlContent);
    } catch (e) {
      console.error('Failed to parse', yamlFile, e);
      return;
    }
    fs.writeFileSync(outPath, JSON.stringify(jsonData, null, 2), 'utf8');
    
    // Add to manifest
    const webPath = relPath.replace(/\\/g, '/').replace(/\.yaml$/, '.json');
    manifest.push(webPath);
    
    // Add shop items to combined file
    if (jsonData && jsonData.type && SHOP_ITEM_TYPES.includes(jsonData.type)) {
      allItems.push(jsonData);
    }
    
    console.log('Converted', yamlFile, '->', outPath);
  });
  
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Manifest written to', MANIFEST_PATH);
  
  // Write combined all-items file for fast loading
  fs.writeFileSync(ALL_ITEMS_PATH, JSON.stringify(allItems, null, 2), 'utf8');
  console.log('All items combined:', allItems.length, 'shop items written to', ALL_ITEMS_PATH);
}

convertAllYamlToJson();