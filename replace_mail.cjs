const fs = require('fs');
let code = fs.readFileSync('shilp-sahayak-r2/src/index.ts', 'utf8');

const regex = /await setFirestoreDoc\(\s*projectId,\s*"mail",\s*mailDocId,\s*mailPayload,\s*apiKey,\s*[a-zA-Z]+\s*\);/g;

const fetchCode = `await fetch("https://script.google.com/macros/s/AKfycbxu-QeWezRGhfc8TEIN36s3YOyQjpeAo--JedLDaG2o_Ybpt1hbI3iLmgEMViqTsJCdBQ/exec", {
            method: "POST",
            body: JSON.stringify(mailPayload)
          }).catch(err => console.error("[mail] Google script error:", err));`;

code = code.replace(regex, fetchCode);
code = code.replace(/return await setFirestoreDoc\(\s*projectId,\s*"mail",\s*mailDocId,\s*mailPayload,\s*apiKey,\s*[a-zA-Z]+\s*\);/g, `return ${fetchCode}`);

fs.writeFileSync('shilp-sahayak-r2/src/index.ts', code);
console.log('Replaced mail calls with Google Script Webhook');
