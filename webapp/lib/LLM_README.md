# LLM Prompt and RAG Configuration Guide

## Overview

This guide explains how to modify the LLM prompts and add RAG (Retrieval Augmented Generation) capabilities for your colleagues working on the draft recommendation system.

## File Structure

### Main File: `lib/llm-prompt.ts`

**This is the ONLY file you need to modify for LLM/prompt work.**

This file centralizes:
- System instructions for the AI
- Prompt templates
- LLM configuration (model, temperature, etc.)
- RAG functions
- Main recommendation generation pipeline

## Quick Start

### 1. Modify the System Instructions

Edit the `SYSTEM_INSTRUCTIONS` constant in `lib/llm-prompt.ts`:

```typescript
export const SYSTEM_INSTRUCTIONS = `
Tu es un assistant expert de Summoners War...
// Modify this to change how the AI behaves
`;
```

### 2. Modify the Prompt Templates

Edit the `buildUserPrompt` function to change how prompts are structured:

```typescript
export function buildUserPrompt(
  draftContext: string,
  currentPhase: "picking" | "banning" | "completed",
  monsterNames?: {...}
): string {
  // Modify this function to change the prompt structure
}
```

### 3. Adjust LLM Configuration

Modify the `LLM_CONFIG` object:

```typescript
export const LLM_CONFIG = {
  models: ["gemini-2.5-flash", ...],  // Change models
  temperature: 0.7,                   // 0.0 = deterministic, 1.0 = creative
  maxOutputTokens: 1500,               // Response length
  topP: 0.95,
  topK: 40,
};
```

### 4. Add RAG (Retrieval Augmented Generation)

Implement the `getRAGContext` function to add context from:
- Previous drafts
- Monster database
- Strategy guides
- Win rate statistics

```typescript
export async function getRAGContext(draftState: {...}): Promise<string> {
  // TODO: Implement your RAG logic here
  // Examples:
  // - Load similar drafts from saved data
  // - Query monster database for synergies
  // - Retrieve win rate statistics
  // - Get strategy recommendations from knowledge base

  return "";
}
```

## Draft Data Collection

### File: `lib/draft-data-collector.ts`

This module automatically saves all completed drafts to `data/draft-history.json`.

### Data Structure

Each draft is saved with:
- Picks and bans for both players
- Final teams (after bans)
- LLM recommendations
- Timestamps and metadata

### Accessing Draft Data

Use the exported functions:

```typescript
import { getDraftHistory, getDraftsWithMonster, exportDraftHistory } from "@/lib/draft-data-collector";

// Get all drafts
const allDrafts = await getDraftHistory();

// Get drafts with a specific monster
const drafts = await getDraftsWithMonster(monsterId);

// Export to CSV
const csv = await exportDraftHistory("csv");
```

### Data File Location

Drafts are saved to: `webapp/data/draft-history.json`

## Example: Adding RAG from Draft History

```typescript
export async function getRAGContext(draftState: {...}): Promise<string> {
  const { getDraftHistory, getDraftsWithMonster } = await import("./draft-data-collector");

  // Get similar drafts
  const similarDrafts = await getDraftsWithMonster(draftState.playerAPicks[0]);

  // Build context from similar drafts
  const context = similarDrafts
    .slice(0, 5) // Top 5 similar drafts
    .map(draft => `Previous draft: ${draft.finalTeamA.join(", ")} vs ${draft.finalTeamB.join(", ")}`)
    .join("\n");

  return context;
}
```

## Testing Your Changes

1. Modify `lib/llm-prompt.ts`
2. Restart the server: `docker-compose -f docker-compose.dev.yml restart app`
3. Test in the draft page
4. Check logs: `docker-compose -f docker-compose.dev.yml logs app --tail=50`

## Best Practices

1. **Keep prompts clear and specific**: The AI works better with clear instructions
2. **Test incrementally**: Make small changes and test each one
3. **Use RAG wisely**: Don't overload the prompt with too much context
4. **Monitor token usage**: Large prompts = higher costs
5. **Version your prompts**: Consider adding version numbers to track changes

## Troubleshooting

### LLM not responding correctly
- Check `SYSTEM_INSTRUCTIONS` - they might be too vague
- Adjust `temperature` - lower = more consistent, higher = more creative
- Verify model availability in `LLM_CONFIG.models`

### RAG not working
- Check that `getRAGContext` returns a string
- Verify data is being saved in `data/draft-history.json`
- Check console logs for errors

### Draft data not saving
- Check that `data/` directory exists and is writable
- Verify the draft phase is "completed" before saving
- Check server logs for errors

## Need Help?

- Check the main function `generateRecommendation` to understand the full pipeline
- Review `lib/gemini-client.ts` for LLM client details
- Check `lib/draft-data-collector.ts` for data collection functions

