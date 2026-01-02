/**
 * Draft Data Collector
 *
 * This module saves draft picks and bans to a JSON file for analysis.
 * Your colleagues can use this data to:
 * - Analyze draft patterns
 * - Train models
 * - Study win rates
 * - Improve recommendations
 *
 * Data is saved to: data/draft-history.json
 */

import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface DraftData {
  id: string;
  timestamp: string;
  playerAPicks: number[];
  playerBPicks: number[];
  playerABans: number[];
  playerBBans: number[];
  firstPlayer: "A" | "B";
  finalTeamA: number[]; // After bans
  finalTeamB: number[]; // After bans
  recommendation?: string; // LLM recommendation if available
  metadata?: {
    userId?: string;
    duration?: number; // Draft duration in seconds
    [key: string]: any;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "draft-history.json");

/**
 * Ensure data directory exists
 */
async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Load existing draft history
 */
async function loadDraftHistory(): Promise<DraftData[]> {
  try {
    await ensureDataDir();

    if (!existsSync(DATA_FILE)) {
      return [];
    }

    const content = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("[DraftData] Error loading draft history:", error);
    return [];
  }
}

/**
 * Save draft history to file
 */
async function saveDraftHistory(history: DraftData[]): Promise<void> {
  try {
    await ensureDataDir();
    await writeFile(DATA_FILE, JSON.stringify(history, null, 2), "utf-8");
    console.log(
      `[DraftData] Saved ${history.length} draft records to ${DATA_FILE}`
    );
  } catch (error) {
    console.error("[DraftData] Error saving draft history:", error);
    throw error;
  }
}

/**
 * Save a draft to the history file
 *
 * @param draftData The draft data to save
 */
export async function saveDraft(
  draftData: Omit<DraftData, "id" | "timestamp">
): Promise<void> {
  try {
    const history = await loadDraftHistory();

    const newDraft: DraftData = {
      ...draftData,
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    history.push(newDraft);
    await saveDraftHistory(history);

    console.log(`[DraftData] Draft saved: ${newDraft.id}`);
  } catch (error) {
    console.error("[DraftData] Error saving draft:", error);
    // Don't throw - we don't want to break the app if saving fails
  }
}

/**
 * Get all draft history
 */
export async function getDraftHistory(): Promise<DraftData[]> {
  return await loadDraftHistory();
}

/**
 * Get drafts by date range
 */
export async function getDraftsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<DraftData[]> {
  const history = await loadDraftHistory();
  return history.filter((draft) => {
    const draftDate = new Date(draft.timestamp);
    return draftDate >= startDate && draftDate <= endDate;
  });
}

/**
 * Get drafts with specific monster picks
 */
export async function getDraftsWithMonster(
  monsterId: number
): Promise<DraftData[]> {
  const history = await loadDraftHistory();
  return history.filter(
    (draft) =>
      draft.playerAPicks.includes(monsterId) ||
      draft.playerBPicks.includes(monsterId) ||
      draft.finalTeamA.includes(monsterId) ||
      draft.finalTeamB.includes(monsterId)
  );
}

/**
 * Export draft history to a different format (CSV, etc.)
 */
export async function exportDraftHistory(
  format: "json" | "csv" = "json"
): Promise<string> {
  const history = await loadDraftHistory();

  if (format === "csv") {
    // Convert to CSV
    const headers = [
      "id",
      "timestamp",
      "playerAPicks",
      "playerBPicks",
      "playerABans",
      "playerBBans",
      "firstPlayer",
      "finalTeamA",
      "finalTeamB",
    ];

    const rows = history.map((draft) => [
      draft.id,
      draft.timestamp,
      draft.playerAPicks.join(";"),
      draft.playerBPicks.join(";"),
      draft.playerABans.join(";"),
      draft.playerBBans.join(";"),
      draft.firstPlayer,
      draft.finalTeamA.join(";"),
      draft.finalTeamB.join(";"),
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  return JSON.stringify(history, null, 2);
}
