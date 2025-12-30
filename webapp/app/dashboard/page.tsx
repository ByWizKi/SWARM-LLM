import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <div className="space-y-4">
          <div className="p-6 bg-card border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Bienvenue, {session.user?.name} !</h2>
            <p className="text-muted-foreground mb-4">
              Votre assistant IA pour les drafts RTA est prêt à vous aider.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/box">Gérer mon Box</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/draft">Lancer un Draft</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/rules">Voir les Règles</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

