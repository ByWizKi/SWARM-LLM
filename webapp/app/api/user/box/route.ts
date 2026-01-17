import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma, prismaWrite } from "@/lib/prisma";
import { z } from "zod";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateBoxSchema = z.object({
  monsters: z.array(z.union([z.number(), z.string()])),
});

/**
 * GET - Récupérer le box de monstres de l'utilisateur
 *
 * IMPORTANT: Pas de cache côté serveur pour garantir la cohérence
 * sur Vercel (instances serverless stateless)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Récupérer depuis la base de données (lecture - peut utiliser Accelerate)
    const box = await prisma.monsterBox.findUnique({
      where: { userId },
      select: { monsters: true },
    });

    const monsters = box?.monsters || [];

    // Vérifier si le client demande un rechargement forcé
    const cacheHeader = request.headers.get("cache-control");
    const forceNoCache = cacheHeader?.includes("no-cache") || cacheHeader?.includes("no-store");

    return NextResponse.json(
      { monsters },
      {
        headers: {
          // Désactiver le cache pour garantir des données à jour
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          // Permettre au client de forcer le rechargement
          "X-Timestamp": Date.now().toString(),
        },
      }
    );
  } catch (error) {
    console.error("[BOX] Erreur lors de la récupération du box:", error);
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
    console.log("[BOX] Début de la mise à jour du box");
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("[BOX] Erreur: Pas de session");
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    if (!session.user?.id) {
      console.log("[BOX] Erreur: Pas d'ID utilisateur dans la session");
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("[BOX] Body reçu:", { monstersCount: body.monsters?.length || 0 });

    const { monsters } = updateBoxSchema.parse(body);
    const userId = session.user.id;

    console.log("[BOX] Mise à jour du box pour userId:", userId, "avec", monsters.length, "monstres");

    // Créer ou mettre à jour le box
    // IMPORTANT: Utiliser prismaWrite (DATABASE_URL direct) pour les écritures
    // Prisma Accelerate ne supporte pas les écritures
    const box = await prismaWrite.monsterBox.upsert({
      where: { userId },
      update: {
        monsters: monsters as any,
      },
      create: {
        userId,
        monsters: monsters as any,
      },
    });

    console.log("[BOX] Box mis à jour avec succès:", { boxId: box.id, monstersCount: Array.isArray(box.monsters) ? box.monsters.length : 0 });

    // Retourner les données à jour avec headers pour forcer le rechargement côté client
    return NextResponse.json({
      message: "Box mis à jour avec succès",
      box: { monsters: box.monsters },
    }, {
      headers: {
        // Forcer le client à ignorer le cache pour la prochaine requête GET
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        // Timestamp pour forcer le rechargement
        "X-Timestamp": Date.now().toString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[BOX] Erreur de validation:", error.errors);
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    // Log détaillé de l'erreur
    console.error("[BOX] Erreur lors de la mise à jour du box:", error);
    if (error instanceof Error) {
      console.error("[BOX] Message d'erreur:", error.message);
      console.error("[BOX] Stack:", error.stack);

      // Vérifier si c'est une erreur Prisma
      if (error.message.includes("P2002")) {
        return NextResponse.json(
          { error: "Erreur de contrainte unique" },
          { status: 400 }
        );
      }

      if (error.message.includes("does not exist") || error.message.includes("P2021")) {
        return NextResponse.json(
          {
            error: "La table monster_boxes n'existe pas dans la base de données",
            details: "Exécutez 'prisma db push' pour créer les tables"
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la mise à jour du box",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

