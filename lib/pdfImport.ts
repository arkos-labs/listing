/**
 * pdfImport.ts
 *
 * Parse les fichiers PDF "listing VCH" (export transporteur médical) et les
 * convertit en ReferenceCourseInput[].
 *
 * Format reconnu :
 *   3 440 638(1)-F  26/06; Hôpital Necker; 75015 PARIS 15  PROTOCOLE  Ambiant  3,00  FUJ  EB
 *                   26/06; FACULTE MEDECINE; 75012 PARIS 12  REF  CONTACT
 *
 * Champs extraits :
 *   lieuEnlevement  → adresse ligne 1 (après la référence)
 *   lieuLivraison   → adresse ligne 2
 *   qteBon          → quantité (ex: "3,00" → 3)
 *   vehicule        → code transport (FUJ, FNA, FNAB…)
 *   domaine         → toujours "medical" pour ce format
 */

import type { ReferenceCourseInput } from '@/types/course';

// Référence de course : "3 440 638(1)-F"
const REF_RE = /^\d[\d\s]{5,}\(\d+\)-[A-Z]\s+/;

// Ligne d'adresse : "26/06; LIEU; CP VILLE" ou "26/06; LIEU"
const ADDR_RE = /^\d{2}\/\d{2}\s*;\s*(.+)/;

// Quantité : nombre décimal à la française
const QTE_RE = /\b(\d+[,.]?\d*)\s+(?:FUJ|FNA|FNAB|NF|FLS|FPR|FNA\d*)\b/i;

// Code véhicule/sous-traitant
const VEH_RE = /\b(FNAB|FUJ|FNA\d*|NF|FLS|FPR)\b/i;

// Nettoyage d'une adresse extraite
function cleanAddr(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/;\s*$/, '')
    .trim();
}

function toNumber(s: string): number {
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/**
 * Parse le texte brut extrait du PDF et retourne les courses.
 * On travaille ligne par ligne : dès qu'on détecte une référence de course
 * (pattern numérique + "(1)-F"), on extrait l'enlèvement sur cette même
 * ligne, puis la livraison sur la suivante qui commence par "DD/MM;".
 */
function parseText(text: string): ReferenceCourseInput[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const results: ReferenceCourseInput[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!REF_RE.test(line)) continue;

    // Retirer la référence de course en début de ligne
    const withoutRef = line.replace(REF_RE, '').trim();

    // Extraire l'adresse d'enlèvement (commence par DD/MM;)
    const enlevMatch = ADDR_RE.exec(withoutRef);
    if (!enlevMatch) continue;

    // L'adresse peut s'arrêter avant les codes (on prend jusqu'à la quantité)
    // On nettoie en retirant tout ce qui suit la quantité + code véhicule
    let enlevRaw = enlevMatch[1];

    // Extraire quantité et véhicule depuis la ligne d'enlèvement
    const qteMatch = QTE_RE.exec(withoutRef);
    const vehMatch = VEH_RE.exec(withoutRef);

    const qteBon = qteMatch ? toNumber(qteMatch[1]) : 0;
    const vehicule = vehMatch ? vehMatch[1].toUpperCase() : undefined;

    // Couper l'adresse avant la condition (Ambiant, Congelé, Réfrigéré…)
    enlevRaw = enlevRaw
      .replace(/\s+(Ambiant|Congelé|Réfrigéré|AMBIANT|CONGELE|REFRIGERE).*$/i, '')
      .trim();

    const lieuEnlevement = cleanAddr(enlevRaw);

    // Chercher la livraison sur les lignes suivantes (max 4 lignes)
    let lieuLivraison = '';
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const next = lines[j];
      // Si c'est une nouvelle référence, on arrête
      if (REF_RE.test(next)) break;
      const livrMatch = ADDR_RE.exec(next);
      if (livrMatch) {
        lieuLivraison = cleanAddr(livrMatch[1]);
        break;
      }
    }

    if (!lieuEnlevement && !lieuLivraison) continue;

    results.push({
      lieuEnlevement,
      lieuLivraison,
      qteBon,
      vehicule,
      domaine: 'medical',
    });
  }

  return results;
}

/**
 * Point d'entrée principal : lit un fichier PDF via son URI (Expo),
 * extrait le texte avec pdfjs-dist et retourne les courses parsées.
 */
export async function parsePdfFile(fileUri: string): Promise<ReferenceCourseInput[]> {
  // Import dynamique pour éviter les erreurs au SSR / mobile sans pdfjs
  const pdfjsLib = await import('pdfjs-dist');

  // Worker requis par pdfjs pour le web
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  const response = await fetch(fileUri);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Reconstituer le texte en préservant les sauts de ligne
    let pageText = '';
    let lastY: number | null = null;
    for (const item of content.items) {
      if ('str' in item) {
        const y = (item as any).transform?.[5] ?? 0;
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str + ' ';
        lastY = y;
      }
    }
    fullText += pageText + '\n';
  }

  return parseText(fullText);
}
