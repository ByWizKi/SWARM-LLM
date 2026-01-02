/**
 * API Route to access draft data
 *
 * This endpoint allows colleagues to retrieve saved draft data for analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getDraftHistory,
  getDraftsByDateRange,
  getDraftsWithMonster,
  exportDraftHistory,
} from "@/lib/draft-data-collector";

/**
 * GET /api/draft/data
 * Retrieve draft history
 *
 * Query parameters:
 * - format: "json" | "csv" (default: "json")
 * - monsterId: Filter drafts containing this monster
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Require authentication
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    // }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "json";
    const monsterId = searchParams.get("monsterId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let drafts;

    // Filter by monster if specified
    if (monsterId) {
      drafts = await getDraftsWithMonster(parseInt(monsterId));
    }
    // Filter by date range if specified
    else if (startDate && endDate) {
      drafts = await getDraftsByDateRange(new Date(startDate), new Date(endDate));
    }
    // Get all drafts
    else {
      drafts = await getDraftHistory();
    }

    // Export in requested format
    if (format === "csv") {
      const csv = await exportDraftHistory("csv");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="draft-history-${new Date().toISOString()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      count: drafts.length,
      drafts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error retrieving draft data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}

