import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ApiKeyGuard } from "@/components/api-key-guard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SWARM-LLM - Assistant IA pour Draft RTA Summoners War",
  description: "Assistant intelligent utilisant des LLMs pour vous aider à faire les meilleurs choix lors des drafts RTA dans Summoners War: Sky Arena",
};

// helper fire-and-forget côté serveur
async function wakeUpBackend() {
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_PYTHON_API_URL || "https://swarm-llm-backend-latest.onrender.com";
  fetch(`${BACKEND_URL}/health`)
    .then(() => console.log("Backend wake-up request sent"))
    .catch(() => console.log("Backend wake-up request failed"));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Lance le wake-up côté serveur mais ne bloque pas le rendu
  wakeUpBackend();

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ApiKeyGuard>{children}</ApiKeyGuard>
        </Providers>
      </body>
    </html>
  );
}
