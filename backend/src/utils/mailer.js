/**
 * Transactional email via Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 * HTTP rather than SMTP because hosts like Render's free tier block outbound SMTP ports.
 *
 * Env: RESEND_API_KEY, MAIL_FROM (e.g. "Vouta <no-reply@yourdomain.in>", on a domain verified in Resend).
 * Without RESEND_API_KEY outside production, emails are printed to the console for local development.
 */
async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set; cannot send email.");
    }
    console.log(`[Mail:dev] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Email provider responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

module.exports = { sendMail };
