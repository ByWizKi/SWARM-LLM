"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (name.length < 3) {
      setError("Le pseudo doit contenir au moins 3 caractères");
      return;
    }

    if (name.length > 20) {
      setError("Le pseudo doit contenir au maximum 20 caractères");
      return;
    }

    if (!geminiApiKey || geminiApiKey.trim().length === 0) {
      setError("La clé API Gemini est requise pour utiliser l'application");
      return;
    }

    if (geminiApiKey.length < 20) {
      setError("La clé API Gemini semble invalide (trop courte)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, password, geminiApiKey: geminiApiKey.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue lors de l'inscription");
        return;
      }

      // Rediriger vers la page de connexion avec un message de succès
      router.push("/auth/signin?registered=true");
    } catch (err) {
      setError("Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Créer un compte
          </CardTitle>
          <CardDescription className="text-center">
            Inscrivez-vous pour utiliser SWARM-LLM
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
              <Label htmlFor="name">Pseudo (unique)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                placeholder="Votre pseudo"
              />
              <p className="text-xs text-muted-foreground">
                3 à 20 caractères
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 6 caractères
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="geminiApiKey">
                Clé API Gemini <span className="text-red-500">*</span>
              </Label>
              <Input
                id="geminiApiKey"
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                required
                minLength={20}
                placeholder="Votre clé API Gemini"
              />
              <p className="text-xs text-muted-foreground">
                Requis pour utiliser l&apos;application. Obtenez votre clé sur{" "}
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Création du compte..." : "Créer mon compte"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Déjà un compte ? </span>
            <Link
              href="/auth/signin"
              className="text-primary hover:underline font-medium"
            >
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

