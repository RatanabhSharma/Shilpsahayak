const fs = require('fs');
let store = fs.readFileSync('frontend/src/store.ts', 'utf8');

store = store.replace(
  /  bankAccountDetails\?: \{[\s\S]*?  \};\n/g,
  ''
);

fs.writeFileSync('frontend/src/store.ts', store);

let settings = fs.readFileSync('frontend/src/pages/admin/Settings.tsx', 'utf8');

settings = settings.replace(
  /    const updateNestedBank = \([\s\S]*?\}\)\);\n    \};\n/g,
  ''
);

// Remove the whole Bank Details section from the UI
settings = settings.replace(
  /                      \{!\-\- Bank Details \-\-\}[\s\S]*?                      \}\)\}\n/g,
  ''
);

fs.writeFileSync('frontend/src/pages/admin/Settings.tsx', settings);
console.log("Removed bank details");
