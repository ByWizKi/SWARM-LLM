"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Styles pour les titres (taille réduite pour le chat)
          h1: ({ children }) => (
            <h1 className="text-base font-bold mt-3 mb-1.5 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold mt-2.5 mb-1.5 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold mt-2 mb-1 text-foreground">{children}</h3>
          ),
          // Styles pour les paragraphes
          p: ({ children }) => (
            <p className="mb-1.5 leading-relaxed text-foreground text-xs">{children}</p>
          ),
          // Styles pour les listes
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-1.5 space-y-0.5 ml-3 text-foreground text-xs">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-1.5 space-y-0.5 ml-3 text-foreground text-xs">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          // Styles pour le texte en gras
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          // Styles pour le texte en italique
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Styles pour le code inline
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-[0.7rem] font-mono text-foreground">
                {children}
              </code>
            ) : (
              <code className={className}>{children}</code>
            );
          },
          // Styles pour les blocs de code
          pre: ({ children }) => (
            <pre className="bg-muted p-2 rounded-lg overflow-x-auto mb-1.5 text-[0.7rem] font-mono">
              {children}
            </pre>
          ),
          // Styles pour les liens
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          // Styles pour les citations
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-3 my-1.5 italic text-muted-foreground text-xs">
              {children}
            </blockquote>
          ),
          // Styles pour les tableaux
          table: ({ children }) => (
            <div className="overflow-x-auto my-1.5">
              <table className="min-w-full border-collapse border border-border text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
