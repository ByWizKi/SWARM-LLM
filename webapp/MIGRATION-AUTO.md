# Migrations automatiques sur Vercel

## Vue d'ensemble

Les migrations de base de données sont maintenant appliquées **automatiquement** pendant chaque build Vercel grâce au script `db:auto-migrate`.

## Comment ça fonctionne

### 1. Script de migration automatique

Le script `scripts/auto-migrate-safe.js` s'exécute automatiquement avant chaque build via la commande `npm run build`.

### 2. Flux d'exécution

```
npm run build
  ↓
npm run db:auto-migrate  (nouveau)
  ↓
prisma generate
  ↓
next build
```

### 3. Comportement

- ✅ **Idempotent** : Peut être exécuté plusieurs fois sans problème
- ✅ **Sécurisé** : N'applique que les migrations spécifiques nécessaires
- ✅ **Non-bloquant** : N'échoue pas le build si la migration échoue (log seulement)
- ✅ **Automatique** : Aucune intervention manuelle nécessaire

## Migrations appliquées automatiquement

### Migration actuelle : `geminiApiKey`

Le script vérifie et ajoute la colonne `geminiApiKey` à la table `users` si elle n'existe pas :

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "geminiApiKey" TEXT
```

### Ajouter de nouvelles migrations

Pour ajouter une nouvelle migration automatique, modifiez `scripts/auto-migrate-safe.js` :

```javascript
// Ajouter après la migration geminiApiKey
await prisma.$executeRaw`
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nouvelle_colonne" TEXT
`;
```

## Options de migration

### Option 1 : Migration sécurisée (par défaut)

**Script** : `scripts/auto-migrate-safe.js`

**Avantages** :
- ✅ Applique uniquement les migrations spécifiques
- ✅ Plus de contrôle
- ✅ Moins de risques

**Utilisation** : Déjà activée par défaut dans `package.json`

### Option 2 : Synchronisation complète du schéma

**Script** : `scripts/auto-migrate.js`

**Avantages** :
- ✅ Synchronise tout le schéma Prisma automatiquement
- ✅ Plus simple (pas besoin d'ajouter chaque migration)

**Inconvénients** :
- ⚠️ Peut modifier plus que nécessaire
- ⚠️ Moins de contrôle

**Pour l'activer** : Changez dans `package.json` :
```json
"db:auto-migrate": "node scripts/auto-migrate.js"
```

## Configuration requise

### Variable d'environnement

Assurez-vous que `DATABASE_URL` est configurée dans Vercel :

- **Settings** > **Environment Variables**
- Variable : `DATABASE_URL`
- Valeur : Votre URL PostgreSQL de production

### Important

- ⚠️ Utilisez `DATABASE_URL` (pas `PRISMA_DATABASE_URL`) car Prisma Accelerate ne supporte pas les migrations
- ⚠️ Si `DATABASE_URL` n'est pas disponible, le script ignore les migrations (build continue)

## Comportement en cas d'erreur

Le script est conçu pour **ne pas bloquer le build** :

- ✅ Si `DATABASE_URL` n'est pas disponible → Log + Build continue
- ✅ Si la migration échoue → Log + Build continue
- ✅ Si la colonne existe déjà → Log "déjà appliquée" + Build continue

**Pourquoi ?** Pour permettre au déploiement de continuer même si la base de données n'est pas accessible pendant le build.

## Désactiver les migrations automatiques

Si vous souhaitez désactiver les migrations automatiques :

1. Modifiez `package.json` :
   ```json
   "build": "prisma generate && next build"
   ```

2. Ou créez un script vide :
   ```json
   "db:auto-migrate": "echo 'Migrations automatiques désactivées'"
   ```

## Vérification

### Vérifier que les migrations s'appliquent

1. Regardez les logs de build Vercel
2. Cherchez les messages `[AUTO_MIGRATE]`
3. Vérifiez que la migration est appliquée

### Exemple de log attendu

```
[AUTO_MIGRATE] Démarrage de la migration automatique...
[AUTO_MIGRATE] Vérification et application des migrations...
[AUTO_MIGRATE] Vérification de la colonne geminiApiKey...
[AUTO_MIGRATE] Colonne geminiApiKey existe déjà
[AUTO_MIGRATE] Toutes les migrations appliquées avec succès
```

### Tester localement

```bash
cd webapp
DATABASE_URL="votre-url-production" npm run db:auto-migrate
```

## Comparaison avec l'ancienne méthode

### Avant (manuelle)
```bash
# Après chaque déploiement
curl -X POST "https://app.vercel.app/api/db/migrate-gemini?secret=..."
```

### Maintenant (automatique)
```bash
# Rien à faire ! Les migrations s'appliquent automatiquement pendant le build
```

## Avantages

1. ✅ **Zéro intervention manuelle** : Les migrations s'appliquent automatiquement
2. ✅ **Synchronisation** : Le code et le schéma sont toujours synchronisés
3. ✅ **Idempotent** : Peut être exécuté plusieurs fois sans problème
4. ✅ **Sécurisé** : N'échoue pas le build si la migration échoue

## Notes importantes

- ⚠️ Les migrations s'appliquent **avant** le build Next.js
- ⚠️ Si `DATABASE_URL` n'est pas disponible, les migrations sont ignorées (build continue)
- ⚠️ Pour les migrations destructives ou complexes, utilisez toujours l'API manuelle pour plus de contrôle

## Support

En cas de problème :

1. Vérifiez les logs de build Vercel
2. Vérifiez que `DATABASE_URL` est configurée
3. Testez localement avec `npm run db:auto-migrate`
4. Si nécessaire, utilisez l'API manuelle : `/api/db/migrate-gemini`
