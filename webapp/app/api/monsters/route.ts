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
    console.log("[MONSTERS] Début de la requête GET, cwd:", cwd);

    // Lister les fichiers dans le répertoire courant pour déboguer
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(cwd);
      console.log("[MONSTERS] Fichiers dans cwd (premiers 20):", files.slice(0, 20));
      console.log("[MONSTERS] Nombre total de fichiers:", files.length);
      const hasMonstersFile = files.includes("monsters_rta.json");
      console.log("[MONSTERS] monsters_rta.json présent:", hasMonstersFile);
    } catch (e: any) {
      console.log("[MONSTERS] Impossible de lister les fichiers:", e?.message || e);
    }

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
      console.error("[MONSTERS] process.cwd():", process.cwd());
      console.error("[MONSTERS] Chemins testés:", possiblePaths);

      // Retourner un tableau vide plutôt qu'une erreur 500
      // pour que l'application continue de fonctionner
      return NextResponse.json(
        {
          error: "Impossible de trouver monsters_rta.json",
          monstres: [],
          debug: process.env.NODE_ENV === "development" ? {
            cwd: process.cwd(),
            pathsTried: possiblePaths,
            errors: errors,
          } : undefined
        },
        { status: 200 } // Retourner 200 avec un tableau vide plutôt que 500
      );
    }

    let rawData: any;
    try {
      rawData = JSON.parse(fileContent);
    } catch (parseError: any) {
      console.error("[MONSTERS] Erreur lors du parsing JSON:", parseError?.message || parseError);
      return NextResponse.json(
        {
          error: "Erreur lors du parsing de monsters_rta.json",
          monstres: [],
          details: process.env.NODE_ENV === "development" ? (parseError?.message || String(parseError)) : undefined
        },
        { status: 200 }
      );
    }

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

    let monstres: any[] = [];
    try {
      monstres = monstersArray.map((monster: any, index: number) => {
        try {
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
        } catch (monsterError: any) {
          console.error(`[MONSTERS] Erreur lors du mapping du monstre ${index}:`, monsterError?.message || monsterError);
          // Retourner un monstre par défaut pour éviter de casser le tableau
          return {
            id: index + 1,
            nom: "Unknown",
            element: "Vent",
            etoiles: 5,
            categorie: "Nat5",
          };
        }
      });
    } catch (mapError: any) {
      console.error("[MONSTERS] Erreur lors du mapping des monstres:", mapError?.message || mapError);
      monstres = [];
    }

    console.log(`[MONSTERS] Retour de ${monstres.length} monstres`);
    return NextResponse.json({
      monstres,
    });
  } catch (error: any) {
    console.error("[MONSTERS] Erreur globale lors du traitement:", error);
    console.error("[MONSTERS] Stack:", error?.stack);
    console.error("[MONSTERS] Message:", error?.message);

    // En cas d'erreur, retourner un tableau vide plutôt qu'une erreur 500
    // pour que l'application continue de fonctionner
    return NextResponse.json(
      {
        error: "Erreur lors du traitement de monsters_rta.json",
        monstres: [],
        details: process.env.NODE_ENV === "development" ? (error?.message || String(error)) : undefined
      },
      { status: 200 } // Retourner 200 avec un tableau vide plutôt que 500
    );
  }
}
