const fs = require('fs');
let eg = fs.readFileSync('gm-tool/src/components/EncounterGenerator.tsx', 'utf8');
eg = eg.replace('tier: tier,\r\n          combatNumber: cn,\r\n          nonCombatNumber: ncn\r\n\r\n    // Generate turrets', 'tier: tier,\r\n          combatNumber: cn,\r\n          nonCombatNumber: ncn\r\n        });\r\n      }\r\n\r\n    // Generate turrets');
eg = eg.replace('tier: tier,\n          combatNumber: cn,\n          nonCombatNumber: ncn\n\n    // Generate turrets', 'tier: tier,\n          combatNumber: cn,\n          nonCombatNumber: ncn\n        });\n      }\n\n    // Generate turrets');
fs.writeFileSync('gm-tool/src/components/EncounterGenerator.tsx', eg);

let et = fs.readFileSync('gm-tool/src/components/EncounterTracker.tsx', 'utf8');
et = et.replace('attacks.push({ ...calculateAttackRoll(baseRef, weaponSkill, attackMod), weaponName: weapon.name });\r\n      ...prev,', 'attacks.push({ ...calculateAttackRoll(baseRef, weaponSkill, attackMod), weaponName: weapon.name });\r\n    }\r\n\r\n    setAttackRolls(prev => ({\r\n      ...prev,');
et = et.replace('attacks.push({ ...calculateAttackRoll(baseRef, weaponSkill, attackMod), weaponName: weapon.name });\n      ...prev,', 'attacks.push({ ...calculateAttackRoll(baseRef, weaponSkill, attackMod), weaponName: weapon.name });\n    }\n\n    setAttackRolls(prev => ({\n      ...prev,');
fs.writeFileSync('gm-tool/src/components/EncounterTracker.tsx', et);

let mnc = fs.readFileSync('gm-tool/src/components/ManualNPCCreator.tsx', 'utf8');
mnc = mnc.replace('{/* Stats Tab */}', ')};\n\n      {/* Stats Tab */}');
fs.writeFileSync('gm-tool/src/components/ManualNPCCreator.tsx', mnc);

