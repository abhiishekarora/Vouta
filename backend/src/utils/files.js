/**
 * Sends a file stored in a BYTEA column. The sandbox CSP and nosniff header mean that even
 * a malicious upload cannot run script in the API's origin when opened directly.
 */
function sendStoredFile(res, { file_data, file_name, file_mime }) {
  res.setHeader("Content-Type", file_mime);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file_name)}`);
  res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Length", file_data.length);
  return res.send(file_data);
}

module.exports = { sendStoredFile };
