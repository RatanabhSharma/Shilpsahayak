const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/ProductDetail.tsx', 'utf8');

// First block
const oldGrid1 = `<div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">`;
const newGrid1 = `<div className="mt-4 flex flex-wrap gap-4">`;

// Second block
const oldGrid2 = `<div className="mt-4 grid grid-cols-3 gap-3">`;
const newGrid2 = `<div className="mt-4 flex flex-wrap gap-3">`;

code = code.replace(oldGrid1, newGrid1).replace(oldGrid2, newGrid2);

// Remove truncate, add whitespace-normal and flex adjustments
code = code.replace(/<div className="rounded-2xl border border-line bg-shell p-3\.5">/g, '<div className="flex-1 min-w-[120px] rounded-xl border border-line bg-shell/50 p-4">');
code = code.replace(/<div className="rounded-xl border border-line bg-shell p-3">/g, '<div className="flex-1 min-w-[110px] rounded-xl border border-line bg-shell/50 p-3.5">');

code = code.replace(/<p className="font-mono text-xs font-bold text-ink truncate">/g, '<p className="font-mono text-xs font-bold text-ink whitespace-normal">');
code = code.replace(/<p className="mt-1 font-mono text-xs font-bold text-ink truncate">/g, '<p className="mt-1 font-mono text-xs font-bold text-ink whitespace-normal">');

fs.writeFileSync('src/pages/storefront/ProductDetail.tsx', code);
console.log('Product tags fixed');
