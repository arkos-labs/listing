// lib/motivation.ts
// Messages générés dynamiquement selon le contexte réel de la course ajoutée.
// Ne s'affiche QUE lors d'un ajout — jamais au démarrage ou à la réouverture.

import type { UserHabits } from '@/lib/learningEngine';

export interface MotivationContext {
  prenom: string;          // prénom de l'utilisateur
  bonsJour: number;        // bons cumulés aujourd'hui APRÈS ajout
  caJour: number;          // CA du jour en € APRÈS ajout
  coursesJour: number;     // nombre de courses aujourd'hui APRÈS ajout
  bonsMois: number;        // bons du mois
  monthlyGoal: number;     // objectif mensuel en bons (0 = pas défini)
  prixBon: number;         // prix unitaire du bon
  qteBonAjoutee: number;   // bons de la course qui vient d'être ajoutée
  heureActuelle: number;   // heure locale (0-23)
  habits?: UserHabits | null; // habitudes apprises (null = pas encore assez de données)
}

/** Génère un message de motivation contextuel et personnalisé. */
export function generateMotivationMessage(ctx: MotivationContext): string {
  const { prenom, bonsJour, caJour, coursesJour, bonsMois, monthlyGoal, prixBon, qteBonAjoutee, heureActuelle, habits } = ctx;

  const nom = prenom ? ` ${prenom}` : '';
  const ca = caJour.toFixed(0);
  const paliers = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100];

  // ── Messages basés sur les habitudes apprises ──────────────────────────
  if (habits && habits.dataPoints >= 5) {
    // Comparaison avec le rythme habituel à cette heure
    if (habits.avgBonsAtThisHour !== null && coursesJour > 1) {
      const diff = bonsJour - habits.avgBonsAtThisHour;
      const pct = Math.round((diff / habits.avgBonsAtThisHour) * 100);
      if (diff >= 3 && pct >= 20) {
        return `📈 +${pct}% vs ton rythme habituel à cette heure${nom} — excellente journée.`;
      }
      if (diff <= -3 && pct <= -20) {
        return `💪 Un peu en dessous de ton rythme${nom} — encore du temps devant toi.`;
      }
      if (Math.abs(diff) <= 1) {
        return `📊 Dans ta moyenne${nom} — régularité au top.`;
      }
    }
  }

  // 1. Objectif mensuel atteint
  if (monthlyGoal > 0 && bonsMois >= monthlyGoal) {
    return `🏆 Objectif du mois atteint${nom} ! ${bonsMois} bons — c'est dans la poche.`;
  }

  // 2. Palier rond franchi aujourd'hui
  const palierFranchi = paliers.find((p) => bonsJour >= p && bonsJour - qteBonAjoutee < p);
  if (palierFranchi) {
    if (palierFranchi >= 50) return `🔥 ${palierFranchi} bons aujourd'hui${nom} — journée de légende.`;
    if (palierFranchi >= 20) return `💪 ${palierFranchi} bons ce soir${nom} — tu gères vraiment.`;
    return `⚡ ${palierFranchi} bons franchis${nom} — belle progression.`;
  }

  // 3. Première course de la journée
  if (coursesJour === 1) {
    if (heureActuelle < 9) return `☀️ C'est parti${nom} — bonne journée devant toi.`;
    if (heureActuelle < 12) return `🚀 Première course de la matinée${nom} — la machine est lancée.`;
    if (heureActuelle < 15) return `🕐 Premier bon de l'après-midi${nom} — allons-y.`;
    return `🌆 On commence${nom}, il est encore temps de faire une belle fin de journée.`;
  }

  // 4. Proche de l'objectif mensuel (moins de 10% restant)
  if (monthlyGoal > 0) {
    const reste = monthlyGoal - bonsMois;
    if (reste > 0 && reste <= monthlyGoal * 0.1) {
      return `🎯 Plus que ${reste} bons pour l'objectif du mois${nom} — t'es tout près.`;
    }
  }

  // 5. Beau CA en fin de journée
  if (heureActuelle >= 17 && caJour >= 150) {
    return `💰 ${ca} € aujourd'hui${nom} — belle fin de journée.`;
  }

  // 6. Enchaînement rapide (beaucoup de courses)
  if (coursesJour >= 8) return `🔄 ${coursesJour} courses aujourd'hui${nom} — quel rythme.`;
  if (coursesJour >= 5) return `📦 ${coursesJour} courses${nom} — t'es en plein dans le rush.`;

  // 7. Grosse course (beaucoup de bons d'un coup)
  if (qteBonAjoutee >= 5) return `💥 ${qteBonAjoutee} bons d'un coup${nom} — belle course.`;

  // 8. Messages neutres variés selon l'heure et le nombre de bons
  const msgsMatin = [
    `☀️ ${bonsJour} bons${nom}, bonne dynamique ce matin.`,
    `🚀 En route — ${bonsJour} bons au compteur${nom}.`,
    `📈 La journée monte${nom} — ${ca} € pour l'instant.`,
  ];
  const msgsApresMidi = [
    `⚡ ${bonsJour} bons${nom} — bel après-midi.`,
    `💼 Course validée${nom} — ${ca} € au total.`,
    `🔥 Ça tourne${nom} — ${bonsJour} bons aujourd'hui.`,
  ];
  const msgsSoir = [
    `🌙 ${bonsJour} bons pour aujourd'hui${nom} — bonne journée.`,
    `✅ Course ajoutée — ${ca} € de CA ce soir${nom}.`,
    `🏁 ${bonsJour} bons${nom} — belle fin de journée.`,
  ];

  const pool = heureActuelle < 13 ? msgsMatin : heureActuelle < 18 ? msgsApresMidi : msgsSoir;

  // Déterministe selon le nombre de courses (pas aléatoire → stable sur la session)
  return pool[coursesJour % pool.length];
}
