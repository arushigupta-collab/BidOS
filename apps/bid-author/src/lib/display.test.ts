import { describe, expect, it } from "vitest";
import { countdown, day, EMPTY, shortMoney } from "./display";

/**
 * Values are stored as the tender wrote them, because rewriting them would
 * destroy the quote that makes each figure checkable against its page. A table
 * cell cannot carry the whole clause, so it is shortened here.
 *
 * The strings below are what extraction actually returned from the source RFP.
 */
describe("shortening a stored value for a table cell", () => {
  it("lifts the figure out of the clause", () => {
    expect(shortMoney("INR 1,00,00,000 /- (Indian Rupees One Crore only) in form of Bank Guarantee"))
      .toBe("INR 1,00,00,000");
  });

  it("keeps crore and lakh with the number", () => {
    expect(shortMoney("Estimated INR 72 Cr for the full term")).toBe("INR 72 Cr");
  });

  it("shows a dash where the tender published nothing", () => {
    expect(shortMoney(null)).toBe(EMPTY);
    expect(day(null)).toBe(EMPTY);
    expect(countdown(null)).toBe(EMPTY);
  });
});

describe("the deadline a specialist is working to", () => {
  const now = new Date("2027-08-01T12:00:00+05:30");

  it("counts down in days and hours", () => {
    expect(countdown("2027-08-03T12:00:00+05:30", now)).toBe("2d 0h");
    expect(countdown("2027-08-01T18:00:00+05:30", now)).toBe("6h");
  });

  it("says Closed rather than counting backwards", () => {
    expect(countdown("2027-07-30T12:00:00+05:30", now)).toBe("Closed");
  });

  it("formats the date the way the rest of the platform does", () => {
    expect(day("2027-08-28T17:00:00+05:30")).toBe("28 Aug 2027");
  });
});
