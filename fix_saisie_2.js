const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(tabs)/saisie.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\/\/ Si ce trajet précis a toujours été fait[\s\S]*?const selectVehicule = \(value: string\) => \{\n    setForm\(\(f\) => \(\{ \.\.\.f, vehicule: f\.vehicule === value \? '' : value \}\)\);\n/g;

content = content.replace(regex, `const selectVehicule = (value: string) => {
    setForm((f) => ({ ...f, vehicule: f.vehicule === value ? '' : value }));
  };
`);

// also remove vehiculeAuto and vehiculeTouched from useState
content = content.replace(/const \[vehiculeAuto, setVehiculeAuto\] = useState\(false\);\n/, '');
content = content.replace(/const \[vehiculeTouched, setVehiculeTouched\] = useState\(false\);\n/, '');

fs.writeFileSync(filePath, content);
console.log('Fixed saisie.tsx completely');
