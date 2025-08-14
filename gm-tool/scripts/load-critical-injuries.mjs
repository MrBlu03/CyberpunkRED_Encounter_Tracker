#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FVTT_PATH = path.join(__dirname, '../../fvtt-cyberpunk-red-core-master/src/packs/core');
const OUTPUT_PATH = path.join(__dirname, '../public/data');

async function loadCriticalInjuries() {
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_PATH, { recursive: true });

    const headDir = path.join(FVTT_PATH, 'critical-injuries-head');
    const bodyDir = path.join(FVTT_PATH, 'critical-injuries-body');

    const headFiles = await fs.readdir(headDir);
    const bodyFiles = await fs.readdir(bodyDir);

    const headInjuries = [];
    const bodyInjuries = [];

    // Load head injuries
    for (const file of headFiles) {
      if (file.endsWith('.yaml')) {
        const content = await fs.readFile(path.join(headDir, file), 'utf-8');
        const data = yaml.load(content);
        
        headInjuries.push({
          key: data._id,
          name: data.name,
          location: 'head',
          description: data.system?.description?.value?.replace(/<\/?p>/g, '') || 'No description',
          deathSaveIncrease: data.system?.deathSaveIncrease || false,
          quickFix: data.system?.quickFix || {},
          treatment: data.system?.treatment || {},
          source: data.system?.source || {}
        });
      }
    }

    // Load body injuries  
    for (const file of bodyFiles) {
      if (file.endsWith('.yaml')) {
        const content = await fs.readFile(path.join(bodyDir, file), 'utf-8');
        const data = yaml.load(content);
        
        bodyInjuries.push({
          key: data._id,
          name: data.name,
          location: 'body',
          description: data.system?.description?.value?.replace(/<\/?p>/g, '') || 'No description',
          deathSaveIncrease: data.system?.deathSaveIncrease || false,
          quickFix: data.system?.quickFix || {},
          treatment: data.system?.treatment || {},
          source: data.system?.source || {}
        });
      }
    }

    const criticalInjuries = {
      head: headInjuries.sort((a, b) => a.name.localeCompare(b.name)),
      body: bodyInjuries.sort((a, b) => a.name.localeCompare(b.name))
    };

    await fs.writeFile(
      path.join(OUTPUT_PATH, 'critical-injuries.json'),
      JSON.stringify(criticalInjuries, null, 2)
    );

    console.log(`✅ Loaded ${headInjuries.length} head injuries and ${bodyInjuries.length} body injuries`);
    console.log('   Output:', path.join(OUTPUT_PATH, 'critical-injuries.json'));

  } catch (error) {
    console.error('❌ Error loading critical injuries:', error.message);
    process.exit(1);
  }
}

loadCriticalInjuries();
