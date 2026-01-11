import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API Route pour récupérer la liste de tous les monstres disponibles
 * Charge depuis monsters_rta.json (monté dans Docker ou à la racine en local)
 */
export async function GET() {
  try {
    // Essayer plusieurs chemins possibles pour monsters_rta.json
    // Sur Vercel, process.cwd() pointe vers /var/task/webapp
    const cwd = process.cwd();
    const possiblePaths = [
      join(cwd, "monsters_rta.json"), // Vercel: /var/task/webapp/monsters_rta.json
      join(cwd, "..", "monsters_rta.json"), // En local depuis webapp/: ../monsters_rta.json
      "/app/monsters_rta.json", // Chemin absolu Docker
    ];

    let fileContent: string | null = null;
    let filePath: string | null = null;
    const errors: string[] = [];

    console.log("[MONSTERS] process.cwd():", process.cwd());
    console.log("[MONSTERS] Tentative de chargement depuis les chemins suivants:", possiblePaths);

    // Essayer chaque chemin jusqu'à trouver le fichier
    for (const path of possiblePaths) {
      try {
        fileContent = await readFile(path, "utf-8");
        filePath = path;
        console.log(`[MONSTERS] Fichier trouvé à: ${path} (${fileContent.length} caractères)`);
        break;
      } catch (error: any) {
        errors.push(`${path}: ${error.message}`);
        // Continuer avec le chemin suivant
        continue;
      }
    }

    if (!fileContent) {
      console.error("[MONSTERS] Impossible de trouver monsters_rta.json");
      console.error("[MONSTERS] Erreurs:", errors);
      return NextResponse.json(
        { 
          error: "Impossible de trouver monsters_rta.json", 
          monstres: [],
          debug: {
            cwd: process.cwd(),
            pathsTried: possiblePaths,
            errors: errors,
          }
        },
        { status: 500 }
      );
    }

  try {
    const rawData = JSON.parse(fileContent);

    // Le fichier monsters_rta.json est un tableau direct de monstres
    const monstersArray = Array.isArray(rawData) ? rawData : (rawData.monstres || []);

    // Mapper les monstres au format attendu par l'application
    const elementMap: Record<string, string> = {
      Fire: "Feu",
      Water: "Eau",
      Wind: "Vent",
      Light: "Lumière",
      Dark: "Ténèbres",
      fire: "Feu",
      water: "Eau",
      wind: "Vent",
      light: "Lumière",
      dark: "Ténèbres",
    };

    const getCategorie = (etoiles: number): string => {
      if (etoiles === 3) return "Nat3";
      if (etoiles === 4) return "Nat4";
      if (etoiles === 5) return "Nat5";
      return "Nat" + etoiles;
    };

    const getImageUrl = (imageFilename?: string): string | undefined => {
      if (!imageFilename) return undefined;
      // Si c'est déjà une URL complète, la retourner telle quelle
      if (imageFilename.startsWith("http")) return imageFilename;
      // Utiliser les images locales depuis /images/
      return `/images/${imageFilename}`;
    };

    const monstres = monstersArray.map((monster: any, index: number) => {
      const nom = monster.name || monster.nom || monster.slug || "Unknown";
      // Gérer les éléments en anglais (Fire, Water, etc.) et en français
      const elementRaw = monster.element || "Wind";
      const element = elementMap[elementRaw] || elementRaw;
      const etoiles = monster.natural_stars || monster.naturalStars || monster.etoiles || 5;
      const categorie = getCategorie(etoiles);

      return {
        id: monster.id || index + 1, // Utiliser l'ID existant ou générer un ID basé sur l'index
        nom,
        element,
        etoiles,
        categorie,
        imageUrl: getImageUrl(monster.image_filename || monster.imageUrl),
        slug: monster.slug,
        archetype: monster.archetype,
        isAwakened: monster.is_awakened || monster.isAwakened,
      };
    });

    return NextResponse.json({
      monstres,
    });
  } catch (error) {
    console.error("[MONSTERS] Erreur lors du parsing de monsters_rta.json:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors du traitement de monsters_rta.json", 
        monstres: [],
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
