import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateRecommendation } from "@/lib/llm-prompt";
import { saveDraft } from "@/lib/draft-data-collector";

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
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body: DraftRecommendationRequest = await request.json();
    const { playerAPicks, playerBPicks, playerABans = [], playerBBans = [], currentPhase, currentTurn, firstPlayer,playerAAvailableIds=[] } = body;

    // Valider les données
    if (!Array.isArray(playerAPicks) || !Array.isArray(playerBPicks)) {
      return NextResponse.json(
        { error: "Format de données invalide" },  
        { status: 400 }
      );
    }

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
          finalTeamA: playerAPicks.filter(id => !playerBBans.includes(id)),
          finalTeamB: playerBPicks.filter(id => !playerABans.includes(id)),
          recommendation,
          metadata: {
            userId: session.user?.id || session.user?.email || "unknown",
          },
        });
      } catch (error) {
        console.error("Error saving draft:", error);
        // Don't fail the request if saving fails
      }
    }

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


