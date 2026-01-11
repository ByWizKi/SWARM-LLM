import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RulesPage() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Règles de Draft RTA</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard">Retour au Dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vue d&apos;ensemble</CardTitle>
            <CardDescription>
              Les règles officielles du mode Real Time Arena (RTA) de Summoners War: Sky Arena
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Le mode RTA se joue en 1v1 avec un système de draft. Chaque joueur sélectionne
              5 monstres, puis les équipes sont réduites à 4 monstres après la phase de bans,
              avec un leader choisi pour chaque équipe.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase 1 : Draft (Snake Draft)</CardTitle>
            <CardDescription>Ordre de sélection en serpentin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-left">Tour</th>
                    <th className="border border-border p-2 text-left">Joueur A</th>
                    <th className="border border-border p-2 text-left">Joueur B</th>
                    <th className="border border-border p-2 text-left">Total A</th>
                    <th className="border border-border p-2 text-left">Total B</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-2">1</td>
                    <td className="border border-border p-2">Pick 1</td>
                    <td className="border border-border p-2">-</td>
                    <td className="border border-border p-2">1</td>
                    <td className="border border-border p-2">0</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">2</td>
                    <td className="border border-border p-2">-</td>
                    <td className="border border-border p-2">Pick 2</td>
                    <td className="border border-border p-2">1</td>
                    <td className="border border-border p-2">2</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">3</td>
                    <td className="border border-border p-2">Pick 2</td>
                    <td className="border border-border p-2">-</td>
                    <td className="border border-border p-2">3</td>
                    <td className="border border-border p-2">2</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">4</td>
                    <td className="border border-border p-2">-</td>
                    <td className="border border-border p-2">Pick 2</td>
                    <td className="border border-border p-2">3</td>
                    <td className="border border-border p-2">4</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">5</td>
                    <td className="border border-border p-2">Pick 1</td>
                    <td className="border border-border p-2">-</td>
                    <td className="border border-border p-2">5</td>
                    <td className="border border-border p-2">4</td>
                  </tr>
                  <tr className="bg-muted/50">
                    <td className="border border-border p-2 font-semibold">6</td>
                    <td className="border border-border p-2">-</td>
                    <td className="border border-border p-2 font-semibold">Pick 1</td>
                    <td className="border border-border p-2">5</td>
                    <td className="border border-border p-2 font-semibold">5</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-4 text-sm text-muted-foreground">
                <strong>Note :</strong> Le tableau ci-dessus montre l&apos;ordre si le Joueur A commence.
                Si le Joueur B commence, l&apos;ordre est inversé : B(1) → A(2) → B(2) → A(2) → B(1).
              </p>
              <p className="mt-2 text-sm font-semibold">
                Total final : 5 monstres pour chaque joueur
              </p>
              <p className="text-sm text-muted-foreground">
                Ordre exact (si A commence) : A(1) → B(2) → A(2) → B(2) → A(1) → B(1)
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold">Règles importantes :</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Pas de doublons :</strong> Un monstre déjà sélectionné ne peut plus être choisi par l&apos;adversaire</li>
                <li><strong>Ordre strict :</strong> L&apos;ordre des picks doit être respecté scrupuleusement</li>
                <li><strong>Timer :</strong> 30 secondes par pick (pick automatique en cas de dépassement du temps)</li>
                <li><strong>Visibilité :</strong> Les picks sont révélés en temps réel aux deux joueurs</li>
                <li><strong>Box personnel :</strong> Vous ne pouvez sélectionner que des monstres présents dans votre box</li>
                <li><strong>Stats verrouillées :</strong> Pendant le draft, les runes, artefacts et skills sont verrouillés (ceux configurés avant le draft)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase 2 : Bans</CardTitle>
            <CardDescription>Élimination d&apos;un monstre adverse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Après la phase de draft, chaque joueur ban 1 monstre de l&apos;équipe adverse.
              Les bans sont simultanés (les deux joueurs bannissent en même temps).
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Simultané :</span>
                <span>Le Joueur A et le Joueur B bannissent chacun 1 monstre de l&apos;équipe adverse en même temps</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Résultat : Chaque équipe se retrouve avec 4 monstres pour le combat (5 - 1 ban).
            </p>
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm">
                <strong>Important :</strong> Les monstres bannis ne participent pas au combat.
                Les bans doivent cibler des monstres de l&apos;équipe adverse uniquement.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase 3 : Sélection du Leader</CardTitle>
            <CardDescription>Choix du monstre leader</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Après les bans, chaque joueur choisit un monstre leader parmi ses 4 monstres restants.
              Le choix du leader se fait simultanément (les deux joueurs choisissent en même temps).
            </p>
            <div className="bg-muted p-4 rounded-md space-y-2">
              <p className="text-sm font-semibold">Règles du leader :</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Le leader skill du monstre sélectionné s&apos;applique uniquement à votre propre équipe</li>
                <li>Le choix est simultané (les deux joueurs choisissent en même temps)</li>
                <li>Le leader skill fonctionne normalement selon les règles du jeu</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase 4 : Combat</CardTitle>
            <CardDescription>4 monstres contre 4 monstres</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Le combat se déroule avec les 4 monstres de chaque équipe (après les bans).
              Le leader skill choisi s&apos;applique à l&apos;équipe.
            </p>
            <div className="bg-muted p-4 rounded-md space-y-2">
              <p className="text-sm font-semibold">Règles du combat :</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Les leader skills fonctionnent normalement et s&apos;appliquent uniquement à leur propre équipe</li>
                <li>Pas de bonus externes (guildes, tours, etc.)</li>
                <li>Mode World Arena standard</li>
                <li>Les runes, artefacts et skills sont ceux configurés avant le draft (verrouillés pendant le draft)</li>
                <li>Victoire : Éliminer tous les monstres adverses</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Règles Générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>First Pick :</strong> Déterminé aléatoirement par le système</li>
              <li><strong>Timer :</strong> 30 secondes par pick (pick automatique en cas de dépassement)</li>
              <li><strong>Monstres :</strong> Sélection uniquement depuis votre box personnel</li>
              <li><strong>Visibilité :</strong> Tous les picks sont révélés en temps réel</li>
              <li><strong>Bans simultanés :</strong> Les deux joueurs bannissent en même temps</li>
              <li><strong>Doublons interdits :</strong> Un monstre déjà pické ne peut plus être sélectionné</li>
              <li><strong>Stats verrouillées :</strong> Runes, artefacts et skills sont verrouillés pendant le draft</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

