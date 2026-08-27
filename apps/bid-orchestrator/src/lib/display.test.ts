import { describe, expect, it } from "vitest";
import { countdown, shortMoney, urgency, EMPTY } from "./display";

/** The strings below are what extraction actually returned from the source RFP. */
describe("shortening a stored value for a table cell", () => {
  it("lifts the figure out of the clause", () => {
    expect(shortMoney("INR 1,00,00,000 /- (Indian Rupees One Crore only) in form of Bank Guarantee"))
      .toBe("INR 1,00,00,000");
    expect(shortMoney("INR 25,000/- (Indian Rupees Twenty-Five Thousand only)"))
      .toBe("INR 25,000");
  });

  it("keeps crore and lakh with the number", () => {
    expect(shortMoney("Estimated INR 72 Cr for the full term")).toBe("INR 72 Cr");
  });

  it("shows a dash where the tender published nothing", () => {
    expect(shortMoney(null)).toBe(EMPTY);
    expect(shortMoney("")).toBe(EMPTY);
  });
});

describe("deadline urgency", () => {
  const now = new Date("2027-08-01T12:00:00+05:30");
  it("matches the bands Bid Hawk uses", () => {
    expect(urgency("2027-08-02T12:00:00+05:30", now)).toBe("critical");
    expect(urgency("2027-08-05T12:00:00+05:30", now)).toBe("warning");
    expect(urgency("2027-08-28T17:00:00+05:30", now)).toBe("normal");
    expect(urgency("2027-07-30T12:00:00+05:30", now)).toBe("elapsed");
  });

  it("says Closed rather than counting backwards", () => {
    expect(countdown("2027-07-30T12:00:00+05:30", now)).toBe("Closed");
    expect(countdown("2027-08-03T12:00:00+05:30", now)).toBe("2d 0h");
  });
});
