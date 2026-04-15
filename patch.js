const fs = require('fs');
let txt = fs.readFileSync('gm-tool/src/components/EncounterGenerator.tsx', 'utf8');
txt = txt.replace('nonCombatNumber: ncn\n\n    // Generate turrets', 'nonCombatNumber: ncn\n        });\n      }\n\n    // Generate turrets');
txt = txt.replace('nonCombatNumber: ncn\r\n\r\n    // Generate turrets', 'nonCombatNumber: ncn\r\n        });\r\n      }\r\n\r\n    // Generate turrets');
fs.writeFileSync('gm-tool/src/components/EncounterGenerator.tsx', txt);
