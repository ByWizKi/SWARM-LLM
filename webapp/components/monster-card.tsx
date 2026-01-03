"use client";

interface Monster {
  id: number;
  nom: string;
  element: string;
  etoiles: number;
  categorie: string;
  imageUrl?: string;
}

interface MonsterCardProps {
  monster?: Monster;
  monsterId?: number;
  showDetails?: boolean;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

export function MonsterCard({
  monster,
  monsterId,
  showDetails = false,
  className = "",
  onClick,
  selected = false,
  size = "md",
}: MonsterCardProps) {
  // Si on a seulement l'ID, on retourne un placeholder pour l'instant
  // Dans une vraie app, on chargerait les données depuis l'API
  if (monsterId && !monster) {
    return (
      <div
        className={`flex flex-col items-center justify-center border rounded bg-muted p-2 ${className} ${
          onClick ? "cursor-pointer hover:bg-muted/80" : ""
        } ${selected ? "ring-2 ring-primary" : ""}`}
        onClick={onClick}
      >
        <div className="text-xs text-muted-foreground">#{monsterId}</div>
      </div>
    );
  }

  if (!monster) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed rounded bg-background p-2 text-muted-foreground ${className}`}
      >
        Vide
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center border rounded bg-card p-2 transition-all ${className} ${
        onClick ? "cursor-pointer hover:bg-muted/80" : ""
      } ${selected ? "ring-2 ring-primary" : ""}`}
      onClick={onClick}
      title={monster.nom}
    >
      {monster.imageUrl && (
        <div className={`relative ${sizeClasses[size]} mb-1`}>
          <img
            src={monster.imageUrl}
            alt={monster.nom}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Si l'image ne charge pas, masquer l'élément img
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="font-semibold text-xs text-center break-words w-full" style={{ lineHeight: '1.2' }}>
        {monster.nom}
      </div>
      {showDetails && (
        <>
          <div className="text-xs opacity-80 text-center mt-1">
            {monster.element} - {monster.categorie}
          </div>
          <div className="text-xs mt-1">{monster.etoiles} etoiles</div>
        </>
      )}
    </div>
  );
}

