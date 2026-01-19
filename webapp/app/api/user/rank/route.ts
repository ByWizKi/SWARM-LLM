import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma, prismaWrite } from "@/lib/prisma";
import { z } from "zod";
import { victoryPointsToRank } from "@/lib/rank-utils";

const updateRankSchema = z.object({
  victoryPoints: z.number().int().min(0, "Les Victory Points doivent être positifs").max(5000, "Les Victory Points doivent être raisonnables"),
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { victoryPoints: true },
    });

    const rank = victoryPointsToRank(user?.victoryPoints);

    return NextResponse.json({
      hasRank: user?.victoryPoints !== null && user?.victoryPoints !== undefined,
      victoryPoints: user?.victoryPoints || null,
      rank: rank,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification du rank:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification du rank" },
      { status: 500 }
    );
  }
}

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
    const { victoryPoints } = updateRankSchema.parse(body);

    // Calculer le rank à partir des Victory Points
    const rank = victoryPointsToRank(victoryPoints);

    // Mettre à jour les Victory Points
    await prismaWrite.user.update({
      where: { id: session.user.id },
      data: { victoryPoints },
    });

    return NextResponse.json({
      message: "Victory Points mis à jour avec succès",
      victoryPoints,
      rank: rank,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la mise à jour du rank:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du rank" },
      { status: 500 }
    );
  }
}
