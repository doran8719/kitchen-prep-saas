// src/components/prep/pdf.ts
// Kitchen pull sheet as a PDF, same layout as the screen and her paper sheet.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PrepResult } from "@/src/lib/prep/types";
import { catCode, lb, meals, oz, shortDish } from "./format";

/** jsPDF's built-in fonts only cover basic Latin, so swap symbols that would garble the text. */
const safe = (s: string) =>
  s
    .replace(/×/g, "x")
    .replace(/·/g, "|")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // é -> e, à -> a
    .replace(/[^\x20-\x7E–]/g, "");
const right = (content: string, bold = false) => ({ content, styles: { halign: "right" as const, fontStyle: bold ? ("bold" as const) : ("normal" as const) } });
const HEAD = { fillColor: [24, 24, 24] as [number, number, number] };
const STYLE = { fontSize: 9, cellPadding: 3.5 };

export function downloadPullSheet(opts: {
  businessName: string;
  title: string;
  sourceNote: string;
  fileSlug: string;
  result: PrepResult;
}) {
  const r = opts.result;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const left = 36;
  const margin = { left, right: 36 };
  const next = (gap = 16) => (doc as any).lastAutoTable.finalY + gap;
  const heading = (text: string, y: number) => {
    if (y > 700) {
      doc.addPage();
      y = 48;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(safe(text), left, y);
    doc.setFont("helvetica", "normal");
    return y + 6;
  };

  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(safe(`${opts.businessName} – Kitchen Pull Sheet`), left, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  doc.text(safe(`${opts.title}  ·  ${meals(r.mealsCounted)} entrée meals  ·  ${opts.sourceNote}`), left, 60);
  doc.text(`Generated ${new Date().toLocaleString()}`, left, 73);
  doc.setTextColor(0);

  // Entrées
  let y = heading("Entrées (cooked oz, meals in brackets)", 94);
  const c = r.containers;
  const cell = (m: number, o: number, plant: boolean) => (m ? (plant ? `(${meals(m)})` : `${oz(o)} (${meals(m)})`) : "–");
  autoTable(doc, {
    startY: y,
    head: [["", "Entrée", right("Small 4oz"), right("Medium 6oz"), right("Large 8oz"), right("A la carte"), right("+2oz"), right("Total oz"), right("Cooked lb")]],
    body: [
      ...r.entrees.map((e) => {
        const plant = !e.ingredient;
        return [
          catCode(e.category),
          safe(e.dishes.map(shortDish).join(" / ")),
          right(cell(e.sizes.S.meals, e.sizes.S.oz, plant)),
          right(cell(e.sizes.M.meals, e.sizes.M.oz, plant)),
          right(cell(e.sizes.L.meals, e.sizes.L.oz, plant)),
          right(e.alaCarte.orders ? `${oz(e.alaCarte.oz)} (${e.alaCarte.orders})` : "–"),
          right(e.extraProtein.count ? `${oz(e.extraProtein.oz)} (${e.extraProtein.count})` : "–"),
          right(plant ? "–" : oz(e.totalOz)),
          right(plant ? "add-ons" : lb(e.totalOz), true),
        ];
      }),
      ["", { content: "Containers", styles: { fontStyle: "bold" } }, right(String(c.S), true), right(String(c.M), true), right(String(c.L), true), "", "", right(`${c.S + c.M + c.L + c.other} meals`), ""],
    ],
    styles: STYLE,
    headStyles: HEAD,
    columnStyles: { 0: { cellWidth: 24, fontStyle: "bold" } },
    margin,
  });

  // Contest prep
  y = heading("Contest prep by the pound (separate recipes)", next(24));
  autoTable(doc, {
    startY: y,
    head: [["Item", right("Cooked lb")]],
    body: r.contestPrep.length ? r.contestPrep.map((x) => [safe(x.item) + (x.kind === "side" ? "  (side)" : ""), right(lb(x.oz), true)]) : [["No contest prep orders", ""]],
    styles: STYLE,
    headStyles: HEAD,
    margin: { left, right: 300 },
  });
  const contestEnd = next(0);

  // Add-ons + subs side by side
  y = heading("Add-on proteins (2 oz each)", contestEnd + 24);
  autoTable(doc, {
    startY: y,
    head: [["Add-on", right("Count"), right("oz"), "On"]],
    body: r.addOns.length
      ? r.addOns.map((a) => [safe(a.label), right(String(a.count)), right(oz(a.oz)), safe(Object.entries(a.on).map(([d, n]) => `${shortDish(d)} x${n}`).join(", "))])
      : [["None", "", "", ""]],
    styles: STYLE,
    headStyles: HEAD,
    margin,
  });

  y = heading("Substitutions (meals by size)", next(24));
  autoTable(doc, {
    startY: y,
    head: [["Sub", right("4oz"), right("6oz"), right("8oz"), right("Total")]],
    body: r.substitutions.length
      ? r.substitutions.map((s) => [safe(s.sub), right(String(s.bySize.S || "–")), right(String(s.bySize.M || "–")), right(String(s.bySize.L || "–")), right(String(s.total), true)])
      : [[r.exportMode === "summary" ? "Not available from a summary export" : "None", "", "", "", ""]],
    styles: STYLE,
    headStyles: HEAD,
    margin: { left, right: 250 },
  });

  y = heading("Breakfast & snacks", next(24));
  autoTable(doc, {
    startY: y,
    head: [["Item", right("Qty"), "Add-ons"]],
    body: r.breakfast.length
      ? r.breakfast.map((b) => [safe(b.name), right(String(b.qty), true), safe(Object.entries(b.addOns).map(([k, n]) => `${k} x${n}`).join(", "))])
      : [["None", "", ""]],
    styles: STYLE,
    headStyles: HEAD,
    margin,
  });

  if (r.review.length) {
    y = heading("Check before prep", next(24)) + 10;
    doc.setFontSize(8.5);
    for (const item of r.review) {
      const lines = doc.splitTextToSize(`[  ]  ${safe(item.message)}`, 530);
      if (y + lines.length * 11 > 752) {
        doc.addPage();
        y = 48;
      }
      doc.text(lines, left + 4, y);
      y += lines.length * 11 + 2;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(`All weights are cooked. Page ${i} of ${pages}`, left, 770);
    doc.setTextColor(0);
  }
  doc.save(`pull-sheet-${opts.fileSlug}.pdf`);
}
