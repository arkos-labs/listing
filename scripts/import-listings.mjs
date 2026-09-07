/**
 * import-listings.mjs
 *
 * Script Node.js autonome pour importer tous les fichiers XLS du dossier
 * "doc linsting" directement dans Supabase, sans passer par l'app mobile.
 *
 * Usage:
 *   node scripts/import-listings.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LISTINGS_DIR = join(ROOT, 'doc linsting');

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

const SUPABASE_URL = 'https://wtrlmjyzklxljiulbzca.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cmxtanl6a2x4bGppdWxiemNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzEwMDQsImV4cCI6MjEwMTAwNzAwNH0.q4ZZFDcCdvffEdbUkwa8Xc1WzMPcKUpjaA7qcayxv1k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentification admin (identifiants passés via variables d'environnement)
const { error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.SUPABASE_EMAIL,
  password: process.env.SUPABASE_PASSWORD,
});
if (authError) { console.error('❌ Auth failed:', authError.message); process.exit(1); }

// ---------------------------------------------------------------------------
// Normalisation des lieux (réplique lib/normalizeLieu.ts)
// ---------------------------------------------------------------------------

const MANUAL_OVERRIDES = [
  [/CENTRE\s+DE\s+TRI\s+TROUSS+EAU\w*/i, 'TROUSSEAU'],
  [/CENTRE\s+DE\s+TRI\s+BICHAT\w*/i, 'BICHAT'],
  [/CENTRE\s+DE\s+TRI\s+LARIBOISIERE\w*/i, 'LARIBOISIERE'],
  [/TRI\s+(?:SAINT|ST)[\s-]+LOUIS/i, 'ST-LOUIS'],
  [/(?:SAINT|ST)\s+LOUIS\b/i, 'ST-LOUIS'],
  [/LBU\s+ST\s+ANTOINE\s+HOPITAL/i, 'ST ANTOINE'],
  [/HOPITAL\s+ST\s+ANTOINE/i, 'ST ANTOINE'],
  [/SAINT\s+ANTOINE/i, 'ST ANTOINE'],
  [/URGEB\s+ROBERT\s+DEBRE\b/i, 'ROBERT DEBRE'],
  [/ROBERT\s+DEBRE\s*\([^)]*\)/i, 'ROBERT DEBRE'],
  [/LOGE\s+ACCUEIL\s*-+\s*CHARLES\s+FOIX/i, 'CHARLES FOIX'],
  [/LOGE\s+ACCUEIL\s*-+\s*PITIE\b/i, 'PITIE SALPETRIERE'],
  [/ACDL\s+BEAUJON/i, 'BEAUJON'],
  [/HAUTEVILLE\s+MAISON\s+BLANCHE/i, 'MAISON BLANCHE'],
  [/RUNGIS\s*[/\\]\s*PLATEAU\s+TECHNIQUE/i, 'RUNGIS'],
  [/BOISSY\s+LOG\b/i, 'BOISSY ST-LEGER'],
  [/\+?H\s+A\s+D\b/i, 'HAD'],
  [/RATP\s+CAP\b/i, 'RATP'],
  [/RATP\s*\/\s*MRF\b/i, 'RATP'],
  [/RDS\s+CENTRE\s+BUS\b/i, 'RATP'],
  [/CAP\s+CENTRE\s+BUS\b/i, 'RATP'],
  [/GCS\s+SEQOIA\b/i, 'GCS SEQOIA'],
  [/CEGOS\s*-*\s*ISSY\b/i, 'CEGOS ISSY'],
  [/(?:INSTIT?U?T?\s+CURIE|INST\.?\s+CURIE)\b/i, 'INSTITUT CURIE'],
  [/HOPITAL\s+RENE\s+HUGUENIN/i, 'RENE HUGUENIN'],
  [/LES\s+ATELIERS\s+DE\s+VAUGIRARD/i, 'ATELIERS VAUGIRARD'],
];

function normalizeLieu(raw) {
  let s = raw
    .trim()
    .replace(/\s*\+\s*retour\b.*/i, '')
    .replace(/^\+\s*/, '')
    .replace(/^\d+[-–]\s*/, '')
    .replace(/^\*\s*/, '')
    .trim();

  for (const [pat, rep] of MANUAL_OVERRIDES) {
    if (pat.test(s)) {
      s = s.replace(pat, rep);
      break;
    }
  }

  const postalMatch = s.match(/\s*[-–]\s*(\d{5})\s+(.+)$/);
  let namePart, suffix;
  if (postalMatch && postalMatch.index !== undefined) {
    namePart = s.slice(0, postalMatch.index).trim();
    const city = postalMatch[2].trim().replace(/^(PARIS)\s+\d+$/i, '$1');
    suffix = ` - ${postalMatch[1]} ${city}`;
  } else {
    namePart = s;
    suffix = '';
  }

  namePart = namePart
    .replace(/\s{2,}/g, ' ')
    .replace(/[-–/\s]+$/, '')
    .replace(/^[-–/\s]+/, '')
    .trim();

  if (!namePart) {
    namePart = raw.trim().replace(/^\+\s*/, '').replace(/^\d+[-–]\s*/, '');
  }

  return namePart + suffix;
}

function normalizeStr(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Hash (réplique lib/supabaseSync.ts)
// ---------------------------------------------------------------------------

function makeHash(input) {
  const str = [
    (input.lieuEnlevement ?? '').trim().toLowerCase(),
    (input.lieuLivraison ?? '').trim().toLowerCase(),
    (input.vehicule ?? '').trim().toLowerCase(),
    String(input.qteBon ?? 0),
  ].join('|');

  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, '0') + '_' + str.slice(0, 40).replace(/[^a-z0-9]/g, '_');
}

// ---------------------------------------------------------------------------
// Prix minimum (réplique lib/supabaseSync.ts)
// ---------------------------------------------------------------------------

function getPostal2(addr) {
  const m = addr.match(/\b(\d{5})\b/);
  return m ? m[1].slice(0, 2) : '';
}

function isParis(addr) { return getPostal2(addr) === '75'; }
function isBanlieue(addr) { return ['91','92','93','94','77','78','95'].includes(getPostal2(addr)); }

function applyPriceMinimum(rows) {
  for (const r of rows) {
    const veh = (r.vehicule ?? '').toUpperCase();
    if (veh.includes('PROGRAMME')) continue;
    const enl = r.lieuEnlevement ?? '';
    const liv = r.lieuLivraison ?? '';
    const isBreak = veh.includes('BREAK');
    const isVital = veh.includes('VITAL') || veh.includes('URGENCE');
    if (isParis(enl) && isParis(liv)) {
      if (isBreak && (r.qteBon ?? 0) < 4.5) r.qteBon = 4.5;
      else if (isVital && (r.qteBon ?? 0) < 3.5) r.qteBon = 3.5;
      else if (!isBreak && !isVital && (r.qteBon ?? 0) < 2.5) r.qteBon = 2.5;
    } else if (isBanlieue(enl) || isBanlieue(liv)) {
      if ((r.qteBon ?? 0) < 3.0) r.qteBon = 3.0;
    }
  }
}

// ---------------------------------------------------------------------------
// Parsing XLS (réplique lib/excelImport.ts)
// ---------------------------------------------------------------------------

const LOC_LINE_RE = /^(\d{2}\/\d{2}\s+\d{2}:\d{2})\s*;\s*(.*)$/;
const REF_RE = /\(\d+\)\s*-\s*[A-Za-z]+/;

function cellStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function cellHasLocLine(v) {
  const s = cellStr(v);
  if (!s) return false;
  return s.split('\n').some(l => LOC_LINE_RE.test(l.trim()));
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d,.\-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function cellIsNumeric(v) {
  if (typeof v === 'number') return true;
  const s = cellStr(v);
  if (!s) return false;
  return /\d/.test(s) && !Number.isNaN(toNumber(s));
}

function findHeader(grid) {
  const limit = Math.min(grid.length, 60);
  for (let r = 0; r < limit; r++) {
    const row = grid[r] ?? [];
    let enlevCol = -1, livrCol = -1, qteCol = -1;
    for (let c = 0; c < row.length; c++) {
      const txt = normalizeStr(String(row[c] ?? '').replace(/\n/g, ' '));
      if (!txt) continue;
      if (txt.includes('enlevement') && txt.includes('livraison')) { enlevCol = c; livrCol = c; }
      else {
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

function resolveLocCol(grid, headerRowIdx, guessCol) {
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

function resolveQteCol(grid, headerRowIdx, guessCol) {
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

function parseLocLine(line) {
  const m = LOC_LINE_RE.exec(line.trim());
  if (m) return { datetime: m[1], lieu: normalizeLieu(cleanLieu(m[2])) };
  return { datetime: '', lieu: normalizeLieu(cleanLieu(line)) };
}

function cleanLieu(s) {
  return s.replace(/\s*-\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();
}

function findRef(row, beforeCol) {
  for (let c = 0; c < beforeCol; c++) {
    const v = cellStr(row[c]);
    if (v && REF_RE.test(v)) return v.split('\n')[0].trim();
  }
  return undefined;
}

function normalizeVehicule(v) {
  const s = v.trim().toUpperCase();
  if (s === '2 ROUES NORMAL') return '2 ROUES EXPRESS';
  return v.trim();
}

function findVehicule(row, afterCol, beforeCol) {
  const end = beforeCol > afterCol ? beforeCol : row.length;
  for (let c = afterCol + 1; c < end; c++) {
    const v = row[c];
    if (typeof v === 'string' && v.trim() && Number.isNaN(Number(v.replace(',', '.')))) {
      return normalizeVehicule(v);
    }
  }
  return undefined;
}

function parseGrid(grid) {
  const header = findHeader(grid);
  if (!header) return [];

  const locCol = resolveLocCol(grid, header.rowIdx, header.enlevColGuess);
  const qteCol = resolveQteCol(grid, header.rowIdx, header.qteColGuess);

  const results = [];
  let domaineCourant = 'courseCourse';
  let coursesVues = 0;
  let separateurTrouve = false;

  for (let r = header.rowIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const raw = cellStr(row[locCol]);

    if (!raw) {
      if (!separateurTrouve && coursesVues > 0 && qteCol !== -1) {
        const sousTot = toNumber(row[qteCol]);
        if (sousTot > 0) { separateurTrouve = true; domaineCourant = 'medical'; }
      }
      continue;
    }

    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const enlev = parseLocLine(lines[0]);
    const livr = lines[1] ? parseLocLine(lines[1]) : null;
    const qte = qteCol !== -1 ? toNumber(row[qteCol]) : 0;
    if (!enlev.lieu && !(livr && livr.lieu) && qte === 0) continue;
    if (!livr || !livr.lieu) continue;

    if (!separateurTrouve) coursesVues++;

    const numeroCourse = findRef(row, locCol);
    const vehicule = findVehicule(row, locCol, qteCol);

    results.push({
      lieuEnlevement: enlev.lieu,
      lieuLivraison: livr.lieu,
      qteBon: qte,
      numeroCourse,
      dateCourse: enlev.datetime || undefined,
      vehicule,
      domaine: domaineCourant,
    });
  }
  return results;
}

function parseFlatSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  const results = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const findKey = (candidates) => {
      for (const cand of candidates) {
        const target = normalizeStr(cand);
        const found = keys.find(k => normalizeStr(k) === target);
        if (found) return found;
      }
      for (const cand of candidates) {
        const target = normalizeStr(cand);
        const found = keys.find(k => normalizeStr(k).includes(target));
        if (found) return found;
      }
      return undefined;
    };

    const qteKey = findKey(['Qté', 'Quantité', 'Qte bon', 'Quantité de bons', 'Qte']);
    const achatKey = findKey(['Achat', 'Montant achat', 'Montant', 'Prix']);
    const enlevKey = findKey(['Enlèvement', 'Lieu enlèvement', 'Départ', 'Enlevement']);
    const livrKey = findKey(['Livraison', 'Lieu livraison', 'Arrivée', 'Livraison']);

    if (!qteKey && !achatKey) continue;

    results.push({
      lieuEnlevement: enlevKey ? String(row[enlevKey] ?? '') : '',
      lieuLivraison: livrKey ? String(row[livrKey] ?? '') : '',
      qteBon: qteKey ? toNumber(row[qteKey]) : achatKey ? toNumber(row[achatKey]) : 0,
      domaine: 'courseCourse',
    });
  }
  return results;
}

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const results = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    const fromGrid = parseGrid(grid);
    if (fromGrid.length > 0) results.push(...fromGrid);
    else results.push(...parseFlatSheet(sheet));
  }
  return results;
}

// ---------------------------------------------------------------------------
// Import dans Supabase
// ---------------------------------------------------------------------------

async function importToSupabase(courses) {
  if (courses.length === 0) return { inserted: 0, duplicates: 0, errors: 0 };

  const mapped = courses.map(c => ({
    lieuEnlevement: (c.lieuEnlevement ?? '').trim(),
    lieuLivraison: (c.lieuLivraison ?? '').trim(),
    qteBon: c.qteBon ?? 0,
    vehicule: c.vehicule ?? null,
    domaine: c.domaine ?? null,
    hash: makeHash(c),
  }));

  const best = new Map();
  for (const r of mapped) {
    const existing = best.get(r.hash);
    if (!existing || r.qteBon > existing.qteBon) best.set(r.hash, r);
  }

  const dedupedRows = Array.from(best.values());
  const dupCount = courses.length - dedupedRows.length;

  applyPriceMinimum(dedupedRows);

  const rows = dedupedRows.map(r => ({
    lieu_enlevement: r.lieuEnlevement,
    lieu_livraison: r.lieuLivraison,
    qte_bon: r.qteBon,
    vehicule: r.vehicule,
    domaine: r.domaine,
    hash: r.hash,
  }));

  const BATCH = 500;
  let inserted = 0, errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('reference_courses')
      .upsert(batch, { onConflict: 'hash', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error(`  ❌ Erreur batch ${i}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += data?.length ?? 0;
    }
  }

  return { inserted, duplicates: Math.max(0, dupCount), errors };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('📂 Dossier:', LISTINGS_DIR);

  // Lister tous les fichiers .xls/.xlsx
  const files = readdirSync(LISTINGS_DIR)
    .filter(f => /\.(xls|xlsx)$/i.test(f))
    .sort();

  console.log(`\n📋 ${files.length} fichier(s) trouvé(s)\n`);

  let totalCourses = 0;
  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;

  for (const file of files) {
    const filePath = join(LISTINGS_DIR, file);
    process.stdout.write(`  📄 ${file} ... `);

    try {
      const buffer = readFileSync(filePath);
      const courses = parseExcelBuffer(new Uint8Array(buffer));

      if (courses.length === 0) {
        console.log(`⚠️  0 course parsée`);
        continue;
      }

      const result = await importToSupabase(courses);
      totalCourses += courses.length;
      totalInserted += result.inserted;
      totalDuplicates += result.duplicates;
      totalErrors += result.errors;

      console.log(`✅ ${courses.length} courses → +${result.inserted} nouvelles, ${result.duplicates} doublons${result.errors > 0 ? `, ${result.errors} erreurs` : ''}`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 Résultat final:`);
  console.log(`   Courses parsées : ${totalCourses}`);
  console.log(`   Nouvelles       : ${totalInserted}`);
  console.log(`   Doublons ignorés: ${totalDuplicates}`);
  if (totalErrors > 0) console.log(`   Erreurs         : ${totalErrors}`);
  console.log('─'.repeat(60));
}

main().catch(e => { console.error('Erreur fatale:', e); process.exit(1); });
