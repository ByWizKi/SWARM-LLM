import { NextResponse } from "next/server";
import { prismaWrite } from "@/lib/prisma";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Route API pour appliquer la migration de la colonne geminiApiKey
 *
 * Cette route ajoute la colonne geminiApiKey à la table users si elle n'existe pas.
 *
 * Pour l'utiliser:
 * 1. Appelez POST /api/db/migrate-gemini?secret=YOUR_SECRET
 * 2. Le secret doit correspondre à INIT_DB_SECRET dans les variables d'environnement
 */
export async function POST(request: Request) {
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

    console.log("[DB_MIGRATE] Application de la migration geminiApiKey...");

    // Exécuter la migration SQL directement
    try {
      // Vérifier si la colonne existe déjà
      const checkColumn = await prismaWrite.$queryRaw`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'geminiApiKey'
      `;

      if (Array.isArray(checkColumn) && checkColumn.length > 0) {
        console.log("[DB_MIGRATE] La colonne geminiApiKey existe déjà");
        return NextResponse.json({
          message: "La colonne geminiApiKey existe déjà",
          status: "ok",
          timestamp: new Date().toISOString(),
        });
      }

      // Ajouter la colonne
      await prismaWrite.$executeRaw`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "geminiApiKey" TEXT
      `;

      console.log("[DB_MIGRATE] Migration réussie: colonne geminiApiKey ajoutée");

      return NextResponse.json({
        message: "Migration appliquée avec succès",
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[DB_MIGRATE] Erreur lors de la migration:", error);

      // Si la colonne existe déjà (erreur différente selon le SGBD)
      if (error?.message?.includes('already exists') ||
          error?.message?.includes('duplicate column') ||
          error?.code === '42701') {
        return NextResponse.json({
          message: "La colonne geminiApiKey existe déjà",
          status: "ok",
          timestamp: new Date().toISOString(),
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("[DB_MIGRATE] Erreur lors de la migration:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'application de la migration",
        details: error instanceof Error ? error.message : String(error),
        instructions: [
          "Vous pouvez également appliquer la migration manuellement via SQL:",
          "ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"geminiApiKey\" TEXT;",
          "",
          "Ou via Prisma CLI:",
          "DATABASE_URL='votre-url-production' npx prisma db push"
        ]
      },
      { status: 500 }
    );
  }
}
