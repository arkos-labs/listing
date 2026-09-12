import { normalize } from '@/lib/text';
import { computeMontant } from '@/lib/pricing';
import { matchByPickupAndDelivery } from '@/lib/reference';
import type { ReferenceCourse } from '@/types/course';

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
 * Cherche, dans la base de référence (fichiers du transporteur), le vrai
 * tarif "2ème+ ramassage au même enlèvement" pour ce trajet + véhicule
 * exact — quand le transporteur a déjà facturé ce cas précis avec un
 * montant différent du tarif plein (ex: Champcueil → Mondor : 7 bons au
 * 1er ramassage, 5 bons au suivant, pas 6 comme le donnerait la règle
 * générique par zone).
 *
 * Retourne cette valeur réelle uniquement si :
 *  - au moins deux tarifs distincts existent pour ce trajet+véhicule ;
 *  - le tarif de base actuellement saisi correspond au plus élevé des deux
 *    (sinon on ne sait pas lequel des deux tarifs représente le "plein tarif").
 * Sinon retourne null et on retombe sur la règle générique par zone.
 */
function resolveOptimizedQteFromReference(
  referenceCourses: ReferenceCourse[] | undefined,
  lieuEnlevement: string,
  lieuLivraison: string,
  vehicule: string,
  qteBonBase: number
): number | null {
  if (!referenceCourses || referenceCourses.length === 0) return null;
  const matches = matchByPickupAndDelivery(referenceCourses, lieuEnlevement, lieuLivraison, vehicule);
  if (matches.length === 0) return null;

  const distinctQte = Array.from(new Set(matches.map((m) => m.qteBon))).sort((a, b) => b - a);
  if (distinctQte.length < 2) return null;

  const [plein, reduit] = distinctQte;
  if (Math.abs(qteBonBase - plein) > 0.01) return null;
  return reduit;
}

/**
 * Calcule le tarif qu'un ramassage optimisé (2ème+ au même enlèvement)
 * obtiendra réellement : le vrai tarif réduit connu du transporteur en
 * priorité, sinon la règle générique par zone. Utilisé à la fois par
 * `calculerTournee` (calcul final) et par l'écran de saisie pour afficher
 * au chauffeur, dès qu'il choisit le type de course du 2ème+ ramassage,
 * le tarif qui sera réellement compté — pas le tarif plein qui sera
 * automatiquement réduit ensuite.
 */
export function previewOptimizedQte(
  qteBonBase: number,
  lieuEnlevement: string,
  lieuLivraison: string,
  vehicule: string,
  referenceCourses?: ReferenceCourse[]
): { qteBonOptimise: number; optimise: boolean; delta: number } {
  const qteReference = resolveOptimizedQteFromReference(
    referenceCourses, lieuEnlevement, lieuLivraison, vehicule, qteBonBase
  );
  if (qteReference !== null && qteReference < qteBonBase) {
    const delta = qteReference - qteBonBase;
    return { qteBonOptimise: qteReference, optimise: true, delta };
  }

  const delta = calculerDelta(lieuEnlevement, lieuLivraison, vehicule);
  const optimise = delta < 0;
  const qteBonOptimise = Math.max(0, qteBonBase + delta);
  return { qteBonOptimise, optimise, delta };
}

/**
 * Applique la règle d'optimisation transporteur :
 * quand plusieurs courses du même lot sont récupérées au même enlèvement,
 * la première est payée plein pot, les suivantes perdent des bons.
 * Le vrai tarif réduit du transporteur (base de référence) est utilisé en
 * priorité quand il est connu pour ce trajet+véhicule exact ; à défaut on
 * retombe sur la règle générique par zone :
 *   - Paris ↔ Paris  → −0.5 bon
 *   - Banlieue (l'un ou l'autre) → −1.0 bon
 *   - PROGRAMME → pas d'optimisation
 *
 * Le groupement se fait sur le lieu d'enlèvement normalisé (casse + accents ignorés).
 */
export function calculerTournee(
  courses: SimulateurCourse[],
  prixBon: number,
  referenceCourses?: ReferenceCourse[]
): ResultatTournee {
  const compteurEnlevement = new Map<string, number>();

  const coursesCalculees: SimulateurCourseCalculee[] = courses.map((c) => {
    const cle = normalize(c.lieuEnlevement.trim());
    const dejaSeen = compteurEnlevement.get(cle) ?? 0;
    compteurEnlevement.set(cle, dejaSeen + 1);

    if (dejaSeen === 0) {
      return { ...c, qteBonOptimise: c.qteBonBase, optimise: false, delta: 0 };
    }

    const { qteBonOptimise, optimise, delta } = previewOptimizedQte(
      c.qteBonBase, c.lieuEnlevement, c.lieuLivraison, c.vehicule, referenceCourses
    );

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
