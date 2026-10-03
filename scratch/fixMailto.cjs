const fs = require('fs');
const files = [
  'frontend/src/pages/storefront/CookiePolicy.tsx',
  'frontend/src/pages/storefront/PrivacyPolicy.tsx',
  'frontend/src/pages/storefront/RefundPolicy.tsx',
  'frontend/src/pages/storefront/TermsAndConditions.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/"mailto:\$\{email\}"/g, '{`mailto:${email}`}');
  fs.writeFileSync(file, code);
}
