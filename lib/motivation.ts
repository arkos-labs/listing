// lib/motivation.ts

export const MOTIVATIONAL_MESSAGES = [
  "Allez, encore un petit effort !",
  "Super rythme !",
  "Tu gères aujourd'hui !",
  "Continue comme ça, champion !",
  "En route vers l'objectif !",
  "C'est une belle journée pour engranger !",
  "Chaque bon compte !",
  "Ne lâche rien !",
  "La journée s'annonce très bonne !",
  "Un de plus dans la poche !",
  "On reste concentré !",
  "Le CA grimpe en flèche !",
  "Plus que quelques uns !",
  "Impressionnant !",
  "Rien ne t'arrête aujourd'hui !",
  "Excellente dynamique !",
  "Tu vas exploser les compteurs !",
  "Garde ce rythme de croisière !",
  "C'est comme ça qu'on fait du chiffre !",
  "On est sur la bonne voie !",
  "Encore une belle course !",
  "Tu es une machine !",
  "Rien ne peut te stopper !",
  "Quel enchaînement !",
  "Les bons s'accumulent vite !",
  "On maintient le cap !",
  "L'objectif approche à grands pas !",
  "Un vrai pro !",
  "C'est le moment d'accélérer !",
  "Bientôt la pause bien méritée !",
  "On garde l'énergie au max !",
  "En mode turbo !",
  "Pas de repos pour les braves !",
  "Tu maîtrises ton sujet !",
  "Le portefeuille te dit merci !",
  "La motivation est au sommet !",
  "Encore un bel arrêt !",
  "On carbure aujourd'hui !",
  "Régularité et efficacité !",
  "Le travail paie toujours !",
  "Un vrai marathonien du bitume !",
  "On reste serein et on encaisse !",
  "C'est ça qu'on aime voir !",
  "La machine est lancée !",
  "Objectif en ligne de mire !",
  "On fait grimper les stats !",
  "Ton application est fière de toi !",
  "Chaque clic te rapproche du but !",
  "Tu brûles le pavé !",
  "C'est une journée record en vue !"
];

export const GOAL_REACHED_MESSAGES = [
  "Objectif du jour atteint ! Magique !",
  "Rythme du jour atteint ! Tu déchires !",
  "Félicitations, contrat rempli aujourd'hui !",
  "Mission accomplie, tu peux être fier !",
  "Objectif pulvérisé ! Exceptionnel !"
];

export function getRandomMotivation(goalReached: boolean = false): string {
  if (goalReached) {
    const idx = Math.floor(Math.random() * GOAL_REACHED_MESSAGES.length);
    return GOAL_REACHED_MESSAGES[idx];
  }
  const idx = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
  return MOTIVATIONAL_MESSAGES[idx];
}
