# Guide d'Extraction des Drafts pour Analyse

Ce guide explique comment extraire les données de drafts enregistrées depuis la base de données PostgreSQL pour effectuer des analyses.

## Structure de la Table `draft_sessions`

La table `draft_sessions` contient toutes les informations d'une draft complète au format JSON.

### Champs Principaux

- `id` : Identifiant unique de la draft
- `userId` : ID de l'utilisateur qui a créé la draft
- `firstPlayer` : "A" ou "B" - Le joueur qui a commencé la draft
- `winner` : "A", "B" ou NULL - Le gagnant de la draft (renseigné à la fin)
- `playerAPicks` : JSON array d'IDs de monstres sélectionnés par le joueur A
- `playerBPicks` : JSON array d'IDs de monstres sélectionnés par le joueur B
- `playerABans` : JSON array d'IDs de monstres bannis par le joueur A
- `playerBBans` : JSON array d'IDs de monstres bannis par le joueur B
- `recommendations` : JSON array des recommandations LLM pendant la phase de picking
- `banRecommendations` : JSON array des recommandations LLM pendant la phase de banning
- `metadata` : JSON object avec métadonnées (durée, mode LLM, etc.)
- `createdAt` : Date de création de la draft
- `updatedAt` : Date de dernière mise à jour

## Exemples d'Extraction

### 1. Extraction Directe avec SQL

#### Extraire toutes les drafts

```sql
SELECT
    id,
    "userId",
    "firstPlayer",
    winner,
    "playerAPicks",
    "playerBPicks",
    "playerABans",
    "playerBBans",
    recommendations,
    "banRecommendations",
    metadata,
    "createdAt"
FROM draft_sessions
ORDER BY "createdAt" DESC;
```

#### Extraire les drafts avec gagnant renseigné

```sql
SELECT *
FROM draft_sessions
WHERE winner IS NOT NULL
ORDER BY "createdAt" DESC;
```

#### Extraire les drafts d'un utilisateur spécifique

```sql
SELECT *
FROM draft_sessions
WHERE "userId" = 'user_id_here'
ORDER BY "createdAt" DESC;
```

#### Compter les drafts par gagnant

```sql
SELECT
    winner,
    COUNT(*) as count
FROM draft_sessions
WHERE winner IS NOT NULL
GROUP BY winner;
```

#### Extraire les drafts avec statistiques

```sql
SELECT
    id,
    "firstPlayer",
    winner,
    jsonb_array_length("playerAPicks") as picks_a,
    jsonb_array_length("playerBPicks") as picks_b,
    jsonb_array_length(recommendations) as nb_recommendations,
    (metadata->>'duration')::int as duration_minutes,
    "createdAt"
FROM draft_sessions
ORDER BY "createdAt" DESC;
```

### 2. Extraction avec Prisma Client (Node.js/TypeScript)

#### Installation

```bash
cd webapp
npm install
npx prisma generate
```

#### Code d'exemple

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extraire toutes les drafts
async function getAllDrafts() {
  const drafts = await prisma.draftSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  return drafts;
}

// Extraire les drafts avec gagnant
async function getDraftsWithWinner() {
  const drafts = await prisma.draftSession.findMany({
    where: {
      winner: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  });
  return drafts;
}

// Extraire les drafts d'un utilisateur
async function getUserDrafts(userId: string) {
  const drafts = await prisma.draftSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return drafts;
}

// Analyser les statistiques des recommandations
async function analyzeRecommendations() {
  const drafts = await prisma.draftSession.findMany({
    where: { winner: { not: null } },
  });

  const stats = {
    totalDrafts: drafts.length,
    totalRecommendations: 0,
    averageRecommendationsPerDraft: 0,
    recommendationsByPhase: {
      picking: 0,
      banning: 0,
    },
    averageRating: 0,
    ratingsCount: 0,
  };

  for (const draft of drafts) {
    const recommendations = draft.recommendations as any[];
    stats.totalRecommendations += recommendations.length;

    recommendations.forEach((rec) => {
      if (rec.phase === 'picking') {
        stats.recommendationsByPhase.picking++;
      } else if (rec.phase === 'banning') {
        stats.recommendationsByPhase.banning++;
      }

      if (rec.rating) {
        stats.averageRating += rec.rating;
        stats.ratingsCount++;
      }
    });
  }

  stats.averageRecommendationsPerDraft = stats.totalRecommendations / stats.totalDrafts;
  stats.averageRating = stats.ratingsCount > 0
    ? stats.averageRating / stats.ratingsCount
    : 0;

  return stats;
}

// Exporter en JSON
async function exportToJSON(outputPath: string) {
  const drafts = await prisma.draftSession.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const fs = require('fs');
  fs.writeFileSync(outputPath, JSON.stringify(drafts, null, 2));
  console.log(`Exported ${drafts.length} drafts to ${outputPath}`);
}
```

### 3. Extraction avec Python (psycopg2)

```python
import psycopg2
import json
from datetime import datetime

# Connexion à la base de données
conn = psycopg2.connect(
    host="your_host",
    database="your_database",
    user="your_user",
    password="your_password"
)
cur = conn.cursor()

# Extraire toutes les drafts
cur.execute("""
    SELECT id, "userId", "firstPlayer", winner,
           "playerAPicks", "playerBPicks", "playerABans", "playerBBans",
           recommendations, "banRecommendations", metadata, "createdAt"
    FROM draft_sessions
    ORDER BY "createdAt" DESC
""")

drafts = []
for row in cur.fetchall():
    draft = {
        'id': row[0],
        'userId': row[1],
        'firstPlayer': row[2],
        'winner': row[3],
        'playerAPicks': row[4],
        'playerBPicks': row[5],
        'playerABans': row[6],
        'playerBBans': row[7],
        'recommendations': row[8],
        'banRecommendations': row[9],
        'metadata': row[10],
        'createdAt': row[11].isoformat() if row[11] else None
    }
    drafts.append(draft)

# Exporter en JSON
with open('drafts_export.json', 'w', encoding='utf-8') as f:
    json.dump(drafts, f, indent=2, ensure_ascii=False)

print(f"Exported {len(drafts)} drafts to drafts_export.json")

cur.close()
conn.close()
```

### 4. Export CSV pour Analyse

#### Script Node.js pour exporter en CSV

```javascript
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportToCSV() {
  const drafts = await prisma.draftSession.findMany({
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  const csvHeader = [
    'id',
    'userName',
    'firstPlayer',
    'winner',
    'picksA',
    'picksB',
    'bansA',
    'bansB',
    'nbRecommendations',
    'nbBanRecommendations',
    'durationMinutes',
    'mode',
    'createdAt'
  ].join(',');

  const csvRows = drafts.map(draft => {
    const recommendations = draft.recommendations || [];
    const banRecommendations = draft.banRecommendations || [];
    const metadata = draft.metadata || {};

    return [
      draft.id,
      draft.user.name,
      draft.firstPlayer,
      draft.winner || '',
      JSON.stringify(draft.playerAPicks),
      JSON.stringify(draft.playerBPicks),
      JSON.stringify(draft.playerABans),
      JSON.stringify(draft.playerBBans),
      recommendations.length,
      banRecommendations.length,
      metadata.duration || '',
      metadata.mode || '',
      draft.createdAt.toISOString()
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [csvHeader, ...csvRows].join('\n');
  fs.writeFileSync('drafts_export.csv', csv, 'utf-8');

  console.log(`Exported ${drafts.length} drafts to drafts_export.csv`);
}

exportToCSV()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Structure JSON des Recommandations

Chaque recommandation dans le champ `recommendations` a la structure suivante :

```json
{
  "messageId": "rec-1234567890-0.123",
  "text": "Le LLM recommande...",
  "proposedMonsterIds": [123, 456],
  "phase": "picking",
  "turn": 1,
  "rating": 4,
  "timestamp": "2024-01-19T17:00:00.000Z"
}
```

## Structure JSON des Métadonnées

Le champ `metadata` contient :

```json
{
  "duration": 15,  // Durée du draft en minutes
  "mode": 0,       // 0: Gemini, 1: Neural Network, 2: LLM fine-tuned
  "totalRecommendations": 8
}
```

## Analyses Possibles

### 1. Analyse de Performance des Recommandations

- Taux de victoire selon les recommandations suivies
- Corrélation entre les notes (ratings) et les résultats
- Efficacité des différents modes LLM

### 2. Analyse des Compositions

- Monstres les plus fréquemment pickés
- Combinaisons gagnantes de monstres
- Impact du premier joueur sur la victoire

### 3. Analyse des Bans

- Monstres les plus bannis
- Efficacité des recommandations de ban

### 4. Analyse Temporelle

- Évolution des stratégies au fil du temps
- Impact de la durée du draft sur le résultat

## Accès à la Base de Données

### Variables d'Environnement

Les informations de connexion sont dans le fichier `.env` :

```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Via Prisma Studio (Interface Graphique)

```bash
cd webapp
npx prisma studio
```

Ouvrez http://localhost:5555 pour accéder à l'interface graphique et explorer les données.

## Export pour Machine Learning

Pour préparer les données pour des modèles de machine learning :

```python
import json
import pandas as pd

# Charger les drafts
with open('drafts_export.json', 'r') as f:
    drafts = json.load(f)

# Créer un DataFrame pour l'analyse
df = pd.DataFrame([
    {
        'winner': draft['winner'],
        'firstPlayer': draft['firstPlayer'],
        'picksA': draft['playerAPicks'],
        'picksB': draft['playerBPicks'],
        'bansA': draft['playerABans'],
        'bansB': draft['playerBBans'],
        'avgRating': sum(r.get('rating', 0) for r in draft['recommendations']) / max(len(draft['recommendations']), 1),
        'duration': draft['metadata'].get('duration', 0),
        'mode': draft['metadata'].get('mode', 0),
    }
    for draft in drafts
    if draft['winner']  # Seulement les drafts avec gagnant
])

# Sauvegarder pour ML
df.to_csv('drafts_ml_ready.csv', index=False)
```

## Notes Importantes

1. **Données Sensibles** : Les drafts contiennent des informations utilisateur. Respectez la confidentialité lors de l'extraction.

2. **Format JSON** : PostgreSQL stocke les données JSON. Utilisez `jsonb` pour des opérations efficaces.

3. **Index** : Des index sont créés sur `userId` et `createdAt` pour accélérer les requêtes.

4. **Relations** : Utilisez `JOIN` avec la table `users` si vous avez besoin du nom d'utilisateur :

```sql
SELECT
    ds.*,
    u.name as user_name
FROM draft_sessions ds
JOIN users u ON ds."userId" = u.id
ORDER BY ds."createdAt" DESC;
```
