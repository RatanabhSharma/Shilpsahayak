import fs from 'fs';

async function main() {
  const res = await fetch('https://raw.githubusercontent.com/SamiSalah221/3mf-to-glb/master/src/lib/parse3MF.ts');
  const text = await res.text();
  console.log('Total length:', text.length);
  fs.writeFileSync('scratch/reference_parse3MF.ts', text);
  console.log('Saved to scratch/reference_parse3MF.ts');
}

main().catch(console.error);

