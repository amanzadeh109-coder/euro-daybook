import { clearSession } from "../lib/auth.js";
import { fail } from "../lib/http.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "method_not_allowed", "This address does not accept that request.");
  }
  clearSession(req, res);
  return res.status(200).json({ ok: true });
}
