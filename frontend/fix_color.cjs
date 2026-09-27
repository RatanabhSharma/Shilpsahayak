const fs = require('fs');
let code = fs.readFileSync('src/components/product/ProductCard.tsx', 'utf8');

code = code.replace(
  /className="flex items-center justify-center gap-1\.5 min-h-\[40px\] sm:min-h-\[36px\] w-full rounded-md bg-ink text-white font-sans text-\[11px\] font-bold shadow-xs hover:bg-ink\/90 active:scale-95 transition-all duration-150 cursor-pointer"/,
  'className="flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] w-full rounded-md bg-accent text-white font-sans text-[11px] font-bold shadow-xs hover:bg-accent-hover active:scale-95 transition-all duration-150 cursor-pointer"'
);

fs.writeFileSync('src/components/product/ProductCard.tsx', code);
console.log('Button color reverted to orange');
