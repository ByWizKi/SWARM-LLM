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
import { Eye, EyeOff, Key, Lock, Save, ArrowLeft, Trophy, Download } from "lucide-react";
import { victoryPointsToRank, formatRankDisplay } from "@/lib/rank-utils";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // État pour la clé Gemini
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [loadingGemini, setLoadingGemini] = useState(true);

  // État pour les Victory Points
  const [victoryPoints, setVictoryPoints] = useState<string>("");
  const [calculatedRank, setCalculatedRank] = useState<string | null>(null);
  const [loadingRank, setLoadingRank] = useState(true);

  // État pour le mot de passe
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // État pour l'export des drafts
  const [exportingDrafts, setExportingDrafts] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Charger la clé Gemini actuelle (masquée) et le rank
  useEffect(() => {
    if (status === "authenticated") {
      loadApiKeyStatus();
      loadRank();
    }
  }, [status]);

  const loadRank = async () => {
    try {
      const response = await fetch("/api/user/rank");
      const data = await response.json();
      if (data.victoryPoints !== null && data.victoryPoints !== undefined) {
        setVictoryPoints(data.victoryPoints.toString());
        if (data.rank) {
          setCalculatedRank(formatRankDisplay(data.rank));
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du rank:", error);
    } finally {
      setLoadingRank(false);
    }
  };

  const loadApiKeyStatus = async () => {
    try {
      const response = await fetch("/api/user/api-key");
      const data = await response.json();
      if (data.hasApiKey) {
        // Afficher une indication que la clé existe mais ne pas la montrer
        setGeminiApiKey("••••••••••••••••••••");
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la clé API:", error);
    } finally {
      setLoadingGemini(false);
    }
  };

  const handleUpdateGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!geminiApiKey || geminiApiKey.trim().length === 0) {
      setError("La clé API Gemini est requise");
      setLoading(false);
      return;
    }

    if (geminiApiKey.length < 20) {
      setError("La clé API Gemini semble invalide (trop courte)");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ geminiApiKey: geminiApiKey.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue");
        return;
      }

      setSuccess("Clé API Gemini mise à jour avec succès");
      setGeminiApiKey("••••••••••••••••••••");
      setShowGeminiKey(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Une erreur est survenue lors de la sauvegarde");
    } finally {
      setLoading(false);
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

  const handleUpdateRank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!victoryPoints || victoryPoints.trim().length === 0) {
      setError("Les Victory Points sont requis");
      setLoading(false);
      return;
    }

    const vp = parseInt(victoryPoints, 10);
    if (isNaN(vp) || vp < 0) {
      setError("Veuillez entrer un nombre valide de Victory Points");
      setLoading(false);
      return;
    }

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

      if (data.rank) {
        setCalculatedRank(formatRankDisplay(data.rank));
      }

      setSuccess("Victory Points mis à jour avec succès");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Une erreur est survenue lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleExportDrafts = async () => {
    setError("");
    setSuccess("");
    setExportingDrafts(true);

    try {
      const response = await fetch("/api/drafts/export-anonymous");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'export");
      }

      // Récupérer le JSON
      const jsonData = await response.json();

      // Créer un blob et télécharger le fichier
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `drafts-anonymes-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`Export réussi ! ${jsonData.totalDrafts} drafts téléchargés.`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'export des drafts");
    } finally {
      setExportingDrafts(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Le mot de passe actuel est requis");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/user/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue");
        return;
      }

      setSuccess("Mot de passe mis à jour avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Une erreur est survenue lors de la mise à jour du mot de passe");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loadingGemini || loadingRank) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mon Profil
            </h1>
            <p className="text-muted-foreground">
              Gérez vos paramètres et vos informations de compte
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        {/* Messages d'erreur et succès */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="grid gap-6">
          {/* Section Rank */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle>Rank</CardTitle>
              </div>
              <CardDescription>
                Vos Victory Points actuels dans Summoners War RTA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateRank} className="space-y-4">
                <div>
                  <Label htmlFor="victoryPoints">Victory Points</Label>
                  <Input
                    id="victoryPoints"
                    type="number"
                    value={victoryPoints}
                    onChange={(e) => handleVictoryPointsChange(e.target.value)}
                    placeholder="Ex: 1500, 2000, 2800..."
                    min="0"
                    max="5000"
                  />
                  {calculatedRank && (
                    <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                      <span className="font-semibold">Rank calculé: </span>
                      <span className="text-primary">{calculatedRank}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrez vos Victory Points actuels. Le rank sera calculé automatiquement.
                  </p>
                </div>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Enregistrement..." : "Enregistrer les Victory Points"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Section Clé API Gemini */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <CardTitle>Clé API Gemini</CardTitle>
              </div>
              <CardDescription>
                Modifiez votre clé API Gemini pour utiliser l&apos;assistant IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateGeminiKey} className="space-y-4">
                <div>
                  <Label htmlFor="geminiApiKey">Clé API Gemini</Label>
                  <div className="relative">
                    <Input
                      id="geminiApiKey"
                      type={showGeminiKey ? "text" : "password"}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Entrez votre clé API Gemini"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                    >
                      {showGeminiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    La clé API Gemini est nécessaire pour utiliser l&apos;assistant IA. Vous pouvez obtenir votre clé sur{" "}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Enregistrement..." : "Enregistrer la clé API"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Section Mot de passe */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Mot de passe</CardTitle>
              </div>
              <CardDescription>
                Modifiez votre mot de passe pour sécuriser votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Entrez votre mot de passe actuel"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Entrez votre nouveau mot de passe (min. 6 caractères)"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez votre nouveau mot de passe"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Section Export des drafts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle>Export des drafts</CardTitle>
              </div>
              <CardDescription>
                Téléchargez tous les drafts de tous les joueurs de manière anonyme pour analyse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cette fonctionnalité permet d&apos;exporter tous les drafts enregistrés dans une base de données
                  anonymisée (les identifiants utilisateur sont remplacés par des hash SHA-256).
                  Les données incluent les picks, bans, recommandations LLM, ratings et métadonnées.
                </p>
                <Button
                  onClick={handleExportDrafts}
                  disabled={exportingDrafts}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportingDrafts ? "Export en cours..." : "Exporter les drafts (JSON anonyme)"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informations du compte */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du compte</CardTitle>
              <CardDescription>
                Vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom d&apos;utilisateur</Label>
                <Input
                  value={session.user?.name || ""}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={(session.user as any)?.email || "Non renseigné"}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
              <div>
                <Label>Victory Points</Label>
                <Input
                  value={victoryPoints ? `${victoryPoints} VP (${calculatedRank || "Non calculé"})` : "Non renseigné"}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
