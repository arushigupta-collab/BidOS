import type { ReactNode } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { FileText } from 'lucide-react'
import type { Source } from '@/types'
import { Badge, Chip, Tooltip } from '@/components/ui'
import { platformShortLabel } from '@/data/seed/platforms'
import { SOURCE_STATUS_COPY } from '@/data/seed/sources'
import { formatAbsolute, formatRelative } from '@/lib/format'
import { rfpDocumentHref } from '@/lib/rfpDocument'
import { ICON } from '@/lib/tokens'

const column = createColumnHelper<Source>()

const VISIBLE_KEYWORDS = 2

/**
 * Column priority is expressed as a responsive class rather than through
 * tanstack's visibility state: the library owns sorting behaviour, our styling
 * layer owns what is shown at which width, and CSS needs no media-query hook.
 */
export interface ColumnMeta {
  className?: string
  align?: 'left' | 'right'
}

/**
 * `renderMenu` is optional: the schema table on the add screen shows the same
 * columns as a record of what a source holds, and has no per-row actions to offer.
 *
 * `showDocument` adds the trailing "View RFP" cell. One flag drives both the cell
 * and the row's click behaviour in `SourcesTable`, so the affordance and the action
 * cannot disagree — a row that looks clickable is clickable, and one that does not
 * is not.
 */
export function buildSourceColumns(
  renderMenu?: (source: Source) => ReactNode,
  showDocument = false,
) {
  return [
    column.accessor('name', {
      id: 'platform',
      header: 'Platform',
      cell: (info) => {
        const source = info.row.original
        const code = platformShortLabel(source.platformId)
        // The badge earns its place only when it says something the name does not.
        // A created source is named after its platform, so the code would be the
        // same word twice in one cell.
        const showCode = !source.name.toLowerCase().includes(code.toLowerCase())

        return (
          <div className="flex min-w-0 max-w-col-title items-center gap-8">
            <span className="truncate text-body-strong text-fg">{source.name}</span>
            {showCode && <Badge tone="neutral">{code}</Badge>}
          </div>
        )
      },
    }),

    column.accessor('url', {
      id: 'url',
      header: 'Listing URL',
      meta: { className: 'hidden lg:table-cell' } satisfies ColumnMeta,
      cell: (info) => (
        <span
          title={info.getValue()}
          className="block max-w-col-title truncate font-mono text-metadata text-fg-muted"
        >
          {info.getValue()}
        </span>
      ),
    }),

    column.accessor('registeredId', {
      id: 'registeredId',
      header: 'Registered ID',
      meta: { className: 'hidden xl:table-cell' } satisfies ColumnMeta,
      cell: (info) => (
        <div className="flex flex-col gap-2">
          <span className="whitespace-nowrap font-mono text-metadata text-fg-secondary">
            {info.getValue()}
          </span>
          {/* The credential itself is never shown, only that one is held. */}
          <span className="whitespace-nowrap text-metadata text-fg-muted">
            {info.row.original.credentialLabel}
          </span>
        </div>
      ),
    }),

    column.accessor('keywords', {
      id: 'keywords',
      header: 'Keywords',
      enableSorting: false,
      meta: { className: 'hidden md:table-cell' } satisfies ColumnMeta,
      cell: (info) => {
        const keywords = info.getValue()
        const shown = keywords.slice(0, VISIBLE_KEYWORDS)
        const hidden = keywords.length - shown.length

        return (
          <div className="flex flex-wrap items-center gap-4">
            {shown.map((keyword) => (
              <Chip key={keyword}>{keyword}</Chip>
            ))}
            {hidden > 0 && (
              <Tooltip content={keywords.join(', ')}>
                <button
                  type="button"
                  className="rounded-field px-4 py-2 text-metadata-strong text-fg-muted underline decoration-border underline-offset-2 hover:text-fg"
                >
                  {`+${hidden}`}
                </button>
              </Tooltip>
            )}
          </div>
        )
      },
    }),

    column.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const copy = SOURCE_STATUS_COPY[info.getValue()]
        // A badge with its own word: status is never carried by colour alone.
        return <Badge tone={copy.tone === 'success' ? 'success' : 'neutral'}>{copy.label}</Badge>
      },
    }),

    column.accessor('addedAt', {
      id: 'addedAt',
      header: 'Added',
      meta: { className: 'hidden sm:table-cell' } satisfies ColumnMeta,
      cell: (info) => (
        <span
          title={formatAbsolute(info.getValue())}
          className="whitespace-nowrap text-body text-fg-secondary"
        >
          {formatRelative(info.getValue())}
        </span>
      ),
    }),

    /**
     * A real anchor, not a styled span. The row delegates its click to this
     * element, so the one path to the document is a link: middle-click, copy
     * address and open-in-new-tab all work, and nothing goes through
     * `window.open`, which Chrome refuses for a local file from a file:// page.
     *
     * Matches the summary page's "View RFP" — same glyph, same words — so the two
     * read as one action rather than two that happen to open the same file.
     */
    ...(showDocument
      ? [
          column.display({
            id: 'document',
            header: '',
            meta: { align: 'right', className: 'w-0 whitespace-nowrap' } satisfies ColumnMeta,
            cell: () => (
              <a
                href={rfpDocumentHref()}
                target="_blank"
                rel="noopener noreferrer"
                data-row-document="true"
                // The row already names the destination, so this is not announced
                // a second time; it stays reachable and clickable in its own right.
                tabIndex={-1}
                aria-hidden="true"
                className="inline-flex items-center gap-4 rounded-field text-metadata-strong text-fg-muted transition-colors duration-micro ease-out group-hover:text-fg"
              >
                <FileText size={ICON.sm} aria-hidden="true" className="shrink-0" />
                View RFP
              </a>
            ),
          }),
        ]
      : []),

    ...(renderMenu
      ? [
          column.display({
            id: 'actions',
            header: '',
            cell: (info) => renderMenu(info.row.original),
          }),
        ]
      : []),
  ]
}
