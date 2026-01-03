# Guide de démarrage rapide

## Prérequis

- Docker et Docker Compose installés
- Git

## Installation

1. Cloner le repository :

```bash
git clone <repository-url>
cd SWARM-LLM/webapp
```

2. Démarrer les conteneurs Docker :

```bash
docker-compose -f docker-compose.dev.yml up --build
```

3. Attendre que les services soient prêts (environ 30 secondes)

4. Accéder à l'application :

- URL : http://localhost:3000

## Connexion

Un utilisateur par défaut est créé automatiquement :

- **Nom d'utilisateur** : `admin`
- **Mot de passe** : `admin123`

**IMPORTANT** : Changez le mot de passe après la première connexion !

## Créer un nouveau compte

Vous pouvez créer un nouveau compte depuis l'interface :

1. Aller sur http://localhost:3000/auth/signup
2. Remplir le formulaire d'inscription
3. Se connecter avec vos identifiants

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du dossier `webapp` avec :

```env
# Base de données (optionnel - valeurs par défaut)
POSTGRES_USER=swarm_user
POSTGRES_PASSWORD=swarm_password
POSTGRES_DB=swarm_db

# NextAuth (optionnel - valeur par défaut)
NEXTAUTH_SECRET=dev-secret-change-in-production

# Gemini API (requis pour les recommandations IA)
GEMINI_API_KEY=votre_cle_api_ici
```

### Obtenir une clé API Gemini

1. Aller sur https://makersuite.google.com/app/apikey
2. Créer une nouvelle clé API
3. Ajouter la clé dans le fichier `.env`

## Dépannage

### Erreur "database does not exist"

Si vous obtenez cette erreur :

1. Arrêter les conteneurs : `docker-compose -f docker-compose.dev.yml down`
2. Supprimer le volume de données : `docker volume rm webapp_postgres_data_dev`
3. Redémarrer : `docker-compose -f docker-compose.dev.yml up --build`

### Réinitialiser la base de données

```bash
docker-compose -f docker-compose.dev.yml down
docker volume rm webapp_postgres_data_dev
docker-compose -f docker-compose.dev.yml up --build
```

## Structure du projet

- `app/` : Pages et routes Next.js
- `components/` : Composants React réutilisables
- `lib/` : Bibliothèques et utilitaires
- `prisma/` : Schéma de base de données
- `scripts/` : Scripts d'initialisation et utilitaires
- `docker/` : Scripts d'initialisation Docker

## Support

Pour toute question ou problème, ouvrez une issue sur GitHub.
