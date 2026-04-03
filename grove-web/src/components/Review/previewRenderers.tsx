/* eslint-disable react-refresh/only-export-components */
import { MarkdownRenderer, MermaidBlock } from '../ui/MarkdownRenderer';
import type { DiffFile } from '../../api/review';

// ============================================================================
// Preview Renderer Registry
// ============================================================================

export interface PreviewRenderer {
  /** Unique identifier */
  id: string;
  /** Human-readable label for tooltip */
  label: string;
  /** Test whether this renderer handles the given file path */
  match: (path: string) => boolean;
  /**
   * Render full-file preview content.
   * - `content`: full file text (available in "full" view mode)
   * - `diffContent`: reconstructed text from diff hunks (always available)
   */
  renderFull: (props: { content: string }) => React.ReactNode;
  /**
   * Whether this renderer supports diff-mode segment preview.
   * If false, the preview drawer will use `renderFull` with reconstructed content.
   */
  supportsDiffSegments: boolean;
}

// ============================================================================
// Built-in Renderers
// ============================================================================

const markdownRenderer: PreviewRenderer = {
  id: 'markdown',
  label: 'Preview markdown',
  match: (path) => /\.(md|markdown)$/i.test(path),
  renderFull: ({ content }) => <MarkdownRenderer content={content} />,
  supportsDiffSegments: true,
};

const mermaidRenderer: PreviewRenderer = {
  id: 'mermaid',
  label: 'Preview diagram',
  match: (path) => /\.(mmd|mermaid)$/i.test(path),
  renderFull: ({ content }) => <MermaidBlock code={content} />,
  supportsDiffSegments: false,
};

const svgRenderer: PreviewRenderer = {
  id: 'svg',
  label: 'Preview SVG',
  match: (path) => /\.svg$/i.test(path),
  renderFull: ({ content }) => (
    <div
      className="flex items-center justify-center p-4 [&_svg]:max-w-full [&_svg]:max-h-[70vh]"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  ),
  supportsDiffSegments: false,
};

const imageRenderer: PreviewRenderer = {
  id: 'image',
  label: 'Preview image',
  match: (path) => /\.(png|jpe?g|webp|gif|bmp|ico)$/i.test(path),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  renderFull: (_props) => null, // handled specially via ImagePreview
  supportsDiffSegments: false,
};

// ============================================================================
// Registry
// ============================================================================

const renderers: PreviewRenderer[] = [
  markdownRenderer,
  mermaidRenderer,
  svgRenderer,
  imageRenderer,
];

/**
 * Find the matching preview renderer for a file path.
 * Returns undefined if no renderer matches.
 */
export function getPreviewRenderer(path: string): PreviewRenderer | undefined {
  return renderers.find((r) => r.match(path));
}

// ============================================================================
// Image Preview Component
// ============================================================================

interface ImagePreviewProps {
  projectId?: string;
  taskId?: string;
  file: DiffFile;
}

export function ImagePreview({ projectId, taskId, file }: ImagePreviewProps) {
  if (!projectId || !taskId) {
    return <div className="preview-loading">Missing project context</div>;
  }

  const imgUrl = `/api/v1/projects/${projectId}/tasks/${taskId}/file?path=${encodeURIComponent(file.new_path)}`;

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4">
      <img
        src={imgUrl}
        alt={file.new_path}
        className="max-w-full max-h-[70vh] object-contain rounded-lg border border-[var(--color-border)]"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
      <div className="hidden text-sm text-[var(--color-text-muted)]">Failed to load image</div>
      <span className="text-xs text-[var(--color-text-muted)]">{file.new_path}</span>
    </div>
  );
}
