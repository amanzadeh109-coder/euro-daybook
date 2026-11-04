import { passwordMatches, setSession } from "../lib/auth.js";
import { query } from "../lib/db.js";
import { fail, setupMessage } from "../lib/http.js";

const MAX_FAILURES = 10;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "method_not_allowed", "This address does not accept that request.");
  }
  try {
    const ip = String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
    const [{ count }] = await query(
      `SELECT count(*)::int AS count FROM login_failures WHERE ip = $1 AND at > now() - interval '15 minutes'`,
      [ip]
    );
    if (count >= MAX_FAILURES) {
      return fail(res, 429, "too_many_attempts", "Too many wrong passwords. Wait 15 minutes and try again.");
    }
    const password = req.body && typeof req.body.password === "string" ? req.body.password : "";
    if (!passwordMatches(password)) {
      await query(`DELETE FROM login_failures WHERE at < now() - interval '1 day'`);
      await query(`INSERT INTO login_failures (ip) VALUES ($1)`, [ip]);
      return fail(res, 401, "wrong_password", "That password is wrong. Try again.");
    }
    await query(`DELETE FROM login_failures WHERE ip = $1`, [ip]);
    setSession(req, res);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return fail(res, 500, "server_error", setupMessage(err));
  }
}
