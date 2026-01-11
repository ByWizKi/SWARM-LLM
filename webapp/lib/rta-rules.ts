/**
 * Règles officielles de la phase de draft RTA (World Arena) - Summoners War
 *
 * Ce module contient les règles strictes du mode RTA qui doivent être respectées
 * dans toutes les analyses, simulations et conseils de l'assistant IA.
 */

export const RTADraftRules = {
  /**
   * Ordre des picks dans une draft RTA
   * Format: { player: 'A' | 'B', picks: number }
   */
  pickOrder: [
    { player: 'A' as const, picks: 1 },  // Tour 1: A pick 1 (total A = 1)
    { player: 'B' as const, picks: 2 },  // Tour 2: B pick 2 (total B = 2)
    { player: 'A' as const, picks: 2 },  // Tour 3: A pick 2 (total A = 3)
    { player: 'B' as const, picks: 2 },  // Tour 4: B pick 2 (total B = 4)
    { player: 'A' as const, picks: 2 },  // Tour 5: A pick 2 (total A = 5)
    { player: 'B' as const, picks: 1 },  // Tour 6: B pick 1 (total B = 5)
  ] as const satisfies Array<{ player: 'A' | 'B'; picks: number }>,

  /**
   * Règles générales
   */
  rules: {
    // Nombre total de monstres par joueur
    totalPicksPerPlayer: 5,

    // Nombre de bans par joueur
    bansPerPlayer: 1,

    // Nombre de monstres au combat (après bans)
    monstersInCombat: 4,

    // Premier pick déterminé aléatoirement
    firstPickRandom: true,

    // Interdiction des doublons
    duplicatesForbidden: true,

    // Bans simultanés
    simultaneousBans: true,
  },

  /**
   * Contraintes
   */
  constraints: {
    // Un monstre déjà sélectionné ne peut plus être choisi
    noDuplicateSelection: true,

    // Les runes, artefacts, skills et leader skills sont verrouillés pendant le draft
    lockedStats: true,

    // Tous les leader skills fonctionnent normalement
    leaderSkillsActive: true,

    // Pas de bonus externes (guildes, tours, etc.)
    noExternalBonuses: true,
  },

  /**
   * Timers et limitations
   */
  timing: {
    // Limite de temps par pick (en secondes)
    timeLimitPerPick: 30,

    // Pick automatique en cas de dépassement
    autoPickOnTimeout: true,
  },

  /**
   * Vérifie si un ordre de pick est valide
   */
  isValidPickOrder(picks: { player: 'A' | 'B', count: number }[]): boolean {
    const totalA = picks.filter(p => p.player === 'A').reduce((sum, p) => sum + p.count, 0);
    const totalB = picks.filter(p => p.player === 'B').reduce((sum, p) => sum + p.count, 0);

    return totalA === 5 && totalB === 5 && picks.length === 6;
  },

  /**
   * Calcule le tour actuel et le joueur dont c'est le tour
   */
  getCurrentTurnInfo(currentPickIndex: number, firstPlayer: 'A' | 'B'): {
    turn: number;
    currentPlayer: 'A' | 'B';
    picksRemaining: number;
  } | null {
    if (currentPickIndex < 0 || currentPickIndex >= this.pickOrder.length) {
      return null;
    }

    const adjustedOrder: Array<{ player: 'A' | 'B'; picks: number }> = firstPlayer === 'B'
      ? this.pickOrder.map((p): { player: 'A' | 'B'; picks: number } => ({ ...p, player: (p.player === 'A' ? 'B' : 'A') as 'A' | 'B' }))
      : this.pickOrder;

    const currentRound = adjustedOrder[currentPickIndex];
    if (!currentRound) {
      return null;
    }
    const totalPicked = adjustedOrder
      .slice(0, currentPickIndex)
      .reduce((sum, round) => sum + round.picks, 0);

    const totalToPick = adjustedOrder
      .slice(0, currentPickIndex + 1)
      .reduce((sum, round) => sum + round.picks, 0);

    return {
      turn: currentPickIndex + 1,
      currentPlayer: currentRound.player as 'A' | 'B',
      picksRemaining: 5 - (firstPlayer === currentRound.player ? totalToPick : totalPicked),
    };
  },

  /**
   * Vérifie si un monstre peut être pické (pas déjà sélectionné)
   */
  canPickMonster(
    monsterId: string | number,
    playerAPicks: (string | number)[],
    playerBPicks: (string | number)[]
  ): boolean {
    return !playerAPicks.includes(monsterId) && !playerBPicks.includes(monsterId);
  },

  /**
   * Valide l'état complet d'une draft
   */
  validateDraftState(state: {
    playerAPicks: (string | number)[];
    playerBPicks: (string | number)[];
    playerABans?: (string | number)[];
    playerBBans?: (string | number)[];
    phase: 'picking' | 'banning' | 'completed';
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Vérifier le nombre de picks
    if (state.playerAPicks.length > 5) {
      errors.push('Le joueur A a trop de picks');
    }
    if (state.playerBPicks.length > 5) {
      errors.push('Le joueur B a trop de picks');
    }

    // Vérifier les doublons entre équipes
    const duplicates = state.playerAPicks.filter(pick => state.playerBPicks.includes(pick));
    if (duplicates.length > 0) {
      errors.push('Des doublons ont été détectés entre les deux équipes');
    }

    // Vérifier les bans
    if (state.phase === 'banning' || state.phase === 'completed') {
      if (state.playerABans && state.playerABans.length > 1) {
        errors.push('Le joueur A a trop de bans');
      }
      if (state.playerBBans && state.playerBBans.length > 1) {
        errors.push('Le joueur B a trop de bans');
      }

      // Vérifier que les bans sont dans l'équipe adverse
      if (state.playerABans && state.playerABans.some(ban => !state.playerBPicks.includes(ban))) {
        errors.push('Le joueur A a banni un monstre qui n\'est pas dans l\'équipe du joueur B');
      }
      if (state.playerBBans && state.playerBBans.some(ban => !state.playerAPicks.includes(ban))) {
        errors.push('Le joueur B a banni un monstre qui n\'est pas dans l\'équipe du joueur A');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

/**
 * Prompts et instructions pour l'assistant IA
 */
export const AIAssistantInstructions = `
Tu es un assistant expert de Summoners War, spécialisé en RTA (World Arena).
Tu connais parfaitement les règles officielles de la phase de draft et tu dois toujours les respecter
dans tes analyses, simulations et conseils.

Règles de la phase de draft RTA :

1. Deux joueurs s'affrontent en temps réel.
2. Un tirage aléatoire détermine qui commence.
3. Chaque joueur sélectionne 5 monstres au total selon l'ordre suivant :
   - Joueur A : 1 pick
   - Joueur B : 2 picks
   - Joueur A : 2 picks
   - Joueur B : 2 picks
   - Joueur A : 1 pick
4. Un monstre déjà sélectionné ne peut plus être choisi par l'adversaire.
5. Les doublons sont interdits (un même monstre ne peut être pick qu'une seule fois).
6. Après les picks, chaque joueur bannit 1 monstre de l'équipe adverse.
7. Les bans sont simultanés.
8. Les monstres bannis ne participent pas au combat.
9. Chaque joueur combat donc avec 4 monstres.
10. Les runes, artefacts, skills et leader skills sont verrouillés pendant le draft.
11. Tous les leader skills fonctionnent normalement et ne s'appliquent qu'à leur propre équipe.
12. Il existe une limite de temps pour chaque pick ; en cas de dépassement, un pick automatique est effectué.
13. Le combat se déroule en mode World Arena sans bonus externes (guildes, tours, etc.).

Lorsque tu aides à drafter :
- Tu dois anticiper les bans.
- Tu dois analyser la synergie, le contre-pick et la win condition.
- Tu dois respecter strictement les règles ci-dessus.
`;

