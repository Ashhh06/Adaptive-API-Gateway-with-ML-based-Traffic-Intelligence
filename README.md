# Adaptive API gateway (ML-aware traffic)

Express gateway in front of a small demo backend. Traffic gets logged to MongoDB, scored by a Python ML service (RandomForest trained on CIC-derived features), and rate limits change with the predicted label (normal / suspicious / malicious). There is a React dashboard for read-only stats.

Stack in practice: **Node gateway** · **Redis** (counters + ML cache + per-IP limit caps) · **MongoDB** (request logs) · **FastAPI** (`ml-service`) · optional **Vite dashboard** served from the gateway in production.

---

## What to run

You need these running before the gateway is useful:

| Piece | Role |
|--------|------|
| MongoDB | stores one document per finished request |
| Redis | sliding window request counts + `ml:pred:*` + `rl:max:*` |
| `backend/` | dummy API on port **5000** (or change `BACKEND_URL`) |
| `ml-service/` | `POST /predict` on port **8000** (optional but that is the point of the project) |
| `gateway/` | entry point, default port **3000** |

Order I use: Redis → Mongo → backend → ML → gateway → (optional) dashboard dev server.

---

## Gateway env

Copy `gateway/.env.example` to `gateway/.env` and set at least:

- `MONGO_URI` — your Atlas or local URI  
- `REDIS_URL` — e.g. `redis://127.0.0.1:6379`  
- `BACKEND_URL` — upstream for `/api/*` (proxy), e.g. `http://127.0.0.1:5000`  
- `ML_SERVICE_URL` — e.g. `http://127.0.0.1:8000/predict` (omit to force label `normal` and skip HTTP calls)

Tuning knobs you might touch:

- `RATE_LIMIT_WINDOW` — seconds for the Redis counter window  
- `RLIMIT_NORMAL`, `RLIMIT_SUSPICIOUS`, `RLIMIT_MALICIOUS` — max requests per window for that label  
- `RL_POLICY_TTL` — how long Redis keeps the per-IP cap after ML updates it  
- `ML_TIMEOUT_MS` — if predictions time out, the gateway falls back to `normal`  
- `ML_DEBUG=1` — noisy JSON logs for features + oracle (gateway + optional header to ML)

Never commit `.env`. Examples stay in repo as `*.env.example` only.

Optional ML training env: see `ml-service/.env.example`.

---

## Commands

**Backend** (from `backend/`):

```bash
npm install
node index.js
```

**Gateway** (from `gateway/`):

```bash
npm install
npm run dev
# or: node src/index.js
```

**ML service** (from `ml-service/`, with venv + `pip install -r requirements.txt`):

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Needs `model/model.pkl` and `model/scaler.pkl`. Regenerate with `python train_cic_gateway_features.py` after you put CIC 2017 CSVs under `ml-service/dataset/` (CSVs/zips are **gitignored** — see `ml-service/dataset/README.md` and the training script for expected columns).

**Dashboard** — dev UI with Vite proxy to the gateway:

```bash
cd dashboard && npm install && npm run dev
```

Production-style bundle copied next to the gateway:

```bash
cd dashboard && npm run build:gateway
```

Then open `http://localhost:3000/dashboard/`. The built UI under `gateway/public/dashboard/` is **gitignored**; run `npm run build:gateway` from `dashboard/` after clone (or use Vite dev on port 5173).

---

## Useful HTTP paths

- `GET /` — gateway alive  
- `GET /health` — gateway health  
- `GET /api/dashboard/*` — read-only stats for the UI (no ML, not rate-limited like API traffic)  
- `GET /features/:ip` — raw feature vector from the last 60s of logs for that IP (not the same as calling ML directly)  
- `/api/*` — proxied to `BACKEND_URL`, goes through ML + rate limit + logging  

---

## WSL / Windows

If `npm install` under `/mnt/e/...` throws rename errors, use `dashboard/.npmrc` (`install-strategy=nested`) or clone on the Linux filesystem (`~/...`). If the browser on Windows cannot open `localhost:5173` while Vite runs in WSL, Vite uses `host: true`; try the printed `http://172.x.x.x:5173/` or Windows 11 mirrored networking in `.wslconfig`.

---

## Evaluation folder

`evaluation/report.js` is a separate script (its own env vars like `GATEWAY_URL`, `ML_URL`). It is not started by the gateway.

---

## License

For Educational Purposes.
