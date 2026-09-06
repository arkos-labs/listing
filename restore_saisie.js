const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(tabs)/saisie.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The file was broken by removing exactMatchKey, the useEffect, and applySuggestion.
// I will re-insert them right after exactMatch is defined.

const anchor = `  const exactMatch = useMemo(() => {
    if (form.lieuEnlevement.trim().length < 3 || form.lieuLivraison.trim().length < 3) return null;
    return resolveQte(baseFiltered, form.lieuEnlevement, form.lieuLivraison, form.vehicule);
    setDeliveryOpen(false);
  };`;

// Wait, the regex replace messed it up. Let's see what is there now using view_file or Get-Content.
