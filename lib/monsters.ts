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
 */
export async function loadMonsters(): Promise<Monster[]> {
  if (monstersCache) {
    return monstersCache;
  }

  try {
    // En production, le fichier sera dans /app/data/monsters.json
    // En développement, il sera dans ./data/monsters.json
    const fs = await import('fs/promises');
    const path = await import('path');

    const monstersPath = path.join(process.cwd(), 'data', 'monsters.json');
    const fileContent = await fs.readFile(monstersPath, 'utf-8');
    const data: MonstersData = JSON.parse(fileContent);

    monstersCache = data.monstres || [];
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

