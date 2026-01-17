# Checklist de déploiement production

## Après chaque déploiement sur Vercel

### 1. Vérifier le déploiement

Vérifiez que le build a réussi :
- [ ] Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Vérifier que le dernier déploiement est "Ready" (vert)
- [ ] Vérifier les logs pour s'assurer qu'il n'y a pas d'erreurs

### 2. Vérifier les variables d'environnement

Dans Vercel > Settings > Environment Variables, vérifier que toutes les variables sont présentes :

- [ ] `DATABASE_URL` - URL PostgreSQL de production
- [ ] `PRISMA_DATABASE_URL` - (Optionnel) URL Prisma Accelerate
- [ ] `NEXTAUTH_SECRET` - Secret pour NextAuth
- [ ] `NEXTAUTH_URL` - URL de l'application (ex: https://votre-app.vercel.app)
- [ ] `INIT_DB_SECRET` - Secret pour les routes de migration
- [ ] `GEMINI_API_KEY` - (Optionnel) Clé API Gemini globale

### 3. Appliquer les migrations de base de données

Si le schéma Prisma a été modifié, appliquez les migrations :

#### Option A : Via le script helper (Recommandé)

```bash
cd webapp
export VERCEL_APP_URL="https://votre-app.vercel.app"
export INIT_DB_SECRET="votre-secret-depuis-vercel"
./scripts/apply-migration-production.sh
```

#### Option B : Via curl

```bash
curl -X POST "https://votre-app.vercel.app/api/db/migrate-gemini?secret=VOTRE_INIT_DB_SECRET"
```

#### Option C : Via npm script (localement)

```bash
cd webapp
DATABASE_URL="votre-url-production" npm run db:migrate:check
```

### 4. Tester l'application

- [ ] Accéder à l'URL de production : `https://votre-app.vercel.app`
- [ ] Tester la création de compte (signup)
- [ ] Tester la connexion (signin)
- [ ] Vérifier que les fonctionnalités principales fonctionnent

### 5. Vérifier les logs

- [ ] Vérifier les logs Vercel : Deployments > View Function Logs
- [ ] Vérifier qu'il n'y a pas d'erreurs Prisma (colonnes manquantes, etc.)
- [ ] Vérifier qu'il n'y a pas d'erreurs d'authentification

## Migration geminiApiKey spécifique

Si vous venez de déployer les modifications concernant `geminiApiKey` :

1. **Vérifier que la colonne existe** :
   ```sql
   -- Via votre client PostgreSQL ou Prisma Studio
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'geminiApiKey';
   ```

2. **Si la colonne n'existe pas, appliquer la migration** :
   ```bash
   curl -X POST "https://votre-app.vercel.app/api/db/migrate-gemini?secret=VOTRE_SECRET"
   ```

3. **Tester l'inscription** :
   - Aller sur `/auth/signup`
   - Créer un nouveau compte avec une clé API Gemini
   - Vérifier que l'inscription fonctionne sans erreur

## En cas de problème

### Erreur : "Column does not exist"

**Solution** : Appliquez la migration via l'une des méthodes ci-dessus.

### Erreur : "Prisma Client not generated"

**Solution** : 
- Vérifier que `prisma generate` s'exécute dans le build (déjà dans `package.json`)
- Vérifier les logs de build Vercel

### Erreur : "DATABASE_URL is not defined"

**Solution** :
- Vérifier les variables d'environnement dans Vercel
- S'assurer qu'elles sont ajoutées pour **Production**, **Preview**, et **Development**

### Erreur : "Secret invalide" lors de la migration

**Solution** :
- Vérifier que `INIT_DB_SECRET` dans Vercel correspond au secret utilisé
- Régénérer un secret si nécessaire : `openssl rand -base64 32`

## Commandes utiles

```bash
# Vérifier l'état de la base de données
DATABASE_URL="votre-url" npm run db:studio

# Appliquer toutes les migrations
DATABASE_URL="votre-url" npm run db:push

# Vérifier une migration spécifique
DATABASE_URL="votre-url" npm run db:migrate:check

# Tester l'API de migration localement (avec .env.local)
npm run dev
# Puis: curl -X POST "http://localhost:3000/api/db/migrate-gemini?secret=test"
```
