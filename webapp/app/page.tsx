import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight">
          SWARM-LLM
        </h1>
        <p className="text-xl text-muted-foreground">
          Assistant IA pour vos Drafts RTA dans Summoners War: Sky Arena
        </p>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Utilisez l'intelligence artificielle pour obtenir des recommandations stratégiques sur vos picks, bans et composition d'équipe
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/auth/signin">Se connecter</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/rules">Règles de draft</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

