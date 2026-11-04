# Euro Daybook

A personal log of daily spending in euro, with day, week and month reports.
Static page plus Vercel Functions, with Neon Postgres as the database and one password for sign-in.

## Deploy

Run these from this folder.

1. Create the project and first deployment. The first deployment shows a setup error until step 4 is done.

   ```
   npx vercel
   ```

2. In the Vercel dashboard, open the project, then **Storage**, and add **Neon**. Choose the Frankfurt region, then connect the database to the project for all environments. This adds `DATABASE_URL`.

3. Create a session secret:

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Under **Settings > Environment Variables**, add these for all environments:

   | Name | Value |
   |---|---|
   | `APP_PASSWORD` | The password you will sign in with. Use a long one, because the site is public. |
   | `SESSION_SECRET` | The value from step 3. |

5. Deploy to production. New variables only apply to new deployments.

   ```
   npx vercel --prod
   ```

The tables are created automatically the first time you sign in.

To deploy on every push instead, put this folder in a GitHub repository and import it at vercel.com/new.

## Good to know

- Changing `SESSION_SECRET` signs out every device. Changing `APP_PASSWORD` does not, so change both if the password leaks.
- Sign-in sessions last 90 days. Ten wrong passwords from one address block it for 15 minutes.
- Functions run in Frankfurt (`fra1` in `vercel.json`). Keep the database in the same region so the site stays fast.

## Structure

```
public/index.html        the whole page
api/expenses/index.js    GET a date range
api/expenses/[id].js     PUT to create or update, DELETE to remove
api/login.js, logout.js  password sign-in
lib/                     database, session and request helpers
```
