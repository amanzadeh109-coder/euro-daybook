import { isAuthenticated } from "./auth.js";

export const CATEGORIES = ["food", "groceries", "transport", "home", "education", "health", "shopping", "fun", "other"];

export function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

/** A real calendar day in YYYY-MM-DD form. Rejects dates like 2026-02-31. */
export function isDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Wraps a handler with the checks every data route shares: signed in, and
 * JSON on writes. A cross-site form cannot send application/json without a
 * preflight, which adds to the protection of the SameSite cookie.
 */
export function guarded(methods, handler) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      if (!methods.includes(req.method)) {
        res.setHeader("Allow", methods.join(", "));
        return fail(res, 405, "method_not_allowed", "This address does not accept that request.");
      }
      if (!isAuthenticated(req)) return fail(res, 401, "signed_out", "Sign in to continue.");
      if (req.method === "PUT" && !String(req.headers["content-type"] || "").includes("application/json")) {
        return fail(res, 415, "bad_content_type", "Send this request as JSON.");
      }
      return await handler(req, res);
    } catch (err) {
      console.error(err);
      return fail(res, 500, "server_error", setupMessage(err));
    }
  };
}

/** Names a missing setting, which is safe to show and saves a trip to the logs. */
export function setupMessage(err) {
  const text = String((err && err.message) || "");
  if (/DATABASE_URL|APP_PASSWORD|SESSION_SECRET/.test(text)) return `Server setup is incomplete: ${text}.`;
  return "The server could not finish that request. Try again in a moment.";
}
