// src/components/site/PullSheet.tsx
// The homepage's main picture: a sample prep sheet, laid out like the paper
// sheet kitchens fill in by hand. Example numbers, not a real kitchen's orders.
// On load, each line gets ticked off and the total gets circled (CSS only).

type Row = { code: string; dish: string; pull: string; s: number; m: number; l: number; alaLb: number };

const ROWS: Row[] = [
  { code: "C", dish: "Honey chipotle chicken", pull: "Grilled chicken breast", s: 18, m: 41, l: 37, alaLb: 6 },
  { code: "T", dish: "Turkey taco bowl", pull: "Ground turkey", s: 9, m: 22, l: 19, alaLb: 2 },
  { code: "P", dish: "Pork carnitas", pull: "Shredded pork shoulder", s: 6, m: 15, l: 14, alaLb: 1 },
  { code: "B", dish: "Steak and peppers", pull: "Grilled sirloin", s: 8, m: 20, l: 23, alaLb: 3 },
  { code: "GB", dish: "Beef picadillo", pull: "Ground beef 93/7", s: 7, m: 17, l: 21, alaLb: 2 },
  { code: "S", dish: "Lemon garlic salmon", pull: "Baked salmon", s: 5, m: 12, l: 10, alaLb: 1 },
  { code: "PB", dish: "Black bean stew", pull: "Plant-based", s: 3, m: 6, l: 4, alaLb: 0 },
];

const SIZES = { s: 4, m: 6, l: 8 }; // cooked oz per meal
const rowOz = (r: Row) => r.s * SIZES.s + r.m * SIZES.m + r.l * SIZES.l + r.alaLb * 16;
const lb = (oz: number) => (oz / 16).toFixed(1);

const totalOz = ROWS.reduce((a, r) => a + rowOz(r), 0);
const totalMeals = ROWS.reduce((a, r) => a + r.s + r.m + r.l, 0);

function Tick({ delay }: { delay: number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-monday" aria-hidden="true">
      <path
        d="M4 13.5 L9.5 19 L20 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="marker-circle"
        style={{ strokeDasharray: 32, strokeDashoffset: 32, animationDelay: `${delay}ms`, animationDuration: "220ms" }}
      />
    </svg>
  );
}

export default function PullSheet() {
  return (
    <figure className="relative mx-auto w-full max-w-[640px]">
      {/* masking tape holding the sheet down */}
      <div
        className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 -rotate-2 bg-tape/90 px-5 py-1.5 font-marker text-lg text-ink shadow-[0_1px_0_rgba(27,36,48,0.15)]"
        aria-hidden="true"
      >
        Week of Oct 19
      </div>

      <div className="relative bg-paper px-4 pb-5 pt-8 shadow-[0_18px_40px_-18px_rgba(27,36,48,0.45)] sm:px-7 sm:pb-7">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b-2 border-ink pb-3">
          <div>
            <p className="wide text-lg font-extrabold leading-none sm:text-xl">Prep sheet</p>
            <p className="mt-1 text-sm text-ink-soft">Sample kitchen</p>
          </div>
          <p className="text-right text-sm leading-snug text-ink-soft">
            Orders Oct 12–18
            <br />
            Delivered Mon, Oct 19
          </p>
        </div>

        <table className="narrow tnum mt-2 w-full border-collapse text-left text-[13px] sm:text-[15px]">
          <caption className="sr-only">
            Sample prep sheet: meals per size and cooked pounds to pull for each dish
          </caption>
          <thead>
            <tr className="align-bottom text-[11px] font-semibold text-ink-soft sm:text-xs">
              <th scope="col" className="w-8 py-2 sm:w-10">
                <span className="sr-only">Category</span>
              </th>
              <th scope="col" className="py-2">Dish</th>
              <th scope="col" className="w-9 py-2 text-right sm:w-12">4 oz</th>
              <th scope="col" className="w-9 py-2 text-right sm:w-12">6 oz</th>
              <th scope="col" className="w-9 py-2 text-right sm:w-12">8 oz</th>
              <th scope="col" className="w-10 py-2 text-right sm:w-14">
                By
                <br />
                the lb
              </th>
              <th scope="col" className="w-12 py-2 text-right sm:w-16">
                Cooked
                <br />
                lb
              </th>
              <th scope="col" className="w-6 py-2 sm:w-8">
                <span className="sr-only">Pulled</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={r.code} className="border-t border-steel-deep align-top">
                <th scope="row" className="py-2 text-base font-extrabold sm:text-lg">
                  {r.code}
                </th>
                <td className="py-2 pr-2">
                  <span className="block font-semibold leading-tight">{r.dish}</span>
                  <span className="block text-[11px] leading-tight text-ink-soft sm:text-xs">{r.pull}</span>
                </td>
                <td className="py-2 text-right">{r.s}</td>
                <td className="py-2 text-right">{r.m}</td>
                <td className="py-2 text-right">{r.l}</td>
                <td className="py-2 text-right">{r.alaLb || "–"}</td>
                <td className="py-2 text-right font-bold">{lb(rowOz(r))}</td>
                <td className="py-1.5 pl-1">
                  <Tick delay={250 + i * 170} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink">
              <td />
              <td colSpan={4} className="pt-3 text-ink-soft">
                {totalMeals} entrée meals
              </td>
              <td className="pt-3 text-right font-semibold">Total</td>
              <td className="pt-3 text-right text-base font-extrabold sm:text-lg">
                <span className="relative inline-block">
                  {lb(totalOz)}
                  <svg
                    viewBox="0 0 120 60"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute -inset-x-3 -inset-y-2.5 h-[calc(100%+1.25rem)] w-[calc(100%+1.5rem)] overflow-visible text-monday"
                    aria-hidden="true"
                  >
                    <path
                      d="M96 12 C 70 2, 22 4, 10 22 C 0 40, 40 56, 78 52 C 108 48, 118 30, 104 16 C 96 9, 84 7, 70 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      className="marker-circle"
                    />
                  </svg>
                </span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <figcaption className="sr-only">Example only. Numbers are made up for illustration.</figcaption>
    </figure>
  );
}
