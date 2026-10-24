# InfiCatalog — AI-Powered Product Management & Search Platform

A full-stack, enterprise-grade product catalog and management platform featuring natural-language AI search, automated product description & tag generation, real-time facet filtering, Redis caching, and UUID-based REST APIs.

Built for the **Infilect Full Stack Development Intern Technical Assignment**.

| Resource | URL / Details |
|---|---|
| **Live Application** | [https://infi-catalog.vercel.app](https://infi-catalog.vercel.app) |
| **Backend API Health Check** | [https://inficatalog-api.onrender.com/api/health/](https://inficatalog-api.onrender.com/api/health/) |
| **Interactive API Docs (Swagger UI)** | [https://inficatalog-api.onrender.com/api/docs/](https://inficatalog-api.onrender.com/api/docs/) |
| **Alternative API Docs (Redoc)** | [https://inficatalog-api.onrender.com/api/redoc/](https://inficatalog-api.onrender.com/api/redoc/) |
| **GitHub Repository** | [https://github.com/AtharvKulkarni07/InfiCatalog](https://github.com/AtharvKulkarni07/InfiCatalog) |
| **Demo Account Credentials** | Username: `demo` &nbsp;\|&nbsp; Password: `Demo@12345` |

---

## 1. Project Overview

**InfiCatalog** is a modern, responsive web application designed for high-performance catalog management and intuitive discovery. The platform supports two core user modes:
- **Global Catalog Exploration:** Open to visitors and shoppers with instant keyword search, natural-language AI query translation, category/brand facet filtering, price range scoping, and sorting.
- **My Workspace (Authenticated Dashboard):** A secure space where registered users create, update, and manage their own product listings with ownership-based access control, AI-assisted description generation, and automated tag suggestions.

### Core Capabilities
- **Product Lifecycle (CRUD):** Create, retrieve, update, and delete products (Name, Brand, Category, Description, Price, Image URL, Tags) using secure UUID identifiers (`/api/products/<uuid>/`).
- **Unified Smart Search & GenAI:** Translates natural-language intent (e.g., *"healthy zero sugar drinks under 200"*) into grounded SQL database queries using Google Gemini, backed by a deterministic rule-based fallback when offline.
- **AI Authoring Tools:** One-click marketing description generator and tag recommender integrated directly into product creation forms.
- **High-Performance Redis Caching:** Sub-millisecond facet aggregation caching and AI query deduplication with automatic Django signal invalidation on database mutations.
- **Cybersecurity & OWASP Hardening:** JWT authentication (access & refresh tokens), ownership enforcement, input sanitization, image URL protocol & SSRF protection, strict security headers (CSP, HSTS, X-Content-Type-Options), and rate-limiting.
- **Responsive Widescreen Dashboard:** Adaptive layout engineered for mobile phones, tablets, laptops, and ultra-wide desktop monitors with zero wasted gutter space.

### System Architecture Flow
```
[ User Browser / Client (Mobile & Desktop) ]
                   │
                   ▼ (HTTPS)
      [ Vercel Edge CDN (React 18 SPA) ]
                   │
                   ▼ (REST APIs via Axios)
  [ Render Web Service (Gunicorn + WhiteNoise + Django DRF) ]
        │                   │                         │
        ▼                   ▼                         ▼
[ Supabase PostgreSQL ] [ Upstash Redis Cache ] [ Google Gemini 3.5 LLM ]
- Products Table (UUID) - Facets Cache (30m)    - Query Parser
- Auth & Users          - AI Query Cache (1h)   - Description Generator
- B-Tree Indexes        - Signal Invalidation   - Tag Suggester
```

---

## 2. Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **Backend Framework** | Python 3.12, Django 5.2, Django REST Framework (DRF) | Robust REST architecture, ORM query optimization, and request validation |
| **Database** | PostgreSQL on **Supabase** (Transaction pooler) | Relational ACID integrity, B-Tree indexed search fields, scalable hosting |
| **Caching Layer** | **Redis** (Upstash Redis in Cloud / Redis 7 Alpine in Docker) via `django-redis` | In-memory facet aggregation and query deduplication with graceful fallback |
| **GenAI / LLM** | Google Gemini (`gemini-3.5-flash-lite` via REST API) | Low-latency, cost-effective natural language extraction and grounding |
| **Authentication** | `djangorestframework-simplejwt` | Stateless JWT access/refresh token lifecycle with auto-refresh on 401 |
| **API Documentation** | `drf-spectacular` (OpenAPI 3.0 / Swagger UI / Redoc) | Auto-generated, interactive schema documentation |
| **Frontend Framework** | React 18, Vite, React Router 6, Axios | High-performance SPA with client-side routing, request interceptors, and caching |
| **Styling** | Vanilla CSS Design System | Zero runtime overhead, bespoke dark/navy design system, fluid responsiveness |
| **Deployment & Hosting**| **Vercel** (Frontend) + **Render** (Backend Docker Container) | Global CDN edge caching for UI, containerized production backend with health checks |
| **CI & Containers** | Docker, Docker Compose, GitHub Actions | Reproducible multi-service local environment and continuous testing |

---

## 3. Local Setup Instructions

You can run InfiCatalog locally using either **Docker Compose** (recommended) or **Manual Setup**.

### Option A: Docker Compose (Zero Configuration)
Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
# 1. Clone the repository
git clone https://github.com/AtharvKulkarni07/InfiCatalog.git
cd InfiCatalog

# 2. Build and launch all services (Backend, Frontend, PostgreSQL, Redis)
docker compose up --build
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API & Swagger:** `http://localhost:8000/api/docs/`
- **Pre-seeded Data:** A demo account (`demo` / `Demo@12345`) and 16 catalog items are automatically seeded on startup.

---

### Option B: Manual Local Setup

#### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Seed initial catalog products and demo account
python manage.py seed_products

# Run backend unit and security tests (14 tests)
python manage.py test products.tests

# Start the Django development server
python manage.py runserver 8000
```

#### 2. Frontend Setup
```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
The client will be running at `http://localhost:5173`.

---

## 4. Environment Variables / Configuration

### Backend Configuration (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and configure the following variables:

| Variable | Required | Description | Default / Example |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | Yes | Django secret cryptographic key | `your-secure-random-secret-key` |
| `DJANGO_DEBUG` | No | Enables debug mode (set `False` in production) | `False` |
| `DATABASE_URL` | Yes | PostgreSQL connection URI | `postgresql://user:pass@host:5432/dbname` |
| `DB_SSL_REQUIRE` | No | Enforces SSL connection to PostgreSQL | `True` |
| `REDIS_URL` | No | Redis connection URI (supports `redis://` and `rediss://` for TLS) | `rediss://default:token@host.upstash.io:6379` |
| `GEMINI_API_KEY` | No | Google AI Studio Gemini API Key | `AIzaSy...` (falls back to rule engine if omitted) |
| `GEMINI_MODEL` | No | Gemini model designation | `gemini-3.5-flash-lite` |
| `CORS_ALLOWED_ORIGINS`| Yes | Comma-separated list of allowed frontend origins | `https://infi-catalog.vercel.app,http://localhost:5173` |
| `ALLOWED_HOSTS` | Yes | Comma-separated list of allowed backend hostnames | `localhost,127.0.0.1,.onrender.com` |
| `SEED_DEMO_DATA` | No | Automatically seeds demo catalog and user on boot | `true` |

### Frontend Configuration (`frontend/.env`)
Create `frontend/.env` (or configure via Vercel dashboard):

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | Yes | Base URL pointing to the Django REST API | `https://inficatalog-api.onrender.com/api` (Production)<br>`http://localhost:8000/api` (Local) |

---

## 5. Deployment Details

InfiCatalog is deployed in a decoupled, production-grade cloud topology:

### Frontend: Vercel (Edge CDN)
- **Production URL:** [https://infi-catalog.vercel.app](https://infi-catalog.vercel.app)
- **Build System:** Vite SPA build (`dist/` directory) with custom SPA rewrite routing in `vercel.json` (`/* -> /index.html`).
- **Client Resilience:** 60-second Axios timeout with automatic transient cold-start retries (mitigating Render free-tier spin-up delays). In-memory facet caching (`getCachedFacets()`) eliminates redundant network round-trips during navigation.

### Backend: Render (Docker Web Service)
- **Production URL:** [https://inficatalog-api.onrender.com](https://inficatalog-api.onrender.com)
- **Container Runtime:** Python 3.12-slim Dockerfile with Gunicorn WSGI server and WhiteNoise static file compression.
- **Port Binding:** Dynamically binds to both `$PORT` (Render's default 10000) and port 8000 via `start.sh`.
- **Multithreading Concurrency:** Gunicorn runs with `--workers 2 --threads 4 --worker-class gthread` to handle asynchronous database and Redis I/O without blocking worker processes.
- **Health Check Endpoint:** `GET /api/health/` returns HTTP 200 with service status, database connectivity, and timestamp.

### Database & Caching: Supabase & Upstash
- **Database:** Hosted PostgreSQL on Supabase using pooled connections with TLS encryption.
- **Cache:** Upstash Serverless Redis over TLS (`rediss://`), providing sub-5ms caching for facet queries and AI translations.

---

## 6. Key Design Decisions

1. **UUID Resource Identifiers in Public APIs:**
   Products use standard `UUIDv4` identifiers in public URLs and REST endpoints (`/api/products/<uuid>/`). This prevents integer enumeration attacks (IDOR), hides business volume, and ensures tamper-resistant object identification.
2. **Grounded GenAI Query Translation with Deterministic Fallback:**
   Rather than allowing the LLM to hallucinate catalog products directly, Gemini functions strictly as a query translator. It extracts structured filters (`category`, `brand`, `min_price`, `max_price`, `exclude`, `search`) against real, distinct catalog facets. If Gemini is unavailable or rate-limited, an instant rule-based fallback extracts keywords and price thresholds deterministically.
3. **Redis Caching with Automated Signal Invalidation:**
   Expensive category and brand aggregations are cached with a 30-minute TTL. Django model signals (`post_save` and `post_delete` on `Product`) automatically purge cache keys whenever items are created, modified, or deleted, ensuring 100% data consistency. Redis failures are non-blocking (`IGNORE_EXCEPTIONS: True`).
4. **Optimized Database Queries (No Duplicate `.exists()` Calls):**
   In `ProductViewSet.list()`, redundant pre-pagination `.exists()` queries were eliminated. Query pagination evaluates counts in a single round-trip, cutting ~50–100ms off catalog load times.
5. **Unified Responsive Dashboard with Adaptive Widescreen Layout:**
   Rather than locking the desktop interface into a narrow 1180px box, the dashboard expands smoothly to `min(1560px, calc(100% - 64px))`. The product grid dynamically fills large displays with 4–5 cards per row, while collapsing cleanly to a streamlined 2-column and 1-column layout on tablets and mobile devices.
6. **Robust Cybersecurity Hardening:**
   - Strict HTTP security headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.
   - Image URL validation prevents private IP address SSRF (blocking loopback, link-local, and RFC 1918 subnets).
   - Owner-only write permissions enforced at both the ORM level and DRF permission layer.
