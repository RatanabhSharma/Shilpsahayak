const fs = require('fs');
let settings = fs.readFileSync('frontend/src/pages/admin/Settings.tsx', 'utf8');

settings = settings.replace(
  /    const updateNestedBank = \([\s\S]*?\}\)\);\n    \};\n/g,
  ''
);

// Remove the JSX block
settings = settings.replace(
  /                \{\/\* Bank Account Details for B2B Clients \*\/\}[\s\S]*?UTIB0000123"[\s\S]*?<\/div>\n                    <\/div>\n                  <\/div>/g,
  ''
);

fs.writeFileSync('frontend/src/pages/admin/Settings.tsx', settings);
console.log("Removed bank details JSX completely");
