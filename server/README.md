# Database setup (Neon Postgres)

This folder contains a simple schema and a small migration script to create the `links` table for the `linkShort` project.

Table fields:
- `id` — primary key (serial integer)
- `short_code` — unique short code for each link
- `target_url` — destination URL
- `click_count` — integer, defaults to 0
- `last_clicked` — nullable timestamp with timezone

Quick steps:

1. Create a Neon Postgres database (or any Postgres instance). Copy the connection string.
2. In `server/`, create a `.env` file (or set `DATABASE_URL` in environment):

```env
DATABASE_URL=postgresql://username:password@host:5432/dbname
```

3. Install the `pg` client (if not already installed):

```powershell
cd server
npm install
# or specifically: npm install pg
```

4. Run the migration to create the `links` table:

```powershell
npm run migrate
```

If you need to reset the table, you can edit `db/schema.sql` or run SQL directly against your Neon dashboard.
# Express Server (linkShort)

Minimal Express server for the linkShort project.

Run locally:

```powershell
cd "C:\Users\swaga\Desktop\tiny links\server"
npm install
npm run dev
```

Endpoints:
- `GET /` — health check
- `POST /api/shorten` — accept JSON `{ "url": "https://..." }` and return a placeholder short id

Notes:
- Edit `.env` to set `PORT` if you want a different port.
- This is a simple starter; persistence is not included.
