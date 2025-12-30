import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateBoxSchema = z.object({
  monsters: z.array(z.union([z.number(), z.string()])),
});

/**
 * GET - Récupérer le box de monstres de l'utilisateur
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const box = await prisma.monsterBox.findUnique({
      where: { userId: session.user.id },
    });

    if (!box) {
      return NextResponse.json({ monsters: [] });
    }

    return NextResponse.json({ monsters: box.monsters });
  } catch (error) {
    console.error("Erreur lors de la récupération du box:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du box" },
      { status: 500 }
    );
  }
}

/**
 * POST/PUT - Mettre à jour le box de monstres de l'utilisateur
 */
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
    const { monsters } = updateBoxSchema.parse(body);

    // Créer ou mettre à jour le box
    const box = await prisma.monsterBox.upsert({
      where: { userId: session.user.id },
      update: {
        monsters: monsters as any,
      },
      create: {
        userId: session.user.id,
        monsters: monsters as any,
      },
    });

    return NextResponse.json({
      message: "Box mis à jour avec succès",
      box: { monsters: box.monsters },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la mise à jour du box:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du box" },
      { status: 500 }
    );
  }
}

