import { query } from "../../lib/db.js";
import { CATEGORIES, fail, guarded, isDay } from "../../lib/http.js";

const ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * PUT /api/expenses/:id creates or replaces an expense. The browser picks the
 * id, so a retried save cannot create a duplicate and Undo restores the same row.
 * DELETE /api/expenses/:id removes it.
 */
export default guarded(["PUT", "DELETE"], async (req, res) => {
  const { id } = req.query;
  if (typeof id !== "string" || !ID.test(id)) return fail(res, 400, "bad_id", "That expense id is not valid.");

  if (req.method === "DELETE") {
    await query(`DELETE FROM expenses WHERE id = $1`, [id]);
    return res.status(204).end();
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { amountCents, category, date } = body;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const created = new Date(body.createdAt || Date.now());

  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 100000000) {
    return fail(res, 400, "bad_amount", "Enter an amount between €0.01 and €1,000,000.");
  }
  if (note.length > 80) return fail(res, 400, "bad_note", "Keep the description under 80 characters.");
  if (!CATEGORIES.includes(category)) return fail(res, 400, "bad_category", "Pick one of the listed categories.");
  if (!isDay(date)) return fail(res, 400, "bad_date", "Pick a valid date.");
  if (Number.isNaN(created.getTime())) return fail(res, 400, "bad_created_at", "The creation time is not valid.");

  await query(
    `INSERT INTO expenses (id, amount_cents, note, category, expense_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (id) DO UPDATE SET
       amount_cents = EXCLUDED.amount_cents,
       note = EXCLUDED.note,
       category = EXCLUDED.category,
       expense_date = EXCLUDED.expense_date,
       updated_at = now()`,
    [id, amountCents, note, category, date, created.toISOString()]
  );
  return res.status(200).json({ ok: true });
});
