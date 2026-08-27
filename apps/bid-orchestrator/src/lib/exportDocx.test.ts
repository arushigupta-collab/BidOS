import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import { buildDocx, type CompiledDocument } from "./exportDocx";

/**
 * The deliverable.
 *
 * Everything else in this product is a screen somebody looks at once. This is the
 * artefact that leaves: it gets opened, edited and printed by people who will
 * never see any of the screens, so it has to be a real Word document rather than
 * something that merely downloads.
 */
const DOC: CompiledDocument = {
  tenderTitle: "Selection of System Integrator for Maharashtra RTS Aaple Sarkar 2.0",
  tenderRef: "MAHAIT/RTS2.0/001/2025/080",
  issuingAuthority: "Maharashtra Information Technology Corporation Limited",
  bidder: "Meridian Infratech Limited",
  sections: [
    { title: "Cover Letter", paragraphs: ["25 August 2026", "To the Managing Director,"] },
    { title: "Table of Contents", paragraphs: ["Cover Letter", "Executive Summary"], asList: true },
    { title: "Technical Solution (Solution Architect)", paragraphs: ["We will deliver in nine months."] },
  ],
};

describe("the compiled bid document", () => {
  it("packs to a real .docx, not an HTML file with the wrong extension", async () => {
    const buffer = await Packer.toBuffer(buildDocx(DOC));
    // A .docx is a ZIP. Every one begins PK\x03\x04, and a renamed HTML file
    // does not -- which is the failure this replaces.
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer.byteLength).toBeGreaterThan(4_000);
  });

  it("grows with the content it is given, so the sections reach the file", async () => {
    // The XML inside a .docx is deflated, so the text cannot be grepped for
    // directly. What CAN be asserted is that content actually reaches the
    // packer: a builder that silently dropped its sections would produce the
    // same bytes for one section as for twenty.
    const one = await Packer.toBuffer(buildDocx({ ...DOC, sections: DOC.sections.slice(0, 1) }));
    const many = await Packer.toBuffer(
      buildDocx({
        ...DOC,
        sections: Array.from({ length: 20 }, (_, i) => ({
          title: `Section ${i}`,
          paragraphs: ["A paragraph long enough that twenty of them cannot compress to nothing."],
        })),
      }),
    );
    expect(many.byteLength).toBeGreaterThan(one.byteLength);
  });

  it("builds without a tender reference, which many tenders omit", async () => {
    const buffer = await Packer.toBuffer(
      buildDocx({ ...DOC, tenderRef: null, issuingAuthority: null }),
    );
    expect(buffer.byteLength).toBeGreaterThan(4_000);
  });

  it("builds with no sections at all rather than throwing", async () => {
    const buffer = await Packer.toBuffer(buildDocx({ ...DOC, sections: [] }));
    expect(buffer.byteLength).toBeGreaterThan(2_000);
  });
});
