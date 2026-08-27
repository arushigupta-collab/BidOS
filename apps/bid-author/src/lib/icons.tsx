import type { SVGProps } from "react";
import type { FileKind } from "../types";

type IconProps = SVGProps<SVGSVGElement>;

/** Shared wrapper: stroke-based, currentColor, 1.75 weight. */
function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const Sparkle = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.9 4.8L18.7 9.7 13.9 11.6 12 16.4 10.1 11.6 5.3 9.7 10.1 7.8z" />
    <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </Base>
);

export const Check = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Base>
);

export const CheckCircle = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </Base>
);

export const Warning = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.3 3.8L2.5 17.5a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.8a2 2 0 00-3.4 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Base>
);

export const CrossCircle = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </Base>
);

export const X = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Base>
);

export const Search = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Base>
);

export const ChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const ChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 6l6 6-6 6" />
  </Base>
);

export const ChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Base>
);

export const ArrowLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </Base>
);

export const ArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </Base>
);

export const SendArrow = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </Base>
);

export const At = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.9 7.9" />
  </Base>
);

export const Bold = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 5h6a3.5 3.5 0 010 7H7z" />
    <path d="M7 12h7a3.5 3.5 0 010 7H7z" />
  </Base>
);

export const Italic = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 5h-6M11 19H5M15 5L9 19" />
  </Base>
);

export const AlignLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h10M4 18h13" />
  </Base>
);

export const AlignCenter = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M7 12h10M6 18h12" />
  </Base>
);

export const AlignRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M10 12h10M7 18h13" />
  </Base>
);

export const AlignJustify = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Base>
);

export const MoreHorizontal = (p: IconProps) => (
  <Base {...p}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </Base>
);

export const Share = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
    <path d="M16 6l-4-4-4 4" />
    <path d="M12 2v13" />
  </Base>
);

export const Download = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
    <path d="M7 11l5 5 5-5" />
    <path d="M12 4v12" />
  </Base>
);

export const Lock = (p: IconProps) => (
  <Base {...p}>
    <rect x="4.5" y="10" width="15" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 018 0v3" />
  </Base>
);

export const Target = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
  </Base>
);

export const Route = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6.5" cy="18.5" r="2.5" />
    <circle cx="17.5" cy="5.5" r="2.5" />
    <path d="M9 18.5h5a3.5 3.5 0 003.5-3.5V8" />
    <path d="M6.5 16V10A3.5 3.5 0 0110 6.5h5" />
  </Base>
);

export const Plus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const Layers = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2l9 5-9 5-9-5z" />
    <path d="M3 12l9 5 9-5" />
    <path d="M3 17l9 5 9-5" />
  </Base>
);

export const Users = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M2.5 20a6.5 6.5 0 0113 0" />
    <path d="M16 5.2a3 3 0 010 5.6" />
    <path d="M18.5 20a6.5 6.5 0 00-4-6" />
  </Base>
);

/** Up/down sort carets used in table headers. */
export const SortCaret = (p: IconProps) => (
  <svg
    viewBox="0 0 12 14"
    width={11}
    height={13}
    fill="currentColor"
    aria-hidden="true"
    {...p}
  >
    <path d="M6 1.5L9 5.5H3z" />
    <path d="M6 12.5L3 8.5h6z" />
  </svg>
);

export const ExternalLink = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14L21 3" />
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
  </Base>
);

export const FileText = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h6" />
  </Base>
);

export const Folder = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </Base>
);

export const Refresh = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.7-3M3 12a9 9 0 019-9 9 9 0 016.7 3" />
    <path d="M21 3v5h-5M3 21v-5h5" />
  </Base>
);

export const Quote = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 7H4a1 1 0 00-1 1v4a1 1 0 001 1h3v3a3 3 0 01-3 3" />
    <path d="M20 7h-3a1 1 0 00-1 1v4a1 1 0 001 1h3v3a3 3 0 01-3 3" />
  </Base>
);

export const Tasks = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6l1.5 1.5L8 5" />
    <path d="M4 13l1.5 1.5L8 11" />
    <path d="M11 6h9M11 13h9M11 19h9" />
    <path d="M4 19l1.5 1.5L8 18" />
  </Base>
);

/** File type badge: coloured rounded rectangle with the extension label. */
export function FileTypeIcon({ kind }: { kind: FileKind }) {
  const map: Record<FileKind, { label: string; classes: string }> = {
    pdf: { label: "PDF", classes: "bg-red-100 text-red-700" },
    docx: { label: "DOC", classes: "bg-blue-100 text-blue-700" },
    xlsx: { label: "XLS", classes: "bg-emerald-100 text-emerald-700" },
  };
  const { label, classes } = map[kind];
  return (
    <span
      className={`inline-flex h-5 w-8 shrink-0 items-center justify-center rounded text-[9px] font-bold tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}
