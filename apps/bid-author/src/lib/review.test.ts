import { describe, expect, it } from "vitest";
import { stateOf, stillMine } from "./review";

describe("what a specialist's row says", () => {
  it("shows the work state until the manager has read it", () => {
    expect(stateOf({ status: "assigned", review: "pending" })).toBe("assigned");
    expect(stateOf({ status: "submitted", review: "pending" })).toBe("submitted");
  });

  /*
   * Sending work back drops the status to in-progress. Rendering that told the
   * specialist their package was merely unfinished and hid the request entirely.
   */
  it("shows a change request rather than the in-progress underneath it", () => {
    expect(stateOf({ status: "in-progress", review: "changes-requested" }))
      .toBe("changes-requested");
  });

  it("shows approval once it lands", () => {
    expect(stateOf({ status: "submitted", review: "approved" })).toBe("approved");
  });
});

describe("how much is still mine", () => {
  it("counts everything not yet approved, submitted included", () => {
    expect(stillMine([
      { review: "approved" },
      { review: "pending" },
      { review: "changes-requested" },
    ])).toBe(2);
  });

  it("is nothing when every package came back approved", () => {
    expect(stillMine([{ review: "approved" }, { review: "approved" }])).toBe(0);
  });
});
