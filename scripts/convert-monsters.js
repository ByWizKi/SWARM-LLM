/**
 * Script pour convertir monsters_rta.json au format attendu par l'application
 * Usage: node scripts/convert-monsters.js
 */

const fs = require("fs");
const path = require("path");

const inputFile = path.join(__dirname, "../monsters_rta.json");
const outputFile = path.join(__dirname, "../data/monsters.json");

// Mapping des éléments anglais vers français
const elementMap = {
  Fire: "Feu",
  Water: "Eau",
  Wind: "Vent",
  Light: "Lumière",
  Dark: "Ténèbres",
};

// Fonction pour déterminer la catégorie
function getCategorie(naturalStars) {
  if (naturalStars === 3) return "Nat3";
  if (naturalStars === 4) return "Nat4";
  if (naturalStars === 5) return "Nat5";
  return `Nat${naturalStars}`;
}

// Fonction pour générer l'URL de l'image (placeholder ou construite depuis le filename)
function getImageUrl(imageFilename) {
  if (!imageFilename) return null;
  // Vous pouvez ajuster cette URL selon où sont stockées les images
  // Pour l'instant, on utilise un placeholder générique
  return `https://swarfarm.com/static/herders/images/monsters/${imageFilename}`;
}

try {
  console.log("Lecture du fichier monsters_rta.json...");
  const rawData = fs.readFileSync(inputFile, "utf-8");
  const monsters = JSON.parse(rawData);

  console.log(`Conversion de ${monsters.length} monstres...`);

  const convertedMonsters = monsters.map((monster) => {
    // Convertir le nom (si besoin, vous pouvez ajouter un mapping de noms)
    // Pour l'instant, on garde le nom tel quel
    const nom = monster.name || monster.slug || "Unknown";

    // Convertir l'élément
    const element = elementMap[monster.element] || monster.element;

    // Récupérer les étoiles
    const etoiles = monster.natural_stars || monster.naturalStars || 5;

    // Déterminer la catégorie
    const categorie = getCategorie(etoiles);

    // URL de l'image
    const imageUrl = getImageUrl(monster.image_filename);

    return {
      id: monster.id, // On garde l'ID original pour référence
      nom,
      element,
      etoiles,
      categorie,
      imageUrl,
      // Données supplémentaires optionnelles
      slug: monster.slug,
      archetype: monster.archetype,
      isAwakened: monster.is_awakened,
    };
  });

  const output = {
    monstres: convertedMonsters,
  };

  // Créer le dossier data s'il n'existe pas
  const dataDir = path.dirname(outputFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Écrire le fichier converti
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), "utf-8");

  console.log(
    `Conversion terminée ! ${convertedMonsters.length} monstres convertis.`
  );
  console.log(`Fichier créé: ${outputFile}`);
  console.log(`\nPour utiliser les monstres dans l'application, exécutez:`);
  console.log(`npm run convert:monsters`);

  // Statistiques
  const stats = {
    total: convertedMonsters.length,
    parElement: {},
    parCategorie: {},
  };

  convertedMonsters.forEach((monster) => {
    stats.parElement[monster.element] =
      (stats.parElement[monster.element] || 0) + 1;
    stats.parCategorie[monster.categorie] =
      (stats.parCategorie[monster.categorie] || 0) + 1;
  });

  console.log("\nStatistiques:");
  console.log("Par élément:", stats.parElement);
  console.log("Par catégorie:", stats.parCategorie);
} catch (error) {
  console.error("Erreur lors de la conversion:", error.message);
  process.exit(1);
}
