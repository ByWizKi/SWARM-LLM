"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface BoxStatusCardProps {
  initialHasBox: boolean;
}

export function BoxStatusCard({ initialHasBox }: BoxStatusCardProps) {
  const { data: session, status } = useSession();
  const [hasBox, setHasBox] = useState(initialHasBox);
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

      setHasBox(monsterCount > 0);
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
      console.log("[BOX_STATUS] Box sauvegardé détecté, rechargement des stats...");
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
            Statut du Box
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {loading ? "..." : hasBox ? "Pret" : "Non configure"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {hasBox
            ? "Vous pouvez obtenir de l'aide pour votre draft"
            : "Configurez votre box pour commencer"}
        </p>
      </CardContent>
    </Card>
  );
}
