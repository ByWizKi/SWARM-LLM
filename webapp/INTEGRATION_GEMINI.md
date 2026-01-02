# Guide d'intégration Gemini

## Étapes pour intégrer Gemini dans le projet

### ✅ Étape 1 : Installation du package (FAIT)
Le package `@google/generative-ai` a été installé.

### 📝 Étape 2 : Obtenir une clé API Gemini

1. Allez sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key" ou "Get API Key"
4. Copiez la clé API générée

### 🔧 Étape 3 : Configurer la clé API

1. Dans le dossier `webapp/`, créez un fichier `.env` (s'il n'existe pas déjà)
2. Ajoutez la ligne suivante :
   ```env
   GEMINI_API_KEY=votre_cle_api_ici
   ```
3. Remplacez `votre_cle_api_ici` par votre vraie clé API

### 🚀 Étape 4 : Redémarrer le serveur

Si le serveur Docker est en cours d'exécution :
```bash
cd webapp
docker-compose -f docker-compose.dev.yml restart app
```

Ou si vous utilisez npm directement :
```bash
cd webapp
npm run dev
```

### ✅ Étape 5 : Tester l'intégration

1. Lancez l'application
2. Connectez-vous
3. Allez sur la page de draft (`/draft`)
4. Sélectionnez quelques monstres
5. Cliquez sur "Obtenir Recommandations"
6. Vous devriez voir des recommandations générées par Gemini !

## Dépannage

### Erreur "GEMINI_API_KEY is required"
- Vérifiez que le fichier `.env` existe dans `webapp/`
- Vérifiez que la variable `GEMINI_API_KEY` est bien définie
- Redémarrez le serveur après avoir ajouté la clé

### Erreur de quota
- Vérifiez votre utilisation sur Google AI Studio
- Attendez quelques minutes avant de réessayer
- Vérifiez les limites de votre compte

### Le serveur ne démarre pas
- Vérifiez que le package est bien installé : `npm list @google/generative-ai`
- Vérifiez les logs : `docker-compose -f docker-compose.dev.yml logs app`

