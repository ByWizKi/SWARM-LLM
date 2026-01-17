import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { Sword, Box, BookOpen, Zap, TrendingUp, Users } from "lucide-react";
import { SignOutButtonWrapper } from "@/components/sign-out-button-wrapper";
import { BoxStats } from "@/components/box-stats";
import { BoxStatusCard } from "@/components/box-status-card";
import { BoxDescription } from "@/components/box-description";
import { BoxStatusText } from "@/components/box-status-text";

// Cache pour les statistiques (5 minutes)
const STATS_CACHE_TTL = 5 * 60 * 1000;
let statsCache: { data: any; timestamp: number } | null = null;

async function getUserStats(userId: string) {
  // Vérifier le cache
  if (statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL) {
    return statsCache.data;
  }

  try {
    const box = await prisma.monsterBox.findUnique({
      where: { userId },
      select: { monsters: true },
    });

    const monsterCount = Array.isArray(box?.monsters) ? box.monsters.length : 0;

    const stats = {
      monsterCount,
      hasBox: monsterCount > 0,
    };

    // Mettre en cache
    statsCache = { data: stats, timestamp: Date.now() };

    return stats;
  } catch (error) {
    console.error("Erreur lors de la récupération des stats:", error);
    return { monsterCount: 0, hasBox: false };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const stats = await getUserStats(session.user.id);

  const quickActions = [
    {
      title: "Aide au Draft",
      description: "Obtenir de l'aide pour votre prochaine draft RTA",
      href: "/draft",
      icon: Sword,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-700 dark:text-blue-300",
      primary: true,
    },
    {
      title: "Gérer mon Box",
      description: "dynamic", // Sera remplacé par BoxDescription
      href: "/box",
      icon: Box,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-800",
      textColor: "text-purple-700 dark:text-purple-300",
      primary: false,
    },
    {
      title: "Voir les Règles",
      description: "Comprendre les règles officielles du draft RTA",
      href: "/rules",
      icon: BookOpen,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-700 dark:text-green-300",
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête avec gradient */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Bienvenue, <span className="font-semibold text-foreground">{session.user?.name}</span> ! Votre assistant IA pour les drafts RTA est prêt.
            </p>
          </div>
          <SignOutButtonWrapper />
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BoxStats initialStats={stats} />

          <BoxStatusCard initialHasBox={stats.hasBox} />

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Assistant IA
                </CardTitle>
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">Actif</div>
              <p className="text-xs text-muted-foreground mt-1">
                Recommandations automatiques disponibles
            </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group block animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Card
                    className={`h-full border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer ${
                      action.primary
                        ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 hover:border-primary/50"
                        : `${action.bgColor} ${action.borderColor} hover:border-opacity-60`
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className={`p-3 rounded-lg bg-gradient-to-br ${action.color} shadow-md group-hover:scale-110 transition-transform`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        {action.primary && (
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full font-semibold">
                            Recommandé
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {action.title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {action.description === "dynamic" ? (
                          <BoxDescription
                            initialMonsterCount={stats.monsterCount}
                            initialHasBox={stats.hasBox}
                          />
                        ) : (
                          action.description
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant={action.primary ? "default" : "outline"}
                        className="w-full group-hover:scale-105 transition-transform"
                        asChild
                      >
                        <span>
                          {action.primary ? "Utiliser" : "Accéder"} →
                        </span>
              </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section d'aide rapide */}
        <Card className="bg-gradient-to-br from-muted/50 to-muted/20 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Démarrage rapide
            </CardTitle>
            <CardDescription>
              Suivez ces étapes pour commencer à utiliser l&apos;assistant IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold">Configurez votre Box</p>
                  <p className="text-sm text-muted-foreground">
                    <BoxStatusText
                      initialMonsterCount={stats.monsterCount}
                      initialHasBox={stats.hasBox}
                    />
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold">Lancez un Draft</p>
                  <p className="text-sm text-muted-foreground">
                    Suivez votre draft en cours et recevez des recommandations automatiques de l&apos;IA pour vos picks et bans
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold">Suivez les Recommandations</p>
                  <p className="text-sm text-muted-foreground">
                    L&apos;IA analyse votre draft en temps réel et vous suggère les meilleurs picks et bans
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

