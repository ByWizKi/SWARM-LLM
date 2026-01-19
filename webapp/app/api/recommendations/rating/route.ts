import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prismaWrite } from "@/lib/prisma";
import { z } from "zod";

const ratingSchema = z.object({
  messageId: z.string().min(1, "L'ID du message est requis"),
  textRating: z.number().int().min(0).max(5, "La note du texte doit être entre 0 et 5").optional().nullable(),
  monsterRecommendationRating: z.number().int().min(0).max(5, "La note des monstres doit être entre 0 et 5").optional().nullable(),
  recommendationText: z.string().optional(),
  phase: z.string().optional(),
  turn: z.number().optional(),
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
    const { messageId, textRating, monsterRecommendationRating, recommendationText, phase, turn } = ratingSchema.parse(body);

    // Créer ou mettre à jour la note
    const ratingRecord = await prismaWrite.recommendationRating.upsert({
      where: {
        userId_messageId: {
          userId: session.user.id,
          messageId: messageId,
        },
      },
      update: {
        textRating: textRating ?? null,
        monsterRecommendationRating: monsterRecommendationRating ?? null,
        recommendationText,
        phase,
        turn,
      },
      create: {
        userId: session.user.id,
        messageId,
        textRating: textRating ?? null,
        monsterRecommendationRating: monsterRecommendationRating ?? null,
        recommendationText,
        phase,
        turn,
      },
    });

    return NextResponse.json({
      message: "Note enregistrée avec succès",
      rating: ratingRecord,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Erreur lors de l'enregistrement de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la note" },
      { status: 500 }
    );
  }
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

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "L'ID du message est requis" },
        { status: 400 }
      );
    }

    const rating = await prismaWrite.recommendationRating.findUnique({
      where: {
        userId_messageId: {
          userId: session.user.id,
          messageId: messageId,
        },
      },
      select: {
        textRating: true,
        monsterRecommendationRating: true,
      },
    });

    return NextResponse.json({
      textRating: rating?.textRating ?? null,
      monsterRecommendationRating: rating?.monsterRecommendationRating ?? null,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la note" },
      { status: 500 }
    );
  }
}
