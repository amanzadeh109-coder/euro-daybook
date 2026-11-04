import { neon } from "@neondatabase/serverless";

let runner = null;
let schemaReady = null;

/** Lets the local test harness run the same SQL against another Postgres. */
export function setRunner(fn) {
  runner = fn;
}

function run(text, params = []) {
  if (!runner) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const sql = neon(url);
    runner = (t, p) => sql.query(t, p);
  }
  return runner(text, params);
}

/** Creates the tables on first use, so there is no manual migration step. */
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await run(`CREATE TABLE IF NOT EXISTS expenses (
        id           TEXT PRIMARY KEY,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        note         TEXT NOT NULL DEFAULT '',
        category     TEXT NOT NULL,
        expense_date DATE NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await run(`CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses (expense_date)`);
      await run(`CREATE TABLE IF NOT EXISTS login_failures (
        ip TEXT NOT NULL,
        at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export async function query(text, params = []) {
  await ensureSchema();
  return run(text, params);
}
