const fs = require('fs');
let code = fs.readFileSync('shilp-sahayak-r2/src/index.ts', 'utf8');

const replacementImg = `<img src="https://shilpsahayak.vercel.app/images/logo.png" alt="Shilp Sahayak" style="height: 36px; margin: 0 auto; display: block;" />`;

// Replace 1: Razorpay webhook
code = code.replace(/<h1 style="color: #ff4d00; margin: 0; font-size: 24px; font-weight: 800;">SHILP SAHAYAK<\/h1>/g, replacementImg);

// Replace 2: emailHeaderHtml multiline
const oldEmailHeader = `<h1 style="color: #ff4d00; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                SHILP SAHAYAK
              </h1>`;
code = code.replace(oldEmailHeader, replacementImg);

fs.writeFileSync('shilp-sahayak-r2/src/index.ts', code);
console.log('Logo replaced in emails');
