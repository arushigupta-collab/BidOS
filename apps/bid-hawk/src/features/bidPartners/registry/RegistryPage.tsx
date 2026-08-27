import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  FileSpreadsheet,
  Send,
  Settings2,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { Partner } from "@/types";
import {
  Button,
  Chip,
  MultiSelect,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  Select,
  Separator,
  SkeletonText,
  Tooltip,
} from "@/components/ui";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { fetchPartners, removePartner, savePartners } from "@/data/api";
import { EMPTY_VALUE, formatCount, pluralise } from "@/lib/format";
import { toast } from "@/lib/toast";
import { ICON } from "@/lib/tokens";
import { usePartnerData } from "@/features/bidPartners/usePartnerData";
import { partnersFor, routedByIndustry, industryOf } from "@/features/bidPartners/partnerTenders";
import { useWorkspace } from "@/store/useWorkspace";
import { InviteDrawer } from "./InviteDrawer";
import { PartnersTable } from "./PartnersTable";
import { SyncNotice } from "@/features/bidPartners/SyncNotice";
import {
  NO_FILTERS,
  activeFilterCount,
  applyFilters,
  filterOptions,
  invitedTo,
  rfpOptions,
  summarise,
  type RegistryFilters,
} from "./registryModel";
import { PARTNER_IMPORT } from "./partnerImport";

/**
 * The partner registry.
 *
 * NO CHOICE STATE. Sources and people open on a choice between viewing what exists and
 * adding a record, because both start empty and that choice is the first-run moment.
 * Partners load by default, so the same screen would put a fork in front of a table
 * that already has seven rows. This goes straight to the table and "Add partner" is a
 * header action. A later session should not "restore consistency" here; see
 * docs/decisions.md.
 */
export function RegistryPage() {
  const navigate = useNavigate();
  const partners = useWorkspace((state) => state.partners);
  const invitations = useWorkspace((state) => state.invitations);
  /**
   * The RFP selector shows the tenders this workspace has actually read.
   *
   * It read the fourteen seeded ones until now, which meant every invitation this
   * module could compose was for a document nobody had uploaded — the covering
   * note, the deadline and the requested documents were all composed from demo
   * data. It falls back to the seed only when no reading exists, because an empty
   * selector with no explanation is worse than a visibly seeded one.
   *
   * Bid Hawk's own first-run reveal is still not inherited: `usePartnerData` reads
   * the uploaded readings, which have nothing to do with connecting a source.
   */
  const { tenders, syncError } = usePartnerData();

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<RegistryFilters>(NO_FILTERS);
  const [selection, setSelection] = useState<RowSelectionState>({});
  /**
   * Undefined, not '': Radix reserves the empty string and a Select given it never
   * opens. The unselected state has to be the absence of a value, not a blank one.
   *
   * Seeded from ?rfp= so the tracker's "Invite more partners" arrives with the selector
   * already pointing at the tender it came from.
   */
  const [search] = useSearchParams();
  const [rfpId, setRfpId] = useState<string | undefined>(
    search.get("rfp") ?? undefined,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Partner | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setLoaded(false);
    fetchPartners()
      .then(() => setLoaded(true))
      .catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const rfp = tenders.find((tender) => tender.id === rfpId) ?? null;

  /**
   * The partners this RFP is routed to, before the operator's own filters.
   *
   * Choosing an RFP narrows the registry to the partners registered under its
   * industry. Sending a citizen-services tender to a scanning bureau wastes two
   * firms' time and buys the bid desk nothing, and the operator selecting thirteen
   * rows and reading each one's industry off the table is the manual version of
   * exactly this.
   *
   * With no RFP chosen the registry is the registry: every active partner.
   */
  /**
   * Choosing an RFP clears the selection.
   *
   * The recipient list is built from the selected ids against the whole registry,
   * not against the visible rows -- so a partner ticked before an RFP was chosen
   * stayed a recipient after the industry filter removed their row, and the
   * invitation went to somebody the table was no longer showing.
   */
  const chooseRfp = useCallback((next: string) => {
    setRfpId(next);
    setSelection({});
  }, []);

  const routed = useMemo(() => partnersFor(rfp, partners), [rfp, partners]);
  const byIndustry = useMemo(
    () => routedByIndustry(rfp, partners),
    [rfp, partners],
  );

  const visible = useMemo(
    () => applyFilters(routed, filters),
    [routed, filters],
  );
  const summary = useMemo(
    () => summarise(partners, invitations, rfpId),
    [partners, invitations, rfpId],
  );
  const invited = useMemo(
    () => invitedTo(invitations, rfpId),
    [invitations, rfpId],
  );
  // The count rides along as `detail`, which MultiSelect renders as a trailing figure
  // and leaves out of the trigger summary.
  const toOptions = (rows: ReturnType<typeof filterOptions>) =>
    rows.map((row) => ({
      value: row.value,
      label: row.value,
      detail: String(row.count),
    }));
  const capabilities = useMemo(
    () => toOptions(filterOptions(partners, "capabilities")),
    [partners],
  );
  const regions = useMemo(
    () => toOptions(filterOptions(partners, "regions")),
    [partners],
  );
  const rfps = useMemo(() => rfpOptions(tenders), [tenders]);

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);
  const recipients = partners.filter((partner) =>
    selectedIds.includes(partner.id),
  );
  /** Both conditions, and the tooltip names whichever is outstanding. */
  const inviteBlockedBecause =
    !rfpId && recipients.length === 0
      ? "Choose the RFP you are inviting partners to, and select at least one partner."
      : !rfpId
        ? "Choose the RFP you are inviting partners to."
        : recipients.length === 0
          ? "Select at least one partner to invite."
          : null;

  const remove = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await removePartner(pendingRemoval.id);
      toast.success("Partner removed", {
        description: `${pendingRemoval.name} is no longer registered.`,
      });
      setPendingRemoval(null);
    } catch {
      toast.error("The partner could not be removed", {
        description: "Nothing was changed.",
      });
    } finally {
      setRemoving(false);
    }
  };

  const renderMenu = useCallback(
    (partner: Partner) => (
      <DropdownMenu
        label={`Actions for ${partner.name}`}
        triggerIcon={<Settings2 size={ICON.md} aria-hidden="true" />}
        items={[
          {
            id: "edit",
            label: "Edit partner",
            icon: <Settings2 size={ICON.sm} />,
            onSelect: () =>
              navigate(`/bid-partners/registry/${partner.id}/edit`),
          },
          {
            id: "remove",
            label: "Remove partner",
            icon: <Trash2 size={ICON.sm} />,
            destructive: true,
            onSelect: () => setPendingRemoval(partner),
          },
        ]}
      />
    ),
    [navigate],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:h-canvas-fit">
      <header className="flex flex-col gap-16 px-24 pb-16 pt-24 md:px-32">
        <div className="flex flex-col gap-16 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4">
            <h1 id="registry-heading" className="text-page-title text-fg">
              Partner registry
            </h1>
            <p className="max-w-lede text-secondary-body text-fg-muted">
              The delivery partners you bid alongside, and who to invite to an
              RFP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-8">
            {inviteBlockedBecause ? (
              <Tooltip content={inviteBlockedBecause} wrapDisabled>
                <Button
                  variant="primary"
                  disabled
                  iconLeft={<Send size={ICON.md} aria-hidden="true" />}
                >
                  Invite selected
                </Button>
              </Tooltip>
            ) : (
              <Button
                variant="primary"
                iconLeft={<Send size={ICON.md} aria-hidden="true" />}
                onClick={() => setDrawerOpen(true)}
              >
                {`Invite selected (${recipients.length})`}
              </Button>
            )}

            <Button
              variant="secondary"
              iconLeft={<UserPlus size={ICON.md} aria-hidden="true" />}
              onClick={() => navigate("/bid-partners/registry/new")}
            >
              Add partner
            </Button>

            <Button
              variant="secondary"
              iconLeft={<FileSpreadsheet size={ICON.md} aria-hidden="true" />}
              onClick={() => setImportOpen(true)}
            >
              Import CSV or Excel
            </Button>
          </div>
        </div>

        {/* One inset surface: a lead metric and one inline stat, matching the summary
            treatment on /sources rather than a row of cards.

            The RFP selector sits here because it is the TARGET of an invitation. It
            does not filter, sort or rank the table, and nothing on this screen suggests
            a partner for it. */}
        <section
          aria-label="Registry summary"
          className="flex flex-col gap-20 rounded-card bg-surface-sunken p-20 lg:flex-row lg:items-center lg:gap-32"
        >
          <div className="flex shrink-0 items-start gap-16">
            <span
              aria-hidden="true"
              className="mt-4 grid h-32 w-32 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
            >
              <Users size={ICON.md} />
            </span>
            <div className="flex flex-col gap-4">
              <p className="text-micro-label uppercase text-fg-muted">
                Registered partners
              </p>
              <p className="numeric font-mono text-kpi-value text-fg">
                {formatCount(summary.registered)}
              </p>
            </div>
          </div>

          {/* Invitations sent for the RFP in the selector. A muted dash when no RFP is
              chosen: a 0 would say "none invited yet" when the truth is "no RFP
              chosen". Replaces a paused count, which was a sources concept and the same
              number on every visit. */}
          <div className="flex flex-col gap-2">
            <p className="text-micro-label uppercase text-fg-muted">
              Invited to this RFP
            </p>
            <p className="numeric font-mono text-panel-title text-fg">
              {summary.invitedToSelected === null ? (
                <span className="text-fg-subtle">{EMPTY_VALUE}</span>
              ) : (
                formatCount(summary.invitedToSelected)
              )}
            </p>
          </div>

          <Separator orientation="vertical" className="hidden h-32 lg:block" />

          <div className="min-w-0 flex-1">
            <Select
              id="invite-rfp"
              label="RFP to invite partners to"
              placeholder="Choose an RFP"
              options={rfps}
              value={rfpId}
              onValueChange={chooseRfp}
              contentClassName="max-w-form"
              helper={
                recipients.length > 0
                  ? `The target of the invitation. It does not filter or reorder the partners below. ${pluralise(recipients.length, "partner")} selected.`
                  : "The target of the invitation. It does not filter or reorder the partners below. Select partners in the table to invite them."
              }
            />
          </div>
        </section>
      </header>

      {!loaded && !error && (
        <div className="flex flex-col gap-16 px-24 py-24 md:px-32">
          <SkeletonText lines={7} />
        </div>
      )}

      {error && (
        <EmptyState
          tone="destructive"
          title="The registry could not be read"
          description="Nothing was changed. The workspace store did not answer in time."
          action={
            <Button variant="primary" onClick={load}>
              Try again
            </Button>
          }
        />
      )}

      {loaded && partners.length === 0 && (
        <EmptyState
          icon={<Users size={ICON.lg} aria-hidden="true" />}
          title="No partners are registered"
          description="A partner record holds what an organisation can do, where it works and what it is certified for, so you can invite the right ones to an RFP."
          action={
            <Button
              variant="primary"
              onClick={() => navigate("/bid-partners/registry/new")}
            >
              Add partner
            </Button>
          }
        />
      )}

      {loaded && partners.length > 0 && (
        <>
          <div className="flex flex-col gap-12 px-24 pb-16 md:px-32">
            {/* TWO DROPDOWNS, not a chip wall. Every capability and every region as a
                chip ran to three dense rows and was the loudest thing on the screen,
                above a table whose own rows carry the same chips — the filter bar and the
                data were saying the same thing twice, and the bar was winning.

                Multi-select within each dropdown and AND across the two, which is what
                `applyFilters` already did; only the control changed. */}
            {/* A labelled region, because the over-filtered empty state carries its own
                "Clear filters" action: two controls with one name in one view are
                ambiguous to a screen reader reading the button list, and the region tells
                them apart without renaming either. */}
            {/* Says what choosing an RFP did to the table below it. A list that
                silently shrank by nine rows reads as a bug, and the fallback case
                -- an industry nobody is registered under -- has to say so too, or
                the operator invites the wrong field without knowing. */}
            {rfp ? (
              <p className="text-body text-fg-muted">
                {byIndustry ? (
                  <>
                    Showing the <strong className="font-medium text-fg">{routed.length}</strong>{" "}
                    partner{routed.length === 1 ? "" : "s"} registered under{" "}
                    <strong className="font-medium text-fg">{industryOf(rfp)}</strong>, which is
                    this tender&rsquo;s industry.
                  </>
                ) : (
                  <>
                    No partner is registered under{" "}
                    <strong className="font-medium text-fg">{industryOf(rfp)}</strong>, so the whole
                    registry is shown. Each row carries its own industry.
                  </>
                )}
              </p>
            ) : null}

            <SyncNotice message={syncError} />

            <section aria-label="Filters" className="flex flex-col gap-12">
              {/* Sized by a WRAPPER, not by a className on the control. MultiSelect carries
                  its own `w-full`, and tailwind-merge does not recognise a project-specific
                  `w-filter` as belonging to the width group, so it kept both classes and
                  `w-full` won on stylesheet order — the two dropdowns rendered full width
                  and stacked. Measured: 1312px against the 232px asked for. */}
              <div className="flex flex-wrap items-end gap-12">
                <div className="w-filter">
                  <MultiSelect
                    id="filter-capability"
                    label="Capability"
                    placeholder="Any capability"
                    summaryNoun="capabilities"
                    options={capabilities}
                    values={filters.capabilities}
                    onChange={(next) =>
                      setFilters((current) => ({
                        ...current,
                        capabilities: next,
                      }))
                    }
                  />
                </div>

                <div className="w-filter">
                  <MultiSelect
                    id="filter-region"
                    label="Region"
                    placeholder="Any region"
                    summaryNoun="regions"
                    options={regions}
                    values={filters.regions}
                    onChange={(next) =>
                      setFilters((current) => ({ ...current, regions: next }))
                    }
                  />
                </div>

                <p className="ml-auto pb-8 text-metadata text-fg-muted">
                  {pluralise(visible.length, "partner")}
                </p>
              </div>

              {/* A SUMMARY of what is on, not a reinstated chip wall: it lists only the
                selected values, so it is empty until the operator chooses something and
                never grows past what they picked. Clear filters appears with it, for the
                same reason — a control that resets nothing is a control that does
                nothing. */}
              {activeFilterCount(filters) > 0 && (
                <div className="flex flex-wrap items-center gap-8">
                  {[...filters.capabilities, ...filters.regions].map(
                    (value) => (
                      <Chip
                        key={value}
                        tone="selected"
                        onRemove={() =>
                          setFilters((current) => ({
                            capabilities: current.capabilities.filter(
                              (v) => v !== value,
                            ),
                            regions: current.regions.filter((v) => v !== value),
                          }))
                        }
                      >
                        {value}
                      </Chip>
                    ),
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<X size={ICON.sm} aria-hidden="true" />}
                    onClick={() => setFilters(NO_FILTERS)}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </section>

            {/* In flow, never fixed: a bar that floats over the header would cover the
                primary action it exists to feed. */}
            {recipients.length > 0 && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-12 rounded-card bg-primary-subtle px-16 py-12"
              >
                <p className="text-body-strong text-primary">
                  {`${pluralise(recipients.length, "partner")} selected`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelection({})}
                >
                  Clear selection
                </Button>
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Users size={ICON.lg} aria-hidden="true" />}
              title="No partners match these filters"
              description="Every registered partner is still here. The current combination of capability and region excludes all of them."
              action={
                <Button
                  variant="primary"
                  onClick={() => setFilters(NO_FILTERS)}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <PartnersTable
              selectAllLabel={
                activeFilterCount(filters) > 0
                  ? `Select all ${visible.length} matching partners`
                  : "Select all partners"
              }
              invited={invited}
              partners={visible}
              renderMenu={renderMenu}
              selection={selection}
              onSelectionChange={setSelection}
              onOpen={(partner) =>
                navigate(`/bid-partners/registry/${partner.id}/edit`)
              }
              labelledBy="registry-heading"
            />
          )}
        </>
      )}

      <InviteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        rfp={rfp}
        recipients={recipients}
        invitations={invitations}
        onSent={() => setSelection({})}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        pending={importing}
        {...PARTNER_IMPORT}
        onConfirm={async (report) => {
          // Only the accepted rows are added. Rejected ones stay reported in the dialog
          // with their reason, rather than being quietly dropped or half-imported.
          const created = report.accepted.map((row) => row.input);
          if (created.length === 0) return;
          setImporting(true);
          try {
            await savePartners(created);
            toast.success(`${pluralise(created.length, "partner")} imported`, {
              description: "They are in the registry now.",
            });
            setImportOpen(false);
          } catch {
            toast.error("The import could not be saved", {
              description: "Nothing was added.",
            });
          } finally {
            setImporting(false);
          }
        }}
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        destructive
        pending={removing}
        title={`Remove ${pendingRemoval?.name ?? "this partner"}?`}
        description="The partner and any invitations already sent to them are removed from this workspace."
        confirmLabel="Remove partner"
        onConfirm={remove}
      />
    </div>
  );
}
