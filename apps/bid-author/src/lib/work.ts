/**
 * The part of a bid that belongs to the signed-in specialist.
 *
 * A work package is not created here. Bid Hawk derived it from the tender and a
 * bid manager assigned it; this module answers it. Nothing on these screens can
 * change what was asked for, only what is said in reply.
 */
import { supabase } from "./supabase";
import type { RoleId } from "./session";

export interface ActionItem {
  id: string;
  ord: number;
  text: string;
  ref: string | null;
  page_no: number | null;
  done: boolean;
}

export interface FormRecord {
  id: string;
  ord: number;
  annexure: string;
  title: string;
  kind: "fields" | "checklist";
  status: string;
}

export type ReviewState = "pending" | "approved" | "changes-requested";

export interface AssignedWork {
  id: string;
  rfp_id: string;
  role_id: RoleId;
  brief: string | null;
  source_sections: string[];
  status: "unassigned" | "assigned" | "in-progress" | "submitted";
  submitted_at: string | null;
  /** What the bid manager made of it, and why, if they sent it back. */
  review: ReviewState;
  review_note: string | null;
  review_at: string | null;
  rfp: {
    id: string;
    title: string;
    tender_ref: string | null;
    issuing_authority: string | null;
    bid_due_at: string | null;
    est_value: string | null;
  };
  actionItems: ActionItem[];
  forms: FormRecord[];
}

/** Everything assigned to one person, soonest deadline first. */
export async function fetchMyWork(userId: string): Promise<AssignedWork[]> {
  const db = supabase();
  const { data: packages, error } = await db
    .from("work_packages")
    .select("*, rfp:rfp_id(id, title, tender_ref, issuing_authority, bid_due_at, est_value)")
    .eq("assignee_id", userId);

  if (error) throw new Error(error.message);
  const ids = (packages ?? []).map((p) => p.id as string);
  if (ids.length === 0) return [];

  const [items, forms] = await Promise.all([
    db.from("action_items").select("*").in("work_package_id", ids).order("ord"),
    db.from("forms").select("*").in("work_package_id", ids).order("ord"),
  ]);

  return (packages ?? [])
    .map((p) => ({
      ...(p as unknown as AssignedWork),
      actionItems: (items.data ?? []).filter((i) => i.work_package_id === p.id) as ActionItem[],
      forms: (forms.data ?? []).filter((f) => f.work_package_id === p.id) as FormRecord[],
    }))
    .sort((a, b) => {
      const at = a.rfp?.bid_due_at ? new Date(a.rfp.bid_due_at).getTime() : Infinity;
      const bt = b.rfp?.bid_due_at ? new Date(b.rfp.bid_due_at).getTime() : Infinity;
      return at - bt;
    });
}

export interface Paragraph {
  text: string;
  ai: boolean;
}

export interface ResponseRecord {
  id: string;
  section_id: string;
  title: string;
  body: Paragraph[];
  status: string;
}

export async function fetchResponses(workPackageId: string): Promise<ResponseRecord[]> {
  const { data } = await supabase()
    .from("responses")
    .select("*")
    .eq("work_package_id", workPackageId);
  return (data ?? []) as ResponseRecord[];
}

export async function saveResponse(
  workPackageId: string,
  sectionId: string,
  title: string,
  body: Paragraph[],
): Promise<void> {
  const { error } = await supabase().from("responses").upsert(
    {
      work_package_id: workPackageId,
      section_id: sectionId,
      title,
      body,
      status: "In Progress",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "work_package_id,section_id" },
  );
  if (error) throw new Error(error.message);
}

export async function setItemDone(itemId: string, done: boolean): Promise<void> {
  const { error } = await supabase().from("action_items").update({ done }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export interface FilledFieldValue {
  label: string;
  value: string;
  source: "rfp" | "profile" | "ai" | "human";
  page_no: number | null;
}

/**
 * Keeps what was filled in.
 *
 * These values were previously held in component state alone: they survived
 * until the tab was reloaded and the bid manager could never see them. An
 * annexure figure is a commitment the company signs, so it belongs in the
 * database next to the prose that argues for it -- and a reviewer approving the
 * prose without it is approving half the work.
 */
export async function saveFormValues(
  formId: string,
  fields: FilledFieldValue[],
): Promise<void> {
  const db = supabase();
  if (fields.length === 0) return;

  const { error } = await db.from("form_values").upsert(
    fields.map((field) => ({
      form_id: formId,
      field_key: field.label,
      value: field.value,
      filled_by: field.source,
      // Only a value lifted from the tender has a page to point at. Carrying one
      // on a drafted figure would make the citation claim something untrue.
      source_page: field.source === "rfp" ? field.page_no : null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "form_id,field_key" },
  );
  if (error) throw new Error(error.message);

  const { error: statusError } = await db
    .from("forms")
    .update({ status: "filled" })
    .eq("id", formId);
  if (statusError) throw new Error(statusError.message);
}

export async function fetchFormValues(
  formIds: string[],
): Promise<Record<string, FilledFieldValue[]>> {
  if (formIds.length === 0) return {};
  const { data } = await supabase()
    .from("form_values")
    .select("*")
    .in("form_id", formIds)
    .order("field_key");

  const grouped: Record<string, FilledFieldValue[]> = {};
  for (const row of data ?? []) {
    (grouped[row.form_id as string] ??= []).push({
      label: row.field_key as string,
      value: (row.value as string) ?? "",
      source: row.filled_by as FilledFieldValue["source"],
      page_no: (row.source_page as number) ?? null,
    });
  }
  return grouped;
}

/**
 * Hands the package back.
 *
 * The only write that the bid manager's Team Overview is watching for, and the
 * point at which this specialist's part of the bid stops being editable.
 *
 * Resubmitting after changes were asked for clears the review back to pending.
 * Leaving it as changes-requested would show the manager an amber row for work
 * that has already been redone.
 */
export async function submit(
  workPackageId: string,
  context: { rfpId: string; roleId: RoleId; roleName: string; actorName: string; resubmit: boolean },
): Promise<void> {
  const { error } = await supabase()
    .from("work_packages")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      review: "pending",
      review_note: null,
      review_at: null,
    })
    .eq("id", workPackageId);
  if (error) throw new Error(error.message);

  // The log is the bid manager's account of what happened, so a submission has
  // to appear in it even though it is written from the other module.
  const { error: logError } = await supabase().from("bid_events").insert({
    rfp_id: context.rfpId,
    role_id: context.roleId,
    kind: "submitted",
    actor_name: context.actorName,
    subject: context.roleName,
    note: context.resubmit ? "Resubmitted after changes were requested." : null,
  });
  if (logError) console.error("change log write failed:", logError.message);
}

/**
 * Watches the packages assigned to one person.
 *
 * The realtime hand-off used to run one way: a submit appeared on the bid
 * manager's board without a refresh, but a change request coming back sat
 * unseen until the specialist happened to reload. A request the recipient does
 * not know about is not a request.
 */
export function watchMyWork(userId: string, onChange: () => void): () => void {
  const channel = supabase()
    .channel(`mine:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "work_packages",
        filter: `assignee_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase().removeChannel(channel);
  };
}
