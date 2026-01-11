# Guide de déploiement sur Vercel

Ce guide vous explique comment déployer l'application SWARM-LLM sur Vercel.

## Prérequis

1. Un compte Vercel (gratuit) : [https://vercel.com](https://vercel.com)
2. Un compte GitHub avec le repository SWARM-LLM
3. Une base de données PostgreSQL hébergée (Vercel Postgres, Supabase, Railway, Neon, etc.)
4. Une clé API Google Gemini

## Étape 1 : Préparer la base de données PostgreSQL

Vercel ne fournit pas de base de données PostgreSQL directement. Vous devez utiliser un service externe :

### Option A : Vercel Postgres (Recommandé)

1. Connectez-vous à votre projet Vercel
2. Allez dans l'onglet "Storage"
3. Créez une nouvelle base de données Postgres
4. Notez la `DATABASE_URL` qui sera générée automatiquement

### Option B : Supabase (Gratuit)

1. Créez un compte sur [https://supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Allez dans Settings > Database
4. Copiez la "Connection string" (URI)
5. Remplacez `[YOUR-PASSWORD]` par votre mot de passe de base de données

### Option C : Prisma Accelerate (Recommandé pour la performance)

1. Créez un compte sur [https://www.prisma.io/data-platform](https://www.prisma.io/data-platform)
2. Créez un projet et connectez votre base de données PostgreSQL
3. Prisma Accelerate génère automatiquement :
   - `DATABASE_URL` : URL de connexion directe PostgreSQL
   - `POSTGRES_URL` : Alias de DATABASE_URL
   - `PRISMA_DATABASE_URL` : URL Prisma Accelerate (avec cache et accélération)

**Avantages de Prisma Accelerate :**

- Cache intelligent pour améliorer les performances
- Connexions optimisées
- Réduction de la latence
- Gratuit jusqu'à 100K requêtes/mois

### Option D : Autres services

- **Railway** : [https://railway.app](https://railway.app)
- **Neon** : [https://neon.tech](https://neon.tech)
- **Render** : [https://render.com](https://render.com)

## Étape 2 : Initialiser la base de données

Une fois votre base de données créée, vous devez initialiser le schéma Prisma :

### Option A : Via l'API d'initialisation (Recommandé pour Vercel)

1. Ajoutez une variable d'environnement `INIT_DB_SECRET` dans Vercel (générez un secret avec `openssl rand -base64 32`)
2. Après le premier déploiement, appelez cette URL :
   ```
   https://votre-app.vercel.app/api/db/init?secret=VOTRE_SECRET
   ```
3. Cela créera automatiquement toutes les tables nécessaires

### Option B : Via Prisma CLI (Localement)

```bash
# Localement, avec votre DATABASE_URL de production
cd webapp
DATABASE_URL="votre-url-production" npx prisma db push
```

### Option C : Via Prisma Studio

```bash
# Localement, avec votre DATABASE_URL de production
cd webapp
DATABASE_URL="votre-url-production" npx prisma studio
```

**Important :** Si vous utilisez Prisma Accelerate (`PRISMA_DATABASE_URL`), vous devez utiliser `DATABASE_URL` pour les opérations d'écriture comme `db push`. Prisma Accelerate est principalement pour les lectures.

## Étape 3 : Créer un compte Vercel et connecter le repository

1. Allez sur [https://vercel.com](https://vercel.com)
2. Cliquez sur "Sign Up" et connectez-vous avec GitHub
3. Cliquez sur "Add New Project"
4. Importez votre repository `SWARM-LLM`
5. Vercel détectera automatiquement que c'est un projet Next.js

## Étape 4 : Configurer le projet Vercel

### 4.1 Configuration du build

**⚠️ IMPORTANT : Configuration du Root Directory**

Dans les paramètres du projet Vercel, allez dans **Settings > General** :

1. **Root Directory** : Cliquez sur "Edit" et définissez `webapp` (CRUCIAL !)

   - Sans cette configuration, Vercel cherchera `package.json` à la racine et échouera
   - Vercel affichera l'erreur : "No Next.js version detected"

2. **Framework Preset** : Next.js (détecté automatiquement après avoir défini Root Directory)

3. **Build Command** : `npm run build` (par défaut, s'exécutera dans `webapp/`)

4. **Output Directory** : `.next` (par défaut)

5. **Install Command** : `npm install` (par défaut, s'exécutera dans `webapp/`)

**Comment configurer le Root Directory :**

- Dans votre projet Vercel, allez dans **Settings > General**
- Trouvez la section "Root Directory"
- Cliquez sur "Edit"
- Entrez `webapp` (sans le slash)
- Cliquez sur "Save"

### 4.2 Variables d'environnement

Allez dans **Settings > Environment Variables** et ajoutez :

| Variable              | Description                                       | Exemple                                                     |
| --------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`        | URL de connexion PostgreSQL (directe)             | `postgresql://user:password@host:5432/dbname`               |
| `PRISMA_DATABASE_URL` | URL Prisma Accelerate (recommandé, avec cache)    | `prisma+postgres://accelerate.prisma-data.net/?api_key=...` |
| `POSTGRES_URL`        | (Optionnel) Alias de DATABASE_URL                 | `postgresql://user:password@host:5432/dbname`               |
| `NEXTAUTH_SECRET`     | Secret pour NextAuth (générez-en un)              | Utilisez : `openssl rand -base64 32`                        |
| `NEXTAUTH_URL`        | URL de votre application                          | `https://votre-app.vercel.app`                              |
| `GEMINI_API_KEY`      | Clé API Google Gemini                             | Votre clé API Gemini                                        |
| `INIT_DB_SECRET`      | Secret pour l'initialisation de la DB (optionnel) | Générez avec : `openssl rand -base64 32`                    |

**Note importante :**

- Si vous utilisez **Prisma Accelerate**, ajoutez `PRISMA_DATABASE_URL` (l'application l'utilisera automatiquement en priorité)
- Sinon, utilisez uniquement `DATABASE_URL`
- `POSTGRES_URL` est optionnel et peut être identique à `DATABASE_URL`

**Générer NEXTAUTH_SECRET :**

```bash
openssl rand -base64 32
```

**Important :**

- Ajoutez ces variables pour **Production**, **Preview**, et **Development**
- Pour `NEXTAUTH_URL`, utilisez l'URL fournie par Vercel après le premier déploiement

## Étape 5 : Déployer

1. Cliquez sur **"Deploy"**
2. Vercel va :
   - Installer les dépendances
   - Exécuter `npm run build`
   - Déployer l'application
3. Attendez la fin du build (2-5 minutes)

## Étape 6 : Vérifier le déploiement

1. Une fois le déploiement terminé, Vercel vous donnera une URL (ex: `https://swarm-llm.vercel.app`)
2. Visitez cette URL
3. Testez la connexion et la création de compte

## Étape 7 : Mettre à jour NEXTAUTH_URL

Après le premier déploiement :

1. Allez dans **Settings > Environment Variables**
2. Modifiez `NEXTAUTH_URL` avec l'URL réelle de votre application
3. Redéployez (Vercel redéploiera automatiquement si vous avez activé les redéploiements automatiques)

## Étape 8 : Initialiser la base de données en production

Vous devez créer au moins un utilisateur pour pouvoir vous connecter :

### Option A : Via Prisma Studio (localement)

```bash
# Utilisez la DATABASE_URL de production
DATABASE_URL="votre-url-production" npx prisma studio
```

### Option B : Via une route API temporaire

Créez une route API temporaire pour créer un utilisateur admin, puis supprimez-la.

### Option C : Via SQL direct

Connectez-vous à votre base de données et exécutez :

```sql
-- Créer un utilisateur admin (mot de passe: admin123)
-- Le mot de passe doit être hashé avec bcrypt
-- Utilisez un script Node.js pour générer le hash
```

## Dépannage

### Erreur : "No Next.js version detected" ou "Module not found"

**Solution principale :**

- **Vérifiez que le Root Directory est bien configuré sur `webapp`** dans Settings > General
- C'est la cause la plus fréquente de cette erreur
- Après avoir défini le Root Directory, redéployez le projet

**Autres vérifications :**

- Vérifiez que `package.json` existe bien dans `webapp/package.json`
- Vérifiez que `next` est bien dans les `dependencies` de `package.json`
- Vérifiez que tous les fichiers nécessaires sont commités et pushés sur GitHub

### Erreur : "DATABASE_URL is not defined"

- Vérifiez que toutes les variables d'environnement sont bien configurées
- Vérifiez qu'elles sont ajoutées pour **Production**, **Preview**, et **Development**

### Erreur : "Prisma Client not generated"

- Ajoutez un script de build personnalisé dans Vercel :
  - **Build Command** : `npm run db:generate && npm run build`

### Erreur : "Function timeout"

- Les fonctions API ont un timeout de 60 secondes (configuré dans `vercel.json`)
- Si vous avez besoin de plus de temps, vous pouvez augmenter `maxDuration` dans `vercel.json`

### Erreur de connexion à la base de données

- Vérifiez que votre base de données accepte les connexions depuis Internet
- Vérifiez que l'IP de Vercel n'est pas bloquée (certains services nécessitent d'ajouter des IPs autorisées)

## Commandes utiles

### Déploiement local avec Vercel CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer en preview
vercel

# Déployer en production
vercel --prod
```

### Vérifier les logs

- Allez dans votre projet Vercel > **Deployments** > Cliquez sur un déploiement > **View Function Logs**

## Notes importantes

1. **Socket.io** : Si vous utilisez Socket.io pour des fonctionnalités temps réel, notez que Vercel ne supporte pas les WebSockets dans les Serverless Functions. Vous devrez utiliser une alternative comme :

   - Vercel Edge Functions avec Server-Sent Events
   - Un service externe (Ably, Pusher, etc.)
   - Vercel KV pour le state management

2. **Fichiers statiques** : Les images des monstres dans `public/images/` seront déployées automatiquement.

3. **Monsters data** : 
   - Le fichier `monsters_rta.json` doit être dans `webapp/` et commité dans le repository
   - Les images des monstres doivent être dans `webapp/public/images/` (633 images PNG)
   - Next.js sert automatiquement les fichiers du dossier `public/` comme fichiers statiques
   - Les images sont accessibles via `/images/unit_icon_XXXX_X_X.png`
   - Vérifiez que tous les fichiers sont bien commités : `git ls-files webapp/`

4. **Build optimizations** : Vercel optimise automatiquement les builds Next.js. Vous n'avez pas besoin de configuration supplémentaire.

## Support

En cas de problème :

1. Vérifiez les logs de déploiement dans Vercel
2. Vérifiez les logs des fonctions dans Vercel
3. Consultez la documentation Vercel : [https://vercel.com/docs](https://vercel.com/docs)
