"use client";

import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Totals = Record<string, Record<string, number>>;

function normalizeHeader(h: string) {
  return (h || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function htmlDecode(s: string) {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');
}

function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (cur !== "" || row.length) {
        row.push(cur);
        rows.push(row.map((v) => (v || "").trim()));
        row = [];
        cur = "";
      }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else {
      cur += c;
    }
  }

  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row.map((v) => (v || "").trim()));
  }

  return rows.filter((r) => r.some((cell) => cell !== ""));
}

function parseNonVariationAttributes(str: string) {
  const out: Record<string, string> = {};
  if (!str) return out;

  const parts = str.split(" | ").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(.+?)\s*-\s*(.+)$/);
    if (!m) continue;
    out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

function addTotal(totals: Totals, protein: string, prepType: string, oz: number) {
  if (!totals[protein]) totals[protein] = {};
  if (!totals[protein][prepType]) totals[protein][prepType] = 0;
  totals[protein][prepType] += oz;
}

function detectProtein(text: string) {
  const s = (text || "").toLowerCase();
  if (!s) return null;

  if (s.includes("chicken")) return "Chicken";
  if (s.includes("turkey")) return "Turkey";
  if (s.includes("bison")) return "Bison";

  if (
    s.includes("salmon") ||
    s.includes("cod") ||
    s.includes("mahi") ||
    s.includes("tilapia") ||
    s.includes("tuna") ||
    s.includes("shrimp")
  ) return "Fish";

  if (s.includes("steak") || s.includes("sirloin")) return "Steak";

  if (s.includes("meatloaf")) return "Beef";
  if (s.includes("ground beef") || s.includes("lean beef") || s.includes("beef")) return "Beef";

  return null;
}

function detectPrep(text: string) {
  const s = (text || "").toLowerCase();
  if (!s) return "Unknown";
  if (s.includes("ground")) return "Ground";
  if (s.includes("pulled")) return "Pulled";
  if (s.includes("shredd")) return "Shredded";
  if (s.includes("grilled")) return "Grilled";
  if (s.includes("baked")) return "Baked";
  if (s.includes("seared")) return "Seared";
  return "Unknown";
}

function parseProteinMix(mixStr: string) {
  const mix: Record<string, number> = {};
  if (!mixStr) return mix;

  const parts = mixStr.split("|").map((x) => x.trim()).filter(Boolean);
  for (const part of parts) {
    const [rawKey, rawVal] = part.split(":").map((x) => (x || "").trim());
    if (!rawKey || !rawVal) continue;

    const n = parseFloat(rawVal.replace(/[^\d.]/g, ""));
    if (Number.isNaN(n)) continue;

    const key = rawKey.trim();
    const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    mix[normalized] = n;
  }
  return mix;
}

function getPortionOunces(metaCombined: string, itemName: string) {
  const decoded = htmlDecode(metaCombined || "");

  const m = decoded.match(/Portions?:\s*([^|]+)/i);
  const portionPart = (m ? m[1] : decoded).trim();
  const s = portionPart.toLowerCase();

  if (s.includes("lb")) {
    const n = s.match(/(\d+(\.\d+)?)/);
    return n ? parseFloat(n[1]) * 16 : 0;
  }
  if (s.includes("oz")) {
    const n = s.match(/(\d+(\.\d+)?)/);
    return n ? parseFloat(n[1]) : 0;
  }

  const n2 = (itemName || "").toLowerCase();
  if (n2.includes("4oz") || n2.includes("small")) return 4;
  if (n2.includes("6oz") || n2.includes("medium")) return 6;
  if (n2.includes("8oz") || n2.includes("large")) return 8;

  return 0;
}

function extractContestSelection(metaCombined: string) {
  const decoded = htmlDecode(metaCombined || "");
  const m1 = decoded.match(/Protein\s*&\s*Sides\s*:\s*([^|]+)/i);
  if (m1?.[1]) return m1[1].trim();
  const m2 = decoded.match(/Protein\s*&\s*Sides\s*-\s*([^|]+)/i);
  if (m2?.[1]) return m2[1].trim();
  return "";
}

// You already fixed these. Keep them correct.
const SPECIAL_FALLBACK_MIX: Record<string, string> = {
  "5 Meal Special": "Chicken:2|Turkey:1|Beef:2",
  "7 Meal Special": "Chicken:3|Turkey:2|Beef:2",
  "10 Meal Special": "Chicken:4|Turkey:3|Beef:3",
};

function matchSpecialKey(itemName: string) {
  const name = itemName.toLowerCase();
  if (name.includes("5 meal special")) return "5 Meal Special";
  if (name.includes("7 meal special")) return "7 Meal Special";
  if (name.includes("10 meal special")) return "10 Meal Special";
  return null;
}

export default function ProteinCalculatorEmbed() {
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("No totals yet. Upload a CSV.");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [totals, setTotals] = useState<Totals>({});
  const [processed, setProcessed] = useState<number>(0);

  const flatRows = useMemo(() => {
    const out: Array<{ protein: string; prep: string; oz: number }> = [];
    Object.keys(totals).sort().forEach((protein) => {
      Object.keys(totals[protein]).sort().forEach((prep) => {
        out.push({ protein, prep, oz: totals[protein][prep] || 0 });
      });
    });
    return out;
  }, [totals]);

  function compute(rows: string[][]) {
    const headers = rows[0].map((h) => normalizeHeader(h));
    const dataRows = rows.slice(1);

    const idxItem = headers.indexOf("itemname");
    const idxVar = headers.indexOf("productvariation");
    const idxMeta = headers.indexOf("orderitemmetadata");
    const idxAttrs = headers.indexOf("nonvariationattributes");
    const idxQty = headers.indexOf("summaryreporttotalquantity");

    if (idxItem === -1 || idxQty === -1) {
      setMessage('Missing required headers: "Item Name" and/or "Summary Report Total Quantity".');
      return;
    }

    const newTotals: Totals = {};
    const newWarnings: string[] = [];
    let newProcessed = 0;

    dataRows.forEach((row, i) => {
      const itemName = (row[idxItem] || "").trim();
      const qtyStr = (row[idxQty] || "").toString().trim().replace(/[^\d.]/g, "");
      const qty = parseFloat(qtyStr);
      if (!itemName || Number.isNaN(qty) || qty <= 0) return;

      const pv = idxVar === -1 ? "" : (row[idxVar] || "");
      const meta = idxMeta === -1 ? "" : (row[idxMeta] || "");
      const metaCombined = `${pv} | ${meta}`;

      const attrsStr = idxAttrs === -1 ? "" : (row[idxAttrs] || "");
      const attrMap = parseNonVariationAttributes(attrsStr);

      const isSpecial = /meal special/i.test(itemName);
      const isContest = /contest prep protein by the pound/i.test(itemName);

      const portionOz = getPortionOunces(metaCombined, itemName);

      // Specials
      if (isSpecial) {
        const specialKey = matchSpecialKey(itemName);
        const mixStr = (attrMap["special mix"] || "").trim() || (specialKey ? SPECIAL_FALLBACK_MIX[specialKey] : "");
        if (!mixStr) {
          newWarnings.push(`Special "${itemName}" missing Special Mix (row ${i + 2}).`);
          return;
        }
        if (!portionOz) {
          newWarnings.push(`Special "${itemName}" has no readable portion size (row ${i + 2}).`);
          return;
        }

        const mix = parseProteinMix(mixStr);
        const prots = Object.keys(mix);
        if (!prots.length) {
          newWarnings.push(`Special "${itemName}" mix couldn't be parsed (row ${i + 2}). Value: "${mixStr}"`);
          return;
        }

        prots.forEach((prot) => addTotal(newTotals, prot, "Special", qty * mix[prot] * portionOz));
        newProcessed++;
        return;
      }

      // Contest prep
      if (isContest) {
        const selection = extractContestSelection(metaCombined);
        if (!selection) {
          newWarnings.push(`Contest Prep missing "Protein & Sides" selection (row ${i + 2}).`);
          return;
        }

        const prot = detectProtein(selection);
        if (!prot) {
          // side like rice/potatoes
          newProcessed++;
          return;
        }

        const prep = detectPrep(selection);
        const ozEach = portionOz || 16;
        addTotal(newTotals, prot, prep, qty * ozEach);
        newProcessed++;
        return;
      }

      // Normal meals
      if (!portionOz) {
        newWarnings.push(`"${itemName}" has no readable portion size (row ${i + 2}).`);
        return;
      }

      const protein = (attrMap["protein"] || "").trim() || detectProtein(itemName);
      const prepType = (attrMap["prep type"] || "").trim() || detectPrep(itemName);

      if (!protein) {
        newWarnings.push(`"${itemName}" missing Protein attribute (row ${i + 2}).`);
        return;
      }

      addTotal(newTotals, protein, prepType, qty * portionOz);
      newProcessed++;
    });

    setTotals(newTotals);
    setWarnings(newWarnings);
    setProcessed(newProcessed);
    setMessage(Object.keys(newTotals).length ? `Done! Processed ${newProcessed} line items.` : "No totals generated.");
  }

  function handleFile(file: File) {
    setFileName(file.name);
    setMessage("Processing...");
    setWarnings([]);
    setTotals({});
    setProcessed(0);

    file.text().then((text) => {
      const rows = parseCSV(text);
      if (!rows.length) {
        setMessage("No data found in CSV.");
        return;
      }
      compute(rows);
    }).catch((err) => {
      console.error(err);
      setMessage("Error reading CSV. Check the format.");
    });
  }

  function downloadPDF() {
    if (!flatRows.length) {
      alert("No totals yet. Upload a CSV first.");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

    doc.setFontSize(16);
    doc.text("Weekly Protein Prep Totals", 40, 50);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 68);
    if (fileName) doc.text(`Source CSV: ${fileName}`, 40, 82);

    const body = flatRows.map((r) => [
      r.protein,
      r.prep,
      r.oz.toFixed(1),
      (r.oz / 16).toFixed(2),
    ]);

    autoTable(doc, {
      startY: 100,
      head: [["Protein", "Prep Type", "Total Ounces", "Total Pounds"]],
      body,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 30, 30] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: 40, right: 40 },
    });

    if (warnings.length) {
      const y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : 140;
      doc.setFontSize(12);
      doc.text("Warnings / Items to Review", 40, y);

      doc.setFontSize(9);
      let yy = y + 16;
      warnings.slice(0, 20).forEach((w) => {
        const lines = doc.splitTextToSize(`• ${w}`, 520);
        doc.text(lines, 50, yy);
        yy += lines.length * 12;
      });
      if (warnings.length > 20) doc.text(`(+${warnings.length - 20} more)`, 50, yy + 4);
    }

    doc.save("protein-prep-totals.pdf");
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">Weekly Protein Prep Calculator</h2>
        <p className="mt-1 text-sm text-white/60">
          Upload your WooCommerce export CSV. We’ll total protein ounces by prep type, including specials + contest prep.
        </p>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="file"
            accept=".csv"
            className="block text-sm text-white"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            onClick={downloadPDF}
            disabled={!flatRows.length}
            className="rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-sm text-white hover:bg-black/50 disabled:opacity-40"
          >
            Download PDF
          </button>

          <div className="text-sm text-white/60">{message}</div>
        </div>

        <div className="mt-6">
          {!flatRows.length ? (
            <div className="text-white/50">No totals yet. Upload a CSV.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-left text-white/70">
                    <th className="py-2 pr-3">Protein</th>
                    <th className="py-2 pr-3">Prep Type</th>
                    <th className="py-2 pr-3 text-right">Total Ounces</th>
                    <th className="py-2 pr-3 text-right">Total Pounds</th>
                  </tr>
                </thead>
                <tbody>
                  {flatRows.map((r, idx) => (
                    <tr key={`${r.protein}-${r.prep}-${idx}`} className="border-b border-white/10 text-white/90">
                      <td className="py-2 pr-3">{r.protein}</td>
                      <td className="py-2 pr-3">{r.prep}</td>
                      <td className="py-2 pr-3 text-right">{r.oz.toFixed(1)}</td>
                      <td className="py-2 pr-3 text-right">{(r.oz / 16).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 text-xs text-white/50">
                Note: Contest Prep sides (rice/potatoes) are ignored automatically.
              </div>
            </div>
          )}
        </div>

        {warnings.length ? (
          <div className="mt-6">
            <h3 className="text-base font-semibold text-white">Warnings / Items to Review</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
