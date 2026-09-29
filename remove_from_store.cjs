const fs = require('fs');
let store = fs.readFileSync('frontend/src/store.ts', 'utf8');

store = store.replace(
  /  bankAccountDetails\?: \{\s*accountName: string;\s*accountNumber: string;\s*ifscCode: string;\s*bankName: string;\s*\};\s*/,
  ''
);
fs.writeFileSync('frontend/src/store.ts', store);

let hooks = fs.readFileSync('frontend/src/hooks/useSettings.ts', 'utf8');
hooks = hooks.replace(
  /  bankAccountDetails: \{\s*accountName: 'Shilp Sahayak 3D Technologies Pvt Ltd',\s*accountNumber: '924020012345678',\s*ifscCode: 'UTIB0000123',\s*bankName: 'Axis Bank Ltd',\s*\},\s*/,
  ''
);
fs.writeFileSync('frontend/src/hooks/useSettings.ts', hooks);

console.log("Removed from store and hooks");
