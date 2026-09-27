const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/CustomPrinting.tsx', 'utf8');

code = code.replace(
  /className="relative overflow-hidden border-b border-line dark:border-slate-800 bg-white\/80 dark:bg-slate-900\/60 backdrop-blur-xs py-10 sm:py-14 px-4 sm:px-6 lg:px-8"/,
  'className="relative overflow-hidden border-b border-line dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xs pt-24 pb-10 sm:pt-32 sm:pb-14 px-4 sm:px-6 lg:px-8"'
);

fs.writeFileSync('src/pages/storefront/CustomPrinting.tsx', code);
console.log('Hero padding updated');
