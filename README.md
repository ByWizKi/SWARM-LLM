# SWARM-LLM - Assistant IA pour Draft RTA Summoners War

Application web d'aide à la décision pour les drafts RTA (Real Time Arena) de Summoners War: Sky Arena. Utilise des LLMs pour analyser et recommander les meilleurs picks, bans et stratégies de draft.

## Démarrage Rapide avec Docker

Pour un guide détaillé pas à pas, consultez [webapp/GUIDE-DOCKER.md](./webapp/GUIDE-DOCKER.md)

### Installation rapide

1. Aller dans le dossier webapp
   ```bash
   cd webapp
   ```

2. Configurer l'environnement
   ```bash
   cp .env.example .env
   ```

3. Lancer avec Docker
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. Initialiser la base de données (première fois, dans un nouveau terminal)
   ```bash
   docker exec -it swarm-app-dev npx prisma generate
   docker exec -it swarm-app-dev npx prisma db push
   ```

L'application est accessible sur **http://localhost:3000**

Note: Pour convertir `monsters_rta.json`, consultez [webapp/GUIDE-DOCKER.md](./webapp/GUIDE-DOCKER.md)

## Structure du Projet

```
SWARM-LLM/
├── webapp/              # Application web Next.js
│   ├── app/            # Pages et routes
│   ├── components/     # Composants React
│   ├── lib/           # Utilitaires
│   ├── prisma/        # Schéma de base de données
│   ├── data/          # Données JSON des monstres
│   ├── scripts/       # Scripts utilitaires
│   └── docker-compose.yml
├── monsters_rta.json   # Fichier source des monstres (à la racine)
└── README.md          # Ce fichier
```

## Fonctionnalités

- Gestion des comptes utilisateurs (authentification)
- Gestion des boxes de monstres (import/sélection depuis votre collection)
- Assistant IA pour les drafts : recommandations de picks et bans basées sur les LLMs
- Analyse stratégique : suggestions de compositions d'équipe optimales
- Support des règles de draft RTA officielles
- Interface responsive avec dark mode
- Page des règles de draft complète

## Commandes Utiles

Dans le dossier `webapp/` :

```bash
# Lancer en mode développement
docker-compose -f docker-compose.dev.yml up

# Lancer en mode production
docker-compose up --build

# Arrêter les conteneurs
docker-compose down

# Voir les logs
docker-compose logs -f

# Accéder à la base de données
docker exec -it swarm-postgres-dev psql -U swarm_user -d swarm_db

# Ouvrir Prisma Studio (interface graphique pour la DB)
docker exec -it swarm-app-dev npx prisma studio
```

## Configuration

### Variables d'environnement (`.env`)

```env
DATABASE_URL="postgresql://swarm_user:swarm_password@postgres:5432/swarm_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-aleatoire"
```

### Conversion des monstres

Le script de conversion transforme `monsters_rta.json` en format utilisable par l'application :

```bash
cd webapp
npm run convert:monsters
```

Cela génère `data/monsters.json` avec tous les monstres formatés.

## Dépannage

### Port 3000 déjà utilisé

Modifiez le port dans `docker-compose.dev.yml` :
```yaml
ports:
  - "3001:3000"  # Utiliser le port 3001
```

### Erreur de connexion à la base de données

Vérifiez que PostgreSQL est bien démarré :
```bash
docker-compose ps
```

### Réinitialiser la base de données

```bash
docker-compose down -v
docker-compose -f docker-compose.dev.yml up -d postgres
docker exec -it swarm-app-dev npx prisma db push
```

### Reconstruire les conteneurs

```bash
docker-compose -f docker-compose.dev.yml up --build --force-recreate
```

## Documentation

- Consultez `/rules` dans l'application pour les règles de draft RTA
- Le code est commenté en français
- Architecture : Next.js 14, PostgreSQL, Prisma, Socket.io, Tailwind CSS
- Utilise des LLMs pour analyser les métas, les synergies entre monstres et recommander les meilleurs choix

## Concept

SWARM-LLM est un assistant intelligent qui vous aide à prendre des décisions éclairées lors de vos drafts RTA. L'application :
- Analyse votre box de monstres
- Évalue les picks de votre adversaire
- Recommande les meilleurs picks et bans selon la méta actuelle
- Suggère des compositions d'équipe synergiques
- Utilise des modèles de langage pour comprendre les stratégies et contre-stratégies

## Contribution

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour les règles de contribution.

## Licence

[À définir]

