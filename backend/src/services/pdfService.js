// Small dependency-free PDF writer for printable, text-based report output.
// For evidence photographs/charts or complex page layouts, replace this with
// a maintained PDF library after the team agrees on a dependency.
function escapePdfText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(text, width = 88) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function reportToLines(report) {
  const lines = [];
  const add = (heading, value) => {
    lines.push(heading);
    lines.push(...wrapLine(value || "Not provided"));
    lines.push("");
  };

  lines.push("FORENSIC ROAD ACCIDENT REPORT", "");
  add("Case reference", report.case?.caseReference);
  add("Incident date", report.case?.incidentDate);
  add("Incident location", report.case?.incidentAddress);
  add("Case status", report.case?.status);
  add("Assigned investigator", report.case?.assignedInvestigator);
  add("Report generated", report.generatedAt);
  add("Executive summary", report.executiveSummary || "No executive summary supplied.");

  lines.push("VEHICLES", "");
  if (!report.vehicles?.length) lines.push("No vehicle records available.");
  for (const [index, vehicle] of (report.vehicles || []).entries()) {
    lines.push(`${index + 1}. ${[vehicle.make, vehicle.model, vehicle.colour, vehicle.vehicle_type].filter(Boolean).join(" ") || "Vehicle details not provided"}`);
    lines.push(...wrapLine(`Registration: ${vehicle.registration_number || "Not provided"}`));
  }
  lines.push("", "EVIDENCE FILES", "");
  if (!report.evidence?.length) lines.push("No evidence file records available.");
  for (const [index, item] of (report.evidence || []).entries()) {
    lines.push(...wrapLine(`${index + 1}. ${item.originalFileName || item.original_filename || "Evidence file"} (uploaded ${item.uploadedAt || item.uploaded_at || "date unavailable"})`));
  }
  lines.push("", "MEASUREMENTS", "");
  if (!report.measurements?.length) lines.push("No reviewer measurements recorded in this report.");
  for (const item of report.measurements || []) lines.push(...wrapLine(`- ${item.label || "Measurement"}: ${item.value ?? "Not provided"}`));
  lines.push("", "FINDINGS", "");
  if (!report.findings?.length) lines.push("No reviewer findings recorded in this report.");
  for (const [index, finding] of (report.findings || []).entries()) lines.push(...wrapLine(`${index + 1}. ${finding}`));
  lines.push("", "LIMITATION", ...wrapLine("This report contains only data available to the system at generation time. Missing measurements, findings, and evidence are not inferred."));
  return lines;
}

function createPdfBuffer(report) {
  const lines = reportToLines(report);
  const pageLines = [];
  for (let i = 0; i < lines.length; i += 48) pageLines.push(lines.slice(i, i + 48));
  if (!pageLines.length) pageLines.push(["Forensic Road Accident Report"]);

  const objects = [];
  const addObject = (body) => { objects.push(body); return objects.length; };
  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];

  for (const page of pageLines) {
    let stream = "BT\n/F1 10 Tf\n50 790 Td\n13 TL\n";
    for (const line of page) stream += `(${escapePdfText(line)}) Tj\nT*\n`;
    stream += "ET";
    const streamId = addObject(`<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n%PDFGEN\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

module.exports = { createPdfBuffer };
