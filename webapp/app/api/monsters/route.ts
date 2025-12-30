import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * API Route pour récupérer la liste de tous les monstres disponibles
 * Charge depuis monsters_rta.json (monté dans Docker ou à la racine en local)
 */
export async function GET() {
  // Essayer plusieurs chemins possibles pour monsters_rta.json
  const possiblePaths = [
    join(process.cwd(), "monsters_rta.json"), // Dans Docker: /app/monsters_rta.json
    join(process.cwd(), "..", "monsters_rta.json"), // En local depuis webapp/: ../monsters_rta.json
  ];

  let fileContent: string | null = null;
  let filePath: string | null = null;

  // Essayer chaque chemin jusqu'à trouver le fichier
  for (const path of possiblePaths) {
    try {
      fileContent = await readFile(path, "utf-8");
      filePath = path;
      break;
    } catch (error) {
      // Continuer avec le chemin suivant
      continue;
    }
  }

  if (!fileContent) {
    return NextResponse.json(
      { error: "Impossible de trouver monsters_rta.json", monstres: [] },
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
    console.error("Erreur lors du parsing de monsters_rta.json:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement de monsters_rta.json", monstres: [] },
      { status: 500 }
    );
  }
}
