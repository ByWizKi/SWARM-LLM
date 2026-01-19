import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { victoryPointsToRank } from "@/lib/rank-utils";
import { createHash } from "crypto";

export const dynamic = 'force-dynamic';

/**
 * Hash un userId de manière déterministe pour l'anonymisation
 */
function hashUserId(userId: string): string {
  // Utiliser un salt fixe pour que le hash soit déterministe
  // Cela permet d'avoir le même hash pour le même userId dans différents exports
  const salt = process.env.ANONYMIZATION_SALT || "default-salt-for-draft-anonymization";
  return createHash('sha256').update(userId + salt).digest('hex');
}

/**
 * Calcule les statistiques globales des drafts
 */
function calculateStatistics(drafts: any[]) {
  const draftsWithWinner = drafts.filter(d => d.winner !== null).length;
  const allTextRatings = drafts.flatMap(draft => {
    const recs = Array.isArray(draft.recommendations) ? draft.recommendations : [];
    return recs.map((rec: any) => rec.textRating).filter((r: any) => r !== null && r !== undefined);
  });
  const allMonsterRatings = drafts.flatMap(draft => {
    const recs = Array.isArray(draft.recommendations) ? draft.recommendations : [];
    return recs.map((rec: any) => rec.monsterRecommendationRating).filter((r: any) => r !== null && r !== undefined);
  });
  const averageTextRating = allTextRatings.length > 0
    ? allTextRatings.reduce((sum: number, r: number) => sum + r, 0) / allTextRatings.length
    : 0;
  const averageMonsterRating = allMonsterRatings.length > 0
    ? allMonsterRatings.reduce((sum: number, r: number) => sum + r, 0) / allMonsterRatings.length
    : 0;

  const durations = drafts
    .map(d => d.metadata?.duration)
    .filter((d: any) => d !== null && d !== undefined);
  const averageDuration = durations.length > 0
    ? durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length
    : 0;

  // Distribution des rangs
  const rankDistribution: Record<string, number> = {};
  drafts.forEach(draft => {
    const rank = draft.rankTier;
    if (rank) {
      rankDistribution[rank] = (rankDistribution[rank] || 0) + 1;
    }
  });

  return {
    totalDrafts: drafts.length,
    draftsWithWinner,
    averageTextRating: Math.round(averageTextRating * 100) / 100,
    averageMonsterRating: Math.round(averageMonsterRating * 100) / 100,
    averageDuration: Math.round(averageDuration * 100) / 100,
    rankDistribution,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer tous les drafts avec les informations utilisateur
    const draftsWithUsers = await prisma.draftSession.findMany({
      include: {
        user: {
          select: {
            id: true,
            victoryPoints: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Mapper les drafts vers le format anonyme
    const anonymizedDrafts = draftsWithUsers.map((draft, index) => {
      const userId = draft.user.id;
      const playerHash = hashUserId(userId);
      const victoryPoints = draft.user.victoryPoints;
      const rankTier = victoryPoints !== null && victoryPoints !== undefined ? victoryPointsToRank(victoryPoints) : null;

      // Formater les recommandations
      const recommendations = Array.isArray(draft.recommendations)
        ? draft.recommendations.map((rec: any) => ({
            messageId: rec.messageId || `rec-${draft.id}-${index}`,
            text: rec.text || "",
            proposedMonsterIds: rec.proposedMonsterIds || [],
            phase: rec.phase || "picking",
            turn: rec.turn || null,
            textRating: rec.textRating ?? null,
            monsterRecommendationRating: rec.monsterRecommendationRating ?? null,
            timestamp: rec.timestamp || draft.createdAt.toISOString(),
          }))
        : [];

      // Formater les recommandations de ban
      const banRecommendations = Array.isArray(draft.banRecommendations) && draft.banRecommendations.length > 0
        ? draft.banRecommendations.map((rec: any) => ({
            messageId: rec.messageId || `ban-rec-${draft.id}-${index}`,
            text: rec.text || "",
            proposedMonsterIds: rec.proposedMonsterIds || [],
            phase: rec.phase || "banning",
            timestamp: rec.timestamp || draft.createdAt.toISOString(),
          }))
        : null;

      // Calculer les métadonnées
      const validTextRatings = recommendations
        .map((r: any) => r.textRating)
        .filter((r: any) => r !== null && r !== undefined && typeof r === 'number') as number[];

      const validMonsterRatings = recommendations
        .map((r: any) => r.monsterRecommendationRating)
        .filter((r: any) => r !== null && r !== undefined && typeof r === 'number') as number[];

      const averageTextRating = validTextRatings.length > 0
        ? Math.round((validTextRatings.reduce((sum, r) => sum + r, 0) / validTextRatings.length) * 100) / 100
        : null;

      const averageMonsterRating = validMonsterRatings.length > 0
        ? Math.round((validMonsterRatings.reduce((sum, r) => sum + r, 0) / validMonsterRatings.length) * 100) / 100
        : null;

      const metadataObj = draft.metadata && typeof draft.metadata === 'object' && !Array.isArray(draft.metadata)
        ? draft.metadata as Record<string, any>
        : {};

      const metadata = {
        duration: metadataObj.duration || null,
        llmModel: metadataObj.llmModel || "gemini-pro",
        totalRecommendations: recommendations.length,
        averageTextRating,
        averageMonsterRating,
        picksCount: Array.isArray(draft.playerAPicks) ? draft.playerAPicks.length : 0,
        bansCount: Array.isArray(draft.playerABans) ? draft.playerABans.length : 0,
        ...metadataObj,
      };

      return {
        draftId: `anon-draft-${String(index + 1).padStart(3, '0')}`,
        playerHash,
        victoryPoints,
        rankTier,
        firstPlayer: draft.firstPlayer,
        winner: draft.winner,
        playerAPicks: Array.isArray(draft.playerAPicks) ? draft.playerAPicks : [],
        playerBPicks: Array.isArray(draft.playerBPicks) ? draft.playerBPicks : [],
        playerABans: Array.isArray(draft.playerABans) ? draft.playerABans : [],
        playerBBans: Array.isArray(draft.playerBBans) ? draft.playerBBans : [],
        recommendations,
        banRecommendations,
        metadata,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
      };
    });

    // Calculer les statistiques
    const statistics = calculateStatistics(anonymizedDrafts);

    // Construire le JSON final
    const exportData = {
      exportVersion: "1.0",
      exportDate: new Date().toISOString(),
      totalDrafts: anonymizedDrafts.length,
      drafts: anonymizedDrafts,
      statistics,
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="drafts-anonymes-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'export anonyme des drafts:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export des drafts" },
      { status: 500 }
    );
  }
}
