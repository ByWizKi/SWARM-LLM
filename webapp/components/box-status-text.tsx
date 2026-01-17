"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface BoxStatusTextProps {
  initialMonsterCount: number;
  initialHasBox: boolean;
}

export function BoxStatusText({ initialMonsterCount, initialHasBox }: BoxStatusTextProps) {
  const { status } = useSession();
  const [monsterCount, setMonsterCount] = useState(initialMonsterCount);
  const [hasBox, setHasBox] = useState(initialHasBox);

  const loadStats = useCallback(async (forceRefresh = false) => {
    if (status !== "authenticated") return;

    try {
      const cacheOptions: RequestInit = forceRefresh
        ? {
            cache: 'no-store' as RequestCache,
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          }
        : {};

      const url = forceRefresh
        ? `/api/user/box?t=${Date.now()}`
        : "/api/user/box";

      const response = await fetch(url, cacheOptions);

      if (!response.ok) return;

      const data = await response.json();
      const count = Array.isArray(data.monsters) ? data.monsters.length : 0;

      setMonsterCount(count);
      setHasBox(count > 0);
    } catch (error) {
      console.error("[BOX_STATUS_TEXT] Erreur lors du chargement:", error);
    }
  }, [status]);

  // Écouter l'événement boxSaved
  useEffect(() => {
    if (status !== "authenticated") return;

    const handleBoxSaved = () => {
      console.log("[BOX_STATUS_TEXT] Box sauvegardé détecté, rechargement...");
      loadStats(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadStats(true);
      }
    };

    const handleFocus = () => {
      loadStats(true);
    };

    window.addEventListener("boxSaved", handleBoxSaved);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("boxSaved", handleBoxSaved);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [status, loadStats]);

  if (hasBox) {
    return <>Votre box est configuré avec {monsterCount} monstres</>;
  }

  return <>Sélectionnez les monstres que vous possédez dans votre collection</>;
}
