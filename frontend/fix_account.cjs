const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/Account.tsx', 'utf8');

code = code.replace(
  /if \(phone && !\/\\^\[6-9\]\\d\{9\}\$\/\.test\(phone\)\) \{/,
  "if (!phone || !/^[6-9]\\d{9}$/.test(phone)) {"
);

code = code.replace(
  /label="Mobile Number \(Optional\)"/,
  'label="Mobile Number *"'
);

fs.writeFileSync('src/pages/storefront/Account.tsx', code);
