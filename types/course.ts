export interface Course {
  id: string;
  dateSaisie: string; // ISO string
  lieuEnlevement: string;
  lieuLivraison: string;
  qteBon: number;
  montantAchat: number;
  vehicule?: string; // type de course (ex: "2 ROUES EXPRESS", "VITAL", "PROGRAMMÉE")
  domaine?: 'medical' | 'courseCourse'; // catégorie détectée automatiquement à la saisie
  optimise?: boolean; // true si la société a appliqué une déduction (Paris↔Paris: −0.5, banlieue: −1.0)
}

export interface DashboardKpi {
  coursesJour: number;
  caJour: number;
  caMois: number;
  totalCourses: number;
  bonsJour: number;
  bonsMois: number;
}

export type CourseInput = Omit<Course, 'id' | 'dateSaisie'>;

/**
 * Une ligne de la base de données de référence, importée depuis les fichiers
 * .xls du transporteur. Sert uniquement à retrouver le nombre de bons d'une
 * course passée (par lieu d'enlèvement) — n'est PAS une course du jour et
 * n'entre pas dans les KPI / l'historique des courses réellement faites.
 */
export interface ReferenceCourse {
  id: string;
  lieuEnlevement: string;
  lieuLivraison: string;
  qteBon: number;
  numeroCourse?: string; // référence dans le listing (ex: "9 094 780(1)-F")
  dateCourse?: string; // date/heure d'enlèvement telle que dans le fichier (ex: "04/05 08:36")
  vehicule?: string; // type de véhicule (ex: "2 ROUES EXPRESS")
  domaine?: 'medical' | 'courseCourse'; // catégorie détectée automatiquement à l'import
}

export type ReferenceCourseInput = Omit<ReferenceCourse, 'id'>;
