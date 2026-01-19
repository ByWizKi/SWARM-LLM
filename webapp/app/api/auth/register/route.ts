import { NextRequest, NextResponse } from "next/server";
import { prisma, prismaWrite } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(3, "Le pseudo doit contenir au moins 3 caractères").max(20, "Le pseudo doit contenir au maximum 20 caractères"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  geminiApiKey: z.string().min(20, "La clé API Gemini est requise et doit être valide"),
  victoryPoints: z.number().int().min(0, "Les Victory Points doivent être positifs").max(5000, "Les Victory Points doivent être raisonnables").optional(),
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[REGISTER] Tentative d'inscription pour:", body.name);

    const { name, password, geminiApiKey, victoryPoints } = registerSchema.parse(body);

    // Vérifier si le pseudo existe déjà (lecture - peut utiliser Accelerate)
    console.log("[REGISTER] Vérification de l'existence du pseudo...");
    const existingUser = await prisma.user.findUnique({
      where: { name },
      select: { id: true, name: true }, // Ne charger que les champs nécessaires pour éviter l'erreur si geminiApiKey n'existe pas encore
    });

    if (existingUser) {
      console.log("[REGISTER] Pseudo déjà utilisé:", name);
      return NextResponse.json(
        { error: "Ce pseudo est déjà utilisé" },
        { status: 400 }
      );
    }

    // Hasher le mot de passe
    console.log("[REGISTER] Hashage du mot de passe...");
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur (écriture - utiliser prismaWrite)
    console.log("[REGISTER] Création de l'utilisateur dans la base de données...");
    const user = await prismaWrite.user.create({
      data: {
        name,
        password: hashedPassword,
        geminiApiKey: geminiApiKey.trim(),
        victoryPoints: victoryPoints || null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    console.log("[REGISTER] Utilisateur créé avec succès:", user.id);
    return NextResponse.json(
      { message: "Compte créé avec succès", user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[REGISTER] Erreur de validation:", error.errors);
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    // Log détaillé de l'erreur
    console.error("[REGISTER] Erreur lors de l'inscription:", error);
    if (error instanceof Error) {
      console.error("[REGISTER] Message d'erreur:", error.message);
      console.error("[REGISTER] Stack:", error.stack);

      // Vérifier si c'est une erreur Prisma
      if (error.message.includes("P2002")) {
        return NextResponse.json(
          { error: "Ce pseudo est déjà utilisé" },
          { status: 400 }
        );
      }

      if (error.message.includes("connection") || error.message.includes("database")) {
        return NextResponse.json(
          { error: "Erreur de connexion à la base de données. Veuillez réessayer plus tard." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Une erreur est survenue lors de l'inscription",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

