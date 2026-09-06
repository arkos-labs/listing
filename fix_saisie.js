const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(tabs)/saisie.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const importsToAdd = `import {
  suggestionsForPickup,
  suggestLocations,
  matchByPickup,
  resolveQte,
  resolveVehicule,
  listVehicules,
  matchesVehicule,
  Suggestion,
  LocationOption,
  VehiculeOption,
} from '@/lib/reference';
import { formatQte, formatEuro } from '@/lib/kpi';
`;

content = content.replace(
  `import { computeMontant, PRIX_BON } from '@/lib/pricing';`,
  importsToAdd + `import { computeMontant, PRIX_BON } from '@/lib/pricing';`
);

// Fix the duplicate vehiculeOptions issue
// In my previous rewrite script, I added `vehiculeOptions = listVehicules(referenceCourses)` 
// but failed to remove the old one at line 80 because the regex failed to match.
// Let's remove the old one specifically:

content = content.replace(
  /const vehiculeOptions = useMemo<VehiculeOption\[\]>\(\(\) => listVehicules\(deliveryPool\), \[deliveryPool\]\);\n/,
  ''
);

fs.writeFileSync(filePath, content);
console.log('Fixed saisie.tsx');
