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

  if (vp < 1000) return "Beginner";
  if (vp < 1200) return "Challenger ★";
  if (vp < 1400) return "Challenger ★★";
  if (vp < 1600) return "Challenger ★★★";
  if (vp < 1800) return "Fighter ★";
  if (vp < 2000) return "Fighter ★★";
  if (vp < 2200) return "Fighter ★★★";
  if (vp < 2400) return "Conqueror ★";
  if (vp < 2600) return "Conqueror ★★";
  if (vp < 2800) return "Conqueror ★★★";
  if (vp < 3000) return "Guardian ★";
  if (vp < 3200) return "Guardian ★★";
  if (vp < 3400) return "Guardian ★★★";
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
      return 1000;
    case "Challenger ★★":
      return 1200;
    case "Challenger ★★★":
      return 1400;
    case "Fighter ★":
      return 1600;
    case "Fighter ★★":
      return 1800;
    case "Fighter ★★★":
      return 2000;
    case "Conqueror ★":
      return 2200;
    case "Conqueror ★★":
      return 2400;
    case "Conqueror ★★★":
      return 2600;
    case "Guardian ★":
      return 2800;
    case "Guardian ★★":
      return 3000;
    case "Guardian ★★★":
      return 3200;
    case "Legend":
      return 3400;
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
    "Guardian ★": "🔹",
    "Guardian ★★": "🔹",
    "Guardian ★★★": "🔹",
    Legend: "🔹",
  };

  return `${rankEmojis[rank] || "🔹"} ${rank}`;
}
