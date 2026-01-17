"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ApiKeyRequiredPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      checkApiKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  const checkApiKey = async () => {
    try {
      const response = await fetch("/api/user/api-key");
      const data = await response.json();

      if (data.hasApiKey) {
        // L'utilisateur a déjà une clé, rediriger vers le dashboard
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification:", error);
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!geminiApiKey || geminiApiKey.trim().length === 0) {
      setError("La clé API Gemini est requise");
      return;
    }

    if (geminiApiKey.length < 20) {
      setError("La clé API Gemini semble invalide (trop courte)");
      return;
    }

    setLoading(true);

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
          <CardTitle className="text-2xl font-bold text-center">
            Clé API Gemini requise
          </CardTitle>
          <CardDescription className="text-center">
            Pour utiliser l&apos;application, vous devez configurer votre clé API Gemini
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
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Cette clé est nécessaire pour utiliser les fonctionnalités IA de l&apos;application.
                Obtenez votre clé sur{" "}
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
              {loading ? "Sauvegarde..." : "Enregistrer et continuer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
