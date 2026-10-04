# CCL InternConnect demo

This demo stores student accounts in Neon PostgreSQL through the Node/Express API. The browser never connects to Neon directly and never receives the password hash.

## Connect Neon

1. Create a project at [neon.tech](https://neon.tech) and copy its pooled connection string.
2. In this folder, create `.env` from `.env.example`:

```sh
cp .env.example .env
```

3. Set `DATABASE_URL` in `.env` to the Neon connection string.
4. Start the app:

```sh
npm start
```

Open http://localhost:4173.

The server creates the `students` table on startup and seeds this demo account:

- Email: `intern@ccl.gov.in`
- Password: `cclintern2026`

## API routes

- `POST /api/register` creates a student and hashes the password with bcrypt.
- `POST /api/login` checks the email and password against Neon.

For production, replace the demo's local browser session marker with a secure, HTTP-only cookie session or an established auth provider. Never commit `.env` or expose `DATABASE_URL` in frontend code.
