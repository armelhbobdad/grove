import { Children, isValidElement, useState, useEffect, useRef, useId } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { VSCodeIcon } from "./VSCodeIcon";

// Match file paths like `path/to/file.ext` or `path/to/file.ext:123`.
// Accept Unicode and other non-ASCII characters in path segments.
const FILE_PATH_RE = /^(.+\/[^/]+?\.[A-Za-z0-9]+)(?::(\d+))?[,.]?$/;

// Match local file hrefs after decoding percent-encoded characters.
// e.g. "service/foo.go", "/abs/path/中文名.md", or ends with "#L505"
const FILE_HREF_RE = /^(.+\/[^/]+?\.[A-Za-z0-9]+)(?:[:#]L?(\d+))?$/;

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "transparent",
    primaryColor: "#3b82f6",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#475569",
    lineColor: "#64748b",
    secondaryColor: "#1e293b",
    tertiaryColor: "#0f172a",
    fontFamily: "inherit",
  },
});

export function MermaidBlock({ code }: { code: string }): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${uniqueId.replace(/:/g, "")}`;
    mermaid
      .render(id, code)
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => { cancelled = true; };
  }, [code, uniqueId]);

  if (error) {
    return (
      <pre className="rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] p-3 my-2 whitespace-pre-wrap break-words text-xs font-mono text-[var(--color-danger)]">
        Mermaid error: {error}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] p-4 my-2 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] p-3 my-2 overflow-x-auto flex justify-center [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
MermaidBlock.displayName = 'MermaidBlock';

interface MarkdownRendererProps {
  content: string;
  /** When provided, inline code matching file path patterns become clickable */
  onFileClick?: (filePath: string, line?: number) => void;
}

/** Extract filename from a full file path */
function getFileName(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1];
}

/** Render an inline file chip with VSCode icon */
function FileChip({
  filePath,
  line,
  onClick,
}: {
  filePath: string;
  line?: number;
  onClick: () => void;
}) {
  const fileName = getFileName(filePath);
  const lineLabel = line ? `:${line}` : "";
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer
        bg-[color-mix(in_srgb,var(--color-bg-secondary)_80%,var(--color-bg))]
        text-[var(--color-highlight)]
        border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)]
        hover:bg-[color-mix(in_srgb,var(--color-highlight)_12%,var(--color-bg-secondary))]
        hover:border-[color-mix(in_srgb,var(--color-highlight)_30%,var(--color-border))]
        transition-colors align-middle"
      title={`Open ${filePath}${line ? ` at line ${line}` : ""}`}
    >
      <VSCodeIcon filename={fileName} size={13} />
      <span>{fileName}{lineLabel}</span>
    </button>
  );
}

/** Extract plain text from React children recursively */
function extractText(children: React.ReactNode): string {
  let text = "";
  Children.forEach(children, (child) => {
    if (typeof child === "string") {
      text += child;
    } else if (typeof child === "number") {
      text += String(child);
    } else if (isValidElement(child)) {
      const props = child.props as Record<string, unknown>;
      if (props.children) {
        text += extractText(props.children as React.ReactNode);
      }
    }
  });
  return text;
}

function parseFileHref(href: string): { filePath: string; line?: number } | null {
  if (/^(https?:\/\/|mailto:)/.test(href)) {
    return null;
  }

  let decodedHref = href;
  try {
    decodedHref = decodeURIComponent(href);
  } catch {
    // Keep the raw href when decoding fails so plain ASCII paths still work.
  }

  if (decodedHref.startsWith("file://")) {
    decodedHref = decodedHref.slice("file://".length);
  }

  const hrefMatch = decodedHref.match(FILE_HREF_RE);
  if (!hrefMatch) {
    return null;
  }

  return {
    filePath: hrefMatch[1],
    line: hrefMatch[2] ? parseInt(hrefMatch[2], 10) : undefined,
  };
}

export function MarkdownRenderer({ content, onFileClick }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-[var(--color-text)] mt-4 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-[var(--color-text)] mt-3 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-[var(--color-text)] mt-3 mb-1">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-medium text-[var(--color-text)] mt-2 mb-1">{children}</h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-xs font-semibold text-[var(--color-text)] mt-2 mb-1">{children}</h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-xs font-medium text-[var(--color-text-muted)] mt-2 mb-1">{children}</h6>
        ),
        p: ({ children }) => (
          <p className="text-sm text-[var(--color-text)] mb-2 last:mb-0 [li>&]:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-sm text-[var(--color-text)] mb-2 ml-2 space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-sm text-[var(--color-text)] mb-2 ml-2 space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-[var(--color-text)]">{children}</li>
        ),
        a: ({ href, children }) => {
          // Check if the link href looks like a file path (not an external URL)
          if (onFileClick && href) {
            const parsedHref = parseFileHref(href);
            if (parsedHref) {
              const { filePath, line } = parsedHref;
              // Also check the link text for "file:line" pattern
              const text = extractText(children);
              const textMatch = text.match(FILE_PATH_RE);
              const finalLine = line ?? (textMatch?.[2] ? parseInt(textMatch[2], 10) : undefined);
              return (
                <FileChip
                  filePath={filePath}
                  line={finalLine}
                  onClick={() => onFileClick(filePath, finalLine)}
                />
              );
            }
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-highlight)] hover:underline"
            >
              {children}
            </a>
          );
        },
        strong: ({ children }) => (
          <strong className="font-semibold text-[var(--color-text)]">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--color-highlight)] pl-3 my-2 text-sm text-[var(--color-text-muted)]">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            if (className === "language-mermaid") {
              const text = extractText(children);
              return <MermaidBlock code={text} />;
            }
            return (
              <code className="block text-xs font-mono">{children}</code>
            );
          }
          // Check if inline code looks like a file path
          if (onFileClick) {
            const text = extractText(children);
            const match = text.match(FILE_PATH_RE);
            if (match) {
              const filePath = match[1];
              const line = match[2] ? parseInt(match[2], 10) : undefined;
              return (
                <FileChip
                  filePath={filePath}
                  line={line}
                  onClick={() => onFileClick(filePath, line)}
                />
              );
            }
          }
          return (
            <code className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-highlight)] text-xs font-mono">
              {children}
            </code>
          );
        },
        pre: ({ children }) => {
          // If the child is a component (e.g. MermaidBlock) rather than a native <code>, pass through
          const child = Children.toArray(children)[0];
          if (isValidElement(child) && typeof child.type !== 'string') {
            return <>{children}</>;
          }
          return (
            <pre className="rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 my-2 overflow-x-auto text-xs font-mono">
              {children}
            </pre>
          );
        },
        hr: () => (
          <hr className="border-[var(--color-border)] my-3" />
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-sm border-collapse border border-[var(--color-border)]">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[var(--color-bg-tertiary)]">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-[var(--color-border)] px-3 py-1.5 text-left text-xs font-semibold text-[var(--color-text)]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)]">
            {children}
          </td>
        ),
        input: ({ checked, ...props }) => {
          if (props.type === "checkbox") {
            return (
              <span className={`inline-block mr-1.5 ${checked ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"}`}>
                {checked ? "✓" : "○"}
              </span>
            );
          }
          return <input {...props} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
