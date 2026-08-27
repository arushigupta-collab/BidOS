// Shared domain types for the Bid Orchestrator prototype.

export type RfpStatus = "Pending Review" | "Accepted" | "Rejected";

export type Source = "GeM" | "CPPP" | "MahaTenders" | "Direct";

export type EligibilityStatus = "pass" | "warn" | "fail";

export interface EligibilityRow {
  status: EligibilityStatus;
  criterion: string;
  note: string;
}

export interface KeyFact {
  label: string;
  value: string;
}

/** A row in the inbox table. RFP-001 additionally carries the rich triage fields. */
export interface Rfp {
  id: string;
  title: string;
  source: Source;
  authority: string;
  due: string;
  value: string;
  status: RfpStatus;
  /** Only the primary RFP is fully seeded with triage + team data. */
  detailed: boolean;

  // Rich fields, primary RFP only.
  tenderRef?: string;
  sourceUrl?: string;
  /** Path to the served RFP PDF, opened in the in-app viewer. */
  documentUrl?: string;
  documentName?: string;
  keyFacts?: KeyFact[];
  aiSummary?: string[];
  aiSummaryCondensed?: string[];
  eligibility?: EligibilityRow[];
}

/** Stable identifiers for the six wizard roles. */
export type RoleId =
  | "bid-manager"
  | "solution-architect"
  | "legal-1"
  | "legal-2"
  | "finance"
  | "delivery";

export interface ActionItem {
  text: string;
  /** Source reference, e.g. "RFP §5.5, Annexure 24". May be empty. */
  ref: string;
}

export interface Role {
  id: RoleId;
  name: string;
  mandate: string;
  /** Plain-language brief on what this department must ensure. */
  brief: string;
  /** Relevant RFP source sections, rendered as chips. */
  sourceSections: string[];
  actionItems: ActionItem[];
  /** Annexures / forms this department must complete. */
  forms: string[];
  /** Submission summary shown on the Team Overview screen. */
  submission: string;
  submittedAt: string;
  /** Tailwind classes for the role's avatar chip. */
  avatarClasses: string;
}

export interface Person {
  id: string;
  name: string;
  title: string;
  capabilities: RoleId[];
  activeBids: number;
  initials: string;
}

/** Map of role id -> assigned person id (or null when unassigned). */
export type Assignments = Record<RoleId, string | null>;

// ---- Response Compiler ----

export type SectionStatus = "Not Started" | "In Progress" | "Completed";

export type SectionKind = "author" | "compiled";

export interface Paragraph {
  text: string;
  /** AI-generated paragraphs carry the highlight wash and hover actions. */
  ai: boolean;
}

export interface Section {
  id: string;
  title: string;
  kind: SectionKind;
  status: SectionStatus;
  /** For compiled sections, the role that contributed the content. */
  contributor?: RoleId;
  /** Seed prose. Author sections stay hidden until Generate with AI runs. */
  content: Paragraph[];
}

// ---- Sources page ----

export type SourceStatus = "Active" | "Paused";

export interface SourceRow {
  id: string;
  name: string;
  /** Platform badge label, e.g. GeM, CPPP, IREPS, MahaTenders, State portal. */
  platform: string;
  listingUrl: string;
  registeredId: string;
  loginNote: string;
  keywords: string[];
  status: SourceStatus;
  added: string;
}

// ---- Bid Manager forms (Team Overview auto-fill) ----

export interface FormField {
  label: string;
  value: string;
}

export type ChecklistStatus = "Yes" | "In progress" | "No" | "N/A";

export interface ChecklistRow {
  item: string;
  status: ChecklistStatus;
  ref: string;
}

export interface BidForm {
  id: string;
  annexure: string;
  title: string;
  kind: "fields" | "checklist";
  fields?: FormField[];
  rows?: ChecklistRow[];
  /** Role that filled the form (for provenance in the compiler). */
  contributor?: RoleId;
}

// ---- Context Sources file tree ----

export type FileKind = "pdf" | "docx" | "xlsx";

export interface ContextFile {
  id: string;
  name: string;
  kind: FileKind;
}

export interface ContextFolder {
  id: string;
  name: string;
  files: ContextFile[];
  folders?: ContextFolder[];
}
