"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const handleSignOut = async () => {
    await signOut({
      callbackUrl: "/",
      redirect: true
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Deconnexion</span>
    </Button>
  );
}

