import * as XLSX from 'xlsx';
import type { ReferenceCourseInput } from '@/types/course';
import { normalize } from '@/lib/text';
import { normalizeLieu } from '@/lib/normalizeLieu';

/**
 * Lit un ou plusieurs fichiers .xls/.xlsx "listing" (export transporteur) et
 * convertit chaque course en ReferenceCourseInput. Ces lignes alimentent la
 * base de données de référence (onglet "Base"), PAS l'historique des
 * courses réellement faites: importer ces fichiers ne doit jamais créer de
 * "courses du jour".
 *
 * Format réel observé dans ces exports:
 *  - Les en-têtes sont sur une seule ligne (souvent vers la ligne 10), pas la ligne 0.
 *  - Une cellule fusionnée "enlèvement\nlivraison" sert de titre, mais la
 *    cellule de données correspondante n'est pas forcément dans la même
 *    colonne (décalage dû à la fusion) : "DD/MM HH:MM; NOM - CP VILLE" pour
 *    l'enlèvement, puis un retour à la ligne et la même syntaxe pour la
 *    livraison, dans une seule cellule.
 *  - Une colonne "Qté\nAchat" contient le nombre de bons.
 *  - Chaque course occupe une ligne de données suivie de 1-2 lignes vides.
 *
 * On repère donc les vraies colonnes de données par leur CONTENU (motif de
 * date "JJ/MM HH:MM; ...", motif de référence "(1)-F", valeur numérique)
 * plutôt que par la position exacte de l'en-tête, ce qui évite les décalages
 * de colonne dus aux cellules fusionnées.
 *
 * En repli, on garde l'ancien format "plat" (une ligne = un en-tête propre
 * par colonne: Enlèvement / Livraison / Qté / Achat) au cas où un fichier
 * serait exporté différemment.
 */
export async function parseExcelFile(fileUri: string): Promise<ReferenceCourseInput[]> {
  const response = await fetch(fileUri);
  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const results: ReferenceCourseInput[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: '',
    }) as unknown[][];

    const fromGrid = parseGrid(grid);
    if (fromGrid.length > 0) {
      results.push(...fromGrid);
    } else {
      results.push(...parseFlatSheet(sheet));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Format "listing" réel (en-têtes fusionnés, une course tous les 3 lignes)
// ---------------------------------------------------------------------------

const LOC_LINE_RE = /^(\d{2}\/\d{2}\s+\d{2}:\d{2})\s*;\s*(.*)$/;
const REF_RE = /\(\d+\)\s*-\s*[A-Za-z]+/;

interface HeaderInfo {
  rowIdx: number;
  enlevColGuess: number;
  qteColGuess: number;
}

/** Repère la ligne d'en-tête via les mots-clés "enlèvement"/"livraison" et "qté"/"achat". */
function findHeader(grid: unknown[][]): HeaderInfo | null {
  const limit = Math.min(grid.length, 60);
  for (let r = 0; r < limit; r++) {
    const row = grid[r] ?? [];
    let enlevCol = -1;
    let livrCol = -1;
    let qteCol = -1;
    for (let c = 0; c < row.length; c++) {
      const txt = normalize(String(row[c] ?? '').replace(/\n/g, ' '));
      if (!txt) continue;
      if (txt.includes('enlevement') && txt.includes('livraison')) {
        enlevCol = c;
        livrCol = c;
      } else {
        if (txt.includes('enlevement') && enlevCol === -1) enlevCol = c;
        if (txt.includes('livraison') && livrCol === -1) livrCol = c;
      }
      if (txt.includes('qte') && txt.includes('achat')) qteCol = c;
    }
    if (enlevCol !== -1 && livrCol !== -1) {
      return { rowIdx: r, enlevColGuess: enlevCol, qteColGuess: qteCol };
    }
  }
  return null;
}

function cellHasLocLine(v: unknown): boolean {
  const s = cellStr(v);
  if (!s) return false;
  return s.split('\n').some((l) => LOC_LINE_RE.test(l.trim()));
}

function cellIsNumeric(v: unknown): boolean {
  if (typeof v === 'number') return true;
  const s = cellStr(v);
  if (!s) return false;
  return /\d/.test(s) && !Number.isNaN(toNumber(s));
}

/** Trouve la vraie colonne contenant "JJ/MM HH:MM; lieu" en scannant les lignes de données. */
function resolveLocCol(grid: unknown[][], headerRowIdx: number, guessCol: number): number {
  const start = Math.max(0, guessCol - 2);
  const end = Math.min(grid.length, headerRowIdx + 150);
  for (let r = headerRowIdx + 1; r < end; r++) {
    const row = grid[r] ?? [];
    for (let c = start; c < row.length; c++) {
      if (cellHasLocLine(row[c])) return c;
    }
  }
  return guessCol;
}

/** Trouve la vraie colonne numérique "Qté Achat", en partant de l'en-tête puis les colonnes voisines. */
function resolveQteCol(grid: unknown[][], headerRowIdx: number, guessCol: number): number {
  if (guessCol === -1) return -1;
  const end = Math.min(grid.length, headerRowIdx + 150);
  for (let r = headerRowIdx + 1; r < end; r++) {
    const row = grid[r] ?? [];
    if (cellIsNumeric(row[guessCol])) return guessCol;
    for (let d = 1; d <= 2; d++) {
      if (cellIsNumeric(row[guessCol + d])) return guessCol + d;
      if (guessCol - d >= 0 && cellIsNumeric(row[guessCol - d])) return guessCol - d;
    }
  }
  return guessCol;
}

function parseGrid(grid: unknown[][]): ReferenceCourseInput[] {
  const header = findHeader(grid);
  if (!header) return [];

  const locCol = resolveLocCol(grid, header.rowIdx, header.enlevColGuess);
  const qteCol = resolveQteCol(grid, header.rowIdx, header.qteColGuess);

  const results: ReferenceCourseInput[] = [];

  // Détection structurelle du séparateur :
  // Le listing est divisé en deux blocs par une ligne "carré jaune" :
  //   - Bloc 1 (avant le carré jaune) : course à course
  //   - Bloc 2 (après le carré jaune) : médical
  //
  // Le carré jaune est une ligne où la cellule lieu est VIDE mais la colonne
  // Qté contient un sous-total (nombre > 0). On bascule en mode 'medical'
  // dès qu'on rencontre cette ligne, après avoir vu au moins une course.
  let domaineCourant: 'courseCourse' | 'medical' = 'courseCourse';
  let coursesVues = 0;
  let separateurTrouve = false;

  for (let r = header.rowIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const raw = cellStr(row[locCol]);

    if (!raw) {
      // Ligne sans lieu — vérifier si c'est le séparateur (carré jaune)
      if (!separateurTrouve && coursesVues > 0 && qteCol !== -1) {
        const sousTot = toNumber(row[qteCol]);
        if (sousTot > 0) {
          // C'est le sous-total "course à course" → tout ce qui suit est médical
          separateurTrouve = true;
          domaineCourant = 'medical';
        }
      }
      continue;
    }

    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const enlev = parseLocLine(lines[0]);
    const livr = lines[1] ? parseLocLine(lines[1]) : null;

    const qte = qteCol !== -1 ? toNumber(row[qteCol]) : 0;
    if (!enlev.lieu && !(livr && livr.lieu) && qte === 0) continue;
    // Ignorer les courses sans livraison : lieu d'enlèvement seul = destination inconnue
    if (!livr || !livr.lieu) continue;

    if (!separateurTrouve) coursesVues++;

    const numeroCourse = findRef(row, locCol);
    const vehicule = findVehicule(row, locCol, qteCol);

    results.push({
      lieuEnlevement: enlev.lieu,
      lieuLivraison: livr?.lieu ?? '',
      qteBon: qte,
      numeroCourse,
      dateCourse: enlev.datetime || undefined,
      vehicule,
      domaine: domaineCourant,
    });
  }
  return results;
}

function parseLocLine(line: string): { datetime: string; lieu: string } {
  const m = LOC_LINE_RE.exec(line.trim());
  if (m) {
    return { datetime: m[1], lieu: cleanLieu(m[2]) };
  }
  return { datetime: '', lieu: cleanLieu(line) };
}

function cleanLieu(s: string): string {
  const cleaned = s
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeLieu(cleaned);
}

function findRef(row: unknown[], beforeCol: number): string | undefined {
  for (let c = 0; c < beforeCol; c++) {
    const v = cellStr(row[c]);
    if (v && REF_RE.test(v)) {
      return v.split('\n')[0].trim();
    }
  }
  return undefined;
}

function normalizeVehicule(v: string): string {
  const s = v.trim().toUpperCase();
  // 2 ROUES NORMAL = même tarif que 2 ROUES EXPRESS → on fusionne
  if (s === '2 ROUES NORMAL') return '2 ROUES EXPRESS';
  return v.trim();
}

function findVehicule(row: unknown[], afterCol: number, beforeCol: number): string | undefined {
  const end = beforeCol > afterCol ? beforeCol : row.length;
  for (let c = afterCol + 1; c < end; c++) {
    const v = row[c];
    if (typeof v === 'string' && v.trim() && Number.isNaN(Number(v.replace(',', '.')))) {
      return normalizeVehicule(v);
    }
  }
  return undefined;
}

function cellStr(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

// ---------------------------------------------------------------------------
// Repli: format "plat" avec en-têtes propres en ligne 0 (une course = une ligne)
// ---------------------------------------------------------------------------

function parseFlatSheet(sheet: XLSX.WorkSheet): ReferenceCourseInput[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });

  const results: ReferenceCourseInput[] = [];
  for (const row of rows) {
    const entry = mapFlatRow(row);
    if (entry) results.push(entry);
  }
  return results;
}

function findKey(obj: Record<string, unknown>, candidates: string[]): string | undefined {
  const keys = Object.keys(obj);
  for (const cand of candidates) {
    const target = normalize(cand);
    const found = keys.find((k) => normalize(k) === target);
    if (found) return found;
  }
  for (const cand of candidates) {
    const target = normalize(cand);
    const found = keys.find((k) => normalize(k).includes(target));
    if (found) return found;
  }
  return undefined;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d,.\-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function mapFlatRow(row: Record<string, unknown>): ReferenceCourseInput | null {
  const qteKey = findKey(row, ['Qté', 'Quantité', 'Qte bon', 'Quantité de bons', 'Qte']);
  const achatKey = findKey(row, ['Achat', 'Montant achat', 'Montant', 'Prix']);
  const enlevKey = findKey(row, ['Enlèvement', 'Lieu enlèvement', 'Départ', 'Enlevement']);
  const livrKey = findKey(row, ['Livraison', 'Lieu livraison', 'Arrivée', 'Livraison']);

  if (!qteKey && !achatKey) return null;

  return {
    lieuEnlevement: enlevKey ? String(row[enlevKey] ?? '') : '',
    lieuLivraison: livrKey ? String(row[livrKey] ?? '') : '',
    qteBon: qteKey ? toNumber(row[qteKey]) : achatKey ? toNumber(row[achatKey]) : 0,
    // Format plat : pas de séparateur structurel visible, domaine inconnu par défaut
    domaine: 'courseCourse' as const,
  };
}
