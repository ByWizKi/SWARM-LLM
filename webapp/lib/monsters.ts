/**
 * Utilitaires pour charger et gérer les données des monstres
 */

export interface Monster {
  id: number;
  nom: string;
  element: "Feu" | "Eau" | "Vent" | "Lumière" | "Ténèbres";
  etoiles: number;
  categorie: string;
  imageUrl?: string;
  slug?: string;
  archetype?: string;
  isAwakened?: boolean;
}

export interface MonstersData {
  monstres: Monster[];
}

let monstersCache: Monster[] | null = null;

/**
 * Charge les données des monstres depuis le fichier JSON
 * Utilise monsters_rta.json (monté dans Docker ou à la racine en local)
 */
export async function loadMonsters(): Promise<Monster[]> {
  if (monstersCache) {
    console.log('[PERF] Chargement des monstres: cache utilisé (0ms)');
    return monstersCache;
  }

  const loadStart = performance.now();
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const importTime = performance.now() - loadStart;
    console.log(`[PERF] Import des modules fs/path: ${importTime.toFixed(2)}ms`);

    // Essayer plusieurs chemins possibles pour monsters_rta.json
    const possiblePaths = [
      path.join(process.cwd(), 'monsters_rta.json'), // Dans Docker: /app/monsters_rta.json
      path.join(process.cwd(), '..', 'monsters_rta.json'), // En local depuis webapp/: ../monsters_rta.json
      path.join(process.cwd(), 'data', 'monsters.json'), // Ancien chemin (fallback)
    ];

    let fileContent: string | null = null;
    let filePath: string | null = null;

    // Essayer chaque chemin jusqu'à trouver le fichier
    const fileReadStart = performance.now();
    for (const monstersPath of possiblePaths) {
      try {
        fileContent = await fs.readFile(monstersPath, 'utf-8');
        filePath = monstersPath;
        const fileReadTime = performance.now() - fileReadStart;
        console.log(`[PERF] Lecture du fichier ${monstersPath}: ${fileReadTime.toFixed(2)}ms (${fileContent.length} caractères)`);
        break;
      } catch (error) {
        // Continuer avec le chemin suivant
        continue;
      }
    }

    if (!fileContent) {
      console.error('Impossible de trouver monsters_rta.json ou monsters.json');
      return [];
    }

    const parseStart = performance.now();
    const rawData = JSON.parse(fileContent);
    const parseTime = performance.now() - parseStart;
    console.log(`[PERF] Parsing JSON: ${parseTime.toFixed(2)}ms`);

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

    const mapStart = performance.now();
    const monstres = monstersArray.map((monster: any, index: number) => {
      const nom = monster.name || monster.nom || monster.slug || "Unknown";
      // Gérer les éléments en anglais (Fire, Water, etc.) et en français
      const elementRaw = monster.element || "Wind";
      const element = elementMap[elementRaw] || elementRaw;
      const etoiles = monster.natural_stars || monster.naturalStars || monster.etoiles || 5;
      const categorie = getCategorie(etoiles);

      return {
        id: monster.id || index + 1,
        nom,
        element: element as "Feu" | "Eau" | "Vent" | "Lumière" | "Ténèbres",
        etoiles,
        categorie,
        imageUrl: monster.image_filename || monster.imageUrl,
        slug: monster.slug,
        archetype: monster.archetype,
        isAwakened: monster.is_awakened || monster.isAwakened,
      };
    });
    const mapTime = performance.now() - mapStart;
    console.log(`[PERF] Mapping des monstres: ${mapTime.toFixed(2)}ms (${monstres.length} monstres)`);

    monstersCache = monstres;
    const totalLoadTime = performance.now() - loadStart;
    console.log(`[PERF] Temps total loadMonsters: ${totalLoadTime.toFixed(2)}ms`);
    return monstersCache;
  } catch (error) {
    console.error('Erreur lors du chargement des monstres:', error);
    return [];
  }
}

/**
 * Filtre les monstres selon des critères
 */
export function filterMonsters(
  monsters: Monster[],
  filters: {
    element?: string;
    categorie?: string;
    etoiles?: number;
    search?: string;
  }
): Monster[] {
  return monsters.filter(monster => {
    if (filters.element && monster.element !== filters.element) {
      return false;
    }
    if (filters.categorie && monster.categorie !== filters.categorie) {
      return false;
    }
    if (filters.etoiles && monster.etoiles !== filters.etoiles) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        monster.nom.toLowerCase().includes(searchLower) ||
        monster.element.toLowerCase().includes(searchLower) ||
        monster.categorie.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
}

/**
 * Trouve un monstre par son ID
 */
export function findMonsterById(monsters: Monster[], id: number): Monster | undefined {
  return monsters.find(m => m.id === id);
}

/**
 * Trouve des monstres par nom et élément
 */
export function findMonsterByNameAndElement(
  monsters: Monster[],
  nom: string,
  element: string
): Monster | undefined {
  return monsters.find(
    m => m.nom.toLowerCase() === nom.toLowerCase() && m.element === element
  );
}

/**
 * Obtient les statistiques des monstres
 */
export function getMonsterStats(monsters: Monster[]) {
  const stats = {
    total: monsters.length,
    parElement: {} as Record<string, number>,
    parCategorie: {} as Record<string, number>,
    parEtoiles: {} as Record<number, number>,
  };

  monsters.forEach(monster => {
    stats.parElement[monster.element] = (stats.parElement[monster.element] || 0) + 1;
    stats.parCategorie[monster.categorie] = (stats.parCategorie[monster.categorie] || 0) + 1;
    stats.parEtoiles[monster.etoiles] = (stats.parEtoiles[monster.etoiles] || 0) + 1;
  });

  return stats;
}

