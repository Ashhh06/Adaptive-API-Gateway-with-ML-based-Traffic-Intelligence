# Dashboard

React + Vite UI for the gateway’s read-only `/api/dashboard/*` routes.

From here: `npm install`, `npm run dev` (expects the gateway on port 3000 for the proxy). Full setup and env vars are in the **repo root `README.md`**.

`npm run build:gateway` builds and copies into `gateway/public/dashboard/`.

No `.env` needed for the frontend; do not put secrets in the client.
