"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export function ApiKeyGuard({ children }: ApiKeyGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasRank, setHasRank] = useState(false);

  // Pages qui ne nécessitent pas de clé API ni de rank
  const publicPages = [
    "/auth/signin",
    "/auth/signup",
    "/api-key-required",
    "/rank-required",
  ];

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      // Rediriger vers signin si pas authentifié
      if (!publicPages.includes(pathname)) {
        router.push("/auth/signin");
      }
      setChecking(false);
      return;
    }

    if (status === "authenticated") {
      checkRequirements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pathname]);

  const checkRequirements = async () => {
    // Ne pas vérifier sur les pages publiques
    if (publicPages.includes(pathname)) {
      setChecking(false);
      return;
    }

    try {
      // Vérifier d'abord le rank (prioritaire)
      const rankResponse = await fetch("/api/user/rank");
      const rankData = await rankResponse.json();

      if (!rankData.hasRank) {
        // Pas de rank, rediriger vers la page de configuration du rank
        if (pathname !== "/rank-required") {
          router.push("/rank-required");
        }
        setHasRank(false);
        setChecking(false);
        return;
      }
      setHasRank(true);

      // Ensuite vérifier la clé API
      const apiKeyResponse = await fetch("/api/user/api-key");
      const apiKeyData = await apiKeyResponse.json();

      if (!apiKeyData.hasApiKey) {
        // Pas de clé API, rediriger vers la page de configuration
        if (pathname !== "/api-key-required") {
          router.push("/api-key-required");
        }
        setHasApiKey(false);
      } else {
        setHasApiKey(true);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des prérequis:", error);
      // En cas d'erreur, permettre l'accès (pour éviter de bloquer l'app)
      setHasRank(true);
      setHasApiKey(true);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si on est sur une page publique, afficher le contenu
  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }

  // Si l'utilisateur n'a pas de rank, ne rien afficher (redirection en cours)
  if (!hasRank) {
    return null;
  }

  // Si l'utilisateur n'a pas de clé API, ne rien afficher (redirection en cours)
  if (!hasApiKey) {
    return null;
  }

  // Sinon, afficher le contenu normal
  return <>{children}</>;
}
