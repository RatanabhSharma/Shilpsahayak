const fs = require('fs');
let settings = fs.readFileSync('frontend/src/pages/admin/Settings.tsx', 'utf8');

settings = settings.replace(
  /    const updateNestedBank = \([\s\S]*?\}\)\);\n    \};\n/g,
  ''
);

// Remove the JSX block
// It starts with something like `<div>\n                      <h4 className="font-display text-sm font-bold mb-3">Bank Account Details</h4>`
// Let's just find the exact string
let blockStart = settings.indexOf(`<h4 className="font-display text-sm font-bold mb-3">Bank Account Details</h4>`);
if (blockStart !== -1) {
  let divStart = settings.lastIndexOf('<div', blockStart);
  // Find the end of this block. It's a grid with 4 inputs.
  // The next section is `</div>\n                  </div>\n                </div>\n              )}`
  // So let's use a regex to match from `<div` before `Bank Account Details` to the end of the `ifscCode` div
  settings = settings.replace(
    /                    <div className="pt-4 border-t border-line">[\s\S]*?Bank Account Details[\s\S]*?ifscCode[\s\S]*?<\/div>\n                      <\/div>\n                    <\/div>/,
    ''
  );
}

// Remove bankAccountDetails from updatePrivateSettings
settings = settings.replace(
  /bankAccountDetails,\n/g,
  ''
);
settings = settings.replace(
  /        bankAccountDetails,\n/g,
  ''
);

fs.writeFileSync('frontend/src/pages/admin/Settings.tsx', settings);
console.log("Removed bank details JSX");
