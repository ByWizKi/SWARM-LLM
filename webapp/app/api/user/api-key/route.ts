import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma, prismaWrite } from "@/lib/prisma";
import { z } from "zod";

const updateApiKeySchema = z.object({
  geminiApiKey: z.string().min(20, "La clé API Gemini est requise et doit être valide"),
});

// Force dynamic rendering
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
      select: { geminiApiKey: true },
    });

    return NextResponse.json({
      hasApiKey: !!user?.geminiApiKey,
    });
  } catch (error) {
    console.error("Erreur lors de la vérification de la clé API:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification de la clé API" },
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
    const { geminiApiKey } = updateApiKeySchema.parse(body);

    // Mettre à jour la clé API
    await prismaWrite.user.update({
      where: { id: session.user.id },
      data: { geminiApiKey: geminiApiKey.trim() },
    });

    return NextResponse.json({
      message: "Clé API mise à jour avec succès",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la mise à jour de la clé API:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la clé API" },
      { status: 500 }
    );
  }
}
