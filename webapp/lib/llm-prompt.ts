/**
 * LLM Prompt Configuration and RAG System
 *
 * This file centralizes all LLM-related logic, prompts, and configurations.
 * Your colleagues can modify this file to:
 * - Adjust the prompt for better recommendations
 * - Add RAG (Retrieval Augmented Generation) capabilities
 * - Modify the system instructions
 * - Change the model configuration
 *
 * IMPORTANT: This is the ONLY file you need to modify for LLM/prompt work.
 */

import { GeminiClient } from "@/lib/gemini-client";
import { loadMonsters, findMonsterById } from "@/lib/monsters";

// ============================================================================
// SYSTEM INSTRUCTIONS - Modify these to change how the AI behaves
// ============================================================================

/**
 * System instructions for the AI assistant
 * Modify this to change the AI's behavior, knowledge, or instructions
 */
export const SYSTEM_INSTRUCTIONS = `
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
   - Joueur A : 2 picks
   - Joueur B : 1 pick
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
- Tu dois mentionner explicitement les noms complets des monstres que tu recommandes.
`;

// ============================================================================
// PROMPT TEMPLATES - Modify these to change the prompt structure
// ============================================================================

/**
 * Build the draft context from the current draft state
 * Modify this function to change how the context is formatted
 *
 * @param data Draft state data
 * @param monsterNames Optional monster names (if already loaded)
 */
export function buildDraftContext(
  data: {
    playerAPicks: number[];
    playerBPicks: number[];
    playerABans?: number[];
    playerBBans?: number[];
    currentPhase: "picking" | "banning" | "completed";
    currentTurn: number;
    firstPlayer: "A" | "B";
  },
  monsterNames?: {
    playerAPicks: string[];
    playerBPicks: string[];
    playerABans?: string[];
    playerBBans?: string[];
  }
): string {
  const {
    playerAPicks,
    playerBPicks,
    playerABans = [],
    playerBBans = [],
    currentPhase,
    currentTurn,
    firstPlayer,
  } = data;

  // Helper to get display name (use name if available, otherwise ID)
  const getDisplayName = (
    id: number,
    index: number,
    names?: string[]
  ): string => {
    if (names && names[index] !== undefined) {
      return names[index];
    }
    return `Monstre ID ${id}`;
  };

  const context = `
État actuel du draft RTA :

- Phase: ${currentPhase}
- Tour: ${currentTurn + 1}
- Premier joueur: ${firstPlayer}

Équipe Joueur A (Vous) - ${playerAPicks.length}/5 picks :
${
  playerAPicks.length > 0
    ? playerAPicks
        .map(
          (id, idx) =>
            `  ${idx + 1}. ${getDisplayName(
              id,
              idx,
              monsterNames?.playerAPicks
            )}`
        )
        .join("\n")
    : "  Aucun monstre sélectionné pour le moment"
}

Équipe Joueur B (Adversaire) - ${playerBPicks.length}/5 picks :
${
  playerBPicks.length > 0
    ? playerBPicks
        .map(
          (id, idx) =>
            `  ${idx + 1}. ${getDisplayName(
              id,
              idx,
              monsterNames?.playerBPicks
            )}`
        )
        .join("\n")
    : "  Aucun monstre sélectionné pour le moment"
}

${
  currentPhase === "banning"
    ? `
Phase de bans en cours :
- Bans Joueur A: ${
        playerABans.length > 0
          ? playerABans
              .map((id, idx) =>
                getDisplayName(id, idx, monsterNames?.playerABans)
              )
              .join(", ")
          : "Pas encore banni"
      }
- Bans Joueur B: ${
        playerBBans.length > 0
          ? playerBBans
              .map((id, idx) =>
                getDisplayName(id, idx, monsterNames?.playerBBans)
              )
              .join(", ")
          : "Pas encore banni"
      }
`
    : ""
}
${
  currentPhase === "completed"
    ? `
Draft terminé - Analyse finale :
- Bans Joueur A: ${playerABans
        .map((id, idx) => getDisplayName(id, idx, monsterNames?.playerABans))
        .join(", ")}
- Bans Joueur B: ${playerBBans
        .map((id, idx) => getDisplayName(id, idx, monsterNames?.playerBBans))
        .join(", ")}
- Monstres finaux Joueur A (4): ${playerAPicks
        .filter((id) => !playerBBans.includes(id))
        .map((id) => {
          const idx = playerAPicks.indexOf(id);
          return getDisplayName(id, idx, monsterNames?.playerAPicks);
        })
        .join(", ")}
- Monstres finaux Joueur B (4): ${playerBPicks
        .filter((id) => !playerABans.includes(id))
        .map((id) => {
          const idx = playerBPicks.indexOf(id);
          return getDisplayName(id, idx, monsterNames?.playerBPicks);
        })
        .join(", ")}
`
    : ""
}
`;

  return context;
}

/**
 * Build the user prompt based on the current phase
 * Modify this function to change the prompt structure or add RAG context
 */
export function buildUserPrompt(
  draftContext: string,
  currentPhase: "picking" | "banning" | "completed",
  monsterNames?: {
    playerAPicks: string[];
    playerBPicks: string[];
    playerABans?: string[];
    playerBBans?: string[];
  }
): string {
  // Context already has names if monsterNames was provided to buildDraftContext
  const context = draftContext;

  const phaseInstructions = {
    picking: `
Tu es en phase de PICKING. Le joueur A doit faire son prochain pick.
- Analyse les synergies entre les monstres déjà sélectionnés par le Joueur A
- Identifie les faiblesses et les forces de l'équipe actuelle
- Recommande 2-5 monstres spécifiques qui compléteraient bien l'équipe du Joueur A
- IMPORTANT : Mentionne explicitement les noms complets des monstres que tu recommandes (ex: "Je recommande [Nom du Monstre (Élément, Catégorie)]")
- Explique pourquoi ces monstres sont de bons choix (synergies, contre-picks, win conditions)
- Anticipe ce que l'adversaire pourrait picker ensuite
- Sois précis avec les noms des monstres pour faciliter la sélection
`,
    banning: `
Tu es en phase de BANNING. Le Joueur A doit bannir 1 monstre de l'équipe adverse.
- Analyse l'équipe adverse (Joueur B) et identifie le monstre le plus dangereux
- Considère les synergies dans l'équipe adverse
- Recommande quel monstre bannir et explique pourquoi
- Explique l'impact de ce ban sur la composition finale
`,
    completed: `
Le draft est terminé. Fais une analyse complète :
- Évalue la force de chaque équipe finale
- Identifie les avantages et désavantages de chaque composition
- Prédit quelle équipe a le plus de chances de gagner et pourquoi
- Donne des conseils stratégiques pour le combat à venir
`,
  };

  const prompt = `${SYSTEM_INSTRUCTIONS}

${draftContext}

Analyse stratégique demandée :

${phaseInstructions[currentPhase]}

Format de réponse :
- Sois précis et concret
- Mentionne les noms des monstres spécifiques
- Explique tes raisonnements stratégiques
- Utilise un langage clair et accessible
- Réponds en français

Réponds maintenant :`;

  return prompt;
}

// ============================================================================
// LLM CONFIGURATION - Modify these to change model settings
// ============================================================================

/**
 * LLM Configuration
 * Modify these values to change the model behavior
 */
export const LLM_CONFIG = {
  // Models to try in order (fallback if first fails)
  models: [
    "gemini-2.5-flash", // Recommended in official docs
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-3-pro-preview",
  ],

  // Temperature: 0.0 (deterministic) to 1.0 (creative)
  temperature: 0.7,

  // Maximum tokens in response
  maxOutputTokens: 1500,

  // Top-p sampling (0.0 to 1.0)
  topP: 0.95,

  // Top-k sampling
  topK: 40,
};

// ============================================================================
// LLM CALL FUNCTION - Main function to call the LLM
// ============================================================================

/**
 * Call the LLM with the given prompt
 * This function handles model fallback and error handling
 *
 * @param prompt The full prompt to send to the LLM
 * @returns The LLM response text
 */
export async function callLLM(prompt: string): Promise<string> {
  let lastError: Error | null = null;

  for (const modelName of LLM_CONFIG.models) {
    try {
      console.log(`[LLM] Trying model: ${modelName}`);

      const client = new GeminiClient({
        temperature: LLM_CONFIG.temperature,
        maxOutputTokens: LLM_CONFIG.maxOutputTokens,
        model: modelName,
        topP: LLM_CONFIG.topP,
        topK: LLM_CONFIG.topK,
      });

      // Generate response with system instructions
      const response = await client.generateWithSystem(
        SYSTEM_INSTRUCTIONS,
        prompt,
        { model: modelName }
      );

      console.log(`[LLM] Model ${modelName} succeeded!`);
      return response.text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(
        `[LLM] Model ${modelName} failed:`,
        errorMsg.substring(0, 200)
      );
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  // If all models failed, throw the last error
  throw lastError || new Error("Aucun modèle Gemini disponible");
}

// ============================================================================
// RAG FUNCTION - Add your RAG logic here
// ============================================================================

/**
 * RAG (Retrieval Augmented Generation) function
 *
 * This function can be used to retrieve relevant context from:
 * - Previous draft data
 * - Monster database
 * - Strategy guides
 * - Win rate statistics
 *
 * Modify this function to add your RAG capabilities
 *
 * @param draftState Current draft state
 * @returns Additional context to add to the prompt
 */
export async function getRAGContext(draftState: {
  playerAPicks: number[];
  playerBPicks: number[];
  playerABans?: number[];
  playerBBans?: number[];
  currentPhase: "picking" | "banning" | "completed";
}): Promise<string> {
  // TODO: Implement your RAG logic here
  // Examples:
  // - Load similar drafts from saved data
  // - Query monster database for synergies
  // - Retrieve win rate statistics
  // - Get strategy recommendations from knowledge base

  // For now, return empty string (no RAG)
  return "";
}

// ============================================================================
// MAIN FUNCTION - Generate recommendation with full pipeline
// ============================================================================

/**
 * Generate a draft recommendation using the LLM
 * This is the main function that orchestrates everything
 *
 * @param draftData Current draft state
 * @returns LLM recommendation text
 */
export async function generateRecommendation(draftData: {
  playerAPicks: number[];
  playerBPicks: number[];
  playerABans?: number[];
  playerBBans?: number[];
  currentPhase: "picking" | "banning" | "completed";
  currentTurn: number;
  firstPlayer: "A" | "B";
}): Promise<string> {
  try {
    // Load monsters to get names
    const allMonsters = await loadMonsters();

    const getMonsterName = (id: number): string => {
      const monster = findMonsterById(allMonsters, id);
      return monster
        ? `${monster.nom} (${monster.element}, ${monster.categorie})`
        : `Monstre ID ${id}`;
    };

    // Get monster names
    const monsterNames = {
      playerAPicks: draftData.playerAPicks.map((id) => getMonsterName(id)),
      playerBPicks: draftData.playerBPicks.map((id) => getMonsterName(id)),
      playerABans: draftData.playerABans?.map((id) => getMonsterName(id)),
      playerBBans: draftData.playerBBans?.map((id) => getMonsterName(id)),
    };

    // Build context with monster names
    const draftContext = buildDraftContext(draftData, monsterNames);

    // Get RAG context (if implemented)
    const ragContext = await getRAGContext(draftData);

    // Build the full prompt
    let userPrompt = buildUserPrompt(
      draftContext,
      draftData.currentPhase,
      monsterNames
    );

    // Add RAG context if available
    if (ragContext) {
      userPrompt = `${userPrompt}\n\nContexte additionnel (RAG):\n${ragContext}`;
    }

    // Call the LLM
    const recommendation = await callLLM(userPrompt);

    return recommendation;
  } catch (error) {
    console.error("[LLM] Error generating recommendation:", error);

    // Return user-friendly error message
    if (error instanceof Error) {
      if (
        error.message.includes("API key") ||
        error.message.includes("GEMINI_API_KEY")
      ) {
        return `Erreur de configuration : La clé API Gemini n'est pas configurée.

Veuillez :
1. Obtenir une clé API sur https://makersuite.google.com/app/apikey
2. Ajouter GEMINI_API_KEY=votre_cle_ici dans le fichier .env du dossier webapp
3. Redémarrer le serveur de développement`;
      }

      if (
        error.message.includes("quota") ||
        error.message.includes("rate limit")
      ) {
        return `Erreur : Quota API dépassé ou limite de taux atteinte.

Veuillez vérifier votre utilisation de l'API Gemini ou attendre quelques instants avant de réessayer.`;
      }
    }

    return `Erreur lors de la génération de recommandation : ${
      error instanceof Error ? error.message : "Erreur inconnue"
    }

Veuillez vérifier votre configuration et réessayer.`;
  }
}
