const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(tabs)/saisie.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /if \(\!exactMatch\) \{\n      if \(autoFromBase\) setAutoFromBase\(false\);\n      return;\n    \}/g;

const replacement = `if (!exactMatch) {
      if (autoFromBase) {
        setAutoFromBase(false);
        setForm((f) => ({ ...f, qteBon: 0 }));
      }
      return;
    }`;

content = content.replace(regex, replacement);

fs.writeFileSync(filePath, content);
console.log('Fixed qteBon logic');
