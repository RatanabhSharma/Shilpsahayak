const fs = require('fs');
let settings = fs.readFileSync('frontend/src/pages/admin/Settings.tsx', 'utf8');

settings = settings.replace(
  /  const updateNestedBank = \(\n    key: keyof NonNullable<PrivateSettings\['bankAccountDetails'\]>,\n    value: string\n  \) => \{\n    setForm\(\(current\) => \(\{\n      \.\.\.current,\n      bankAccountDetails: \{\n        \.\.\.\(current\.bankAccountDetails \|\| \{\}\),\n        \[key\]: value,\n      \},\n    \}\)\);\n  \};\n/,
  ''
);

fs.writeFileSync('frontend/src/pages/admin/Settings.tsx', settings);
console.log("Removed updateNestedBank");
