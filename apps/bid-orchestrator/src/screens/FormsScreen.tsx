import type { Assignments, Rfp } from "../types";
import { personById } from "../data/seed";
import { BidManagerForms } from "../components/BidManagerForms";
import { ArrowRight } from "../lib/icons";

export function FormsScreen({
  rfp,
  assignments,
  onCompile,
}: {
  rfp: Rfp;
  assignments: Assignments;
  onCompile: () => void;
}) {
  const bidManagerName =
    personById(assignments["bid-manager"])?.name ?? "the Bid Manager";

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Bid Manager Forms
        </h1>
        <p className="mt-1 text-sm text-stone-500">{rfp.title}</p>
      </div>

      <BidManagerForms bidManagerName={bidManagerName} />

      <div className="mt-10 flex justify-end">
        <button
          onClick={onCompile}
          className="flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
        >
          Compile Response
          <ArrowRight width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
