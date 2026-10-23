# Infilect Product Catalog

A full-stack product management app with AI-powered search, built for the Infilect Full Stack Development Intern assignment.

| | |
|---|---|
| **Live app** | `https://<your-app>.vercel.app` |
| **API + Swagger docs** | `https://<your-api>.up.railway.app/api/docs/` |
| **Demo login** | `demo` / `Demo@12345` |

## Project overview

Users register, sign in, and manage a catalog of products (name, brand, category, description, price, image URL, tags). Anyone can browse; signed-in users can add products and edit or delete their own. Browsing supports keyword search, category/brand/price filters, sorting and pagination, all reflected in the URL so views are shareable.

**GenAI features** (Google Gemini):
1. **Smart search** turns a plain-English request like *"cheap snacks under 200"* into structured filters.
2. **Write with AI** drafts a product description from name, brand and category.
3. **Suggest tags** proposes search tags for a product.

## Technology stack

| Layer | Choice |
|---|---|
| Backend | Python 3.12, Django 5, Django REST Framework, SimpleJWT, django-filter, drf-spectacular |
| Frontend | React 18, Vite, React Router, Axios, plain CSS (no UI kit) |
| Database | PostgreSQL on Supabase |
| GenAI | Google Gemini API (`gemini-3.5-flash-lite`, free tier) |
| Hosting | Vercel (frontend), Railway (backend), Supabase (database) |
| Extras | Docker Compose, GitHub Actions CI, structured logging, unit tests |

## Repository layout

```
backend/    Django project (config, accounts, products, genai)
frontend/   React app (pages, components, api client)
docker-compose.yml
.github/workflows/ci.yml
```

## Local setup

### Option A: Docker (one command)

```bash
cp backend/.env.example backend/.env      # optional, only needed for GEMINI_API_KEY
export GEMINI_API_KEY=your_key            # optional
docker compose up --build
```
Open http://localhost:5173 (app) and http://localhost:8000/api/docs/ (Swagger). Demo data is seeded automatically.

### Option B: manual

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit; with no DATABASE_URL it uses SQLite
export $(grep -v '^#' .env | xargs)   # or use your own env loader
python manage.py migrate
python manage.py seed_products        # demo user + 16 products
python manage.py runserver            # http://localhost:8000
python manage.py test                 # run the test suite
```

**Frontend**
```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:8000/api
npm install
npm run dev                 # http://localhost:5173
```

## Environment variables

**Backend** (`backend/.env.example`)

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Secret key. Generate a long random string for production. |
| `DJANGO_DEBUG` | `True` only for local development. |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts (default `*`). |
| `DATABASE_URL` | Postgres connection string. Unset means SQLite. |
| `DB_SSL_REQUIRE` | `True` for Supabase. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins. |
| `CORS_ALLOWED_ORIGIN_REGEXES` | e.g. `^https://.*\.vercel\.app$` to allow Vercel preview URLs. |
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com/apikey. Optional (see fallbacks). |
| `GEMINI_MODEL` | Defaults to `gemini-3.5-flash-lite`. |
| `SEED_DEMO_DATA` | `true` seeds demo data on each start (idempotent). |
| `AI_THROTTLE_RATE` | AI endpoint rate limit, default `30/min`. |

**Frontend**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL including `/api`, e.g. `https://<your-api>.up.railway.app/api` |

## Deployment

Deploy in this order: database, backend, frontend, then fix CORS.

### 1. Database: Supabase
1. Create a project at supabase.com and save the database password.
2. Click **Connect** and copy the **Session pooler** connection string (port 5432). Do not use the "Direct connection" string: it is IPv6-only and Railway cannot reach it.
3. This is your `DATABASE_URL`.

### 2. Backend: Railway
1. New Project, **Deploy from GitHub repo**, select this repo.
2. In the service **Settings**, set **Root Directory** to `backend`. Railway detects the Dockerfile.
3. Add variables: `DATABASE_URL`, `DB_SSL_REQUIRE=True`, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `GEMINI_API_KEY`, `SEED_DEMO_DATA=true`, `CORS_ALLOWED_ORIGINS` (temporary value is fine).
4. **Settings, Networking, Generate Domain**. Swagger is served at `/` and `/api/docs/`.
5. `start.sh` runs migrations, seeds demo data, then starts gunicorn on `$PORT`.

### 3. Frontend: Vercel
1. Import the repo and set **Root Directory** to `frontend` (Vite is auto-detected).
2. Add `VITE_API_URL=https://<your-railway-domain>/api`.
3. Deploy. `vercel.json` rewrites all routes to `index.html` so deep links work.

### 4. Close the loop
Set Railway's `CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app` (optionally add the regex for preview deployments) and redeploy.

## Key design decisions

- **JWT auth with refresh.** Access tokens last 30 minutes, with a transparent refresh on 401 in the Axios interceptor. Tokens are kept in `localStorage` for simplicity. That is XSS-exposed; the production-grade alternative is httpOnly cookies, noted as a follow-up.
- **Ownership rules.** Reads are public; writes need auth; only a product's owner may edit or delete it (`IsOwnerOrReadOnly`). The API returns `is_owner` so the UI hides actions that would fail.
- **Consistent error envelope.** Every failure returns `{"error": {"code", "message", "details"}}`, so the frontend has one parser and shows field-level errors from the server.
- **URL as state.** Search, filters, sort and page live in the query string, which makes views shareable, keeps back/forward working, and avoids duplicated state.
- **Server-side everything for the list.** Search, filtering, sorting and pagination run in the database via DRF filter backends (indexed `brand`, `category`, `price`). Page size is capped at 50.
- **Validation twice.** Client checks give instant feedback; the serializer is the source of truth (whitespace normalised, price greater than 0, tags de-duplicated and limited to 10).
- **Throttling.** AI and auth endpoints use scoped rate limits to protect the LLM quota and slow brute force.
- **Small, accessible UI.** No UI framework: skip link, visible focus, labelled controls, `aria-live` regions, reduced-motion support, responsive down to phones.

## GenAI feature explanation

**What it does.** Three LLM-backed features sit on the product catalog:

- **Smart search (main feature).** The shopper types a sentence. `POST /api/ai/search/` sends it to Gemini along with the *actual* categories and brands in the database, and asks for strict JSON: `search`, `category`, `brand`, `min_price`, `max_price`, `ordering`. The UI applies the result as normal filters and shows what it understood ("Category: Snacks, Under ₹200") so the user can see and adjust it.
- **Write with AI** and **Suggest tags** call the same service layer from the Add/Edit form. Output is placed in the form for the user to review; nothing is saved automatically.

**Why this design.**
- *The LLM translates, the database searches.* The model never sees product rows or invents results, so there is no hallucinated catalog and the existing filter/sort/pagination code is reused.
- *Never trust model output.* Responses are sanitised: only whitelisted keys are kept, numbers are coerced, `category` and `brand` must exactly match real catalog values (case-insensitively), and `ordering` must be on an allow-list. Hallucinated values are dropped.
- *Always works.* If the key is missing, the API is down or the JSON is malformed, a rule-based fallback (regex for "under/over N", name matching, "cheap" mapped to price ascending) takes over, and the response says `source: "fallback"`. The demo never shows a broken AI button.
- *Cost and abuse control.* Generation endpoints require login, all AI endpoints are throttled, inputs are length-limited, and `temperature=0` is used for the structured search task.

## Testing and CI

`python manage.py test` runs 11 tests covering auth, validation, ownership, filtering/sorting/pagination, facets, sanitisation of model output and fallbacks. GitHub Actions runs them against a Postgres service and builds the frontend on every push.

## What I would build next

Redis caching for facets, Celery for bulk AI tagging of imported catalogs, image upload to Supabase Storage, httpOnly-cookie auth, and embedding-based semantic search with pgvector.

## API summary

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register/` | returns user and tokens |
| POST | `/api/auth/login/` | returns user and tokens |
| POST | `/api/auth/refresh/` | new access token |
| GET | `/api/auth/me/` | current user |
| GET | `/api/products/` | `search`, `category`, `brand`, `min_price`, `max_price`, `mine`, `ordering`, `page`, `page_size` |
| POST | `/api/products/` | auth required |
| GET / PUT / PATCH / DELETE | `/api/products/{id}/` | write and delete: owner only |
| GET | `/api/products/facets/` | categories, brands, price range |
| POST | `/api/ai/search/` | natural-language query to filters |
| POST | `/api/ai/generate-description/` | auth required |
| POST | `/api/ai/suggest-tags/` | auth required |
| GET | `/api/docs/` | Swagger UI (`/api/redoc/`, `/api/schema/` also available) |
