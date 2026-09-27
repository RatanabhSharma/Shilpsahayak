const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/Login.tsx', 'utf8');

// Fix validation to make phone mandatory
code = code.replace(
  /if \(cleanPhone && !\/\\^\[6-9\]\\d\{9\}\$\/\.test\(cleanPhone\)\) \{/,
  "if (!cleanPhone || !/^[6-9]\\d{9}$/.test(cleanPhone)) {"
);

// Fix label
code = code.replace(
  /INDIAN MOBILE NUMBER \(OPTIONAL\)/,
  "INDIAN MOBILE NUMBER *"
);

fs.writeFileSync('src/pages/storefront/Login.tsx', code);
console.log('Done');
