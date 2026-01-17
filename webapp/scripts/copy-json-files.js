/**
 * Script pour copier les fichiers JSON nécessaires au RAG dans le build
 * Ce script est exécuté avant le build Next.js pour s'assurer que les fichiers sont disponibles
 */

const fs = require('fs');
const path = require('path');

const jsonFiles = [
  'monsters_rta.json',
  'average_monster_stats_id.json',
  'monsters_pairs_id.json',
  'monster_small_info.json',
];

const sourceDir = __dirname; // scripts/
const targetDir = path.join(__dirname, '..'); // webapp/

console.log('[COPY_JSON] Début de la copie des fichiers JSON...');
console.log('[COPY_JSON] Source:', sourceDir);
console.log('[COPY_JSON] Target:', targetDir);

let copiedCount = 0;
let skippedCount = 0;

jsonFiles.forEach(filename => {
  const sourcePath = path.join(targetDir, filename);
  const targetPath = path.join(targetDir, filename);

  // Les fichiers sont déjà dans le bon répertoire
  // Ce script vérifie juste leur présence
  try {
    if (fs.existsSync(sourcePath)) {
      const stats = fs.statSync(sourcePath);
      console.log(`[COPY_JSON] ✓ ${filename} existe (${(stats.size / 1024).toFixed(2)} KB)`);
      copiedCount++;
    } else {
      console.warn(`[COPY_JSON] ✗ ${filename} n'existe pas à: ${sourcePath}`);
      skippedCount++;
    }
  } catch (error) {
    console.error(`[COPY_JSON] Erreur lors de la vérification de ${filename}:`, error.message);
    skippedCount++;
  }
});

console.log(`[COPY_JSON] Résumé: ${copiedCount} fichiers trouvés, ${skippedCount} manquants`);

if (skippedCount > 0) {
  console.warn('[COPY_JSON] ATTENTION: Certains fichiers JSON sont manquants. Le RAG pourrait ne pas fonctionner correctement.');
  process.exit(0); // Ne pas faire échouer le build, juste avertir
} else {
  console.log('[COPY_JSON] Tous les fichiers JSON sont présents.');
  process.exit(0);
}
