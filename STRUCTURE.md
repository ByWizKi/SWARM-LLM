# Structure du Projet SWARM-LLM

```
SWARM-LLM/
│
├── README.md                    # Guide principal du projet
├── CONTRIBUTING.md              # Règles de contribution
├── monsters_rta.json            # Fichier source avec tous les monstres (à la racine)
│
└── webapp/                      # Application web Next.js
    ├── GUIDE-DOCKER.md          # Guide détaillé Docker
    ├── .env.example             # Exemple de configuration
    │
    ├── app/                     # Pages Next.js (App Router)
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── providers.tsx
    │   └── rules/
    │       └── page.tsx
    │
    ├── components/              # Composants React réutilisables
    │   ├── theme-provider.tsx
    │   └── ui/                  # Composants shadcn/ui
    │       ├── button.tsx
    │       └── card.tsx
    │
    ├── lib/                     # Utilitaires et helpers
    │   ├── monsters.ts          # Gestion des monstres
    │   ├── prisma.ts            # Client Prisma
    │   └── utils.ts             # Utilitaires généraux
    │
    ├── prisma/                  # Schéma de base de données
    │   └── schema.prisma
    │
    ├── data/                    # Données JSON
    │   ├── monsters.example.json
    │   └── monsters.json        # Généré depuis monsters_rta.json
    │
    ├── scripts/                 # Scripts utilitaires
    │   └── convert-monsters.js  # Conversion monsters_rta.json
    │
    ├── public/                  # Fichiers statiques
    │   └── favicon.ico
    │
    ├── Dockerfile               # Production
    ├── Dockerfile.dev           # Développement
    ├── docker-compose.yml       # Production
    ├── docker-compose.dev.yml   # Développement
    │
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.js
    └── postcss.config.mjs
```

## Fichiers Importants

### À la racine
- `monsters_rta.json` : Fichier source avec tous les monstres (ne pas déplacer)

### Dans webapp/
- `GUIDE-DOCKER.md` : Guide complet pour lancer avec Docker
- `docker-compose.dev.yml` : Configuration Docker pour développement
- `.env.example` : Exemple de configuration (copier en `.env`)

## Commandes Principales

Toutes les commandes doivent être exécutées depuis `webapp/` :

```bash
cd webapp

# Lancer avec Docker
docker-compose -f docker-compose.dev.yml up --build

# Convertir les monstres
npm run convert:monsters

# Initialiser la base de données
docker exec -it swarm-app-dev npx prisma generate
docker exec -it swarm-app-dev npx prisma db push
```
