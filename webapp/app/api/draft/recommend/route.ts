import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { generateRecommendation } from "@/lib/llm-prompt";
import { saveDraft } from "@/lib/draft-data-collector";
import { prisma } from "@/lib/prisma";
import { RTADraftRules } from "@/lib/rta-rules";

/**
 * API Route pour obtenir des recommandations de draft depuis un LLM
 *
 * Cette route reçoit l'état actuel du draft et retourne des recommandations
 * basées sur l'analyse stratégique (synergies, contre-picks, win conditions, etc.)
 */

interface DraftRecommendationRequest {
  playerAPicks: number[];
  playerBPicks: number[];
  playerABans?: number[];
  playerBBans?: number[];
  currentPhase: "picking" | "banning" | "completed";
  currentTurn: number;
  firstPlayer: "A" | "B";
  playerAAvailableIds:number[];//Liste des monstres possibles pour le joueur A
  fastResponse?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body: DraftRecommendationRequest = await request.json();
    const { playerAPicks, playerBPicks, playerABans = [], playerBBans = [], currentPhase, currentTurn, firstPlayer,playerAAvailableIds=[],fastResponse=false } = body;

    // Valider les données
    if (!Array.isArray(playerAPicks) || !Array.isArray(playerBPicks)) {
      return NextResponse.json(
        { error: "Format de données invalide" },
        { status: 400 }
      );
    }
    // Vérifier que l'utilisateur a une clé API Gemini
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true },
    });

    if (!user?.geminiApiKey) {
      return NextResponse.json(
        { error: "Clé API Gemini requise. Veuillez configurer votre clé API dans les paramètres." },
        { status: 403 }
      );
    }

    const startTime = performance.now();//pour regarder le temps de la requete + rag
    // Générer la recommandation en utilisant le fichier centralisé
    const recommendation = await generateRecommendation({
      playerAPicks,
      playerBPicks,
      playerABans,
      playerBBans,
      currentPhase,
      currentTurn,
      firstPlayer,
      playerAAvailableIds,
      geminiApiKey: user.geminiApiKey,
      fastResponse,
    });//ajout des monstres possibles pour le llm

    // Sauvegarder le draft si terminé (pour analyse future)
    if (currentPhase === "completed") {
      try {
        await saveDraft({
          playerAPicks,
          playerBPicks,
          playerABans,
          playerBBans,
          firstPlayer,
          finalTeamA: playerAPicks.filter((id) => !playerBBans.includes(id)),
          finalTeamB: playerBPicks.filter((id) => !playerABans.includes(id)),
          recommendation,
          metadata: {
            userId: session.user?.id || "unknown",
          },
        });
      } catch (error) {
        console.error("Error saving draft:", error);
      }
      return NextResponse.json(
        { error: "Le draft est terminé" },
        { status: 400 }
      );
    }

    // Déterminer si c'est le tour du joueur A (celui qui utilise l'app)
    const totalPicks = playerAPicks.length + playerBPicks.length;

    // Calculer l'index du tour actuel (0-5) à partir du nombre total de picks
    // getCurrentTurnInfo attend l'index du tour, pas le nombre total de picks
    // L'index du tour correspond au nombre de tours complets effectués
    let currentTurnIndex = 0;
    let picksCounted = 0;
    for (let i = 0; i < RTADraftRules.pickOrder.length; i++) {
      const turn = RTADraftRules.pickOrder[i];
      const picksBeforeThisTurn = picksCounted;
      picksCounted += turn.picks;

      // Si le nombre total de picks est inférieur au nombre de picks après ce tour,
      // on est dans ce tour
      if (totalPicks < picksCounted) {
        currentTurnIndex = i;
        break;
      }
      // Si on a exactement atteint le nombre de picks de ce tour, on passe au tour suivant
      // (sauf si c'est le dernier tour)
      if (totalPicks === picksCounted && i < RTADraftRules.pickOrder.length - 1) {
        currentTurnIndex = i + 1;
        break;
      }
      // Si on a dépassé, continuer
      if (totalPicks >= picksCounted) {
        currentTurnIndex = i;
      }
    }

    // Limiter l'index au nombre maximum de tours
    if (currentTurnIndex >= RTADraftRules.pickOrder.length) {
      currentTurnIndex = RTADraftRules.pickOrder.length - 1;
    }

    const currentTurnInfo = RTADraftRules.getCurrentTurnInfo(
      currentTurnIndex,
      firstPlayer
    );

    // Log pour déboguer
    console.log("[DEBUG] État du draft:", {
      totalPicks,
      playerAPicks: playerAPicks.length,
      playerBPicks: playerBPicks.length,
      currentPhase,
      currentTurn,
      firstPlayer,
      currentTurnInfo,
      playerABans: playerABans.length,
      playerBBans: playerBBans.length,
    });

    // Calculer si c'est le tour du joueur A
    let isPlayerATurn = false;

    if (currentPhase === "picking") {
      // En phase de picking, vérifier que c'est le tour du joueur A
      // Si currentTurnInfo est null, on peut quand même permettre si c'est le premier pick
      if (currentTurnInfo) {
        isPlayerATurn = currentTurnInfo.currentPlayer === "A";
      } else {
        // Si currentTurnInfo est null, vérifier si c'est le premier pick du joueur A
        // (totalPicks === 0 et firstPlayer === "A")
        isPlayerATurn = totalPicks === 0 && firstPlayer === "A";
      }
    } else if (currentPhase === "banning") {
      // En phase de banning, le joueur A peut bannir si il n'a pas encore banni
      isPlayerATurn = playerABans.length === 0;
    }

    // Log pour déboguer
    console.log("[DEBUG] isPlayerATurn:", isPlayerATurn, {
      currentPhase,
      currentTurnInfo: currentTurnInfo ? JSON.stringify(currentTurnInfo) : "null",
      totalPicks,
      firstPlayer,
    });

    // Vérifier que c'est bien le tour du joueur A
    if (!isPlayerATurn) {
      console.log("[DEBUG] Rejeté: Ce n'est pas le tour du joueur A");
      return NextResponse.json(
        {
          error: "Ce n'est pas votre tour",
          debug: {
            currentPhase,
            currentTurnInfo: currentTurnInfo ? {
              turn: currentTurnInfo.turn,
              currentPlayer: currentTurnInfo.currentPlayer,
              picksRemaining: currentTurnInfo.picksRemaining,
            } : null,
            isPlayerATurn,
            totalPicks,
            playerAPicks: playerAPicks.length,
            playerBPicks: playerBPicks.length,
            firstPlayer,
          }
        },
        { status: 400 }
      );
    }

    // Récupérer le box de l'utilisateur quand c'est le tour du joueur A
    let userMonsters: number[] = [];
    if (isPlayerATurn) {
      try {
        const box = await prisma.monsterBox.findUnique({
          where: { userId: session.user.id },
        });
        if (box && Array.isArray(box.monsters)) {
          // Convertir et filtrer les monstres déjà pickés par le joueur A
          const allUserMonsters = box.monsters
            .map((id: any) => (typeof id === "number" ? id : parseInt(id, 10)))
            .filter((id: number) => !isNaN(id));
          userMonsters = allUserMonsters.filter(
            (id) => !playerAPicks.includes(id)
          );
          console.log(
            `[PERF] Box utilisateur récupéré: ${allUserMonsters.length} monstres, ${userMonsters.length} disponibles après filtrage`
          );
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du box:", error);
      }
    }



    const totalTime = performance.now() - startTime;
    console.log(`[PERF] Temps total de génération: ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      recommendation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur lors de la génération de recommandation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de recommandation" },
      { status: 500 }
    );
  }
}
