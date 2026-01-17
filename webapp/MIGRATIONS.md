# Guide des Migrations Prisma

## Pourquoi les migrations ne s'exécutent pas automatiquement sur Vercel ?

Les scripts Prisma (`db:push`, `db:migrate`) dans `package.json` fonctionnent, **mais ils ne s'exécutent pas automatiquement pendant le build sur Vercel** pour plusieurs raisons importantes :

### 🚫 Limitations de Vercel

1. **Sécurité** : Vercel ne permet pas d'exécuter des migrations destructives pendant le build
2. **Prisma Accelerate** : Si vous utilisez `PRISMA_DATABASE_URL`, il faut utiliser `DATABASE_URL` pour les migrations
3. **Contexte de build** : Le build n'a pas toujours accès aux variables d'environnement de production de manière sécurisée
4. **Timeouts** : Les builds ont une limite de temps et les migrations peuvent être longues
5. **Environnement serverless** : Les fonctions serverless sont stateless, pas d'exécution au démarrage

### ✅ Solutions disponibles

Vous avez **3 options** pour appliquer les migrations :

## Option 1 : Via l'API (⭐ Recommandé pour Vercel)

Une fois votre application déployée, appelez l'endpoint de migration :

```bash
curl -X POST "https://votre-app.vercel.app/api/db/migrate-gemini?secret=VOTRE_INIT_DB_SECRET"
```

**Avantages** :
- ✅ Pas besoin d'installer quoi que ce soit localement
- ✅ Sécurisé avec un secret
- ✅ Idempotent (peut être appelé plusieurs fois sans problème)

**Configuration** :
1. Ajoutez `INIT_DB_SECRET` dans les variables d'environnement Vercel
2. Générez un secret avec : `openssl rand -base64 32`
3. Appelez l'endpoint après chaque déploiement

## Option 2 : Via npm script (Localement)

Utilisez le script npm avec votre `DATABASE_URL` de production :

```bash
# Dans le dossier webapp
DATABASE_URL="votre-url-production" npm run db:migrate:check
```

**Avantages** :
- ✅ Utilise les scripts du `package.json`
- ✅ Rapide et simple
- ✅ Vérifie automatiquement si la migration est déjà appliquée

**Prérequis** :
- Avoir `DATABASE_URL` configurée (pas `PRISMA_DATABASE_URL`)

## Option 3 : Via Prisma CLI directement (Localement)

```bash
# Dans le dossier webapp
DATABASE_URL="votre-url-production" npm run db:push
```

**Avantages** :
- ✅ Synchronise tout le schéma (pas seulement une colonne)
- ✅ Gère toutes les migrations manquantes

**Inconvénients** :
- ⚠️ Plus lent (synchronise tout le schéma)
- ⚠️ Peut modifier d'autres parties du schéma

## Commandes disponibles dans package.json

| Commande | Description | Usage |
|----------|-------------|-------|
| `npm run db:push` | Synchronise le schéma Prisma avec la DB | `DATABASE_URL="..." npm run db:push` |
| `npm run db:migrate` | Crée et applique une nouvelle migration | Développement local uniquement |
| `npm run db:migrate:check` | Vérifie et applique la migration geminiApiKey | `DATABASE_URL="..." npm run db:migrate:check` |
| `npm run db:generate` | Régénère le client Prisma | Automatique dans `npm run build` |
| `npm run db:studio` | Ouvre Prisma Studio | `DATABASE_URL="..." npm run db:studio` |

## Workflow recommandé

### Pour les nouvelles migrations (développement)

1. Modifiez `prisma/schema.prisma`
2. Créez une migration : `npm run db:migrate`
3. Testez localement
4. Commitez la migration

### Pour appliquer en production (Vercel)

**Après chaque déploiement avec des changements de schéma** :

```bash
# Option recommandée : Via l'API
curl -X POST "https://votre-app.vercel.app/api/db/migrate-gemini?secret=VOTRE_SECRET"

# OU via npm script (localement)
DATABASE_URL="votre-url-production" npm run db:migrate:check

# OU via Prisma CLI (pour tout synchroniser)
DATABASE_URL="votre-url-production" npm run db:push
```

## Migration actuelle : `geminiApiKey`

Cette migration ajoute la colonne `geminiApiKey` (nullable) à la table `users`.

**Pourquoi cette migration ?**
- Permet aux utilisateurs de stocker leur clé API Gemini personnelle
- Permet de gérer les clés API au niveau utilisateur plutôt que globalement
- Meilleure sécurité et flexibilité

**Fichiers concernés** :
- `prisma/migrations/add_gemini_api_key.sql` - Migration SQL
- `scripts/ensure-migration.js` - Script de vérification/applications
- `app/api/db/migrate-gemini/route.ts` - Route API pour appliquer la migration

## FAQ

### ❓ Pourquoi ne pas automatiser dans le script `build` ?

C'est **techniquement possible** mais **fortement déconseillé** pour :
- Raisons de sécurité (migrations destructives)
- Performance (build plus lent)
- Fiabilité (timeouts possibles)
- Séparation des responsabilités (build ≠ migration)

### ❓ Peut-on utiliser `prisma migrate deploy` ?

Oui, mais cela nécessite d'avoir des migrations Prisma officielles dans `prisma/migrations/`. Actuellement, nous utilisons une migration SQL manuelle pour plus de contrôle.

Pour utiliser `prisma migrate deploy` :
```bash
DATABASE_URL="votre-url" npm run db:migrate  # Crée la migration
DATABASE_URL="votre-url" npx prisma migrate deploy  # Applique en production
```

### ❓ La migration peut-elle être appelée plusieurs fois ?

Oui ! Toutes les méthodes sont **idempotentes** :
- L'API vérifie si la colonne existe avant de l'ajouter
- Le script utilise `IF NOT EXISTS` dans le SQL
- Vous pouvez appeler l'endpoint autant de fois que nécessaire

## Support

Si vous avez des problèmes avec les migrations :

1. Vérifiez que `DATABASE_URL` est correctement configurée
2. Vérifiez les logs Vercel : `Deployments > View Function Logs`
3. Utilisez Prisma Studio pour inspecter le schéma : `DATABASE_URL="..." npm run db:studio`
