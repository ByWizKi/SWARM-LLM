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
  rag : string,
  nn_contex : string,
  monsterNames?: {
    playerAPicks: string[];
    playerBPicks: string[];
    playerABans?: string[];
    playerBBans?: string[];
    playerAAvailable:string[];
  },
  
): string {
  // Context already has names if monsterNames was provided to buildDraftContext
  const context = draftContext;
  console.log(monsterNames)
  const playerAAvailableText = `
-Voici la liste des monstres que tu peux choisir pour le Joueur A :
- Choisis uniquement dans ces monstres pour le Joueur A :
${monsterNames?.playerAAvailable.map(monster => `- ${monster}`).join("\n")}
`;

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
${playerAAvailableText}
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

${rag}
Voici ce que le réseau de neurone pense des picks possibles, tu peux t'aider pour réfléchir mais ne pas prendre 
le résultat pour une vérité absolue : 

${nn_contex}

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
  playerAAvailableIds:number[];
}): Promise<string> {
  // TODO: Implement your RAG logic here
  // Examples:
  // - Load similar drafts from saved data
  // - Query monster database for synergies
  // - Retrieve win rate statistics
  // - Get strategy recommendations from knowledge base

  // For now, return empty string (no RAG)
  const fs = await import("fs/promises");
  const path = await import("path");

  // Charger le JSON brut
  const filePath = path.join(process.cwd(), "monsters_rta.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const monsters: any[] = JSON.parse(raw);


  // Créer un map id => nom pour lookup rapide
  const monsterIdToName: Record<number, string> = {};
  monsters.forEach(m => { monsterIdToName[m.id] = m.name; });

  //charger le json des stats moyennes
  const avgStatsPath = path.join(
    process.cwd(),
    "average_monster_stats_id.json"
  );
  const avgRaw = await fs.readFile(avgStatsPath, "utf-8");
  const averageStatsById: Record<string, any> = JSON.parse(avgRaw);


  //charger les informations de pairs
  const pairStatsPath = path.join(process.cwd(), "monsters_pairs_id.json");
  const pairStatsRaw = await fs.readFile(pairStatsPath, "utf-8");
  const pairStatsById: Record<string, any> = JSON.parse(pairStatsRaw);


  //on charge les infos de contexte courte
  const smallInfoPath = path.join(
  process.cwd(),
  "monster_small_info.json"
  );
  const smallInfoRaw = await fs.readFile(smallInfoPath, "utf-8");
  const monsterSmallInfo: Record<string, string> = JSON.parse(smallInfoRaw);


  // IDs pertinents (picks + bans)
  const fullInfoIds = new Set<number>([
  ...draftState.playerAPicks,
  ...draftState.playerBPicks,
  ...(draftState.playerABans || []),
  ...(draftState.playerBBans || [])
  ]);
  // IDs qui peuvent être utilisés mais dont on veut seulement des infos courtes.
  const lightInfoIds = new Set<number>(
    draftState.playerAAvailableIds || []
  );

  const fullMonsters = monsters.filter(m =>
  fullInfoIds.has(m.id)
  );
  const lightMonsters = monsters.filter(m =>
  lightInfoIds.has(m.id)
  );

  if (fullMonsters.length === 0) {
    return "";
  }

  const lightRagBlocks = lightMonsters
  .map(monster => {
    const description = monsterSmallInfo[String(monster.id)];
    const avgStats = averageStatsById[String(monster.id)];

    if (!description && !avgStats) return null;

    const avgStatsBlock = avgStats
      ? `
  Stats moyennes (RTA) :
  - HP : ${avgStats.HP}
  - ATK : ${avgStats.ATK}
  - DEF : ${avgStats.DEF}
  - SPD : ${avgStats.SPD}
  - Taux crit : ${avgStats.CRate}
  - Dégâts crit : ${avgStats.CDmg}
  - Résistance : ${avgStats.RES}
  - Précision : ${avgStats.ACC}
  `.trim()
        : "Stats moyennes : Non disponibles";

     // Runages
      const runesBlock = avgStats
        ? `
  Runages les plus joués :
  - ${avgStats.Set1}
  ${avgStats.Set2 ? `- ${avgStats.Set2}` : ""}
  ${avgStats.Set3 ? `- ${avgStats.Set3}` : ""}
  `.trim()
        : "Runages : Non disponibles";


      return `
   Monstre : ${monster.name} (${monster.element}, ${monster.archetype})

  Description courte :
  ${description ?? "Description non disponible"}

  ${avgStatsBlock}
  ${runesBlock}
  `.trim();
    })
    .filter(Boolean);


  const ragBlocks = fullMonsters.map(monster => {
    const avgStats = averageStatsById[String(monster.id)];

    // Stats de base
    const statsBlock = `
  Stats clés :
  - Vitesse : ${monster.speed ?? "N/A"}
  - HP (lvl max) : ${monster.max_lvl_hp ?? "N/A"}
  - ATK (lvl max) : ${monster.max_lvl_attack ?? "N/A"}
  - DEF (lvl max) : ${monster.max_lvl_defense ?? "N/A"}
  `.trim();

      // Stats moyennes RTA
      const averageStatsBlock = avgStats
        ? `
  Stats moyennes (RTA) :
  - HP : ${avgStats.HP}
  - ATK : ${avgStats.ATK}
  - DEF : ${avgStats.DEF}
  - SPD : ${avgStats.SPD}
  - Taux crit : ${avgStats.CRate}
  - Dégâts crit : ${avgStats.CDmg}
  - Résistance : ${avgStats.RES}
  - Précision : ${avgStats.ACC}
  `.trim()
        : "Stats moyennes : Non disponibles";

   // Infos “best_with” et “bad_against”
    const pairStats = pairStatsById[String(monster.id)] || {};
    const bestWithBlock = pairStats.best_with?.length
      ? "Meilleurs coéquipiers :\n" + pairStats.best_with
          .map((p: any) => `- ${monsterIdToName[p.b_monster_id] ?? p.b_monster_id} (WR: ${p.win_together_rate}%)`)
          .join("\n")
      : "Meilleurs coéquipiers : Non disponibles";

    const badAgainstBlock = pairStats.bad_against?.length
      ? "Contres principaux :\n" + pairStats.bad_against
          .map((p: any) => `- ${monsterIdToName[p.b_monster_id] ?? p.b_monster_id} (WR: ${p.win_against_rate}%)`)
          .join("\n")
      : "Contres principaux : Non disponibles";


      // Runages
      const runesBlock = avgStats
        ? `
  Runages les plus joués :
  - ${avgStats.Set1}
  ${avgStats.Set2 ? `- ${avgStats.Set2}` : ""}
  ${avgStats.Set3 ? `- ${avgStats.Set3}` : ""}
  `.trim()
        : "Runages : Non disponibles";

      // Artifacts
      const artifactsBlock = avgStats
        ? `
  Artifacts fréquents :
  - Slot 1 :
  ${(avgStats["Arti 1"] || []).map((a: string) => `  • ${a}`).join("\n")}
  - Slot 2 :
  ${(avgStats["Arti 2"] || []).map((a: string) => `  • ${a}`).join("\n")}
  `.trim()
        : "Artifacts : Non disponibles";

      // Leader skill
      let leaderSkillBlock = "Leader Skill : Aucun";
      if (monster.leader_skill) {
        const ls = monster.leader_skill;
        leaderSkillBlock = `
  Leader Skill :
  - +${ls.amount}% ${ls.attribute} pour ${
          ls.area === "Element" ? `les monstres ${ls.element}` : ls.area
        }
  `.trim();
      }

      // Skills
      const skillsBlock =
        monster.skills && monster.skills.length > 0
          ? monster.skills
              .map(
                (skill: any, index: number) =>
                  `${index + 1}. ${skill.name} : ${skill.description}`
              )
              .join("\n")
          : "Aucun skill disponible";

      return `
  Monstre : ${monster.name} (${monster.element}, ${monster.archetype})

  ${statsBlock}

  ${averageStatsBlock}

  ${runesBlock}

  ${artifactsBlock}

  ${leaderSkillBlock}

  Skills :
  ${skillsBlock}

  Win-rates Infos : 
  
  ${bestWithBlock}

  ${badAgainstBlock}
  `.trim();
    });
  
  
    return `
  === Contexte RAG : Monstres & Compétences ===
  ${ragBlocks.join("\n\n")}
  --- Monstres Disponibles (infos légères) ---
  ${lightRagBlocks.join("\n\n")}
  `.trim();
  
}


const pythonApiUrl = process.env.PYTHON_API_URL || "http://swarm-backend:8000";

export async function getNeuralNet_infos(draftState: any,playerBPossibleCounter:any) {
  const res = await fetch(`${pythonApiUrl}/neural-net`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...draftState,playerBPossibleCounter})
  });
  const data = await res.text();  
  return data;
}

export async function getLLM_recommendation(draftState: any,playerBPossibleCounter:any) {
  const res = await fetch(`${pythonApiUrl}/llm-predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...draftState,playerBPossibleCounter})
  });
  const data = await res.json();  
  return data;
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
  playerAAvailableIds:number[];},
  fastResponse?: boolean
): Promise<string> {
  try {
    // Étape 1: Load monsters to get names
    const loadStart = performance.now();
    const perfStart = performance.now();
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
      playerAAvailable: draftData.playerAAvailableIds.map((id) => getMonsterName(id)),
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

    // Get RAG context (if implemented)
    const ragStart= performance.now();
    let ragContext = await getRAGContext(draftData);
    const ragTime = performance.now() - ragStart;
    // 🔍 DEBUG : afficher le RAG dans la console
    console.log("========== RAG CONTEXT ==========");
    console.log(ragContext || "(RAG vide)");
    console.log("=================================");

    ragContext = ragContext ? `Contexte additionnel (RAG):\n${ragContext}` : "";
    // Build the full prompt
    // Obtenir le contexte depuis le NN
    const nnContext = await getNeuralNet_infos(draftData,[0]);
    const promptStart =  performance.now();
    const userPrompt = buildUserPrompt(
      draftContext,
      draftData.currentPhase,
      ragContext,
      nnContext,
      monsterNames
      
    );
    const promptTime = performance.now() - promptStart;

    // 🔍 DEBUG : afficher le Prompt dans la console
    console.log("========== Prompt ==========");
    console.log(userPrompt || "(Prompt vide)");
    console.log("=================================");
    // Call the LLM
    console.log(userPrompt.length)
    
    console.log(nnContext)
    const llmStart = performance.now()
    console.log(`fastResponse ${fastResponse}`)
    let recommendation :string;
    if (fastResponse){
      const llm_reco = await getLLM_recommendation(draftData,[0]);
      console.log(llm_reco.names)
      const response_string = ` Le LLM fine tune en réponse rapide recommande ${llm_reco.names.join(" et ")}`;
      recommendation=response_string;
    }
    else{
      recommendation = await callLLM(userPrompt);
    }
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
    console.log(recommendation);
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
