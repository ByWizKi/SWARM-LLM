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
// Instructions système optimisées - version courte pour vitesse maximale
export const SYSTEM_INSTRUCTIONS = `
Expert Summoners War RTA. Règles draft : 5 picks/joueur, 1 ban/joueur, 4 monstres finaux.
Recommandations : noms complets des monstres, synergies, contre-picks, win conditions.
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
État actuel du draft RTA - PERSPECTIVE DU JOUEUR A :

- Phase: ${currentPhase}
- Tour: ${currentTurn + 1}
- Premier joueur: ${firstPlayer}

VOTRE ÉQUIPE (Joueur A) - ${playerAPicks.length}/5 picks :
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

ÉQUIPE ADVERSAIRE (Joueur B) - ${playerBPicks.length}/5 picks :
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
  },
  isFirstPick?: boolean,
  availableMonsterNames?: string[]
): string {
  // Context already has names if monsterNames was provided to buildDraftContext
  const context = draftContext;

  const phaseInstructions = {
    picking: isFirstPick
      ? `
Premier pick Joueur A. Recommande 3-5 monstres polyvalents forts.
${
  availableMonsterNames && availableMonsterNames.length > 0
    ? `Monstres disponibles dans votre box (${
        availableMonsterNames.length
      }): ${availableMonsterNames.slice(0, 50).join(", ")}${
        availableMonsterNames.length > 50 ? "..." : ""
      }
IMPORTANT: Recommande UNIQUEMENT des monstres de cette liste.`
    : "Choisis parmi les monstres disponibles."
}
Format: "Je recommande [Nom1], [Nom2], [Nom3] car [raison]"
Maximum 50 mots.
`
      : `
Pick Joueur A. Recommande 3-5 monstres complétant l'équipe.
${
  availableMonsterNames && availableMonsterNames.length > 0
    ? `Monstres disponibles dans votre box (${
        availableMonsterNames.length
      }): ${availableMonsterNames.slice(0, 50).join(", ")}${
        availableMonsterNames.length > 50 ? "..." : ""
      }
IMPORTANT: Recommande UNIQUEMENT des monstres de cette liste.`
    : ""
}
Analyse synergies, faiblesses, forces. Noms complets des monstres.
Maximum 60 mots.
`,
    banning: `
Ban Joueur A. Bannir 1 monstre de l'équipe adverse.
Identifie le monstre le plus dangereux ou qui casse les synergies.
Format: "Je recommande de bannir [Nom] car [raison]"
Maximum 40 mots.
`,
    completed: `
Le draft est terminé. Fais une analyse complète pour le Joueur A :
- Évalue la force de votre équipe finale (Joueur A) après les bans
- Identifie les avantages et désavantages de votre composition
- Prédit vos chances de gagner et pourquoi
- Donne des conseils stratégiques concis pour le combat à venir (maximum 150 mots)
`,
  };

  const prompt = `${SYSTEM_INSTRUCTIONS}

${draftContext}

Analyse stratégique demandée :

${phaseInstructions[currentPhase]}

Format réponse :
- Ultra-concis (50 mots max premier pick, 60 mots picks suivants, 40 mots banning)
- Noms des monstres EN PREMIER
- Une phrase par monstre
- Français, direct, focus Joueur A uniquement

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
  // Utiliser uniquement gemini-2.5-flash (le plus rapide)
  models: [
    "gemini-2.5-flash", // Le plus rapide - disponible avec v1beta
  ],

  // Temperature: 0.0 (deterministic) to 1.0 (creative)
  // Réduite au minimum pour des réponses ultra-rapides et cohérentes
  temperature: 0.0,

  // Maximum tokens in response - réduit drastiquement pour la vitesse
  // 300 tokens = environ 200 mots en français
  maxOutputTokens: 300,

  // Top-p sampling (0.0 to 1.0) - réduit pour la vitesse
  topP: 0.6,

  // Top-k sampling - réduit pour la vitesse
  topK: 10,
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

  // Timeout retiré - laisser l'API répondre naturellement
  // Les timeouts étaient trop sévères et interrompaient des requêtes valides

  for (const modelName of LLM_CONFIG.models) {
    try {
      const modelStart = performance.now();
      console.log(`[LLM] Trying model: ${modelName}`);

      const clientStart = performance.now();
      const client = new GeminiClient({
        temperature: LLM_CONFIG.temperature,
        maxOutputTokens: LLM_CONFIG.maxOutputTokens,
        model: modelName,
        topP: LLM_CONFIG.topP,
        topK: LLM_CONFIG.topK,
      });
      const clientTime = performance.now() - clientStart;
      console.log(
        `[PERF] Initialisation du client Gemini: ${clientTime.toFixed(2)}ms`
      );

      // Generate response with system instructions - sans timeout
      const apiStart = performance.now();
      const response = await client.generateWithSystem(
        SYSTEM_INSTRUCTIONS,
        prompt,
        {
          model: modelName,
        }
      );
      const apiTime = performance.now() - apiStart;
      const modelTime = performance.now() - modelStart;

      console.log(`[LLM] Model ${modelName} succeeded!`);
      console.log(
        `[PERF] Temps d'appel API Gemini: ${apiTime.toFixed(
          2
        )}ms (total modèle: ${modelTime.toFixed(2)}ms)`
      );
      console.log(
        `[PERF] Taille du prompt: ${prompt.length} caractères, réponse: ${response.text.length} caractères`
      );

      return response.text;
    } catch (error) {
      const errorTime = performance.now();
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(
        `[LLM] Model ${modelName} failed:`,
        errorMsg.substring(0, 200)
      );
      console.log(`[PERF] Échec après ${errorTime.toFixed(2)}ms`);
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
  userMonsters?: number[]; // Monstres disponibles dans le box de l'utilisateur
}): Promise<string> {
  const perfStart = performance.now();
  try {
    // Étape 1: Load monsters to get names
    const loadStart = performance.now();
    const allMonsters = await loadMonsters();
    const loadTime = performance.now() - loadStart;
    console.log(
      `[PERF] Chargement des monstres: ${loadTime.toFixed(2)}ms (${
        allMonsters.length
      } monstres)`
    );

    const getMonsterName = (id: number): string => {
      const monster = findMonsterById(allMonsters, id);
      return monster
        ? `${monster.nom} (${monster.element}, ${monster.categorie})`
        : `Monstre ID ${id}`;
    };

    // Étape 2: Get monster names
    const namesStart = performance.now();
    const monsterNames = {
      playerAPicks: draftData.playerAPicks.map((id) => getMonsterName(id)),
      playerBPicks: draftData.playerBPicks.map((id) => getMonsterName(id)),
      playerABans: draftData.playerABans?.map((id) => getMonsterName(id)),
      playerBBans: draftData.playerBBans?.map((id) => getMonsterName(id)),
    };
    const namesTime = performance.now() - namesStart;
    console.log(
      `[PERF] Extraction des noms de monstres: ${namesTime.toFixed(2)}ms`
    );

    // Étape 3: Build context with monster names
    const contextStart = performance.now();
    const draftContext = buildDraftContext(draftData, monsterNames);
    const contextTime = performance.now() - contextStart;
    console.log(
      `[PERF] Construction du contexte: ${contextTime.toFixed(2)}ms (${
        draftContext.length
      } caractères)`
    );

    // Étape 4: Get RAG context (if implemented)
    const ragStart = performance.now();
    const ragContext = await getRAGContext(draftData);
    const ragTime = performance.now() - ragStart;
    if (ragContext) {
      console.log(
        `[PERF] Récupération du contexte RAG: ${ragTime.toFixed(2)}ms (${
          ragContext.length
        } caractères)`
      );
    } else {
      console.log(
        `[PERF] Récupération du contexte RAG: ${ragTime.toFixed(2)}ms (vide)`
      );
    }

    // Étape 5: Déterminer si c'est le premier pick du joueur A
    const isFirstPick =
      draftData.currentPhase === "picking" &&
      draftData.playerAPicks.length === 0 &&
      draftData.playerBPicks.length === 0 &&
      draftData.firstPlayer === "A";

    // Pour les picks du joueur A, récupérer les noms des monstres disponibles dans le box
    let availableMonsterNames: string[] = [];
    if (
      draftData.currentPhase === "picking" &&
      draftData.userMonsters &&
      draftData.userMonsters.length > 0
    ) {
      availableMonsterNames = draftData.userMonsters
        .map((id) => getMonsterName(id))
        .filter((name) => !name.includes("Monstre ID")); // Filtrer les monstres non trouvés
      console.log(
        `[PERF] Monstres disponibles dans le box: ${availableMonsterNames.length} monstres`
      );
    }

    // Étape 6: Build the full prompt
    const promptStart = performance.now();
    let userPrompt = buildUserPrompt(
      draftContext,
      draftData.currentPhase,
      monsterNames,
      isFirstPick,
      availableMonsterNames
    );

    // Add RAG context if available
    if (ragContext) {
      userPrompt = `${userPrompt}\n\nContexte additionnel (RAG):\n${ragContext}`;
    }
    const promptTime = performance.now() - promptStart;
    console.log(
      `[PERF] Construction du prompt: ${promptTime.toFixed(2)}ms (${
        userPrompt.length
      } caractères)`
    );

    // Étape 7: Call the LLM
    const llmStart = performance.now();
    const recommendation = await callLLM(userPrompt);
    const llmTime = performance.now() - llmStart;
    console.log(
      `[PERF] Appel à l'API Gemini: ${llmTime.toFixed(2)}ms (${
        recommendation.length
      } caractères)`
    );

    const totalTime = performance.now() - perfStart;
    console.log(
      `[PERF] Temps total generateRecommendation: ${totalTime.toFixed(2)}ms`
    );
    console.log(
      `[PERF] Répartition: Chargement=${loadTime.toFixed(
        2
      )}ms, Noms=${namesTime.toFixed(2)}ms, Contexte=${contextTime.toFixed(
        2
      )}ms, RAG=${ragTime.toFixed(2)}ms, Prompt=${promptTime.toFixed(
        2
      )}ms, LLM=${llmTime.toFixed(2)}ms`
    );

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
