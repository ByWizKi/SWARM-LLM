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
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StarRating } from "@/components/ui/star-rating";
import {
  Lightbulb,
  Target,
  Ban,
  Clock,
  Check,
  RefreshCw,
  HelpCircle,
  Loader2
} from "lucide-react";

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

interface ChatMessage {
  id: string;
  type: "recommendation" | "choice_selected" | "choice_proposed" | "opponent_selected" | "ban_selected";
  timestamp: Date;
  recommendationText?: string;
  proposedMonsterIds?: number[];
  selectedMonsterIds?: number[];
  phase: "picking" | "banning" | "completed";
  turn?: number;
  textRating?: number; // Note du texte entre 0 et 5 (étoiles)
  monsterRecommendationRating?: number; // Note des monstres entre 0 et 5 (étoiles)
  player?: "A" | "B"; // Joueur qui a fait le choix
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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userMonsters, setUserMonsters] = useState<number[]>([]);
  const [boxChecked, setBoxChecked] = useState(false);
  const [firstPlayerSelected, setFirstPlayerSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterElement, setFilterElement] = useState<string>("all");
  const [filterCategorie, setFilterCategorie] = useState<string>("all");
  const [allMonsters, setAllMonsters] = useState<Record<number, any>>({});
  const [fastResponse, setFastResponse] = useState<boolean>(true);
  const [mode, setMode] = useState(0);
  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    console.log("Mode changed:", mode)
  }, [mode])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const checkUserBox = useCallback(async (forceRefresh = false) => {
    try {
      // Forcer le rechargement sans cache si demandé
      const cacheOptions: RequestInit = forceRefresh
        ? { cache: 'no-store' as RequestCache, headers: { 'Cache-Control': 'no-cache' } }
        : {};

      const response = await fetch("/api/user/box", cacheOptions);
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
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      checkUserBox();
      loadAllMonsters();
    }
  }, [status, checkUserBox]);

  // Recharger le box quand la page devient visible (après retour depuis une autre page)
  useEffect(() => {
    if (status === "authenticated") {
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          // Forcer le rechargement sans cache quand la page redevient visible
          checkUserBox(true);
        }
      };

      const handleFocus = () => {
        // Forcer le rechargement sans cache quand la fenêtre reprend le focus
        checkUserBox(true);
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleFocus);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [status, checkUserBox]);

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

    // Vérifier si le monstre était recommandé (pour le joueur A uniquement)
    const wasRecommended = player === "A" && recommendedMonsterIds.includes(monsterId);

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

        // Ajouter à l'historique du chat (toujours pour le joueur A)
        // Vérifier qu'on n'ajoute pas un doublon
        setChatHistory((prev) => {
          const messageId = `choice-A-${monsterId}-${draftState.currentPhase}-${currentTurnInfo?.turn || '0'}`;
          // Vérifier si ce message existe déjà
          const exists = prev.some(msg =>
            msg.type === "choice_selected" &&
            msg.player === "A" &&
            msg.selectedMonsterIds?.includes(monsterId) &&
            msg.phase === draftState.currentPhase &&
            msg.turn === currentTurnInfo?.turn
          );
          if (exists) return prev;

          return [
            ...prev,
            {
              id: messageId,
              type: "choice_selected",
              timestamp: new Date(),
              selectedMonsterIds: [monsterId],
              phase: draftState.currentPhase,
              turn: currentTurnInfo?.turn,
              player: "A",
            },
          ];
        });
      } else {
        if (newState.playerBPicks.length >= 5) return prev;
        newState.playerBPicks = [...newState.playerBPicks, monsterId];
        showNotification(
          `${
            allMonsters[monsterId]?.nom || "Monstre"
          } ajouté à l'équipe adverse`,
          "info"
        );

        // Ajouter le choix du joueur B à l'historique du chat
        // Vérifier qu'on n'ajoute pas un doublon
        setChatHistory((prev) => {
          const messageId = `choice-B-${monsterId}-${draftState.currentPhase}-${currentTurnInfo?.turn || '0'}`;
          // Vérifier si ce message existe déjà
          const exists = prev.some(msg =>
            msg.type === "choice_selected" &&
            msg.player === "B" &&
            msg.selectedMonsterIds?.includes(monsterId) &&
            msg.phase === draftState.currentPhase &&
            msg.turn === currentTurnInfo?.turn
          );
          if (exists) return prev;

          return [
            ...prev,
            {
              id: messageId,
              type: "choice_selected",
              timestamp: new Date(),
              selectedMonsterIds: [monsterId],
              phase: draftState.currentPhase,
              turn: currentTurnInfo?.turn,
              player: "B",
            },
          ];
        });
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
    (text: string): number[] => {
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
      return sorted;
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

        // Ajouter le ban du joueur A à l'historique du chat
        // Vérifier qu'on n'ajoute pas un doublon
        setChatHistory((prev) => {
          const messageId = `ban-A-${monsterId}`;
          // Vérifier si ce message existe déjà
          const exists = prev.some(msg =>
            msg.type === "choice_selected" &&
            msg.player === "A" &&
            msg.phase === "banning" &&
            msg.selectedMonsterIds?.includes(monsterId)
          );
          if (exists) return prev;

          return [
            ...prev,
            {
              id: messageId,
              type: "choice_selected",
              timestamp: new Date(),
              selectedMonsterIds: [monsterId],
              phase: "banning",
              turn: undefined,
              player: "A",
            },
          ];
        });
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

        // Ajouter le ban du joueur B à l'historique du chat
        // Vérifier qu'on n'ajoute pas un doublon
        setChatHistory((prev) => {
          const messageId = `ban-B-${monsterId}`;
          // Vérifier si ce message existe déjà
          const exists = prev.some(msg =>
            msg.type === "choice_selected" &&
            msg.player === "B" &&
            msg.phase === "banning" &&
            msg.selectedMonsterIds?.includes(monsterId)
          );
          if (exists) return prev;

          return [
            ...prev,
            {
              id: messageId,
              type: "choice_selected",
              timestamp: new Date(),
              selectedMonsterIds: [monsterId],
              phase: "banning",
              turn: undefined,
              player: "B",
            },
          ];
        });
      }

      // Vérifier si on passe à la phase complétée
      if (
        newState.playerABans.length === 1 &&
        newState.playerBBans.length === 1
      ) {
        newState.currentPhase = "completed";
        showNotification("Draft terminé ! Vous pouvez maintenant enregistrer le draft et indiquer le gagnant.", "success");
      }

      return newState;
    });
  };

  const handleSaveDraft = async () => {
    if (!winner) {
      showNotification("Veuillez sélectionner le gagnant avant d'enregistrer", "error");
      return;
    }

    setSavingDraft(true);
    try {
      // Préparer les données de recommandations (phase picking)
      const pickingRecommendations = chatHistory
        .filter((msg) => msg.type === "recommendation" && msg.phase === "picking")
        .map((msg) => ({
          messageId: msg.id,
          text: msg.recommendationText || "",
          proposedMonsterIds: msg.proposedMonsterIds || [],
          phase: msg.phase,
          turn: msg.turn,
          textRating: msg.textRating ?? null,
          monsterRecommendationRating: msg.monsterRecommendationRating ?? null,
          timestamp: msg.timestamp.toISOString(),
        }));

      // Préparer les données de recommandations de ban (phase banning)
      const banRecommendations = chatHistory
        .filter((msg) => msg.type === "recommendation" && msg.phase === "banning")
        .map((msg) => ({
          messageId: msg.id,
          text: msg.recommendationText || "",
          proposedMonsterIds: msg.proposedMonsterIds || [],
          phase: msg.phase,
          timestamp: msg.timestamp.toISOString(),
        }));

      // Calculer la durée du draft
      const draftStartTime = chatHistory.length > 0
        ? chatHistory[0].timestamp
        : new Date();
      const draftDuration = Math.round((Date.now() - draftStartTime.getTime()) / 1000 / 60); // en minutes

      const response = await fetch("/api/drafts/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstPlayer: draftState.firstPlayer,
          winner: winner,
          playerAPicks: draftState.playerAPicks,
          playerBPicks: draftState.playerBPicks,
          playerABans: draftState.playerABans,
          playerBBans: draftState.playerBBans,
          recommendations: pickingRecommendations,
          banRecommendations: banRecommendations.length > 0 ? banRecommendations : undefined,
          metadata: {
            duration: draftDuration, // en minutes
            mode: mode, // Mode LLM utilisé (0: Gemini, 1: Neural Network, 2: LLM fine-tuned)
            totalRecommendations: chatHistory.filter((msg) => msg.type === "recommendation").length,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showNotification(data.error || "Erreur lors de l'enregistrement du draft", "error");
        return;
      }

      setDraftSaved(true);
      showNotification("Draft enregistré avec succès !", "success");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du draft:", error);
      showNotification("Erreur lors de l'enregistrement du draft", "error");
    } finally {
      setSavingDraft(false);
    }
  };


  const fetchLongRecommendation = async (messageId: string,monster_recommended:any) => {
    try {
      console.log("DraftState:", draftState);
      console.log("recommended_monster:", monster_recommended);
      const fetchexplicationoStart = performance.now();
      const longResponse = await fetch("/api/draft/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerAPicks: [...draftState.playerAPicks,...monster_recommended],//On ajoute les choix du neural net pour que l'explication soit juste
          playerBPicks: draftState.playerBPicks,
          playerABans: draftState.playerABans,
          playerBBans: draftState.playerBBans,
          currentPhase: "advice",
          currentTurn: currentTurnInfo?.turn || 0,
          firstPlayer: draftState.firstPlayer,
          playerAAvailableIds: getAvailableMonstersForPlayerA().map(m => m.id).filter(
  (id) => !monster_recommended.includes(id)),
          mode:3,//On met 3 pour le mode pour dire que c'est juste une explication par le llm
        }),
      });//Ici on récupère la réponse du llm 

      const longData = await longResponse.json();
      const fetchTime = performance.now() - fetchexplicationoStart;
      console.log(`[PERF] Temps de fetch API pour l'explication : ${fetchTime.toFixed(2)}ms`);
      // Mettre à jour le message existant avec le texte long
      setChatHistory((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                recommendationText: (msg.recommendationText ?? "").slice(0, -32) + "\n\n" + longData.recommendation
              }
            : msg
        )
      );
      

    } catch (error) {
      console.error("[DRAFT] Erreur fetch long recommendation:", error);
    }
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

      let response;
      try {
        response = await fetch("/api/draft/recommend", {
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
          playerAAvailableIds:getAvailableMonstersForPlayerA().map(m => m.id),//ajout des monstres possibles pour le llm
            mode//on gère la réponse via le modèle interne
        }),
      });
      } catch (fetchError: any) {
        console.error("[DRAFT] Erreur de fetch:", fetchError);
        if (fetchError.message?.includes("fetch failed") || fetchError.code === "ECONNREFUSED") {
          throw new Error("Impossible de se connecter au serveur. Veuillez vérifier votre connexion et réessayer.");
        }
        throw fetchError;
      }

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
        const extractedIds = extractRecommendedMonsters(data.recommendation);

        // Créer un ID unique pour le message
        const messageId = `rec-${Date.now()}-${Math.random()}`;

        // Ajouter la recommandation à l'historique du chat avec une note par défaut
        setChatHistory((prev) => [
          ...prev,
          {
            id: messageId,
            type: "recommendation",
            timestamp: new Date(),
            recommendationText: data.recommendation,
            proposedMonsterIds: extractedIds.length > 0 ? extractedIds : undefined,
            phase: draftState.currentPhase,
            turn: currentTurnInfo?.turn,
            textRating: undefined,
            monsterRecommendationRating: undefined,
          },
        ]);
        if (mode==1){
          fetchLongRecommendation(messageId,extractedIds)
        }

        // Charger les notes existantes si elles existent (peu probable pour un nouveau message, mais pour la cohérence)
        try {
          const ratingResponse = await fetch(`/api/recommendations/rating?messageId=${messageId}`);
          if (ratingResponse.ok) {
            const ratingData = await ratingResponse.json();
            if (ratingData.textRating !== null || ratingData.monsterRecommendationRating !== null) {
              setChatHistory((prev) =>
                prev.map((msg) =>
                  msg.id === messageId
                    ? {
                        ...msg,
                        textRating: ratingData.textRating ?? undefined,
                        monsterRecommendationRating: ratingData.monsterRecommendationRating ?? undefined,
                      }
                    : msg
                )
              );
            }
          }
        } catch (error) {
          // Ignorer l'erreur si le message n'a pas encore de note (cas normal pour un nouveau message)
        }

        const extractTime = performance.now() - extractStart;
        console.log(
          `[PERF] Extraction des monstres recommandés: ${extractTime.toFixed(
            2
          )}ms`
        );
      } else {
        // Gérer les erreurs de réponse
        const errorMsg = data.error || "Erreur lors de la récupération des recommandations.";
        const detailsMsg = data.details ? `\n\n${data.details}` : "";
        console.error("[DRAFT] Erreur de réponse API:", response.status, data);
        setRecommendations(errorMsg + detailsMsg);
        setRecommendedMonsterIds([]);
      }

      const totalClientTime = performance.now() - clientStart;
      console.log(
        `[PERF] Temps total côté client: ${totalClientTime.toFixed(2)}ms`
      );
    } catch (error) {
      console.error("[DRAFT] Erreur lors de la génération de recommandation:", error);

      let errorMessage = "Erreur lors de la génération de recommandation";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "La requête a pris trop de temps. Veuillez réessayer.";
        } else if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
          errorMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion.";
        } else if (error.message) {
          errorMessage = error.message;
        }
      }

      setRecommendations(errorMessage + "\n\nVeuillez vérifier votre configuration et réessayer.");
      setRecommendedMonsterIds([]);
    } finally {
      setLoadingRecommendation(false);
    }
  }, [draftState, currentTurnInfo, extractRecommendedMonsters,mode]);

  // Générer automatiquement les recommandations quand le draft change
  // UNIQUEMENT pour le joueur A (quand c'est son tour ou en phase de ban)
  useEffect(() => {
    if (true) {
    console.log("[AUTO RECO] désactivé");
    return;
  }

  console.log("[AUTO RECO] activé");

    // Délai pour éviter trop de requêtes
    const timeoutId = setTimeout(() => {
      if (draftState.currentPhase !== "completed" && firstPlayerSelected) {
        // Vérifier que c'est le tour du joueur A ou la phase de banning pour le joueur A
        const isPlayerATurn = currentTurnInfo?.currentPlayer === "A" && draftState.currentPhase === "picking";
        const isPlayerABanning = draftState.currentPhase === "banning" && draftState.playerABans.length < draftState.playerBBans.length;

        if (isPlayerATurn || isPlayerABanning) {
          fetchRecommendation();
        }
      }
    }, 800); // Attendre 800ms après le dernier changement pour éviter trop de requêtes

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
                Vous devez d&apos;abord configurer votre box de monstres avant de
                pouvoir utiliser l&apos;assistant de draft
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Pour utiliser l&apos;assistant de draft, vous devez sélectionner les
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
                Le joueur qui commence aura l&apos;avantage du premier pick. Dans le
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
                      : "Tour de l&apos;adversaire"
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
                setChatHistory([]);
                setWinner(null);
                setDraftSaved(false);
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
                            Indiquez le(s) monstre(s) que l&apos;adversaire a
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
                            Joueur A - Bannir un monstre de l&apos;équipe B:
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
                            Joueur B - Bannir un monstre de l&apos;équipe A:
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

            {/* Section Sauvegarde du draft - Afficher quand la draft est terminée */}
            {draftState.currentPhase === "completed" && (
              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/20 border-2 border-green-300 dark:border-green-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-green-700 dark:text-green-300">Draft Terminée</span>
                    {draftSaved && (
                      <span className="text-xs px-2 py-1 bg-green-500 text-white rounded-full">
                        Enregistrée
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Enregistrez cette draft avec le gagnant pour l&apos;analyser plus tard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      Qui a gagné cette draft ?
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={winner === "A" ? "default" : "outline"}
                        onClick={() => setWinner("A")}
                        className={`h-16 ${
                          winner === "A"
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                        disabled={draftSaved}
                      >
                        <div className="text-center">
                          <div className="font-bold">Joueur A</div>
                          <div className="text-xs opacity-80">(Vous)</div>
                        </div>
                      </Button>
                      <Button
                        variant={winner === "B" ? "default" : "outline"}
                        onClick={() => setWinner("B")}
                        className={`h-16 ${
                          winner === "B"
                            ? "bg-orange-500 text-white"
                            : ""
                        }`}
                        disabled={draftSaved}
                      >
                        <div className="text-center">
                          <div className="font-bold">Joueur B</div>
                          <div className="text-xs opacity-80">(Adversaire)</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveDraft}
                    disabled={!winner || savingDraft || draftSaved}
                    className="w-full"
                    size="lg"
                  >
                    {savingDraft ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enregistrement en cours...
                      </>
                    ) : draftSaved ? (
                      <>
                        ✓ Draft enregistrée
                      </>
                    ) : (
                      <>
                        Enregistrer le draft avec le gagnant
                      </>
                    )}
                  </Button>
                  {draftSaved && (
                    <p className="text-xs text-center text-muted-foreground">
                      Cette draft a été enregistrée dans votre historique pour analyse
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

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
                <CardDescription className="mt-2 flex items-center gap-2">
                  {draftState.currentPhase === "picking" &&
                  currentTurnInfo?.currentPlayer === "A" ? (
                    <>
                      <Lightbulb className="w-3 h-3" />
                      Recommandations pour votre prochain pick
                    </>
                  ) : draftState.currentPhase === "banning" &&
                    draftState.playerABans.length === 0 ? (
                    <>
                      <Ban className="w-3 h-3" />
                      Recommandations pour votre ban
                    </>
                  ) : draftState.currentPhase === "picking" ? (
                    <>
                      <Clock className="w-3 h-3" />
                      En attente de votre tour...
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      Draft terminé
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 mb-4">
                  {/* Historique du chat */}
                  <div className="space-y-4">
                    {chatHistory.length === 0 && !loadingRecommendation && (
                      <div className="space-y-3">
                        {/* Message de bienvenue pour les novices */}
                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-4 rounded-lg border-2 border-primary/30 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <HelpCircle className="w-4 h-4 text-primary" />
                        </div>
                            <div className="flex-1 space-y-2">
                              <h4 className="text-sm font-bold text-primary">Bienvenue dans l&apos;Assistant IA !</h4>
                              <div className="text-xs text-muted-foreground space-y-1.5">
                                <p className="flex items-center gap-1">
                                  <strong>Comment ça marche ?</strong>
                                </p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                  <li>L&apos;IA analyse automatiquement votre draft et vous propose des recommandations</li>
                                  <li>Cliquez sur les <strong className="text-primary">monstres proposés</strong> pour les sélectionner rapidement</li>
                                  <li>Évaluez la qualité des recommandations avec le curseur (1-5 étoiles)</li>
                                  <li>L&apos;historique complet de vos choix et ceux de l&apos;adversaire s&apos;affiche ici</li>
                                </ul>
                                <p className="mt-2 pt-2 border-t border-primary/20 flex items-center gap-1">
                                  <Lightbulb className="w-3 h-3 flex-shrink-0" />
                                  <strong>Astuce :</strong> Les recommandations s&apos;améliorent avec vos retours !
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Message contextuel selon la situation */}
                        <div className="text-sm text-muted-foreground italic p-3 bg-muted/30 rounded-lg border border-dashed flex items-start gap-2">
                          {draftState.currentPhase === "picking" &&
                          currentTurnInfo?.currentPlayer !== "A" ? (
                            <>
                              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>En attente de votre tour... L&apos;IA vous proposera des recommandations dès que ce sera votre tour.</span>
                            </>
                          ) : draftState.currentPhase === "banning" &&
                            draftState.playerABans.length > 0 ? (
                            <>
                              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>Ban effectué. En attente de la fin du draft...</span>
                            </>
                          ) : draftState.currentPhase === "picking" ? (
                            <>
                              <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>Sélectionnez un monstre ci-dessus pour recevoir votre première recommandation IA !</span>
                            </>
                          ) : (
                            <span>Commencez par sélectionner qui joue en premier (A ou B)</span>
                          )}
                        </div>
                      </div>
                    )}

                    {chatHistory.map((message) => (
                      <div key={message.id} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 overflow-hidden">
                        {/* Message de recommandation */}
                        {message.type === "recommendation" && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm border border-primary/20">
                              <span className="text-xs font-bold text-primary">IA</span>
                      </div>
                            <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
                              {message.recommendationText && (
                                <div className="text-xs bg-gradient-to-br from-muted/80 to-muted/40 p-3 rounded-lg border border-border/50 shadow-sm break-words overflow-wrap-anywhere">
                                  <MarkdownRenderer
                                    content={message.recommendationText}
                                    className="text-foreground break-words"
                                  />
                    </div>
                              )}
                              {message.proposedMonsterIds && message.proposedMonsterIds.length > 0 && (
                                <div className="space-y-2 mt-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                    <span className="text-xs font-semibold text-primary">
                                      {message.phase === "picking" ? "Monstres recommandés" : "Monstres recommandés à bannir"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    {message.phase === "picking" ? (
                                      <Lightbulb className="w-3 h-3 text-primary flex-shrink-0" />
                                    ) : (
                                      <Ban className="w-3 h-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      Cliquez sur un monstre pour {message.phase === "picking" ? "le sélectionner" : "le bannir"} rapidement
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {message.proposedMonsterIds.map((monsterId) => {
                            const monster = allMonsters[monsterId];
                            if (!monster) return null;

                                      // Vérifier si le monstre peut encore être sélectionné
                                      const isAlreadyPicked = draftState.playerAPicks.includes(monsterId) ||
                                                             draftState.playerBPicks.includes(monsterId);
                                      const isInUserBox = userMonsters.includes(monsterId);
                                      const canSelect = message.phase === "picking"
                                        ? isInUserBox && !isAlreadyPicked && currentTurnInfo?.currentPlayer === "A"
                                        : message.phase === "banning"
                                          ? draftState.playerBPicks.includes(monsterId) && draftState.playerABans.length === 0
                                          : false;

                                      // Déterminer le message d'aide
                                      let tooltipText = monster.nom;
                                      if (!canSelect) {
                                        if (isAlreadyPicked) {
                                          tooltipText = `${monster.nom} - Déjà sélectionné`;
                                        } else if (message.phase === "picking" && !isInUserBox) {
                                          tooltipText = `${monster.nom} - Pas dans votre box`;
                                        } else if (message.phase === "picking" && currentTurnInfo?.currentPlayer !== "A") {
                                          tooltipText = `${monster.nom} - Attendez votre tour`;
                                        } else if (message.phase === "banning" && !draftState.playerBPicks.includes(monsterId)) {
                                          tooltipText = `${monster.nom} - Doit être dans l'équipe adverse`;
                                        } else if (message.phase === "banning" && draftState.playerABans.length > 0) {
                                          tooltipText = `${monster.nom} - Ban déjà effectué`;
                                        }
                                      } else {
                                        tooltipText = `Cliquez pour ${message.phase === "picking" ? "sélectionner" : "bannir"} ${monster.nom}`;
                                      }

                            return (
                              <div
                                key={monsterId}
                                onClick={() => {
                                            if (canSelect) {
                                              if (message.phase === "picking") {
                                  handleAddPick("A", monsterId);
                                              } else if (message.phase === "banning") {
                                                handleAddBan("A", monsterId);
                                              }
                                            }
                                }}
                                          className={`cursor-pointer group animate-in fade-in slide-in-from-bottom-2 ${
                                            canSelect ? "" : "opacity-50 cursor-not-allowed"
                                          }`}
                                          title={tooltipText}
                              >
                                          <div className="relative scale-90 origin-center">
                                  <MonsterCard
                                    monster={monster}
                                    monsterId={monsterId}
                                    size="sm"
                                    showDetails={false}
                                              className={`border-2 transition-all duration-200 ${
                                                message.phase === "picking"
                                                  ? canSelect
                                                    ? "border-primary/50 group-hover:border-primary group-hover:shadow-lg"
                                                    : "border-muted/30"
                                                  : canSelect
                                                    ? "border-orange-400/50 group-hover:border-orange-500 group-hover:shadow-lg"
                                                    : "border-muted/30"
                                              }`}
                                            />
                                            {canSelect && (
                                              <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                                                message.phase === "picking" ? "bg-primary" : "bg-orange-500"
                                              }`}>
                                                <span className={`text-[6px] ${
                                                  message.phase === "picking" ? "text-primary-foreground" : "text-white"
                                                }`}>
                                                  {message.phase === "picking" ? "+" : "×"}
                                    </span>
                                  </div>
                                            )}
                                            {isAlreadyPicked && (
                                              <div className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-white" />
                                              </div>
                                            )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-2.5 h-2.5 text-muted-foreground/70 flex-shrink-0" />
                                <span className="text-[9px] text-muted-foreground/70">
                                  Tour {message.turn || "?"} - {message.phase === "picking" ? "Picking" : "Banning"}
                                </span>
                              </div>
                              {/* Système de notation par étoiles */}
                              <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                                {/* Notation du texte */}
                            <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                                    <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                                      Texte:
                                    </span>
                            </div>
                                  <StarRating
                                    value={message.textRating ?? 0}
                                    onValueChange={async (newRating) => {
                                      // Mettre à jour l'état local immédiatement
                                      setChatHistory((prev) =>
                                        prev.map((msg) =>
                                          msg.id === message.id
                                            ? { ...msg, textRating: newRating }
                                            : msg
                                        )
                                      );

                                      // Sauvegarder sur le serveur
                                      try {
                                        await fetch("/api/recommendations/rating", {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            messageId: message.id,
                                            textRating: newRating > 0 ? newRating : null,
                                            monsterRecommendationRating: message.monsterRecommendationRating ?? null,
                                            recommendationText: message.recommendationText,
                                            phase: message.phase,
                                            turn: message.turn,
                                          }),
                                        });
                                      } catch (error) {
                                        console.error("Erreur lors de l'enregistrement de la note:", error);
                                      }
                                    }}
                                        size="sm"
                                  />
                                </div>
                                {/* Notation des recommandations de monstres */}
                                {message.proposedMonsterIds && message.proposedMonsterIds.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                                      <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                                        Monstres:
                                        </span>
                                      </div>
                                    <StarRating
                                      value={message.monsterRecommendationRating ?? 0}
                                      onValueChange={async (newRating) => {
                                        // Mettre à jour l'état local immédiatement
                                        setChatHistory((prev) =>
                                          prev.map((msg) =>
                                            msg.id === message.id
                                              ? { ...msg, monsterRecommendationRating: newRating }
                                              : msg
                                          )
                                        );

                                        // Sauvegarder sur le serveur
                                        try {
                                          await fetch("/api/recommendations/rating", {
                                            method: "POST",
                                            headers: {
                                              "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                              messageId: message.id,
                                              textRating: message.textRating ?? null,
                                              monsterRecommendationRating: newRating > 0 ? newRating : null,
                                              recommendationText: message.recommendationText,
                                              phase: message.phase,
                                              turn: message.turn,
                                            }),
                                          });
                                        } catch (error) {
                                          console.error("Erreur lors de l'enregistrement de la note:", error);
                                        }
                                      }}
                                      size="sm"
                                    />
                                    </div>
                                )}
                                  </div>
                            </div>
                          </div>
                        )}

                        {/* Message de choix sélectionné */}
                        {message.type === "choice_selected" && message.selectedMonsterIds && (
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${
                              message.player === "A"
                                ? "bg-gradient-to-br from-green-500/20 to-green-500/10 border-green-500/20"
                                : "bg-gradient-to-br from-orange-500/20 to-orange-500/10 border-orange-500/20"
                            }`} title={message.player === "A" ? "Votre choix" : "Choix de l'adversaire"}>
                              <span className={`text-xs font-bold ${
                                message.player === "A" ? "text-green-600" : "text-orange-600"
                              }`}>
                                {message.player === "A" ? "✓" : "B"}
                              </span>
                          </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs p-2 rounded-lg border ${
                                message.player === "A"
                                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                  : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                              }`}>
                                <span className={`font-semibold flex items-center gap-1 ${
                                  message.player === "A"
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-orange-700 dark:text-orange-300"
                                }`}>
                                  {message.player === "A" ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Vous avez sélectionné
                                    </>
                                  ) : (
                                    <>
                                      Adversaire a sélectionné
                                    </>
                                  )}
                                  {message.phase === "banning" && (
                                    <>
                                      <Ban className="w-3 h-3" />
                                      (ban)
                      </>
                    )}
                        </span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {message.selectedMonsterIds.map((monsterId) => {
                                    const monster = allMonsters[monsterId];
                                    if (!monster) return null;
                                    return (
                                      <span key={monsterId} className={`text-xs px-2 py-1 rounded-full border ${
                                        message.player === "A"
                                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                                          : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                                      }`}>
                                        {monster.nom}
                                      </span>
                                    );
                                  })}
                      </div>
                                {message.turn && (
                                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 mt-1">
                                    <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span>Tour {message.turn} - {message.phase === "picking" ? "Picking" : "Banning"}</span>
                          </div>
                                )}
                            </div>
                          </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Indicateur de chargement */}
                    {loadingRecommendation && (
                      <div className="flex items-start gap-3 animate-in fade-in">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm border border-primary/20">
                          <span className="text-xs font-bold text-primary">IA</span>
                    </div>
                        <div className="flex-1 space-y-2">
                          <div className="space-y-2">
                            <div className="h-2 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-pulse"></div>
                            <div className="h-2 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-pulse w-4/5"></div>
                            <div className="h-2 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-full animate-pulse w-3/5"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton de rafraîchissement (optionnel) */}
                {true && (
                  <Button
                    onClick={fetchRecommendation}
                    disabled={loadingRecommendation ||
                      (draftState.currentPhase === "picking" && currentTurnInfo?.currentPlayer !== "A") ||
                      (draftState.currentPhase === "banning" && draftState.playerABans.length > 0) ||
                      draftState.currentPhase === "completed"}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    title={loadingRecommendation
                      ? "Analyse en cours..."
                      : (draftState.currentPhase === "picking" && currentTurnInfo?.currentPlayer !== "A")
                        ? "Attendez votre tour pour obtenir des recommandations"
                        : draftState.currentPhase === "completed"
                          ? "Le draft est terminé"
                          : "Obtenir une nouvelle recommandation IA"}
                  >
                    {loadingRecommendation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualiser les recommandations
                      </>
                    )}
                  </Button>
                )}
                {/* Toggle 3 positions pour choisir le mode LLM */}
                <div className="flex flex-col mt-3 px-2 w-full">
                  <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">
                      Mode de réponse
                  </span>
                    <div title="Choisissez le type de recommandation : Gemini (explicatif), Réseau neuronal (rapide), ou LLM fine-tuned (optimisé)">
                      <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                    </div>
                  </div>

                  <div className="relative w-full h-full bg-muted rounded-full flex items-center px-1">
                    {/* Curseur qui glisse selon la position */}
                    <span
                      className="absolute inset-y-1 w-10 bg-green-200 rounded-full transition-transform"
                      style={{ transform: `translateX(${(mode) * 100}%)`, width: "49%" }}
                    />

                    {/* Labels cliquables */}
                    <div
                      className="flex flex-1 justify-between items-center z-10 text-xs font-medium cursor-pointer select-none"
                    >
                      {["Gemini seulement", "Neural Network et Gemini"].map((label, index) => (
                        <div
                          key={index}
                          className="flex-1 text-center"
                          onClick={() => setMode(index)}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>



              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
