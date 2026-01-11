import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Route API pour vérifier l'état de la base de données
 * 
 * Cette route vérifie si les tables existent dans la base de données.
 * 
 * Pour l'utiliser:
 * 1. Appelez GET /api/db/init?secret=YOUR_SECRET
 * 2. Le secret doit correspondre à INIT_DB_SECRET dans les variables d'environnement
 * 
 * NOTE: Cette route ne peut pas créer les tables dans Vercel (environnement serverless).
 * Vous devez utiliser `prisma db push` localement avec votre DATABASE_URL de production.
 */
export async function GET(request: Request) {
  try {
    // Vérifier le secret pour la sécurité
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const expectedSecret = process.env.INIT_DB_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { 
          error: "INIT_DB_SECRET n'est pas configuré",
          instructions: "Ajoutez INIT_DB_SECRET dans vos variables d'environnement Vercel"
        },
        { status: 500 }
      );
    }

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { error: "Secret invalide" },
        { status: 401 }
      );
    }

    console.log("[DB_INIT] Vérification de l'état de la base de données...");

    // Vérifier que les tables existent en essayant une requête simple
    try {
      const userCount = await prisma.user.count();
      console.log(`[DB_INIT] Vérification réussie: ${userCount} utilisateur(s) dans la base`);
      
      return NextResponse.json({
        message: "Base de données initialisée correctement",
        status: "ok",
        userCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      // Si l'erreur indique que la table n'existe pas
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        console.error("[DB_INIT] Les tables n'existent pas dans la base de données");
        return NextResponse.json(
          { 
            error: "Les tables n'existent pas dans la base de données",
            instructions: [
              "1. Utilisez Prisma CLI localement pour initialiser la base:",
              "   cd webapp",
              "   DATABASE_URL='votre-url-production' npx prisma db push",
              "",
              "2. OU utilisez Prisma Migrate:",
              "   DATABASE_URL='votre-url-production' npx prisma migrate deploy",
              "",
              "3. IMPORTANT: Utilisez DATABASE_URL (pas PRISMA_DATABASE_URL) pour les écritures",
              "",
              "4. Après l'initialisation, vous pourrez créer des utilisateurs via /auth/signup"
            ],
            details: error instanceof Error ? error.message : String(error)
          },
          { status: 500 }
        );
      }
      
      // Autre erreur
      throw error;
    }
  } catch (error) {
    console.error("[DB_INIT] Erreur lors de la vérification:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la vérification de la base de données",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
