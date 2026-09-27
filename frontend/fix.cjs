const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/Home.tsx', 'utf8');

code = code.replace(/from-purple-600 to-blue-600/g, 'from-brand-500 to-brand-600');
code = code.replace(/from-purple-\d+/g, 'from-brand-500');
code = code.replace(/rounded-full/g, 'rounded-md');
code = code.replace(/bg-gradient-to-r from-brand-600 to-accent/g, 'text-brand-600');
code = code.replace(/Precision 3D fabrication studio in Patiala, Punjab\. Handcrafted 3D printed lighting, organizers, and custom pieces\./g, 'Custom 3D Printing in Patiala. Functional parts and prototypes.');
code = code.replace(/10k\+ customers/g, 'Many satisfied clients');
code = code.replace(/https:\/\/images\.unsplash\.com\/photo-[\w-]+.*?q=80/g, '/images/logo.png');

// Remove social proof section safely
const startStr = '{/* =====================================================\n          6. SOCIAL PROOF (REVIEWS)\n      ====================================================== */}';
const endStr = '{/* =====================================================\n          7. FINAL MEMORABLE CTA SECTION';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + endStr + code.substring(endIndex + endStr.length);
}

// Remove animate-fade-up and animate-scroll classes to reduce animations
code = code.replace(/animate-fade-up/g, '');
code = code.replace(/animate-scroll/g, '');

fs.writeFileSync('src/pages/storefront/Home.tsx', code);
