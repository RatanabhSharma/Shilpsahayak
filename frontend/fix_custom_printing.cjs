const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/CustomPrinting.tsx', 'utf8');

// Remove (optional) from Phone Number labels
code = code.replace(/Phone Number <span className="text-muted font-normal">\(optional\)<\/span>/g, 'Phone Number *');

// Update handleAssistedSubmit validation
const assistedValidationMatch = `if (!customerName || !customerEmail || !assistedDesc) {`;
const newAssistedValidation = `const cleanPhone = assistedPhone.replace(/\\D/g, '').slice(-10);
    if (!cleanPhone || !/^[6-9]\\d{9}$/.test(cleanPhone)) {
      alert('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!customerName || !customerEmail || !assistedDesc) {`;
code = code.replace(assistedValidationMatch, newAssistedValidation);

// Update handleRequestQuote validation
const quoteValidationMatch = `if (!customerName || !customerEmail) {
      alert('Please provide your name and email address.');
      return;
    }`;
const newQuoteValidation = `if (!customerName || !customerEmail) {
      alert('Please provide your name and email address.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\\D/g, '').slice(-10);
    if (!cleanPhone || !/^[6-9]\\d{9}$/.test(cleanPhone)) {
      alert('Please enter a valid 10-digit Indian mobile number.');
      return;
    }`;
code = code.replace(quoteValidationMatch, newQuoteValidation);

// Update Phone Number (WhatsApp for updates) to have * 
code = code.replace(/Phone Number \(WhatsApp for updates\)/g, 'Phone Number (WhatsApp for updates) *');

fs.writeFileSync('src/pages/storefront/CustomPrinting.tsx', code);
console.log('Done');
