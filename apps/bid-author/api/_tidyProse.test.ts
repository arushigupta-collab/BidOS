import { describe, expect, it } from "vitest";
import { tidyProse } from "./_tidyProse";

/**
 * Generated prose is pasted into a bid document that a procurement officer reads,
 * and a dash standing in for a clause boundary is the clearest tell that nobody
 * wrote it. The prompts ask for none of this; asking was not enough, so it is
 * enforced here where it cannot be ignored.
 */
describe("tidying generated prose", () => {
  it("turns a spaced em dash into a sentence", () => {
    expect(tidyProse("We accept the terms — the EMD is furnished as a guarantee."))
      .toBe("We accept the terms. The EMD is furnished as a guarantee.");
  });

  it("uses a comma where a full stop would strand a conjunction", () => {
    expect(tidyProse("The appraisal has lapsed — and the renewal is scheduled."))
      .toBe("The appraisal has lapsed, and the renewal is scheduled.");
    expect(tidyProse("It is met — but with a caveat."))
      .toBe("It is met, but with a caveat.");
  });

  it("keeps a compound together with a hyphen", () => {
    expect(tidyProse("a 45—month term")).toBe("a 45-month term");
    expect(tidyProse("CMMI–DEV Level 5")).toBe("CMMI-DEV Level 5");
  });

  it("straightens quotes, which arrive as mojibake downstream", () => {
    expect(tidyProse("the “three envelope” system")).toBe('the "three envelope" system');
    expect(tidyProse("the bidder’s undertaking")).toBe("the bidder's undertaking");
  });

  it("removes a bullet from something that is already a paragraph", () => {
    expect(tidyProse("• Turnover of INR 268.4 Cr.")).toBe("Turnover of INR 268.4 Cr.");
  });

  it("leaves clean text exactly as it is", () => {
    const clean = "Meridian accepts the four envelope process. The EMD is INR 1,00,00,000.";
    expect(tidyProse(clean)).toBe(clean);
  });

  it("does not leave doubled punctuation where a dash followed a full stop", () => {
    expect(tidyProse("It is done. — The rest follows.")).toBe("It is done. The rest follows.");
  });
});
