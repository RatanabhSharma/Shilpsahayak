const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/CustomPrinting.tsx', 'utf8');

// Fix "Photo / Drawing" pill
code = code.replace(
  /<span className="text-\[10px\] font-mono font-bold px-2 py-0.5 rounded-full bg-line dark:bg-slate-700 text-muted">\s*Photo \/ Drawing\s*<\/span>/,
  '<span className="text-[11px] font-sans font-semibold px-2.5 py-1 rounded-md bg-line dark:bg-slate-700 text-ink dark:text-slate-200">Photo / Drawing</span>'
);

// Fix "Text Concept" pill
code = code.replace(
  /<span className="text-\[10px\] font-mono font-bold px-2 py-0.5 rounded-full bg-line dark:bg-slate-700 text-muted">\s*Text Concept\s*<\/span>/,
  '<span className="text-[11px] font-sans font-semibold px-2.5 py-1 rounded-md bg-line dark:bg-slate-700 text-ink dark:text-slate-200">Text Concept</span>'
);

// Fix icon placement
code = code.replace(
  /<div className="flex items-start justify-between">/g,
  '<div className="flex items-center justify-between">'
);

fs.writeFileSync('src/pages/storefront/CustomPrinting.tsx', code);
console.log('Idea flow pills updated');
