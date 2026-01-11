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

// Cache simple en mémoire (pour le développement)
// En production, utiliser Redis ou un autre système de cache
const boxCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 secondes

// Fonction pour invalider le cache (utilisée localement)
function invalidateBoxCache(userId: string) {
  const cacheKey = `box-${userId}`;
  boxCache.delete(cacheKey);
}

/**
 * GET - Récupérer le box de monstres de l'utilisateur
 * Optimisé avec cache pour améliorer les performances
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

    const userId = session.user.id;
    const cacheKey = `box-${userId}`;
    const cached = boxCache.get(cacheKey);

    // Vérifier le cache
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(
        { monsters: cached.data },
        {
          headers: {
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
            "X-Cache": "HIT",
          },
        }
      );
    }

    // Récupérer depuis la base de données (lecture - peut utiliser Accelerate)
    const box = await prisma.monsterBox.findUnique({
      where: { userId },
      select: { monsters: true },
    });

    const monsters = box?.monsters || [];

    // Mettre en cache
    boxCache.set(cacheKey, {
      data: monsters,
      timestamp: Date.now(),
    });

    // Nettoyer le cache ancien (garder seulement les 100 dernières entrées)
    if (boxCache.size > 100) {
      const oldestKey = Array.from(boxCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) boxCache.delete(oldestKey);
    }

    return NextResponse.json(
      { monsters },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          "X-Cache": "MISS",
        },
      }
    );
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

    // Invalider le cache
    const cacheKey = `box-${userId}`;
    boxCache.delete(cacheKey);

    return NextResponse.json({
      message: "Box mis à jour avec succès",
      box: { monsters: box.monsters },
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

