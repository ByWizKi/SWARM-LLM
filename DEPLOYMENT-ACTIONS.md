# Actions immédiates après déploiement

## ✅ Étape 1 : Vérifier le déploiement Vercel

1. Allez sur https://vercel.com/dashboard
2. Ouvrez votre projet SWARM-LLM
3. Vérifiez que le dernier déploiement est marqué "Ready" (icône verte)
4. Notez l'URL de votre application (ex: `https://swarm-llm.vercel.app`)

## ✅ Étape 2 : Vérifier les variables d'environnement

Dans Vercel > Settings > Environment Variables, vérifiez la présence de :

### Variables requises :

- ✅ `DATABASE_URL` - URL PostgreSQL de production
- ✅ `NEXTAUTH_SECRET` - Secret NextAuth (généré avec `openssl rand -base64 32`)
- ✅ `NEXTAUTH_URL` - URL de votre app (ex: `https://votre-app.vercel.app`)
- ✅ `INIT_DB_SECRET` - Secret pour les migrations (généré avec `openssl rand -base64 32`)

### Variables optionnelles :

- `PRISMA_DATABASE_URL` - URL Prisma Accelerate (pour cache)
- `GEMINI_API_KEY` - Clé API Gemini globale (si non stockée par utilisateur)

**Action** : Si `INIT_DB_SECRET` n'existe pas, générez-le et ajoutez-le :
```bash
openssl rand -base64 32
```

## ✅ Étape 3 : Appliquer la migration geminiApiKey

Cette migration est **obligatoire** pour que l'inscription fonctionne correctement.

### Option 1 : Via le script helper (Recommandé)

```bash
cd webapp
export VERCEL_APP_URL="https://votre-app.vercel.app"  # Remplacez par votre URL
export INIT_DB_SECRET="votre-secret"                   # Remplacez par votre secret
./scripts/apply-migration-production.sh
```

### Option 2 : Via curl direct

```bash
curl -X POST "https://votre-app.vercel.app/api/db/migrate-gemini?secret=VOTRE_INIT_DB_SECRET"
```

Remplacez :
- `https://votre-app.vercel.app` par votre URL Vercel
- `VOTRE_INIT_DB_SECRET` par la valeur de `INIT_DB_SECRET` dans Vercel

### Option 3 : Via npm (localement avec DATABASE_URL de production)

```bash
cd webapp
DATABASE_URL="postgresql://user:password@host:5432/dbname" npm run db:migrate:check
```

## ✅ Étape 4 : Tester l'application

1. **Accéder à l'application** : `https://votre-app.vercel.app`
2. **Tester l'inscription** :
   - Aller sur `/auth/signup`
   - Créer un compte avec une clé API Gemini
   - Vérifier que l'inscription fonctionne sans erreur
3. **Tester la connexion** :
   - Se connecter avec le compte créé
   - Vérifier que tout fonctionne

## ✅ Étape 5 : Vérifier les logs

Si vous rencontrez des erreurs :

1. **Logs Vercel** :
   - Vercel Dashboard > Deployments > [Dernier déploiement] > View Function Logs
   - Cherchez les erreurs Prisma ou de migration

2. **Erreur commune** : `Column 'geminiApiKey' does not exist`
   - **Solution** : Appliquez la migration (Étape 3)

## 📋 Résumé des commandes

```bash
# 1. Récupérer l'URL de votre app Vercel
# (Depuis Vercel Dashboard)

# 2. Récupérer INIT_DB_SECRET
# (Depuis Vercel > Settings > Environment Variables)

# 3. Appliquer la migration
curl -X POST "https://VOTRE-URL.vercel.app/api/db/migrate-gemini?secret=VOTRE-SECRET"

# 4. Vérifier que ça fonctionne
# (Réponse devrait être: {"message":"Migration appliquée avec succès","status":"ok",...})
```

## 🔍 Vérification de la migration

Pour vérifier que la colonne existe dans votre base de données :

```bash
# Via Prisma Studio (localement)
cd webapp
DATABASE_URL="votre-url-production" npm run db:studio

# Puis dans Prisma Studio, vérifier la table "users" et la colonne "geminiApiKey"
```

Ou via SQL direct (si vous avez accès à votre base) :

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'geminiApiKey';
```

## ❓ Besoin d'aide ?

Consultez :
- `PRODUCTION-CHECKLIST.md` - Checklist complète de déploiement
- `webapp/MIGRATIONS.md` - Documentation détaillée des migrations
- `webapp/VERCEL-DEPLOY.md` - Guide complet de déploiement Vercel
