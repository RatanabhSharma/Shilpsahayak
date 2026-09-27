const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/Contact.tsx', 'utf8');

const replacement = `await addDoc(collection(db, 'inquiries'), {
        name,
        email: emailVal,
        phone: phoneVal,
        subject,
        message,
        status: 'unread',
        createdAt: new Date().toISOString(),
      });

      // Dispatch email alert to info.shilpsahayak@gmail.com
      try {
        await fetch('https://script.google.com/macros/s/AKfycbyeIpTVAK9peue5pG1JnceLDFC2fRtcNYzO52wXsKgRNWVfO7kkdW9adK8EYZ8h4n4muA/exec', {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({
            name,
            email: emailVal,
            phone: phoneVal,
            subject,
            message
          })
        });
      } catch (emailErr) {
        console.error("Email alert dispatch failed (silent)", emailErr);
      }`;

code = code.replace(/await addDoc\(collection\(db, 'inquiries'\), \{[\s\S]*?createdAt: new Date\(\)\.toISOString\(\),\s*\}\);/, replacement);

fs.writeFileSync('src/pages/storefront/Contact.tsx', code);
console.log('Contact form updated with email alert');
