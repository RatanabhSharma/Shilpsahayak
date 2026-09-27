const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Settings.tsx', 'utf8');

// Replace Primary Phone Number * with Primary Phone Number
code = code.replace(/Primary Phone Number \*/g, 'Primary Phone Number (Optional)');

// Remove required attribute from the phone input
const phoneRegex = /(Primary Phone Number[\s\S]*?<input[\s\S]*?type="tel"[\s\S]*?value=\{form\.phone[\s\S]*?onChange=\{[\s\S]*?\}[\s\S]*?)(required)(\s*className=)/;
code = code.replace(phoneRegex, '$1$3');

// Replace WhatsApp Customer Hotline * with WhatsApp Customer Hotline
code = code.replace(/WhatsApp Customer Hotline \*/g, 'WhatsApp Customer Hotline (Optional)');

// Remove required attribute from the WhatsApp input
const whatsappRegex = /(WhatsApp Customer Hotline[\s\S]*?<input[\s\S]*?type="tel"[\s\S]*?value=\{form\.whatsappNumber[\s\S]*?onChange=\{[\s\S]*?\}[\s\S]*?)(required)(\s*className=)/;
code = code.replace(whatsappRegex, '$1$3');

fs.writeFileSync('src/pages/admin/Settings.tsx', code);
console.log('Phone number requirements removed in Settings');
