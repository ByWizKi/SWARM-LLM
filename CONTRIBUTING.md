# Guide de Contribution

## Règles de Collaboration

Ce document définit les règles pour contribuer au projet SWARM-LLM.

## Workflow Git

### Branches

Les branches doivent suivre la convention de nommage :

```
feature/<description-courte>
fix/<description-courte>
docs/<description-courte>
refactor/<description-courte>
```

Exemples :
- `feature/user-authentication`
- `fix/login-bug`
- `docs/update-api-docs`

### Commits

- Les commits doivent être petits et significatifs
- Les messages de commit doivent être clairs et en français
- Un commit = une modification logique

Exemples :
```
Ajouter bouton de déconnexion
Corriger bug recommandations premier pick
Mettre à jour documentation setup
```

### Push sur main

Les pushes directs sur `main` sont autorisés pour simplifier le workflow. Cependant :

- Assurez-vous que votre code fonctionne avant de push
- Testez localement avec Docker
- Évitez de push du code cassé

## Standards de Code

### Structure

- Utiliser TypeScript pour tout le code
- Suivre les conventions Next.js 14 (App Router)
- Commenter le code complexe en français

### Fichiers Importants

- **`lib/llm-prompt.ts`** : Modifier uniquement ce fichier pour les prompts LLM
- **`lib/rta-rules.ts`** : Règles de draft RTA (ne pas modifier sauf changement de règles officielles)
- **`app/draft/page.tsx`** : Interface principale de draft

### Tests

Avant de push :

1. Tester localement avec Docker
2. Vérifier que l'application démarre sans erreur
3. Tester les fonctionnalités modifiées

## Documentation

### Mettre à jour la documentation

Si vous modifiez une fonctionnalité :

1. Mettre à jour `README.md` si nécessaire
2. Mettre à jour `webapp/README-SETUP.md` si la configuration change
3. Mettre à jour `webapp/lib/LLM_README.md` si vous modifiez les prompts

### Ajouter de la documentation

- Utiliser le français pour toute la documentation
- Être clair et concis
- Inclure des exemples quand c'est pertinent

## Communication

- Communiquer avant de travailler sur les mêmes fichiers
- Demander de l'aide si nécessaire
- Partager les découvertes importantes

## Résolution de Conflits

Si un conflit Git survient :

1. Arrêter de push des changements
2. Informer l'équipe
3. Résoudre le conflit en collaboration
4. Tester après résolution

## Questions

Pour toute question, ouvrez une issue sur GitHub ou contactez l'équipe.
