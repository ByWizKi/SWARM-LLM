"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    return draftState.firstPlayer === 'B'
      ? RTADraftRules.pickOrder.map(p => ({ ...p, player: p.player === 'A' ? 'B' : 'A' as 'A' | 'B' }))
      : RTADraftRules.pickOrder;
  }, [draftState.firstPlayer]);

  // Calculer l'état actuel du tour basé sur les picks effectués
  const currentTurnInfo = useMemo(() => {
    if (draftState.currentPhase !== "picking") {
      return null;
    }

    const totalPicks = draftState.playerAPicks.length + draftState.playerBPicks.length;
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
        const playerPicksSoFar = turn.player === 'A' ? draftState.playerAPicks.length : draftState.playerBPicks.length;
        const totalPicksForPlayer = adjustedPickOrder
          .filter(t => t.player === turn.player)
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

  const handleAddPick = (player: Player, monsterId: number) => {
    if (draftState.currentPhase !== "picking") return;

    // Vérifier que c'est bien le tour du bon joueur
    if (currentTurnInfo && currentTurnInfo.currentPlayer !== player) {
      alert(`Ce n'est pas le tour du joueur ${player}`);
      return;
    }

    // Vérifier qu'il reste des picks à faire dans ce tour
    if (currentTurnInfo && currentTurnInfo.picksRemaining <= 0) {
      return;
    }

    // Pour le joueur A, vérifier que le monstre est dans son box
    if (player === "A" && !userMonsters.includes(monsterId)) {
      alert("Ce monstre n'est pas dans votre box !");
      return;
    }

    setDraftState((prev) => {
      const newState = { ...prev };

      // Vérifier les doublons
      if (newState.playerAPicks.includes(monsterId) || newState.playerBPicks.includes(monsterId)) {
        alert("Ce monstre a déjà été sélectionné !");
        return prev;
      }

      // Ajouter le pick
      if (player === "A") {
        if (newState.playerAPicks.length >= 5) return prev;
        newState.playerAPicks = [...newState.playerAPicks, monsterId];
      } else {
        if (newState.playerBPicks.length >= 5) return prev;
        newState.playerBPicks = [...newState.playerBPicks, monsterId];
      }

      // Vérifier si on passe à la phase de bans
      if (newState.playerAPicks.length === 5 && newState.playerBPicks.length === 5) {
        newState.currentPhase = "banning";
      }

      return newState;
    });

    // Demander une recommandation après chaque pick
    setTimeout(() => fetchRecommendation(), 100);
  };

  // Obtenir les monstres disponibles pour le joueur A (dans son box, pas déjà pickés)
  const getAvailableMonstersForPlayerA = () => {
    const allPickedIds = [...draftState.playerAPicks, ...draftState.playerBPicks];
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
      available = available.filter((monster) => monster.element === filterElement);
    }
    if (filterCategorie !== "all") {
      available = available.filter((monster) => monster.categorie === filterCategorie);
    }

    return available;
  };

  // Obtenir tous les monstres disponibles pour le joueur B (pas déjà pickés, avec recherche)
  const getAvailableMonstersForPlayerB = () => {
    const allPickedIds = [...draftState.playerAPicks, ...draftState.playerBPicks];
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
      available = available.filter((monster) => monster.element === filterElement);
    }
    if (filterCategorie !== "all") {
      available = available.filter((monster) => monster.categorie === filterCategorie);
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

  const handleAddBan = (player: Player, monsterId: number) => {
    if (draftState.currentPhase !== "banning") return;

    setDraftState((prev) => {
      const newState = { ...prev };

      if (player === "A") {
        if (newState.playerABans.length >= 1) return prev;
        if (!newState.playerBPicks.includes(monsterId)) return prev; // Doit être dans l'équipe adverse
        newState.playerABans = [monsterId];
      } else {
        if (newState.playerBBans.length >= 1) return prev;
        if (!newState.playerAPicks.includes(monsterId)) return prev; // Doit être dans l'équipe adverse
        newState.playerBBans = [monsterId];
      }

      // Vérifier si on passe à la phase complétée
      if (newState.playerABans.length === 1 && newState.playerBBans.length === 1) {
        newState.currentPhase = "completed";
      }

      return newState;
    });
  };

  const fetchRecommendation = async () => {
    setLoadingRecommendation(true);
    try {
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

      const data = await response.json();
      if (response.ok && data.recommendation) {
        setRecommendations(data.recommendation);
      } else {
        setRecommendations("Erreur lors de la récupération des recommandations.");
      }
    } catch (error) {
      console.error("Erreur:", error);
      setRecommendations("Erreur lors de la récupération des recommandations.");
    } finally {
      setLoadingRecommendation(false);
    }
  };

  if (status === "loading" || !boxChecked) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
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
                Vous devez d'abord configurer votre box de monstres avant de pouvoir lancer un draft
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Pour utiliser le simulateur de draft, vous devez sélectionner les monstres que vous possédez dans votre collection.
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
                Dans le jeu, le premier joueur est déterminé aléatoirement. Choisissez qui commence cette draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Le joueur qui commence aura l'avantage du premier pick. Dans le jeu, cela est déterminé aléatoirement par le système.
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Simulateur de Draft RTA</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/box">Gérer mon Box</Link>
            </Button>
            <Button variant="outline" onClick={() => {
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
            }}>
              Nouveau Draft
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche : Simulation du draft */}
          <div className="lg:col-span-2 space-y-4">
            {/* Équipe Joueur A */}
            <Card>
              <CardHeader>
                <CardTitle>Équipe Joueur A (Vous)</CardTitle>
                <CardDescription>
                  Picks: {draftState.playerAPicks.length}/5
                  {draftState.currentPhase === "completed" && ` | Monstres finaux: ${playerAFinalMonsters.length}/4`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2 min-h-[100px] border rounded-lg p-4">
                    {draftState.playerAPicks.map((id, index) => (
                      <MonsterCard
                        key={index}
                        monster={allMonsters[id]}
                        monsterId={id}
                        size="md"
                      />
                    ))}
                    {Array.from({ length: 5 - draftState.playerAPicks.length }).map((_, index) => (
                      <MonsterCard key={`empty-${index}`} />
                    ))}
                  </div>

                  {draftState.currentPhase !== "picking" && draftState.playerBBans.length > 0 && (
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

                  {draftState.currentPhase === "picking" && currentTurnInfo?.currentPlayer === "A" && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Tour {currentTurnInfo.turn} - Joueur A - {currentTurnInfo.picksRemaining} pick(s) restant(s) dans ce tour
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sélectionnez un monstre depuis votre box ({currentTurnInfo.picksRemainingForPlayer} picks restants au total)
                        </p>
                      </div>

                      {/* Filtres de recherche */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="search-monster" className="text-xs">Recherche</Label>
                          <Input
                            id="search-monster"
                            placeholder="Nom du monstre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="filter-element" className="text-xs">Élément</Label>
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
                          <Label htmlFor="filter-categorie" className="text-xs">Catégorie</Label>
                          <select
                            id="filter-categorie"
                            value={filterCategorie}
                            onChange={(e) => setFilterCategorie(e.target.value)}
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
                              {searchTerm || filterElement !== "all" || filterCategorie !== "all"
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
            <Card>
              <CardHeader>
                <CardTitle>Équipe Joueur B (Adversaire)</CardTitle>
                <CardDescription>
                  Picks: {draftState.playerBPicks.length}/5
                  {draftState.currentPhase === "completed" && ` | Monstres finaux: ${playerBFinalMonsters.length}/4`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2 min-h-[100px] border rounded-lg p-4">
                    {draftState.playerBPicks.map((id, index) => (
                      <MonsterCard
                        key={index}
                        monster={allMonsters[id]}
                        monsterId={id}
                        size="md"
                      />
                    ))}
                    {Array.from({ length: 5 - draftState.playerBPicks.length }).map((_, index) => (
                      <MonsterCard key={`empty-${index}`} />
                    ))}
                  </div>

                  {draftState.currentPhase !== "picking" && draftState.playerABans.length > 0 && (
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

                  {draftState.currentPhase === "picking" && currentTurnInfo?.currentPlayer === "B" && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Tour {currentTurnInfo.turn} - Joueur B (Adversaire) - {currentTurnInfo.picksRemaining} pick(s) restant(s) dans ce tour
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sélectionnez le(s) monstre(s) que l'adversaire a pické ({currentTurnInfo.picksRemainingForPlayer} picks restants au total)
                        </p>
                      </div>

                      {/* Filtres de recherche */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="search-monster-b" className="text-xs">Recherche</Label>
                          <Input
                            id="search-monster-b"
                            placeholder="Nom du monstre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="filter-element-b" className="text-xs">Élément</Label>
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
                          <Label htmlFor="filter-categorie-b" className="text-xs">Catégorie</Label>
                          <select
                            id="filter-categorie-b"
                            value={filterCategorie}
                            onChange={(e) => setFilterCategorie(e.target.value)}
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
                              {searchTerm || filterElement !== "all" || filterCategorie !== "all"
                                ? "Aucun monstre trouvé avec ces filtres"
                                : "Aucun monstre disponible"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {draftState.currentPhase === "picking" && !currentTurnInfo && (
                    <p className="text-sm text-muted-foreground">
                      Draft terminé - Phase de picks complétée
                    </p>
                  )}

                  {draftState.currentPhase === "banning" && (
                    <div className="space-y-4">
                      {/* Ban du joueur A */}
                      {draftState.playerABans.length === 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Joueur A - Bannir un monstre de l'équipe B:</p>
                          <div className="max-h-[200px] overflow-y-auto border rounded-lg p-4">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {draftState.playerBPicks
                                .filter((id) => !draftState.playerABans.includes(id))
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
                          <p className="text-sm font-semibold">Joueur B - Bannir un monstre de l'équipe A:</p>
                          <div className="max-h-[200px] overflow-y-auto border rounded-lg p-4">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {draftState.playerAPicks
                                .filter((id) => !draftState.playerBBans.includes(id))
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
            <Card>
              <CardHeader>
                <CardTitle>État du Draft</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Phase:</strong> {draftState.currentPhase}</p>
                  {currentTurnInfo && (
                    <>
                      <p><strong>Tour actuel:</strong> {currentTurnInfo.turn}</p>
                      <p><strong>Joueur actuel:</strong> {currentTurnInfo.currentPlayer}</p>
                      <p><strong>Picks restants ce tour:</strong> {currentTurnInfo.picksRemaining}</p>
                    </>
                  )}
                  <p><strong>Premier joueur:</strong> {draftState.firstPlayer}</p>
                  <p><strong>Picks A:</strong> {draftState.playerAPicks.length}/5</p>
                  <p><strong>Picks B:</strong> {draftState.playerBPicks.length}/5</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite : Recommandations LLM */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Recommandations IA</CardTitle>
                <CardDescription>
                  Analyse stratégique basée sur les picks actuels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={fetchRecommendation}
                    disabled={loadingRecommendation}
                    className="w-full"
                  >
                    {loadingRecommendation ? "Chargement..." : "Obtenir Recommandations"}
                  </Button>

                  <div className="min-h-[400px] p-4 border rounded-lg bg-muted/50">
                    {recommendations ? (
                      <div className="whitespace-pre-wrap text-sm">
                        {recommendations}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        Cliquez sur "Obtenir Recommandations" pour recevoir des conseils stratégiques
                        basés sur l'état actuel du draft.
                      </div>
                    )}
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
