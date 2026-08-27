/**
 * The compiled response, as a Word document.
 *
 * `.docx` rather than the HTML this module produced before, because the artefact
 * has to survive being opened, edited and printed by people who will never see
 * this product. An HTML file that opens in a browser is a preview; a bid is a
 * document somebody signs.
 */
import {
  AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun,
} from "docx";

export interface CompiledSection {
  title: string;
  paragraphs: string[];
  /** Contents pages are a list, not prose. */
  asList?: boolean;
}

export interface CompiledDocument {
  tenderTitle: string;
  tenderRef: string | null;
  issuingAuthority: string | null;
  bidder: string;
  sections: CompiledSection[];
}

export function buildDocx(doc: CompiledDocument): Document {
  const cover: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 240 },
      children: [new TextRun({ text: "Bid Response", bold: true, size: 44 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [new TextRun({ text: doc.tenderTitle, size: 28 })],
    }),
    ...(doc.tenderRef
      ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Tender reference: ${doc.tenderRef}`, size: 22 })],
        })]
      : []),
    ...(doc.issuingAuthority
      ? [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: doc.issuingAuthority, size: 22 })],
        })]
      : []),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 720 },
      children: [new TextRun({ text: `Submitted by ${doc.bidder}`, bold: true, size: 24 })],
    }),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  ];

  const body = doc.sections.flatMap((section, index) => [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: index === 0 ? 0 : 360, after: 180 },
      children: [new TextRun({ text: section.title, bold: true, size: 30 })],
    }),
    ...section.paragraphs.map((text) =>
      new Paragraph({
        spacing: { after: 160, line: 300 },
        ...(section.asList ? { bullet: { level: 0 } } : {}),
        children: [new TextRun({ text, size: 22 })],
      }),
    ),
  ]);

  return new Document({
    creator: doc.bidder,
    title: `Bid response — ${doc.tenderTitle}`,
    sections: [{ properties: {}, children: [...cover, ...body] }],
  });
}

/** Hands the file to the browser. */
export async function downloadDocx(doc: CompiledDocument, fileName: string): Promise<void> {
  const blob = await Packer.toBlob(buildDocx(doc));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked on the next tick: revoking immediately races the download in Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
