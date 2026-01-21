/**
 * Utilitaires pour gérer les Victory Points et les rangs
 * Basé sur le système de rank de Summoners War RTA
 */

export type Rank =
  | "Beginner"
  | "Challenger ★"
  | "Challenger ★★"
  | "Challenger ★★★"
  | "Fighter ★"
  | "Fighter ★★"
  | "Fighter ★★★"
  | "Conqueror ★"
  | "Conqueror ★★"
  | "Conqueror ★★★"
  | "Punisher ★"
  | "Punisher ★★"
  | "Punisher ★★★"
  | "Guardian ★"
  | "Guardian ★★"
  | "Guardian ★★★"
  | "Legend";

/**
 * Convertit les Victory Points en rank
 * @param victoryPoints Les Victory Points du joueur
 * @returns Le rank correspondant aux Victory Points
 */
export function victoryPointsToRank(victoryPoints: number | null | undefined): Rank | null {
  if (victoryPoints === null || victoryPoints === undefined) {
    return null;
  }

  const vp = victoryPoints;

  if (vp < 450) return "Beginner";
  if (vp < 500) return "Challenger ★";
  if (vp < 550) return "Challenger ★★";
  if (vp < 600) return "Challenger ★★★";
  if (vp < 650) return "Fighter ★";
  if (vp < 700) return "Fighter ★★";
  if (vp < 750) return "Fighter ★★★";
  if (vp < 800) return "Conqueror ★";
  if (vp < 850) return "Conqueror ★★";
  if (vp < 900) return "Conqueror ★★★";
  if (vp < 1100) return "Punisher ★";
  if (vp < 1200) return "Punisher ★★";
  if (vp < 1300) return "Punisher ★★★";
  if (vp < 1400) return "Guardian ★";
  if (vp < 1500) return "Guardian ★★";
  if (vp < 1750) return "Guardian ★★★";
  return "Legend";
}

/**
 * Obtient le rang suivant pour un rank donné
 * @param rank Le rank actuel
 * @returns Le rank suivant ou null si déjà au maximum
 */
export function getNextRank(rank: Rank | null): Rank | null {
  if (!rank) return "Beginner";

  const ranks: Rank[] = [
    "Beginner",
    "Challenger ★",
    "Challenger ★★",
    "Challenger ★★★",
    "Fighter ★",
    "Fighter ★★",
    "Fighter ★★★",
    "Conqueror ★",
    "Conqueror ★★",
    "Conqueror ★★★",
    "Punisher ★",
    "Punisher ★★",
    "Punisher ★★★",
    "Guardian ★",
    "Guardian ★★",
    "Guardian ★★★",
    "Legend",
  ];

  const currentIndex = ranks.indexOf(rank);
  if (currentIndex === -1 || currentIndex === ranks.length - 1) {
    return null;
  }

  return ranks[currentIndex + 1];
}

/**
 * Obtient les Victory Points minimum pour un rank donné
 * @param rank Le rank
 * @returns Les Victory Points minimum pour ce rank
 */
export function getRankMinVP(rank: Rank): number {
  switch (rank) {
    case "Beginner":
      return 0;
    case "Challenger ★":
      return 450;
    case "Challenger ★★":
      return 500;
    case "Challenger ★★★":
      return 550;
    case "Fighter ★":
      return 600;
    case "Fighter ★★":
      return 650;
    case "Fighter ★★★":
      return 700;
    case "Conqueror ★":
      return 750;
    case "Conqueror ★★":
      return 800;
    case "Conqueror ★★★":
      return 850;
    case "Punisher ★":
      return 900;
    case "Punisher ★★":
      return 1100;
    case "Punisher ★★★":
      return 1200;
    case "Guardian ★":
      return 1300;
    case "Guardian ★★":
      return 1400;
    case "Guardian ★★★":
      return 1500;
    case "Legend":
      return 1750;
  }
}

/**
 * Formate le rank pour l'affichage
 * @param rank Le rank
 * @returns Le rank formaté avec émojis
 */
export function formatRankDisplay(rank: Rank | null): string {
  if (!rank) return "Non renseigné";

  const rankEmojis: Record<Rank, string> = {
    Beginner: "🔹",
    "Challenger ★": "🔹",
    "Challenger ★★": "🔹",
    "Challenger ★★★": "🔹",
    "Fighter ★": "🔹",
    "Fighter ★★": "🔹",
    "Fighter ★★★": "🔹",
    "Conqueror ★": "🔹",
    "Conqueror ★★": "🔹",
    "Conqueror ★★★": "🔹",
    "Punisher ★": "🔹",
    "Punisher ★★": "🔹",
    "Punisher ★★★": "🔹",
    "Guardian ★": "🔹",
    "Guardian ★★": "🔹",
    "Guardian ★★★": "🔹",
    Legend: "🔹",
  };

  return `${rankEmojis[rank] || "🔹"} ${rank}`;
}
