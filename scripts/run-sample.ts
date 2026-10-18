// Run: npx tsx scripts/run-sample.ts [path/to/orders.csv]
import { readFileSync } from "node:fs";
import { calculatePrep } from "../src/lib/prep/engine";
import { hungryHouseCatalog, weekOfOct12 } from "../src/lib/prep/hungry-house";
import { CATEGORY_LABEL } from "../src/lib/prep/types";

const file = process.argv[2] || new URL("./sample-orders.csv", import.meta.url).pathname;
const r = calculatePrep(readFileSync(file, "utf8"), hungryHouseCatalog, weekOfOct12);
const lb = (oz: number) => (oz / 16).toFixed(1);
console.log(`Export: ${r.exportMode} | rows ${r.rowsUsed}/${r.rowsRead} | entrée meals ${r.mealsCounted}\n`);
console.log("ENTRÉES  (oz/meals)            Small        Medium        Large    À la carte   Total oz   lb");
for (const e of r.entrees) {
  const c = (x: { oz: number; meals: number }) => `${x.oz}/${+x.meals.toFixed(1)}`.padStart(12);
  console.log(`${CATEGORY_LABEL[e.category].code.padEnd(3)} ${e.dishes.join("/").slice(0, 24).padEnd(24)} ${c(e.sizes.S)} ${c(e.sizes.M)} ${c(e.sizes.L)} ${String(e.alaCarte.oz).padStart(10)} ${String(e.totalOz).padStart(10)} ${lb(e.totalOz).padStart(5)}`);
}
console.log(`    containers: S ${r.containers.S}  M ${r.containers.M}  L ${r.containers.L}  breakfast ${r.containers.breakfast}`);
console.log("\nCONTEST PREP (lb)");
for (const c of r.contestPrep) console.log(`   ${c.item.padEnd(32)} ${lb(c.oz)}`);
console.log("\nBREAKFAST");
for (const b of r.breakfast) console.log(`   ${b.name}: ${b.qty}`);
console.log("\nREVIEW");
for (const x of r.review) console.log(`   [${x.severity}] ${x.message}`);
