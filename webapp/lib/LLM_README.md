# Guide LLM - Configuration des Recommandations IA

## Vue d'ensemble

Ce guide explique comment modifier les prompts et la configuration LLM pour les recommandations de draft. **Tout le code LLM est centralisé dans un seul fichier** pour faciliter le travail collaboratif.

## Fichier Principal

### `lib/llm-prompt.ts`

**C'est le SEUL fichier à modifier pour travailler sur les prompts et la configuration LLM.**

Ce fichier contient :
- Instructions système pour l'IA
- Templates de prompts
- Configuration LLM (modèle, température, etc.)
- Fonctions RAG (à implémenter)
- Pipeline de génération de recommandations

## Configuration Rapide

### 1. Modifier les Instructions Système

Éditez la constante `SYSTEM_INSTRUCTIONS` :

```typescript
export const SYSTEM_INSTRUCTIONS = `
Tu es un assistant expert de Summoners War RTA...
// Modifiez ce texte pour changer le comportement de l'IA
`;
```

### 2. Modifier les Prompts Utilisateur

Éditez la fonction `buildUserPrompt` :

```typescript
export function buildUserPrompt(
  draftContext: string,
  currentPhase: "picking" | "banning" | "completed",
  monsterNames?: {...}
): string {
  // Modifiez cette fonction pour changer la structure des prompts
}
```

### 3. Ajuster la Configuration LLM

Modifiez l'objet `LLM_CONFIG` :

```typescript
export const LLM_CONFIG = {
  models: ["gemini-2.5-flash"],
  temperature: 0.0,        // Déterminisme (0.0 = réponses prévisibles)
  maxOutputTokens: 300,    // Longueur maximale de la réponse
  topP: 0.6,              // Sampling nucleus
  topK: 10,                // Top-k sampling
};
```

## Phases de Draft

### Premier Pick du Joueur A

Pour le premier pick, l'IA reçoit :
- La liste des monstres disponibles dans le box de l'utilisateur
- Un prompt spécial court (max 50 mots)
- Instructions strictes pour recommander uniquement depuis la liste fournie

### Picks Suivants

Pour les picks suivants, l'IA reçoit :
- Le contexte complet du draft (picks des deux joueurs)
- Un prompt optimisé (max 60 mots)
- Les noms des monstres pour meilleure compréhension

### Phase de Bans

Pour les bans, l'IA reçoit :
- Le contexte du draft complet
- Un prompt court (max 40 mots)
- Instructions pour recommander des bans stratégiques

## Ajouter du RAG (Retrieval Augmented Generation)

La fonction `getRAGContext()` est prête à être implémentée :

```typescript
async function getRAGContext(draftState: DraftState): Promise<string> {
  // TODO: Implémenter la récupération de données contextuelles
  // Exemples :
  // - Historique de drafts similaires
  // - Statistiques de win rate
  // - Métadonnées de monstres
  return "";
}
```

## Collecte de Données

Les drafts sont automatiquement sauvegardés dans `data/draft-history.json` pour :
- Analyser les patterns
- Améliorer les prompts
- Implémenter du RAG basé sur l'historique

Accéder aux données via l'API : `GET /api/draft/data`

## Performance

Les prompts sont optimisés pour la vitesse :
- Instructions système courtes (~50 mots)
- Prompts utilisateur limités (40-60 mots)
- Modèle rapide : `gemini-2.5-flash`
- Paramètres optimisés pour la rapidité

## Dépannage

### Les recommandations ne s'affichent pas

1. Vérifier que `GEMINI_API_KEY` est configuré dans `.env`
2. Vérifier les logs dans la console Docker
3. Vérifier que c'est bien le tour du joueur A

### Les recommandations sont trop lentes

1. Réduire `maxOutputTokens` dans `LLM_CONFIG`
2. Raccourcir les prompts
3. Vérifier les quotas de l'API Gemini

### Les recommandations ne sont pas pertinentes

1. Ajuster `SYSTEM_INSTRUCTIONS`
2. Modifier les prompts dans `buildUserPrompt`
3. Ajuster `temperature` (0.0 = déterministe, 1.0 = créatif)

## Support

Pour toute question sur la configuration LLM, consultez le code dans `lib/llm-prompt.ts` ou ouvrez une issue sur GitHub.
