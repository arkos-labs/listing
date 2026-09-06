/** Normalise une chaîne pour comparaison insensible à la casse et aux accents. */
export function normalize(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** true si `haystack` contient `needle` (insensible casse/accents). Needle vide -> true. */
export function includesNormalized(haystack: unknown, needle: string): boolean {
  if (!needle.trim()) return true;
  
  const h = normalize(haystack);
  const n = normalize(needle);
  
  if (h.includes(n)) return true;
  
  const tokens = n.replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  
  return tokens.every((token) => h.includes(token));
}
