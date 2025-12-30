# Guide Docker - Lancement Rapide

Guide simple pour lancer l'application SWARM-LLM (Assistant IA pour Draft RTA) sur votre ordinateur avec Docker.

## Prérequis

1. **Installer Docker Desktop**

   - Windows/Mac : [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - Linux : Suivez les instructions pour votre distribution

2. **Vérifier l'installation**
   ```bash
   docker --version
   docker-compose --version
   ```
   Les deux commandes doivent afficher des numéros de version.

## Lancement en 4 étapes

### Étape 1 : Ouvrir un terminal

Ouvrez un terminal (Terminal sur Mac/Linux, PowerShell ou CMD sur Windows) et naviguez dans le dossier du projet :

```bash
cd SWARM-LLM/webapp
```

### Étape 2 : Configurer l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env
```

Le fichier `.env` est déjà configuré avec les valeurs par défaut. Vous n'avez rien à modifier pour démarrer.

### Étape 3 : Convertir les monstres (première fois uniquement)

Cette étape convertit le fichier `monsters_rta.json` au format utilisé par l'application.

```bash
# Si vous avez npm installé localement
npm install
npm run convert:monsters

# OU depuis Docker (si npm n'est pas installé)
docker run --rm -v "$(pwd):/app" -w /app node:20-alpine npm install
docker run --rm -v "$(pwd):/app" -w /app node:20-alpine npm run convert:monsters
```

**Note :** Si vous n'avez pas npm installé, vous pouvez passer cette étape pour l'instant. Le fichier `data/monsters.example.json` sera utilisé par défaut.

### Étape 4 : Lancer l'application

```bash
# Mode développement (recommandé pour commencer)
docker-compose -f docker-compose.dev.yml up --build
```

La première fois, cela peut prendre quelques minutes (téléchargement des images Docker).

## Vérifier que ça fonctionne

1. **Attendre que les conteneurs démarrent**
   Vous verrez des messages dans le terminal. Attendez de voir :

   ```
   Ready in X.Xs
   - Local: http://localhost:3000
   ```

2. **Ouvrir votre navigateur**
   Allez sur : **http://localhost:3000**

3. **Initialiser la base de données** (première fois uniquement)

   Ouvrez un **nouveau terminal** et exécutez :

   ```bash
   cd SWARM-LLM/webapp
   docker exec -it swarm-app-dev npx prisma generate
   docker exec -it swarm-app-dev npx prisma db push
   ```

   Cela crée les tables dans la base de données.

4. **Rafraîchir la page**
   L'application devrait maintenant être fonctionnelle !

## Arrêter l'application

Dans le terminal où `docker-compose` est en cours d'exécution :

- Appuyez sur **Ctrl + C** (ou Cmd + C sur Mac)

Pour arrêter proprement :

```bash
docker-compose -f docker-compose.dev.yml down
```

## Relancer l'application

Une fois que vous avez tout configuré la première fois, relancer est simple :

```bash
cd SWARM-LLM/webapp
docker-compose -f docker-compose.dev.yml up
```

## Problèmes Courants

### "Port already in use"

Le port 3000 est déjà utilisé par une autre application.

Solution: Modifiez `docker-compose.dev.yml` :

```yaml
ports:
  - "3001:3000" # Changez 3000 en 3001
```

Puis accédez à http://localhost:3001

### "Cannot connect to Docker daemon"

Docker Desktop n'est pas démarré.

Solution: Lancez Docker Desktop, attendez qu'il démarre complètement, puis réessayez.

### "No such file or directory: monsters_rta.json"

Le fichier `monsters_rta.json` doit être à la racine du projet (pas dans `webapp/`).

Solution: Vérifiez que le fichier existe :

```bash
cd SWARM-LLM
ls monsters_rta.json  # Doit afficher le fichier
```

### L'application ne charge pas / Erreur de base de données

La base de données n'est pas initialisée.

Solution: Exécutez les commandes d'initialisation :

```bash
cd webapp
docker exec -it swarm-app-dev npx prisma generate
docker exec -it swarm-app-dev npx prisma db push
```

### Les changements de code ne s'affichent pas

En mode développement, les changements devraient apparaître automatiquement. Si ce n'est pas le cas :

```bash
# Redémarrer les conteneurs
docker-compose -f docker-compose.dev.yml restart
```

## Commandes Utiles

### Voir les logs en temps réel

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Voir l'état des conteneurs

```bash
docker-compose -f docker-compose.dev.yml ps
```

### Accéder au shell du conteneur

```bash
docker exec -it swarm-app-dev bash
```

### Réinitialiser complètement (supprime toutes les données)

```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

## Mode Production

Pour lancer en mode production (optimisé, sans hot-reload) :

```bash
cd webapp
docker-compose up --build
```

Note: Le mode production nécessite de construire l'application, ce qui prend plus de temps au premier lancement.

## Besoin d'aide ?

- Vérifiez que Docker Desktop est bien démarré
- Vérifiez les logs : `docker-compose logs`
- Consultez le README.md principal pour plus de détails
