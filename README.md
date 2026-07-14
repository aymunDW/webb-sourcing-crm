# The Webb Sourcing — CRM

A sourcing CRM for suppliers, sourcing requests, and team activity. Real login (email + password), shared team data, PostgreSQL-backed.

## Stack
- **Backend**: Node.js + Express + PostgreSQL, JWT auth (bcrypt-hashed passwords)
- **Frontend**: React (Vite)

## Project structure
```
webb-sourcing-crm/
  server/     Express API
  client/     React frontend
```

## 1. Local setup

### Database
You need a PostgreSQL database (local, or a free one from Railway/Neon/Supabase).

### Backend
```bash
cd server
cp .env.example .env
# edit .env: set DATABASE_URL and a random JWT_SECRET
npm install
npm run migrate   # creates tables
npm start          # runs on http://localhost:4000
```

### Frontend
```bash
cd client
cp .env.example .env
# edit .env if your API isn't on localhost:4000
npm install
npm run dev         # runs on http://localhost:5173
```

Open http://localhost:5173, register the first account (it automatically becomes **admin**), and everyone who registers after that becomes a regular **member**.

## 2. Deploying

### Backend + database on Railway
1. Create a new Railway project → **New → Database → PostgreSQL**. Copy the connection string it gives you.
2. Add a second service → **Deploy from GitHub repo** (push this `server/` folder, or the whole repo, to GitHub first) or use `railway up` from the `server/` folder with the Railway CLI.
3. Set environment variables on the service: `DATABASE_URL` (from step 1), `JWT_SECRET` (any long random string), `CLIENT_ORIGIN` (your Vercel frontend URL, set after step 3 below).
4. Run the migration once, either via Railway's console (`npm run migrate`) or by adding it as a one-off deploy command.
5. Railway gives you a public URL like `https://webb-sourcing-server.up.railway.app` — that's your API base.

### Frontend on Vercel
1. Push `client/` (or the whole repo) to GitHub.
2. In Vercel: **New Project** → import the repo → set **Root Directory** to `client`.
3. Framework preset: Vite. Build command `npm run build`, output directory `dist` (Vercel usually detects this automatically).
4. Add environment variable `VITE_API_URL` = `https://your-railway-url.up.railway.app/api`.
5. Deploy. Vercel gives you a URL like `https://webb-sourcing.vercel.app`.
6. Go back to Railway and set `CLIENT_ORIGIN` to that Vercel URL, then redeploy the backend so CORS allows it.

That's it — share the Vercel URL with your team, and everyone registers their own login.

## Notes on permissions
- First registered user = `admin`, everyone else = `member`. The schema supports the role but the app doesn't yet restrict actions by role — every logged-in user can edit everything. If you want admins-only delete, for example, that's a small addition to the route middleware (`requireAdmin` is already scaffolded in `server/middleware/auth.js`, just not applied to any routes yet).
- Passwords are hashed with bcrypt and never stored in plain text.
- JWTs expire after 30 days; users just log in again after that.
