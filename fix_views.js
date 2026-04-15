const fs = require('fs');
let src = fs.readFileSync('gm-tool/src/components/EncounterTracker.tsx', 'utf8');

src = src.replace(
  '<div className="flex flex-wrap gap-2">\\n        {weapons.map((weapon, idx) => {',
  '<div className="flex flex-nowrap overflow-x-auto gap-2 max-w-[220px] pb-1 custom-scrollbar">\\n        {weapons.map((weapon, idx) => {'
);
src = src.replace(
  'className="flex flex-col gap-1 bg-secondary/10 border border-border/50 rounded-md p-1.5 min-w-[60px] items-center"',
  'className="flex flex-shrink-0 flex-col gap-1 bg-secondary/10 border border-border/50 rounded-md p-1.5 min-w-[60px] items-center"'
);
src = src.replace(
  '<div className="space-y-1">\\n        {weapons.map((weapon, idx) => (',
  '<div className="flex flex-nowrap items-center gap-2 overflow-x-auto max-w-[300px] pb-1 custom-scrollbar">\\n        {weapons.map((weapon, idx) => ('
);
src = src.replace(
  '<div key={idx} className="text-xs">\\n            <div className="flex items-center gap-1.5 flex-wrap bg-secondary/10 p-1.5 rounded-md">',
  '<div key={idx} className="text-xs flex-shrink-0">\\n            <div className="flex items-center gap-1.5 flex-nowrap bg-secondary/10 p-1.5 rounded-md">'
);

fs.writeFileSync('gm-tool/src/components/EncounterTracker.tsx', src);
console.log('patched');
