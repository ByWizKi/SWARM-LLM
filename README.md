# SWARM-LLM - Assistant IA pour Draft RTA Summoners War

Application web d'aide à la décision pour les drafts RTA (Real Time Arena) de Summoners War: Sky Arena. Utilise des LLMs (Google Gemini) pour analyser et recommander les meilleurs picks, bans et stratégies de draft.
## Démarrage Rapide

Pour un guide détaillé, consultez [webapp/README-SETUP.md](./webapp/README-SETUP.md)

### Installation rapide

1. Aller dans le dossier SWARM-LLM (la racine), vous y êtes déjà normalement


2. Pour configurer l'environnement (optionnel)
   ```bash
   cd webapp
   cp .env.example .env
   # Éditer .env et ajouter votre GEMINI_API_KEY
   ```
3. **Télécharger les poids du modèle LLM local**  

   - Lien de téléchargement : [Poids du modèle](https://filesender.renater.fr/?s=download&token=89d3de5b-08f9-45fb-8c34-52e752f2af72)  
   - Ajouter le fichier téléchargé dans le dossier :

   ```
   backend/full_model_finetuned
   ```
4. Lancer avec Docker depuis la racine SWARM-LLM
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

5. Accéder à l'application : **http://localhost:3000**

6. Se connecter avec :
   - **Utilisateur** : `admin`
   - **Mot de passe** : `admin123`

## Structure du Projet

```
SWARM-LLM/
├── backend/                # API / ML backend
│   ├── main.py             # Entrée du backend
│   ├── my_model.py         # Modèle de prédiction
│   ├── modele_predic.pt    # Poids du modèle
│   ├── monsters_rta.json   # Monstres RTA utilisés par le backend
│   └── requirements.txt    # Fichiers de librairie de Python
│
├── webapp/                 # Application web Next.js
│   ├── app/                # Pages et routes
│   │   ├── api/            # API routes
│   │   │   ├── draft/      # Endpoints draft
│   │   │   ├── monsters/   # Endpoints monstres
│   │   │   └── user/box/   # Gestion du box utilisateur
│   │   ├── auth/           # Sign-in / Sign-up
│   │   ├── box/            # Page du box utilisateur
│   │   ├── dashboard/      # Tableau de bord
│   │   ├── draft/          # Page draft
│   │   └── rules/          # Page règles
│   │
│   ├── components/         # Composants React
│   ├── lib/                # Libs et utilitaires (auth, prisma, LLM, règles, etc.)
│   │   ├── llm-prompt.ts   # Fichier de configuration des prompts pour le LLM 
│   │   ├── gemini-client.ts    # Client API Gemini
│   │   ├── rta-rules.ts    # Règles de draft de RTA
│   ├── prisma/             # Schéma et migrations DB
│   ├── public/             # Fichiers statiques / images
│   └── scripts/            # Scripts utilitaires (convert, init DB)
│
├── monsters_rta.json       # Monstres RTA globaux (pour scripts ou docs)
├── lib/                    # Scripts et utilitaires partagés
├── scripts/                # Scripts généraux (conversion, téléchargement)
├── images/                 # Images de référence
├── .gitignore
├── docker-compose.yml
├── README.md


```

## Fonctionnalités

- **Authentification** : Gestion des comptes utilisateurs
- **Gestion du Box** : Import et sélection de votre collection de monstres
- **Assistant IA** : Recommandations automatiques de picks et bans basées sur Gemini
- **Règles RTA** : Support des règles officielles de draft RTA
- **Interface moderne** : Design responsive avec dark mode

## Configuration

### Variables d'environnement

Créez un fichier `.env` dans `webapp/` :

```env
# Base de données (optionnel - valeurs par défaut)
POSTGRES_USER=swarm_user
POSTGRES_PASSWORD=swarm_password
POSTGRES_DB=swarm_db

# NextAuth
NEXTAUTH_SECRET=dev-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Gemini API (requis pour les recommandations)
GEMINI_API_KEY=votre_cle_api_ici
```

### Obtenir une clé API Gemini

1. Aller sur https://makersuite.google.com/app/apikey
2. Créer une nouvelle clé API
3. Ajouter la clé dans `.env`

## Commandes Utiles

Dans le dossier racine `SWARM-LLM/` :

```bash
# Lancer en mode développement
docker-compose -f docker-compose.dev.yml up

# Arrêter les conteneurs
docker-compose -f docker-compose.dev.yml down

# Voir les logs
docker-compose -f docker-compose.dev.yml logs -f

# Réinitialiser la base de données
docker-compose -f docker-compose.dev.yml down
docker volume rm webapp_postgres_data_dev
docker-compose -f docker-compose.dev.yml up --build
```

## Documentation pour les Développeurs

### Modifier les Recommandations IA

Tous les prompts et la configuration LLM sont centralisés dans un seul fichier :

- **`webapp/lib/llm-prompt.ts`** : Modifiez ce fichier pour ajuster les prompts, la configuration du modèle, et ajouter du RAG

Consultez [webapp/lib/LLM_README.md](./webapp/lib/LLM_README.md) pour plus de détails.

### Architecture

- **Frontend** : Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes
- **Base de données** : PostgreSQL avec Prisma ORM
- **Authentification** : NextAuth.js
- **IA** : Google Gemini API

## Concept

SWARM-LLM est un assistant intelligent qui vous aide à prendre des décisions éclairées lors de vos drafts RTA. L'application :

- Analyse votre box de monstres
- Évalue les picks de votre adversaire
- Recommande les meilleurs picks et bans selon la méta actuelle
- Suggère des compositions d'équipe synergiques
- Utilise des modèles de langage pour comprendre les stratégies et contre-stratégies

## Contribution

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](./CONTRIBUTING.md) pour les règles de contribution.

## Licence

[À définir]
