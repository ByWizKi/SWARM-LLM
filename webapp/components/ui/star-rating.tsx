"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StarRatingProps {
  value?: number; // Note entre 0 et 5
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const StarRating = React.forwardRef<HTMLDivElement, StarRatingProps>(
  ({ value = 0, onValueChange, disabled = false, size = "md", className }, ref) => {
    const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);
    const displayValue = hoveredValue !== null ? hoveredValue : value;

    const sizeClasses = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    const handleClick = (starValue: number) => {
      if (!disabled && onValueChange) {
        // Si on clique sur la même étoile que la valeur actuelle, on remet à 0
        if (starValue === value) {
          onValueChange(0);
        } else {
          onValueChange(starValue);
        }
      }
    };

    const handleMouseEnter = (starValue: number) => {
      if (!disabled) {
        setHoveredValue(starValue);
      }
    };

    const handleMouseLeave = () => {
      if (!disabled) {
        setHoveredValue(null);
      }
    };

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-0.5", className)}
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            className={cn(
              "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded",
              disabled && "cursor-not-allowed",
              !disabled && "cursor-pointer"
            )}
            aria-label={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                star <= displayValue
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-muted-foreground/30",
                !disabled && "hover:scale-110 transition-transform"
              )}
            />
          </button>
        ))}
      </div>
    );
  }
);

StarRating.displayName = "StarRating";

export { StarRating };
