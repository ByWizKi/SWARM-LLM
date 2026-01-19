"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { Trophy } from "lucide-react";
import { victoryPointsToRank, formatRankDisplay } from "@/lib/rank-utils";

export default function RankRequiredPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [victoryPoints, setVictoryPoints] = useState<string>("");
  const [calculatedRank, setCalculatedRank] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      checkRank();
    }
  }, [status]);

  const checkRank = async () => {
    try {
      const response = await fetch("/api/user/rank");
      const data = await response.json();

      if (data.hasRank) {
        // L'utilisateur a déjà un rank, rediriger vers le dashboard
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du rank:", error);
      setChecking(false);
    }
  };

  const handleVictoryPointsChange = (value: string) => {
    setVictoryPoints(value);
    const vp = parseInt(value, 10);
    if (!isNaN(vp) && vp >= 0) {
      const rank = victoryPointsToRank(vp);
      setCalculatedRank(rank ? formatRankDisplay(rank) : null);
    } else {
      setCalculatedRank(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!victoryPoints || victoryPoints.trim().length === 0) {
      setError("Les Victory Points sont requis pour continuer");
      return;
    }

    const vp = parseInt(victoryPoints, 10);
    if (isNaN(vp) || vp < 0) {
      setError("Veuillez entrer un nombre valide de Victory Points");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/user/rank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ victoryPoints: vp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue");
        return;
      }

      // Rediriger vers le dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Une erreur est survenue lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Victory Points Requis
          </CardTitle>
          <CardDescription className="text-center">
            Veuillez renseigner vos Victory Points pour accéder à l&apos;application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="victoryPoints">
                Vos Victory Points <span className="text-red-500">*</span>
              </Label>
              <Input
                id="victoryPoints"
                type="number"
                value={victoryPoints}
                onChange={(e) => handleVictoryPointsChange(e.target.value)}
                required
                placeholder="Ex: 1500, 2000, 2800..."
                min="0"
                max="5000"
              />
              {calculatedRank && (
                <div className="p-2 bg-muted rounded-md text-sm">
                  <span className="font-semibold">Rank calculé: </span>
                  <span className="text-primary">{calculatedRank}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Indiquez vos Victory Points actuels dans Summoners War RTA. Le rank sera calculé automatiquement. Vous pourrez modifier cette valeur plus tard dans votre profil.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enregistrement..." : "Continuer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
