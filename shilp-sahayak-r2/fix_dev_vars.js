const fs = require('fs');
const testCode = fs.readFileSync('test/index.spec.ts', 'utf8');
const match = testCode.match(/const testPrivateKey = `([\s\S]*?)`;/);
if (match) {
    const key = match[1].replace(/\n/g, '\\n');
    let devVars = fs.readFileSync('.dev.vars', 'utf8');
    devVars = devVars.replace(/FIREBASE_PRIVATE_KEY=".*?"/s, 'FIREBASE_PRIVATE_KEY="' + key + '"');
    fs.writeFileSync('.dev.vars', devVars);
    console.log("Updated .dev.vars");
} else {
    console.log("Could not find testPrivateKey");
}
