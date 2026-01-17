"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box } from "lucide-react";

interface BoxStatsProps {
  initialStats: {
    monsterCount: number;
    hasBox: boolean;
  };
}

export function BoxStats({ initialStats }: BoxStatsProps) {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async (forceRefresh = false) => {
    if (status !== "authenticated") return;

    setLoading(true);
    try {
      const cacheOptions: RequestInit = forceRefresh
        ? { cache: 'no-store' as RequestCache, headers: { 'Cache-Control': 'no-cache' } }
        : {};

      const response = await fetch("/api/user/box", cacheOptions);
      const data = await response.json();
      const monsterCount = Array.isArray(data.monsters) ? data.monsters.length : 0;

      setStats({
        monsterCount,
        hasBox: monsterCount > 0,
      });
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error);
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Recharger les stats quand la page devient visible ou quand le box est sauvegardé
  useEffect(() => {
    if (status !== "authenticated") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadStats(true);
      }
    };

    const handleFocus = () => {
      loadStats(true);
    };

    // Écouter l'événement personnalisé quand le box est sauvegardé
    const handleBoxSaved = () => {
      console.log("[BOX_STATS] Box sauvegardé détecté, rechargement des stats...");
      loadStats(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("boxSaved", handleBoxSaved);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("boxSaved", handleBoxSaved);
    };
  }, [status, loadStats]);

  return (
    <Card className="border-2 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monstres dans le Box
          </CardTitle>
          <Box className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {loading ? "..." : stats.monsterCount}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {stats.hasBox ? "Collection configurée" : "Aucun monstre configuré"}
        </p>
      </CardContent>
    </Card>
  );
}
