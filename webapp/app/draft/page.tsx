"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RTADraftRules } from "@/lib/rta-rules";
import { MonsterCard } from "@/components/monster-card";

type Player = "A" | "B";

interface DraftState {
  playerAPicks: number[];
  playerBPicks: number[];
  playerABans: number[];
  playerBBans: number[];
  currentPhase: "picking" | "banning" | "completed";
  currentTurn: number;
  firstPlayer: Player;
}

export default function DraftPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [draftState, setDraftState] = useState<DraftState>({
    playerAPicks: [],
    playerBPicks: [],
    playerABans: [],
    playerBBans: [],
    currentPhase: "picking",
    currentTurn: 0,
    firstPlayer: "A", // Sera choisi par l'utilisateur
  });

  const [recommendations, setRecommendations] = useState<string>("");
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [tempPick, setTempPick] = useState<string>("");
  const [recommendedMonsterIds, setRecommendedMonsterIds] = useState<number[]>(
    []
  );
  const [userMonsters, setUserMonsters] = useState<number[]>([]);
  const [boxChecked, setBoxChecked] = useState(false);
  const [firstPlayerSelected, setFirstPlayerSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterElement, setFilterElement] = useState<string>("all");
  const [filterCategorie, setFilterCategorie] = useState<string>("all");
  const [allMonsters, setAllMonsters] = useState<Record<number, any>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      checkUserBox();
      loadAllMonsters();
    }
  }, [status]);

  const loadAllMonsters = async () => {
    try {
      const response = await fetch("/api/monsters");
      const data = await response.json();
      const monstersMap: Record<number, any> = {};
      (data.monstres || []).forEach((monster: any) => {
        monstersMap[monster.id] = monster;
      });
      setAllMonsters(monstersMap);
    } catch (error) {
      console.error("Erreur lors du chargement des monstres:", error);
    }
  };

  const checkUserBox = async () => {
    try {
      const response = await fetch("/api/user/box");
      const data = await response.json();
      const monsters = Array.isArray(data.monsters) ? data.monsters : [];
      setUserMonsters(monsters);

      if (monsters.length === 0) {
        setBoxChecked(true);
      } else {
        setBoxChecked(true);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du box:", error);
      setBoxChecked(true);
    }
  };

  // Calculer l'ordre ajusté selon le premier joueur
  const adjustedPickOrder = useMemo(() => {
    return draftState.firstPlayer === "B"
      ? RTADraftRules.pickOrder.map((p) => ({
          ...p,
          player: p.player === "A" ? "B" : ("A" as "A" | "B"),
        }))
      : RTADraftRules.pickOrder;
  }, [draftState.firstPlayer]);

  // Calculer l'état actuel du tour basé sur les picks effectués
  const currentTurnInfo = useMemo(() => {
    if (draftState.currentPhase !== "picking") {
      return null;
    }

    const totalPicks =
      draftState.playerAPicks.length + draftState.playerBPicks.length;
    const totalPossiblePicks = 10; // 5 par joueur

    if (totalPicks >= totalPossiblePicks) {
      return null; // Tous les picks sont terminés
    }

    // Trouver dans quel tour on se trouve en fonction du nombre de picks effectués
    let picksDone = 0;
    for (let turnIndex = 0; turnIndex < adjustedPickOrder.length; turnIndex++) {
      const turn = adjustedPickOrder[turnIndex];
      const picksBeforeThisTurn = picksDone;
      picksDone += turn.picks;

      if (totalPicks < picksDone) {
        // On est dans ce tour
        const picksDoneInThisTurn = totalPicks - picksBeforeThisTurn;
        const picksRemainingInTurn = turn.picks - picksDoneInThisTurn;

        // Calculer les picks restants pour ce joueur
        const playerPicksSoFar =
          turn.player === "A"
            ? draftState.playerAPicks.length
            : draftState.playerBPicks.length;
        const totalPicksForPlayer = adjustedPickOrder
          .filter((t) => t.player === turn.player)
          .reduce((sum, t) => sum + t.picks, 0);
        const picksRemainingForPlayer = totalPicksForPlayer - playerPicksSoFar;

        return {
          turn: turnIndex + 1,
          currentPlayer: turn.player,
          picksRemaining: picksRemainingInTurn,
          picksRemainingForPlayer,
          picksInThisTurn: turn.picks,
          picksDoneInThisTurn,
        };
      }
    }

    return null;
  }, [draftState, adjustedPickOrder]);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddPick = (player: Player, monsterId: number) => {
    if (draftState.currentPhase !== "picking") return;

    // Vérifier que c'est bien le tour du bon joueur
    if (currentTurnInfo && currentTurnInfo.currentPlayer !== player) {
      showNotification(`Ce n'est pas le tour du joueur ${player}`, "error");
      return;
    }

    // Vérifier qu'il reste des picks à faire dans ce tour
    if (currentTurnInfo && currentTurnInfo.picksRemaining <= 0) {
      return;
    }

    // Pour le joueur A, vérifier que le monstre est dans son box
    if (player === "A" && !userMonsters.includes(monsterId)) {
      showNotification("Ce monstre n'est pas dans votre box !", "error");
      return;
    }

    setDraftState((prev) => {
      const newState = { ...prev };

      // Vérifier les doublons
      if (
        newState.playerAPicks.includes(monsterId) ||
        newState.playerBPicks.includes(monsterId)
      ) {
        showNotification("Ce monstre a déjà été sélectionné !", "error");
        return prev;
      }

      // Ajouter le pick
      if (player === "A") {
        if (newState.playerAPicks.length >= 5) return prev;
        newState.playerAPicks = [...newState.playerAPicks, monsterId];
        showNotification(
          `${allMonsters[monsterId]?.nom || "Monstre"} ajouté à votre équipe !`,
          "success"
        );
      } else {
        if (newState.playerBPicks.length >= 5) return prev;
        newState.playerBPicks = [...newState.playerBPicks, monsterId];
        showNotification(
          `${
            allMonsters[monsterId]?.nom || "Monstre"
          } ajouté à l'équipe adverse`,
          "info"
        );
      }

      // Vérifier si on passe à la phase de bans
      if (
        newState.playerAPicks.length === 5 &&
        newState.playerBPicks.length === 5
      ) {
        newState.currentPhase = "banning";
        showNotification(
          "Phase de picks terminée ! Phase de bans commencée.",
          "info"
        );
      }

      return newState;
    });
  };

  // Obtenir les monstres disponibles pour le joueur A (dans son box, pas déjà pickés)
  const getAvailableMonstersForPlayerA = () => {
    const allPickedIds = [
      ...draftState.playerAPicks,
      ...draftState.playerBPicks,
    ];
    let available = userMonsters
      .filter((id) => !allPickedIds.includes(id))
      .map((id) => allMonsters[id])
      .filter((monster) => monster !== undefined);

    // Appliquer les filtres de recherche
    if (searchTerm) {
      available = available.filter((monster) =>
        monster.nom.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterElement !== "all") {
      available = available.filter(
        (monster) => monster.element === filterElement
      );
    }
    if (filterCategorie !== "all") {
      available = available.filter(
        (monster) => monster.categorie === filterCategorie
      );
    }

    return available;
  };

  // Obtenir tous les monstres disponibles pour le joueur B (pas déjà pickés, avec recherche)
  const getAvailableMonstersForPlayerB = () => {
    const allPickedIds = [
      ...draftState.playerAPicks,
      ...draftState.playerBPicks,
    ];
    let available = Object.values(allMonsters).filter(
      (monster) => !allPickedIds.includes(monster.id)
    );

    // Appliquer les filtres de recherche
    if (searchTerm) {
      available = available.filter((monster) =>
        monster.nom.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterElement !== "all") {
      available = available.filter(
        (monster) => monster.element === filterElement
      );
    }
    if (filterCategorie !== "all") {
      available = available.filter(
        (monster) => monster.categorie === filterCategorie
      );
    }

    return available;
  };

  const handleSelectFirstPlayer = (player: Player) => {
    setDraftState((prev) => ({
      ...prev,
      firstPlayer: player,
    }));
    setFirstPlayerSelected(true);
  };

  // Extraire les IDs de monstres recommandés depuis le texte de Gemini
  const extractRecommendedMonsters = useCallback(
    (text: string) => {
      const monsterMatches: Array<{ id: number; score: number }> = [];
      const textLower = text.toLowerCase();

      // En phase de picking : chercher les monstres disponibles pour le joueur A
      // En phase de banning : chercher les monstres de l'équipe adverse (Joueur B) à bannir
      let availableMonsters: any[] = [];

      if (draftState.currentPhase === "picking") {
        availableMonsters = Object.values(allMonsters).filter(
          (monster: any) =>
            !draftState.playerAPicks.includes(monster.id) &&
            !draftState.playerBPicks.includes(monster.id) &&
            userMonsters.includes(monster.id)
        );
      } else if (draftState.currentPhase === "banning") {
        // Pour le ban, on cherche dans l'équipe adverse (Joueur B)
        availableMonsters = draftState.playerBPicks
          .filter((id) => !draftState.playerABans.includes(id))
          .map((id) => allMonsters[id])
          .filter((monster) => monster !== undefined);
      }

      // Trier par pertinence : chercher d'abord les mentions explicites
      availableMonsters.forEach((monster: any) => {
        const monsterNameLower = monster.nom.toLowerCase();

        // Chercher différentes variations du nom
        const patterns = [
          // Nom exact avec word boundaries (plus précis)
          new RegExp(
            `\\b${monsterNameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i"
          ),
          // Nom dans une liste ou après "recommande", "suggère", "bannir", etc.
          new RegExp(
            `(?:recommande|suggère|conseille|choisir|picker|sélectionner|bannir|ban).*?${monsterNameLower.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )}`,
            "i"
          ),
          // Nom simple
          new RegExp(
            monsterNameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          ),
        ];

        patterns.forEach((pattern, index) => {
          if (pattern.test(text)) {
            // Les patterns plus précis (index 0, 1) ont plus de poids
            const score = index === 0 ? 3 : index === 1 ? 2 : 1;

            const existing = monsterMatches.find((m) => m.id === monster.id);
            if (!existing) {
              monsterMatches.push({ id: monster.id, score });
            } else if (score > existing.score) {
              existing.score = score;
            }
          }
        });
      });

      // Trier par score et prendre les meilleurs (5 pour picking, 3 pour banning)
      const maxResults = draftState.currentPhase === "banning" ? 3 : 5;
      const sorted = monsterMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map((m) => m.id);

      setRecommendedMonsterIds(sorted);
    },
    [
      allMonsters,
      draftState.playerAPicks,
      draftState.playerBPicks,
      draftState.playerABans,
      draftState.currentPhase,
      userMonsters,
    ]
  );

  const handleAddBan = (player: Player, monsterId: number) => {
    if (draftState.currentPhase !== "banning") return;

    setDraftState((prev) => {
      const newState = { ...prev };

      if (player === "A") {
        if (newState.playerABans.length >= 1) {
          showNotification("Vous avez déjà banni un monstre", "error");
          return prev;
        }
        if (!newState.playerBPicks.includes(monsterId)) {
          showNotification(
            "Ce monstre doit être dans l'équipe adverse",
            "error"
          );
          return prev;
        }
        newState.playerABans = [monsterId];
        showNotification(
          `${allMonsters[monsterId]?.nom || "Monstre"} banni !`,
          "success"
        );
      } else {
        if (newState.playerBBans.length >= 1) {
          return prev;
        }
        if (!newState.playerAPicks.includes(monsterId)) {
          return prev;
        }
        newState.playerBBans = [monsterId];
        showNotification(
          `${allMonsters[monsterId]?.nom || "Monstre"} banni par l'adversaire`,
          "info"
        );
      }

      // Vérifier si on passe à la phase complétée
      if (
        newState.playerABans.length === 1 &&
        newState.playerBBans.length === 1
      ) {
        newState.currentPhase = "completed";
        showNotification("Draft terminé !", "success");
      }

      return newState;
    });
  };

  const fetchRecommendation = useCallback(async () => {
    // Ne pas faire de recommandation si on n'est pas en phase de picking ou banning
    if (draftState.currentPhase === "completed") return;

    // Ne pas faire de recommandation si ce n'est pas le tour du joueur A
    if (
      draftState.currentPhase === "picking" &&
      currentTurnInfo?.currentPlayer !== "A"
    )
      return;

    // Ne pas faire de recommandation si on est en phase de banning mais que le joueur A a déjà banni
    if (
      draftState.currentPhase === "banning" &&
      draftState.playerABans.length > 0
    )
      return;

    // Permettre les recommandations même pour le premier pick du joueur A
    // (on a besoin de recommandations dès le début si c'est le joueur A qui commence)

    setLoadingRecommendation(true);
    const clientStart = performance.now();
    try {
      // Timeout supprimé pour les tests - laisser l'API répondre naturellement
      const fetchStart = performance.now();
      const response = await fetch("/api/draft/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerAPicks: draftState.playerAPicks,
          playerBPicks: draftState.playerBPicks,
          playerABans: draftState.playerABans,
          playerBBans: draftState.playerBBans,
          currentPhase: draftState.currentPhase,
          currentTurn: currentTurnInfo?.turn || 0,
          firstPlayer: draftState.firstPlayer,
        }),
      });

      const fetchTime = performance.now() - fetchStart;
      console.log(`[PERF] Temps de fetch API: ${fetchTime.toFixed(2)}ms`);

      const parseStart = performance.now();
      const data = await response.json();
      const parseTime = performance.now() - parseStart;
      console.log(`[PERF] Parsing JSON response: ${parseTime.toFixed(2)}ms`);

      if (response.ok && data.recommendation) {
        const extractStart = performance.now();
        setRecommendations(data.recommendation);
        // Extraire les IDs de monstres recommandés depuis la réponse
        extractRecommendedMonsters(data.recommendation);
        const extractTime = performance.now() - extractStart;
        console.log(
          `[PERF] Extraction des monstres recommandés: ${extractTime.toFixed(
            2
          )}ms`
        );
      } else {
        setRecommendations(
          "Erreur lors de la récupération des recommandations."
        );
        setRecommendedMonsterIds([]);
      }

      const totalClientTime = performance.now() - clientStart;
      console.log(
        `[PERF] Temps total côté client: ${totalClientTime.toFixed(2)}ms`
      );
    } catch (error) {
      console.error("Erreur:", error);
      if (error instanceof Error && error.name === "AbortError") {
        setRecommendations(
          "La requête a pris trop de temps. Veuillez réessayer."
        );
      } else {
        setRecommendations(
          "Erreur lors de la récupération des recommandations."
        );
      }
      setRecommendedMonsterIds([]);
    } finally {
      setLoadingRecommendation(false);
    }
  }, [draftState, currentTurnInfo, extractRecommendedMonsters]);

  // Générer automatiquement les recommandations quand le draft change
  // UNIQUEMENT pour le joueur A (quand c'est son tour ou en phase de ban)
  useEffect(() => {
    // Ne générer des recommandations que si :
    // 1. Le premier joueur est sélectionné
    // 2. C'est le tour du joueur A OU on est en phase de banning
    // 3. Le draft n'est pas terminé
    const shouldFetch =
      firstPlayerSelected &&
      draftState.currentPhase !== "completed" &&
      ((draftState.currentPhase === "picking" &&
        currentTurnInfo?.currentPlayer === "A") ||
        (draftState.currentPhase === "banning" &&
          draftState.playerABans.length === 0));

    if (!shouldFetch) {
      // Effacer immédiatement les recommandations quand ce n'est pas le tour du joueur A
      setRecommendations("");
      setRecommendedMonsterIds([]);
      setLoadingRecommendation(false);
      return;
    }

    // Délai réduit pour une réponse plus rapide
    // Si c'est le premier pick du joueur A, déclencher immédiatement
    const isFirstPick =
      draftState.playerAPicks.length === 0 &&
      draftState.playerBPicks.length === 0 &&
      currentTurnInfo?.currentPlayer === "A";
    const delay = isFirstPick ? 200 : 500; // 200ms pour le premier pick, 500ms pour les autres

    const timeoutId = setTimeout(() => {
      fetchRecommendation();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [
    draftState.playerAPicks.length,
    draftState.playerBPicks.length,
    draftState.currentPhase,
    draftState.playerABans.length,
    draftState.playerBBans.length,
    firstPlayerSelected,
    fetchRecommendation,
    currentTurnInfo?.currentPlayer,
  ]);

  if (status === "loading" || !boxChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Afficher un message si le box est vide
  if (boxChecked && userMonsters.length === 0) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Box de monstres requis</CardTitle>
              <CardDescription>
                Vous devez d'abord configurer votre box de monstres avant de
                pouvoir utiliser l'assistant de draft
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Pour utiliser l'assistant de draft, vous devez sélectionner les
                monstres que vous possédez dans votre collection.
              </p>
              <div className="flex gap-4">
                <Button asChild>
                  <Link href="/box">Gérer mon Box</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Retour au Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const playerAFinalMonsters = draftState.playerAPicks.filter(
    (id) => !draftState.playerBBans.includes(id)
  );
  const playerBFinalMonsters = draftState.playerBPicks.filter(
    (id) => !draftState.playerABans.includes(id)
  );

  // Si le premier joueur n'a pas été sélectionné, afficher l'écran de sélection
  if (!firstPlayerSelected) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-background">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Qui commence la draft ?</CardTitle>
              <CardDescription>
                Dans le jeu, le premier joueur est déterminé aléatoirement.
                Choisissez qui commence cette draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Le joueur qui commence aura l'avantage du premier pick. Dans le
                jeu, cela est déterminé aléatoirement par le système.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Button
                  size="lg"
                  onClick={() => handleSelectFirstPlayer("A")}
                  className="h-24 text-lg"
                >
                  Joueur A (Vous) commence
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleSelectFirstPlayer("B")}
                  className="h-24 text-lg"
                >
                  Joueur B (Adversaire) commence
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Obtenir les éléments et catégories uniques pour les filtres
  const elements = Array.from(
    new Set(
      Object.values(allMonsters)
        .filter((m) => m)
        .map((m) => m.element)
    )
  );
  const categories = Array.from(
    new Set(
      Object.values(allMonsters)
        .filter((m) => m)
        .map((m) => m.categorie)
    )
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-top-5 ${
            notification.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
              : notification.type === "error"
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
          }`}
        >
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête amélioré */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Assistant de Draft RTA
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {draftState.currentPhase === "picking" && currentTurnInfo
                ? `Tour ${currentTurnInfo.turn} - ${
                    currentTurnInfo.currentPlayer === "A"
                      ? "Votre tour"
                      : "Tour de l'adversaire"
                  }`
                : draftState.currentPhase === "banning"
                ? "Phase de bans"
                : "Draft terminé"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/box">Gérer mon Box</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraftState({
                  playerAPicks: [],
                  playerBPicks: [],
                  playerABans: [],
                  playerBBans: [],
                  currentPhase: "picking",
                  currentTurn: 0,
                  firstPlayer: "A",
                });
                setFirstPlayerSelected(false);
                setSearchTerm("");
                setFilterElement("all");
                setFilterCategorie("all");
                setRecommendations("");
                setRecommendedMonsterIds([]);
                showNotification("Nouvelle draft demarree", "info");
              }}
            >
              Nouvelle Draft
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche : Suivi du draft */}
          <div className="lg:col-span-2 space-y-4">
            {/* Équipe Joueur A */}
            <Card
              className={`transition-all duration-300 ${
                currentTurnInfo?.currentPlayer === "A" &&
                draftState.currentPhase === "picking"
                  ? "ring-2 ring-primary shadow-lg"
                  : ""
              }`}
            >
              <CardHeader className="bg-primary/5 dark:bg-primary/10">
                <CardTitle className="flex items-center justify-between">
                  <span>Équipe Joueur A (Vous)</span>
                  {currentTurnInfo?.currentPlayer === "A" &&
                    draftState.currentPhase === "picking" && (
                      <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full animate-pulse">
                        Votre tour
                      </span>
                    )}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold">Picks:</span>
                      <span
                        className={`font-bold ${
                          draftState.playerAPicks.length === 5
                            ? "text-green-600 dark:text-green-400"
                            : ""
                        }`}
                      >
                        {draftState.playerAPicks.length}/5
                      </span>
                    </span>
                    {draftState.currentPhase === "completed" && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">Finaux:</span>
                        <span className="font-bold text-primary">
                          {playerAFinalMonsters.length}/4
                        </span>
                      </span>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2 min-h-[100px] border-2 border-dashed border-muted rounded-lg p-4 bg-muted/20">
                    {draftState.playerAPicks.map((id, index) => (
                      <div
                        key={index}
                        className="animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <MonsterCard
                          monster={allMonsters[id]}
                          monsterId={id}
                          size="md"
                        />
                      </div>
                    ))}
                    {Array.from({
                      length: 5 - draftState.playerAPicks.length,
                    }).map((_, index) => (
                      <MonsterCard key={`empty-${index}`} />
                    ))}
                  </div>

                  {draftState.currentPhase !== "picking" &&
                    draftState.playerBBans.length > 0 && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <p className="text-sm text-red-600 dark:text-red-400 font-semibold mb-2">
                          Banni(s) par B ({draftState.playerBBans.length}/1):
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          {draftState.playerBBans.map((id) => (
                            <MonsterCard
                              key={id}
                              monster={allMonsters[id]}
                              monsterId={id}
                              size="sm"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {draftState.currentPhase === "picking" &&
                    currentTurnInfo?.currentPlayer === "A" && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Tour {currentTurnInfo.turn} - Joueur A -{" "}
                            {currentTurnInfo.picksRemaining} pick(s) restant(s)
                            dans ce tour
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Choisissez un monstre depuis votre box pour votre
                            prochain pick (
                            {currentTurnInfo.picksRemainingForPlayer} picks
                            restants au total)
                          </p>
                        </div>

                        {/* Filtres de recherche */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="search-monster" className="text-xs">
                              Recherche
                            </Label>
                            <Input
                              id="search-monster"
                              placeholder="Nom du monstre..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="filter-element" className="text-xs">
                              Élément
                            </Label>
                            <select
                              id="filter-element"
                              value={filterElement}
                              onChange={(e) => setFilterElement(e.target.value)}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              <option value="all">Tous</option>
                              {elements.map((elem) => (
                                <option key={elem} value={elem}>
                                  {elem}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label
                              htmlFor="filter-categorie"
                              className="text-xs"
                            >
                              Catégorie
                            </Label>
                            <select
                              id="filter-categorie"
                              value={filterCategorie}
                              onChange={(e) =>
                                setFilterCategorie(e.target.value)
                              }
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              <option value="all">Toutes</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4">
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {getAvailableMonstersForPlayerA().map((monster) => (
                              <MonsterCard
                                key={monster.id}
                                monster={monster}
                                onClick={() => {
                                  handleAddPick("A", monster.id);
                                  setSearchTerm(""); // Réinitialiser la recherche après sélection
                                }}
                                size="sm"
                                showDetails={false}
                                className="hover:scale-105 transition-transform cursor-pointer"
                              />
                            ))}
                            {getAvailableMonstersForPlayerA().length === 0 && (
                              <div className="col-span-full text-center py-4 text-sm text-muted-foreground">
                                {searchTerm ||
                                filterElement !== "all" ||
                                filterCategorie !== "all"
                                  ? "Aucun monstre trouvé avec ces filtres"
                                  : "Aucun monstre disponible dans votre box"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* Équipe Joueur B */}
            <Card
              className={`transition-all duration-300 ${
                currentTurnInfo?.currentPlayer === "B" &&
                draftState.currentPhase === "picking"
                  ? "ring-2 ring-orange-500 shadow-lg"
                  : ""
              }`}
            >
              <CardHeader className="bg-orange-50/50 dark:bg-orange-900/10">
                <CardTitle className="flex items-center justify-between">
                  <span>Équipe Joueur B (Adversaire)</span>
                  {currentTurnInfo?.currentPlayer === "B" &&
                    draftState.currentPhase === "picking" && (
                      <span className="text-xs px-2 py-1 bg-orange-500 text-white rounded-full animate-pulse">
                        Tour adversaire
                      </span>
                    )}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold">Picks:</span>
                      <span
                        className={`font-bold ${
                          draftState.playerBPicks.length === 5
                            ? "text-orange-600 dark:text-orange-400"
                            : ""
                        }`}
                      >
                        {draftState.playerBPicks.length}/5
                      </span>
                    </span>
                    {draftState.currentPhase === "completed" && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">Finaux:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {playerBFinalMonsters.length}/4
                        </span>
                      </span>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2 min-h-[100px] border-2 border-dashed border-muted rounded-lg p-4 bg-muted/10">
                    {draftState.playerBPicks.map((id, index) => (
                      <div
                        key={index}
                        className="animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <MonsterCard
                          monster={allMonsters[id]}
                          monsterId={id}
                          size="md"
                        />
                      </div>
                    ))}
                    {Array.from({
                      length: 5 - draftState.playerBPicks.length,
                    }).map((_, index) => (
                      <MonsterCard key={`empty-${index}`} />
                    ))}
                  </div>

                  {draftState.currentPhase !== "picking" &&
                    draftState.playerABans.length > 0 && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <p className="text-sm text-red-600 dark:text-red-400 font-semibold mb-2">
                          Banni(s) par A ({draftState.playerABans.length}/1):
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          {draftState.playerABans.map((id) => (
                            <MonsterCard
                              key={id}
                              monster={allMonsters[id]}
                              monsterId={id}
                              size="sm"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {draftState.currentPhase === "picking" &&
                    currentTurnInfo?.currentPlayer === "B" && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Tour {currentTurnInfo.turn} - Joueur B (Adversaire)
                            - {currentTurnInfo.picksRemaining} pick(s)
                            restant(s) dans ce tour
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Indiquez le(s) monstre(s) que l'adversaire a
                            selectionne dans le jeu (
                            {currentTurnInfo.picksRemainingForPlayer} picks
                            restants au total)
                          </p>
                        </div>

                        {/* Filtres de recherche */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <Label
                              htmlFor="search-monster-b"
                              className="text-xs"
                            >
                              Recherche
                            </Label>
                            <Input
                              id="search-monster-b"
                              placeholder="Nom du monstre..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="filter-element-b"
                              className="text-xs"
                            >
                              Élément
                            </Label>
                            <select
                              id="filter-element-b"
                              value={filterElement}
                              onChange={(e) => setFilterElement(e.target.value)}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              <option value="all">Tous</option>
                              {elements.map((elem) => (
                                <option key={elem} value={elem}>
                                  {elem}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label
                              htmlFor="filter-categorie-b"
                              className="text-xs"
                            >
                              Catégorie
                            </Label>
                            <select
                              id="filter-categorie-b"
                              value={filterCategorie}
                              onChange={(e) =>
                                setFilterCategorie(e.target.value)
                              }
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            >
                              <option value="all">Toutes</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4">
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {getAvailableMonstersForPlayerB().map((monster) => (
                              <MonsterCard
                                key={monster.id}
                                monster={monster}
                                onClick={() => {
                                  handleAddPick("B", monster.id);
                                  setSearchTerm(""); // Réinitialiser la recherche après sélection
                                }}
                                size="sm"
                                showDetails={false}
                                className="hover:scale-105 transition-transform cursor-pointer"
                              />
                            ))}
                            {getAvailableMonstersForPlayerB().length === 0 && (
                              <div className="col-span-full text-center py-4 text-sm text-muted-foreground">
                                {searchTerm ||
                                filterElement !== "all" ||
                                filterCategorie !== "all"
                                  ? "Aucun monstre trouvé avec ces filtres"
                                  : "Aucun monstre disponible"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {draftState.currentPhase === "picking" &&
                    !currentTurnInfo && (
                      <p className="text-sm text-muted-foreground">
                        Draft terminé - Phase de picks complétée
                      </p>
                    )}

                  {draftState.currentPhase === "banning" && (
                    <div className="space-y-4">
                      {/* Ban du joueur A */}
                      {draftState.playerABans.length === 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">
                            Joueur A - Bannir un monstre de l'équipe B:
                          </p>
                          <div className="max-h-[200px] overflow-y-auto border rounded-lg p-4">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {draftState.playerBPicks
                                .filter(
                                  (id) => !draftState.playerABans.includes(id)
                                )
                                .map((id) => (
                                  <MonsterCard
                                    key={id}
                                    monster={allMonsters[id]}
                                    monsterId={id}
                                    onClick={() => handleAddBan("A", id)}
                                    size="sm"
                                    showDetails={false}
                                    className="hover:scale-105 transition-transform cursor-pointer"
                                  />
                                ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ban du joueur B */}
                      {draftState.playerBBans.length === 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">
                            Joueur B - Bannir un monstre de l'équipe A:
                          </p>
                          <div className="max-h-[200px] overflow-y-auto border rounded-lg p-4">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {draftState.playerAPicks
                                .filter(
                                  (id) => !draftState.playerBBans.includes(id)
                                )
                                .map((id) => (
                                  <MonsterCard
                                    key={id}
                                    monster={allMonsters[id]}
                                    monsterId={id}
                                    onClick={() => handleAddBan("B", id)}
                                    size="sm"
                                    showDetails={false}
                                    className="hover:scale-105 transition-transform cursor-pointer"
                                  />
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* État du draft */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">État du Draft</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-background rounded">
                    <span className="text-sm font-medium">Phase:</span>
                    <span
                      className={`text-sm font-bold px-2 py-1 rounded ${
                        draftState.currentPhase === "picking"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : draftState.currentPhase === "banning"
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      }`}
                    >
                      {draftState.currentPhase === "picking"
                        ? "Picking"
                        : draftState.currentPhase === "banning"
                        ? "Banning"
                        : "Terminé"}
                    </span>
                  </div>
                  {currentTurnInfo && (
                    <>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-sm font-medium">Tour:</span>
                        <span className="text-sm font-bold">
                          {currentTurnInfo.turn}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-sm font-medium">
                          Joueur actuel:
                        </span>
                        <span
                          className={`text-sm font-bold px-2 py-1 rounded ${
                            currentTurnInfo.currentPlayer === "A"
                              ? "bg-primary/20 text-primary"
                              : "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                          }`}
                        >
                          {currentTurnInfo.currentPlayer}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-sm font-medium">
                          Picks restants:
                        </span>
                        <span className="text-sm font-bold">
                          {currentTurnInfo.picksRemaining}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between p-2 bg-background rounded">
                    <span className="text-sm font-medium">Premier joueur:</span>
                    <span className="text-sm font-bold">
                      {draftState.firstPlayer}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="text-center p-2 bg-primary/5 rounded">
                      <p className="text-xs text-muted-foreground">Picks A</p>
                      <p className="text-lg font-bold text-primary">
                        {draftState.playerAPicks.length}/5
                      </p>
                    </div>
                    <div className="text-center p-2 bg-orange-500/5 rounded">
                      <p className="text-xs text-muted-foreground">Picks B</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {draftState.playerBPicks.length}/5
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Chat IA avec recommandations */}
          <div className="lg:col-span-1">
            <Card
              className="sticky top-4 flex flex-col shadow-xl border-2"
              style={{ maxHeight: "calc(100vh - 2rem)" }}
            >
              <CardHeader className="flex-shrink-0 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">IA</span>
                  </div>
                  <span>Assistant IA</span>
                  {loadingRecommendation && (
                    <span className="ml-auto text-xs px-2 py-1 bg-primary/20 text-primary rounded-full animate-pulse">
                      Analyse...
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  {draftState.currentPhase === "picking" &&
                  currentTurnInfo?.currentPlayer === "A"
                    ? "Recommandations pour votre prochain pick"
                    : draftState.currentPhase === "banning" &&
                      draftState.playerABans.length === 0
                    ? "Recommandations pour votre ban"
                    : "En attente de votre tour"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {/* Monstres recommandés (cliquables) - Phase picking */}
                  {recommendedMonsterIds.length > 0 &&
                    draftState.currentPhase === "picking" &&
                    currentTurnInfo?.currentPlayer === "A" && (
                      <div className="space-y-3 mb-4 p-4 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border-2 border-primary/30 shadow-md animate-in fade-in slide-in-from-right-5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                          <p className="text-sm font-bold text-primary">
                            Monstres recommandés
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Cliquez sur un monstre pour le sélectionner rapidement
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {recommendedMonsterIds.map((monsterId, index) => {
                            const monster = allMonsters[monsterId];
                            if (!monster) return null;

                            return (
                              <div
                                key={monsterId}
                                onClick={() => {
                                  handleAddPick("A", monsterId);
                                }}
                                className="cursor-pointer group animate-in fade-in slide-in-from-bottom-2"
                                style={{ animationDelay: `${index * 100}ms` }}
                                title={`Sélectionner ${monster.nom}`}
                              >
                                <div className="relative">
                                  <MonsterCard
                                    monster={monster}
                                    monsterId={monsterId}
                                    size="sm"
                                    showDetails={false}
                                    className="border-2 border-primary/50 group-hover:border-primary group-hover:shadow-lg transition-all duration-200"
                                  />
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[8px] text-primary-foreground">
                                      +
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Suggestions de ban - Phase banning */}
                  {draftState.currentPhase === "banning" &&
                    draftState.playerABans.length === 0 &&
                    currentTurnInfo?.currentPlayer === "A" && (
                      <>
                        {recommendedMonsterIds.length > 0 && (
                          <div className="space-y-3 mb-4 p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-900/20 rounded-lg border-2 border-orange-300 dark:border-orange-700 shadow-md animate-in fade-in slide-in-from-right-5">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                                Monstres recommandés à bannir
                              </p>
                            </div>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">
                              Cliquez sur un monstre pour le bannir rapidement
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              {recommendedMonsterIds.map((monsterId, index) => {
                                const monster = allMonsters[monsterId];
                                if (!monster) return null;

                                return (
                                  <div
                                    key={monsterId}
                                    onClick={() => {
                                      handleAddBan("A", monsterId);
                                    }}
                                    className="cursor-pointer group animate-in fade-in slide-in-from-bottom-2"
                                    style={{
                                      animationDelay: `${index * 100}ms`,
                                    }}
                                    title={`Bannir ${monster.nom}`}
                                  >
                                    <div className="relative">
                                      <MonsterCard
                                        monster={monster}
                                        monsterId={monsterId}
                                        size="sm"
                                        showDetails={false}
                                        className="border-2 border-orange-400/50 group-hover:border-orange-500 group-hover:shadow-lg transition-all duration-200"
                                      />
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] text-white">
                                          ×
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {recommendations && (
                          <div className="space-y-2 mb-4 p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/30 dark:to-orange-900/20 rounded-lg border-2 border-orange-300 dark:border-orange-700 shadow-sm">
                            <p className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-2">
                              Analyse de ban :
                            </p>
                            <p className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed">
                              {recommendations}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                  {/* Message de l'IA */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm border border-primary/20">
                        <span className="text-sm font-bold text-primary">
                          IA
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {loadingRecommendation ? (
                          <div className="space-y-3 animate-in fade-in">
                            <div className="h-3 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-pulse"></div>
                            <div className="h-3 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-pulse w-4/5"></div>
                            <div className="h-3 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-pulse w-3/5"></div>
                          </div>
                        ) : recommendations &&
                          ((draftState.currentPhase === "picking" &&
                            currentTurnInfo?.currentPlayer === "A") ||
                            (draftState.currentPhase === "banning" &&
                              draftState.playerABans.length === 0)) ? (
                          <div className="whitespace-pre-wrap text-sm bg-gradient-to-br from-muted/80 to-muted/40 p-4 rounded-lg border border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              {recommendations}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic p-3 bg-muted/30 rounded-lg border border-dashed">
                            {draftState.currentPhase === "picking" &&
                            currentTurnInfo?.currentPlayer !== "A"
                              ? "En attente de votre tour pour les recommandations..."
                              : draftState.currentPhase === "banning" &&
                                draftState.playerABans.length > 0
                              ? "Ban effectue. En attente de la fin du draft..."
                              : "Selectionnez des monstres pour recevoir des recommandations automatiques..."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bouton de rafraîchissement (optionnel) */}
                {recommendations &&
                  ((draftState.currentPhase === "picking" &&
                    currentTurnInfo?.currentPlayer === "A") ||
                    (draftState.currentPhase === "banning" &&
                      draftState.playerABans.length === 0)) && (
                    <Button
                      onClick={fetchRecommendation}
                      disabled={loadingRecommendation}
                      variant="outline"
                      size="sm"
                      className="w-full border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      {loadingRecommendation ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                          Actualisation...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Actualiser les recommandations
                        </span>
                      )}
                    </Button>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
