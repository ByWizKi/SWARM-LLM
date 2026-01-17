"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignOutButton } from "@/components/sign-out-button";

interface Monster {
  id: number;
  nom: string;
  element: string;
  etoiles: number;
  categorie: string;
  imageUrl?: string;
}

export default function BoxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [userMonsters, setUserMonsters] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterElement, setFilterElement] = useState<string>("all");
  const [filterCategorie, setFilterCategorie] = useState<string>("all");
  const [filterEtoiles, setFilterEtoiles] = useState<number | "all">("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadMonsters();
      loadUserBox();
    }
  }, [status]);

  const loadMonsters = async () => {
    try {
      const response = await fetch("/api/monsters");
      if (!response.ok) {
        console.error("Erreur HTTP:", response.status, response.statusText);
        setMonsters([]);
        return;
      }
      const data = await response.json();
      // S'assurer que chaque monstre a un ID unique (utiliser l'index si pas d'ID)
      const monstersWithIds = (data.monstres || []).map((monster: Monster, index: number) => ({
        ...monster,
        id: monster.id || index + 1, // Utiliser l'ID existant ou générer un ID basé sur l'index
      }));
      setMonsters(monstersWithIds);
    } catch (error) {
      console.error("Erreur lors du chargement des monstres:", error);
      setMonsters([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserBox = async (forceRefresh = false) => {
    try {
      // Forcer le rechargement sans cache si demandé
      const cacheOptions: RequestInit = forceRefresh
        ? {
            cache: 'no-store' as RequestCache,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            }
          }
        : {};

      // Ajouter un timestamp pour forcer le rechargement
      const url = forceRefresh
        ? `/api/user/box?t=${Date.now()}`
        : "/api/user/box";

      const response = await fetch(url, cacheOptions);

      if (!response.ok) {
        console.error("[BOX] Erreur HTTP lors du chargement:", response.status, response.statusText);
        return;
      }

      const data = await response.json();
      const monsters = Array.isArray(data.monsters) ? data.monsters : [];
      setUserMonsters(monsters);
      console.log("[BOX] Box chargé:", monsters.length, "monstres");
    } catch (error) {
      console.error("[BOX] Erreur lors du chargement du box:", error);
    }
  };

  const toggleMonster = (monsterId: number) => {
    setUserMonsters((prev) => {
      if (prev.includes(monsterId)) {
        return prev.filter((id) => id !== monsterId);
      } else {
        return [...prev, monsterId];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log("[BOX] Sauvegarde de", userMonsters.length, "monstres");
      const response = await fetch("/api/user/box", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ monsters: userMonsters }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[BOX] Erreur de réponse:", data);
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      console.log("[BOX] Sauvegarde réussie, réponse complète:", JSON.stringify(data, null, 2));
      
      // Mettre à jour l'état immédiatement avec les données retournées par le serveur
      const savedMonsters = data.box?.monsters || data.monsters || [];
      const monstersArray = Array.isArray(savedMonsters) ? savedMonsters : [];
      
      console.log("[BOX] Mise à jour de l'état avec", monstersArray.length, "monstres");
      setUserMonsters(monstersArray);
      
      // Petite pause pour s'assurer que l'état est bien mis à jour
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Recharger depuis le serveur pour garantir la cohérence (forcer le rechargement sans cache)
      console.log("[BOX] Rechargement depuis le serveur...");
      await loadUserBox(true);
      
      // Afficher une notification au lieu d'un alert pour une meilleure UX
      alert("Box sauvegardé avec succès !");
      // Ne pas rediriger automatiquement, laisser l'utilisateur continuer à modifier
      // router.push("/dashboard");
    } catch (error) {
      console.error("[BOX] Erreur:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la sauvegarde du box";
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const filteredMonsters = monsters.filter((monster) => {
    const matchesSearch =
      searchTerm === "" ||
      monster.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesElement = filterElement === "all" || monster.element === filterElement;
    const matchesCategorie =
      filterCategorie === "all" || monster.categorie === filterCategorie;
    const matchesEtoiles =
      filterEtoiles === "all" || monster.etoiles === filterEtoiles;

    return (
      matchesSearch && matchesElement && matchesCategorie && matchesEtoiles
    );
  });

  const elements = Array.from(new Set(monsters.map((m) => m.element)));
  const categories = Array.from(new Set(monsters.map((m) => m.categorie)));
  const etoilesOptions = Array.from(new Set(monsters.map((m) => m.etoiles))).sort();

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Mon Box de Monstres</h1>
          <div className="flex gap-2">
            <SignOutButton />
            <Button variant="outline" asChild>
              <Link href="/dashboard">Retour</Link>
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Sauvegarde..." : `Sauvegarder (${userMonsters.length})`}
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Recherche</Label>
                <Input
                  placeholder="Nom du monstre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Élément</Label>
                <select
                  value={filterElement}
                  onChange={(e) => setFilterElement(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Tous</option>
                  {elements.map((elem) => (
                    <option key={elem} value={elem}>
                      {elem}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Catégorie</Label>
                <select
                  value={filterCategorie}
                  onChange={(e) => setFilterCategorie(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Toutes</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Étoiles</Label>
                <select
                  value={filterEtoiles}
                  onChange={(e) =>
                    setFilterEtoiles(
                      e.target.value === "all" ? "all" : parseInt(e.target.value)
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">Toutes</option>
                  {etoilesOptions.map((etoiles) => (
                    <option key={etoiles} value={etoiles}>
                      {etoiles} étoiles
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des monstres */}
        <Card>
          <CardHeader>
            <CardTitle>
              Monstres ({filteredMonsters.length}) - Sélectionnés: {userMonsters.length}
            </CardTitle>
            <CardDescription>
              Cochez les monstres que vous possédez dans votre collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredMonsters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun monstre trouvé avec ces filtres
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[600px] overflow-y-auto p-4">
                {filteredMonsters.map((monster) => {
                  const isSelected = userMonsters.includes(monster.id);
                  return (
                    <div
                      key={monster.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-muted"
                      }`}
                      onClick={() => toggleMonster(monster.id)}
                    >
                      <div className="text-center space-y-2">
                        {monster.imageUrl && (
                          <div className="flex justify-center">
                            <img
                              src={monster.imageUrl}
                              alt={monster.nom}
                              className="w-16 h-16 object-contain"
                              onError={(e) => {
                                // Si l'image ne charge pas, masquer l'élément img
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        <div className="font-semibold text-sm">{monster.nom}</div>
                        <div className="text-xs opacity-80">
                          {monster.element} - {monster.categorie}
                        </div>
                        <div className="text-xs">{monster.etoiles} etoiles</div>
                        {isSelected && (
                          <div className="text-xs font-bold">Possede</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

