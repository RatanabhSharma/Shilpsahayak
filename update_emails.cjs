const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'frontend/src/hooks/useSettings.ts',
  'frontend/src/pages/admin/OrderDetail.tsx',
  'frontend/src/pages/admin/Settings.tsx',
  'frontend/src/pages/storefront/Contact.tsx',
  'frontend/src/pages/storefront/CookiePolicy.tsx',
  'frontend/src/pages/storefront/PrivacyPolicy.tsx',
  'frontend/src/pages/storefront/RefundPolicy.tsx',
  'frontend/src/pages/storefront/TermsAndConditions.tsx',
  'shilp-sahayak-r2/src/index.ts',
  'shilp-sahayak-r2/test/index.spec.ts',
  'workflow.md'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join('d:/Shilp buss/Supabase/New folder/Shilpsahayak', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    content = content.replace(/hello@shilpsahayak\.com/g, 'info.shilpsahayak@gmail.com');
    content = content.replace(/hello@shilpsahayak\.in/g, 'info.shilpsahayak@gmail.com');
    content = content.replace(/support@shilpsahayak\.in/g, 'info.shilpsahayak@gmail.com');
    content = content.replace(/orders@shilpsahayak\.in/g, 'info.shilpsahayak@gmail.com');
    content = content.replace(/support@shilpsahayak\.com/g, 'info.shilpsahayak@gmail.com');
    
    fs.writeFileSync(fullPath, content);
  }
});
console.log('Emails updated across the codebase');
