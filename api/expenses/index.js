import { query } from "../../lib/db.js";
import { fail, guarded, isDay } from "../../lib/http.js";

/** GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD */
export default guarded(["GET"], async (req, res) => {
  const { from, to } = req.query;
  if (!isDay(from) || !isDay(to) || from > to) {
    return fail(res, 400, "bad_range", "Use from and to dates in YYYY-MM-DD form, with from first.");
  }
  const rows = await query(
    `SELECT id, amount_cents, note, category, expense_date::text AS date, created_at
       FROM expenses
      WHERE expense_date BETWEEN $1 AND $2
      ORDER BY expense_date DESC, created_at DESC`,
    [from, to]
  );
  return res.status(200).json({
    expenses: rows.map((r) => ({
      id: r.id,
      amountCents: Number(r.amount_cents),
      note: r.note,
      category: r.category,
      date: r.date,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  });
});
