import "server-only";

// Resend integration (CLAUDE.md §10). Current mode: every completed audit
// is emailed to the owner of THIS tool (REPORT_NOTIFY_EMAIL) as a lead
// notification. Owner-facing report emails come later, once a sending
// domain is verified — then this module grows an opt-in recipient.
// EMAIL_ENABLED=false (or a missing key) silently disables all email:
// the audit flow must never break because email can't send (§10.3).

interface AuditEmailInput {
  businessName: string;
  requesterEmail: string | null;
  runType: string;
  overall: number | null;
  previousOverall: number | null; // for re-runs
  dimensions: Array<{ label: string; score: number | null }>;
  topFixes: Array<{ title: string; effort: string }>;
  reportUrl: string;
}

function emailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true" && !!process.env.RESEND_API_KEY;
}

export async function sendAuditNotification(input: AuditEmailInput): Promise<void> {
  if (!emailEnabled()) return;
  const to = process.env.REPORT_NOTIFY_EMAIL;
  if (!to) return;
  const from = process.env.EMAIL_FROM || "Business Visibility Test <onboarding@resend.dev>";

  const scoreLabel = input.overall === null ? "—" : `${Math.round(input.overall * 10) / 10}`;
  const subject =
    input.runType === "initial"
      ? `New audit: ${input.businessName} — ${scoreLabel}/100`
      : input.previousOverall !== null && input.overall !== null
        ? `Re-check: ${input.businessName} moved ${Math.round(input.previousOverall)} → ${Math.round(input.overall)}`
        : `Re-check complete: ${input.businessName} — ${scoreLabel}/100`;

  const dims = input.dimensions
    .map(
      (d) =>
        `<tr><td style="padding:2px 12px 2px 0">${d.label}</td><td align="right">${d.score === null ? "—" : Math.round(d.score)}</td></tr>`
    )
    .join("");
  const fixes = input.topFixes
    .map((f) => `<li>${f.title} <em>(${f.effort})</em></li>`)
    .join("");

  const html = `
    <div style="font-family:ui-monospace,Menlo,Consolas,monospace;max-width:480px">
      <p style="letter-spacing:2px;text-transform:uppercase;font-size:11px;color:#5A6068">Business Visibility Test</p>
      <h2 style="margin:8px 0">${input.businessName}</h2>
      ${input.requesterEmail ? `<p style="color:#5A6068">requested by ${input.requesterEmail}</p>` : ""}
      <p style="font-size:32px;margin:12px 0"><strong>${scoreLabel}</strong>/100${
        input.previousOverall !== null ? ` <span style="font-size:14px;color:#5A6068">(was ${Math.round(input.previousOverall)})</span>` : ""
      }</p>
      <table style="font-size:14px">${dims}</table>
      ${fixes ? `<p style="margin-bottom:4px"><strong>Top fixes:</strong></p><ul style="margin-top:0">${fixes}</ul>` : ""}
      <p><a href="${input.reportUrl}">Open the report</a></p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("resend send failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("resend send error:", err);
  }
}
