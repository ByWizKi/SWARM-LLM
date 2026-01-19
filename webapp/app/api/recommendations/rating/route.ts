import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prismaWrite } from "@/lib/prisma";
import { z } from "zod";

const ratingSchema = z.object({
  messageId: z.string().min(1, "L'ID du message est requis"),
  rating: z.number().min(1).max(5, "La note doit être entre 1 et 5"),
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
    const { messageId, rating, recommendationText, phase, turn } = ratingSchema.parse(body);

    // Créer ou mettre à jour la note
    const ratingRecord = await prismaWrite.recommendationRating.upsert({
      where: {
        userId_messageId: {
          userId: session.user.id,
          messageId: messageId,
        },
      },
      update: {
        rating,
        recommendationText,
        phase,
        turn,
      },
      create: {
        userId: session.user.id,
        messageId,
        rating,
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
        rating: true,
      },
    });

    return NextResponse.json({
      rating: rating?.rating || null,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la note" },
      { status: 500 }
    );
  }
}
