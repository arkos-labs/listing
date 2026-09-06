// PRIX_BON is now dynamically loaded from GoalContext

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Montant (€) correspondant à une quantité de bons, au prix unitaire fixé. */
export function computeMontant(qteBon: number, prixBon: number): number {
  return round2(qteBon * prixBon);
}
