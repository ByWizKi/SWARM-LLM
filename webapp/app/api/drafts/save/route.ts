import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prismaWrite } from "@/lib/prisma";
import { z } from "zod";

const saveDraftSchema = z.object({
  firstPlayer: z.enum(["A", "B"]),
  playerAPicks: z.array(z.number()),
  playerBPicks: z.array(z.number()),
  playerABans: z.array(z.number()),
  playerBBans: z.array(z.number()),
  recommendations: z.array(z.object({
    messageId: z.string(),
    text: z.string(),
    proposedMonsterIds: z.array(z.number()).optional(),
    phase: z.string(),
    turn: z.number().optional(),
    textRating: z.number().int().min(0).max(5).nullable().optional(),
    monsterRecommendationRating: z.number().int().min(0).max(5).nullable().optional(),
    timestamp: z.string(),
  })),
  banRecommendations: z.array(z.object({
    messageId: z.string(),
    text: z.string(),
    proposedMonsterIds: z.array(z.number()).optional(),
    phase: z.string(),
    timestamp: z.string(),
  })).optional(),
  winner: z.enum(["A", "B"]).optional(),
  metadata: z.record(z.any()).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const draftData = saveDraftSchema.parse(body);

    // Créer la session de draft
    const draftSession = await prismaWrite.draftSession.create({
      data: {
        userId: session.user.id,
        firstPlayer: draftData.firstPlayer,
        winner: draftData.winner || null,
        playerAPicks: draftData.playerAPicks,
        playerBPicks: draftData.playerBPicks,
        playerABans: draftData.playerABans,
        playerBBans: draftData.playerBBans,
        recommendations: draftData.recommendations,
        banRecommendations: draftData.banRecommendations || [],
        metadata: draftData.metadata || {},
      },
    });

    return NextResponse.json({
      message: "Draft enregistrée avec succès",
      draftId: draftSession.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Erreur lors de l'enregistrement de la draft:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la draft" },
      { status: 500 }
    );
  }
}
