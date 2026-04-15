const fs = require('fs');
let src = fs.readFileSync('gm-tool/src/components/EncounterTracker.tsx', 'utf8');
src = src.replace(import { SINGLE_SHOT_DV, getDVTableKey } from '@/lib/weaponRanges';, '');
fs.writeFileSync('gm-tool/src/components/EncounterTracker.tsx', src);
