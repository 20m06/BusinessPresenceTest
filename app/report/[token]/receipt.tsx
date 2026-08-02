// The receipt — the signature score display (CLAUDE.md §14).
// A narrow monospace column: line items with leader dots, a rule, a total.

interface ReceiptProps {
  businessName: string;
  cityState: string;
  dateLabel: string;
  lines: Array<{ label: string; score: number | null }>;
  overall: number | null;
  coveragePct: number | null;
}

function band(score: number | null): string {
  if (score === null) return "bg-rule";
  if (score >= 80) return "bg-pass";
  if (score >= 40) return "bg-warn";
  return "bg-fail";
}

export function Receipt({
  businessName,
  cityState,
  dateLabel,
  lines,
  overall,
  coveragePct,
}: ReceiptProps) {
  return (
    <div className="mt-8 mx-auto max-w-sm bg-white border border-rule px-5 py-6 font-mono text-sm shadow-[0_1px_0_var(--rule)]">
      <p className="text-center text-xs tracking-[0.2em] uppercase">
        Business Visibility Test
      </p>
      <p className="mt-1 text-center text-xs text-muted">{businessName}</p>
      <p className="text-center text-xs text-muted">
        {cityState} · {dateLabel}
      </p>

      <div className="my-4 border-t border-dashed border-rule" aria-hidden="true" />

      <ul className="space-y-3">
        {lines.map(({ label, score }) => (
          <li key={label}>
            <div className="flex items-baseline gap-2">
              <span className="shrink-0">{label}</span>
              <span
                className="flex-1 border-b border-dotted border-muted/40 translate-y-[-3px]"
                aria-hidden="true"
              />
              <span className={score === null ? "text-muted" : ""}>
                {score === null ? "—" : String(Math.round(score)).padStart(3, " ")}
              </span>
            </div>
            <div className="mt-1 h-[3px] bg-rule/60" aria-hidden="true">
              <div
                className={`h-full ${band(score)}`}
                style={{ width: `${score === null ? 0 : Math.max(score, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="my-4 border-t border-rule" aria-hidden="true" />

      <div className="flex items-baseline gap-2 text-base font-semibold">
        <span>TOTAL</span>
        <span
          className="flex-1 border-b border-dotted border-muted/40 translate-y-[-3px]"
          aria-hidden="true"
        />
        <span className="text-2xl">
          {overall === null ? "—" : Math.round(overall * 10) / 10}
          <span className="text-sm font-normal text-muted">/100</span>
        </span>
      </div>

      {coveragePct !== null && coveragePct < 100 && (
        <p className="mt-3 text-center text-xs text-muted">
          scored on {Math.round(coveragePct)}% of checks
        </p>
      )}

      <div className="mt-4 border-t border-dashed border-rule" aria-hidden="true" />
      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.15em] text-muted">
        thank you for checking
      </p>
    </div>
  );
}
