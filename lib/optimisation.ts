import { normalize } from '@/lib/text';
import { computeMontant } from '@/lib/pricing';

export interface SimulateurCourse {
  id: string;
  lieuEnlevement: string;
  lieuLivraison: string;
  /** Nombre de bons de référence (prix plein, sans optimisation) */
  qteBonBase: number;
  vehicule: string;
}

export interface SimulateurCourseCalculee extends SimulateurCourse {
  /** Nombre de bons après optimisation */
  qteBonOptimise: number;
  /** true si la société a appliqué une déduction */
  optimise: boolean;
  /** Différence en bons due à l'optimisation (0, -0.5 ou -1.0) */
  delta: number;
}

export interface ResultatTournee {
  courses: SimulateurCourseCalculee[];
  totalBonsBase: number;
  totalBonsOptimise: number;
  totalDelta: number;
  totalMontantBase: number;
  totalMontantOptimise: number;
  totalMontantPerdu: number;
}

/**
 * Détecte si un lieu est dans Paris intra-muros (code postal 75xxx).
 * Si l'adresse contient "PARIS" sans code banlieue → Paris.
 * Sinon → banlieue.
 */
function isParis(lieu: string): boolean {
  if (/\b75\d{3}\b/.test(lieu)) return true;
  // "PARIS" dans le libellé sans code banlieue (92, 93, 94, 91, 77, 78, 95)
  if (/\bPARIS\b/i.test(lieu) && !/\b(9[1-5]|7[78])\d{3}\b/.test(lieu)) return true;
  return false;
}

/**
 * Courses PROGRAMME (navettes) : aucune optimisation.
 */
function isProgramme(vehicule: string): boolean {
  return /PROGRAMME/i.test(vehicule);
}

/**
 * Calcule la déduction applicable à une course optimisée (2ème+ au même enlèvement) :
 *   - Course PROGRAMME → 0 (jamais optimisée)
 *   - Paris → Paris          → −0.5 bon
 *   - Banlieue impliquée     → −1.0 bon
 */
function calculerDelta(
  lieuEnlevement: string,
  lieuLivraison: string,
  vehicule: string
): number {
  if (isProgramme(vehicule)) return 0;
  if (isParis(lieuEnlevement) && isParis(lieuLivraison)) return -0.5;
  return -1.0;
}

/**
 * Applique la règle d'optimisation transporteur :
 * quand plusieurs courses du même lot sont récupérées au même enlèvement,
 * la première est payée plein pot, les suivantes perdent des bons selon la zone :
 *   - Paris ↔ Paris  → −0.5 bon
 *   - Banlieue (l'un ou l'autre) → −1.0 bon
 *   - PROGRAMME → pas d'optimisation
 *
 * Le groupement se fait sur le lieu d'enlèvement normalisé (casse + accents ignorés).
 */
export function calculerTournee(
  courses: SimulateurCourse[],
  prixBon: number
): ResultatTournee {
  const compteurEnlevement = new Map<string, number>();

  const coursesCalculees: SimulateurCourseCalculee[] = courses.map((c) => {
    const cle = normalize(c.lieuEnlevement.trim());
    const dejaSeen = compteurEnlevement.get(cle) ?? 0;
    compteurEnlevement.set(cle, dejaSeen + 1);

    const delta = dejaSeen > 0 ? calculerDelta(c.lieuEnlevement, c.lieuLivraison, c.vehicule) : 0;
    const optimise = delta < 0;
    const qteBonOptimise = Math.max(0, c.qteBonBase + delta);

    return { ...c, qteBonOptimise, optimise, delta };
  });

  const totalBonsBase = courses.reduce((s, c) => s + c.qteBonBase, 0);
  const totalBonsOptimise = coursesCalculees.reduce((s, c) => s + c.qteBonOptimise, 0);
  const totalDelta = totalBonsOptimise - totalBonsBase;
  const totalMontantBase = computeMontant(totalBonsBase, prixBon);
  const totalMontantOptimise = computeMontant(totalBonsOptimise, prixBon);
  const totalMontantPerdu = totalMontantOptimise - totalMontantBase;

  return {
    courses: coursesCalculees,
    totalBonsBase,
    totalBonsOptimise,
    totalDelta,
    totalMontantBase,
    totalMontantOptimise,
    totalMontantPerdu,
  };
}
