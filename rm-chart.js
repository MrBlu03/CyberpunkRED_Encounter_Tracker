const fs = require('fs');
let src = fs.readFileSync('gm-tool/src/components/EncounterTracker.tsx', 'utf8');
const regex = /\/\/ Weapon Range DV Chart - only for ranged weapons[\s\S]*?\/\/ Attack Quick View Component with Attack Button/;
src = src.replace(regex, '// Attack Quick View Component with Attack Button');
fs.writeFileSync('gm-tool/src/components/EncounterTracker.tsx', src);
console.log('Done!');
