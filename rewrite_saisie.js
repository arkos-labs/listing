const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(tabs)/saisie.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add matchesVehicule to imports
content = content.replace(
  /listVehicules,\n\s*Suggestion,/,
  'listVehicules,\n  matchesVehicule,\n  Suggestion,'
);

// 2. Remove vehiculeAuto, vehiculeTouched, vehiculeMatch logic
content = content.replace(/const \[vehiculeAuto.*?\n/, '');
content = content.replace(/const \[vehiculeTouched.*?\n/, '');
content = content.replace(/const vehiculeMatch = useMemo\(\(\) => \{[\s\S]*?\}, \[referenceCourses, form.lieuEnlevement, form.lieuLivraison\]\);\n\n  const vehiculeMatchKey = vehiculeMatch \? \`\$\{vehiculeMatch.vehicule\}\|\$\{vehiculeMatch.ambiguous\}\` : '';\n\n  useEffect\(\(\) => \{[\s\S]*?\}, \[vehiculeMatchKey, vehiculeTouched\]\);\n/g, '');

content = content.replace(
  /const selectVehicule = \(value: string\) => \{[\s\S]*?\n  \};/,
  `const selectVehicule = (value: string) => {
    setForm((f) => ({ ...f, vehicule: f.vehicule === value ? '' : value }));
  };`
);

// 3. Define baseFiltered and update options
const replacement = `
  // ---- Type de course (ex: "2 ROUES EXPRESS", "VITAL", "PROGRAMMÉE", "BREAK / 4 ROUES") ----
  // On liste tous les types existants dans la base globale.
  const vehiculeOptions = useMemo<VehiculeOption[]>(() => listVehicules(referenceCourses), [referenceCourses]);

  // Filtrage principal : on restreint TOUTE la base au type de course sélectionné
  const baseFiltered = useMemo(() => {
    if (!form.vehicule) return referenceCourses;
    return referenceCourses.filter(c => matchesVehicule(c, form.vehicule));
  }, [referenceCourses, form.vehicule]);

  const pickupOptions = useMemo<LocationOption[]>(
    () => suggestLocations(baseFiltered, 'lieuEnlevement', form.lieuEnlevement),
    [baseFiltered, form.lieuEnlevement]
  );

  const deliveryPool = useMemo(
    () => (form.lieuEnlevement.trim().length >= 2 ? matchByPickup(baseFiltered, form.lieuEnlevement) : baseFiltered),
    [baseFiltered, form.lieuEnlevement]
  );
  
  const deliveryOptions = useMemo<LocationOption[]>(
    () => suggestLocations(deliveryPool, 'lieuLivraison', form.lieuLivraison),
    [deliveryPool, form.lieuLivraison]
  );
`;

content = content.replace(
  /const pickupOptions = useMemo[\s\S]*?const deliveryOptions = useMemo<LocationOption\[\]>\([\s\S]*?\n  \);/,
  replacement.trim()
);

// Replace referenceCourses with baseFiltered in suggestions and exactMatch
content = content.replace(/suggestionsForPickup\(referenceCourses/g, 'suggestionsForPickup(baseFiltered');
content = content.replace(/resolveQte\(referenceCourses/g, 'resolveQte(baseFiltered');
content = content.replace(/\[referenceCourses, form.lieuEnlevement, form.lieuLivraison/g, '[baseFiltered, form.lieuEnlevement, form.lieuLivraison');

// Also fix UI where we show autoHintWrap for vehicle
content = content.replace(/\{vehiculeAuto \? \([\s\S]*?\) : form\.vehicule \? \(/, '{form.vehicule ? (');

fs.writeFileSync(filePath, content);
console.log('Done refactoring saisie.tsx');
