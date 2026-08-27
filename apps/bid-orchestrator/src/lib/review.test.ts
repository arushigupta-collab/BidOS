import { describe, expect, it } from "vitest";
import {
  readyToCompile, awaitingReview, approvedCount, rowState, changeRequestError, specialists,
} from "./review";
import type { Reviewable } from "./review";
import type { ReviewState, RoleId, WorkStatus } from "./rfps";

function pkg(role: RoleId, status: WorkStatus, review: ReviewState): Reviewable {
  return { role_id: role, status, review };
}

/** The six packages Bid Hawk derives, in the state they start in. */
const fresh: Reviewable[] = [
  pkg("bid-manager", "assigned", "pending"),
  pkg("solution-architect", "assigned", "pending"),
  pkg("legal-1", "assigned", "pending"),
  pkg("legal-2", "assigned", "pending"),
  pkg("finance", "assigned", "pending"),
  pkg("delivery", "assigned", "pending"),
];

const allSubmitted = fresh.map((p) =>
  p.role_id === "bid-manager" ? p : pkg(p.role_id, "submitted", "pending"),
);

const allApproved = fresh.map((p) =>
  p.role_id === "bid-manager" ? p : pkg(p.role_id, "submitted", "approved"),
);

describe("the compile gate", () => {
  it("does not count the bid manager's own package", () => {
    expect(specialists(fresh)).toHaveLength(5);
  });

  /*
   * The regression this file exists for. The gate opened on submission, which
   * let a manager compile a bid without having read a word of it.
   */
  it("stays shut when everyone has submitted but nobody is approved", () => {
    expect(readyToCompile(allSubmitted)).toBe(false);
  });

  it("stays shut on the last unapproved specialist", () => {
    const one = allApproved.map((p) =>
      p.role_id === "finance" ? pkg("finance", "submitted", "pending") : p,
    );
    expect(readyToCompile(one)).toBe(false);
  });

  it("stays shut when one was sent back", () => {
    const sentBack = allApproved.map((p) =>
      p.role_id === "legal-2" ? pkg("legal-2", "in-progress", "changes-requested") : p,
    );
    expect(readyToCompile(sentBack)).toBe(false);
  });

  it("opens only when all five are approved", () => {
    expect(readyToCompile(allApproved)).toBe(true);
  });

  /*
   * A tender whose packages have not loaded is not a tender with nothing left to
   * do. `every` on an empty array is true, which would have opened the gate on
   * an empty board.
   */
  it("does not open on an empty board", () => {
    expect(readyToCompile([])).toBe(false);
    expect(readyToCompile([pkg("bid-manager", "assigned", "pending")])).toBe(false);
  });
});

describe("the manager's queue", () => {
  it("counts only what has been handed back and not read", () => {
    expect(awaitingReview(allSubmitted)).toBe(5);
    expect(awaitingReview(allApproved)).toBe(0);
    expect(awaitingReview(fresh)).toBe(0);
  });

  it("does not re-queue something already sent back", () => {
    const sentBack = allSubmitted.map((p) =>
      p.role_id === "finance" ? pkg("finance", "in-progress", "changes-requested") : p,
    );
    expect(awaitingReview(sentBack)).toBe(4);
  });

  it("counts approvals for the progress bar", () => {
    expect(approvedCount(allApproved)).toBe(5);
    expect(approvedCount(allSubmitted)).toBe(0);
  });
});

describe("what a row says", () => {
  it("shows the work state while the verdict is still pending", () => {
    expect(rowState(pkg("finance", "in-progress", "pending"))).toBe("in-progress");
    expect(rowState(pkg("finance", "submitted", "pending"))).toBe("submitted");
  });

  /*
   * Sending work back drops the status to in-progress. Showing that would tell
   * the specialist their package is simply unfinished, hiding the request.
   */
  it("shows the verdict once there is one, not the status underneath it", () => {
    expect(rowState(pkg("finance", "in-progress", "changes-requested"))).toBe("changes-requested");
    expect(rowState(pkg("finance", "submitted", "approved"))).toBe("approved");
  });
});

describe("sending work back", () => {
  it("refuses without a reason", () => {
    expect(changeRequestError("")).toBe("Say what needs changing.");
    expect(changeRequestError("   \n ")).toBe("Say what needs changing.");
  });

  it("accepts one", () => {
    expect(changeRequestError("Annexure IV understates the FY24 turnover.")).toBeNull();
  });
});
