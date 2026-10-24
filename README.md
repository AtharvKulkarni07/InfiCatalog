# InfiCatalog — AI-Powered Product Management & Search Platform

A full-stack, enterprise-grade product catalog and management platform featuring natural-language AI search, automated product description & tag generation, real-time facet filtering, and Redis caching.

Built for the **Infilect Full Stack Development Intern Technical Assignment**.

| Resource | URL |
|---|---|
| **Live Application** | [https://infi-catalog.vercel.app](https://infi-catalog.vercel.app) |
| **Backend API Health** | [https://inficatalog-api.onrender.com/api/health/](https://inficatalog-api.onrender.com/api/health/) |
| **Interactive API Documentation (Swagger)** | [https://inficatalog-api.onrender.com/api/docs/](https://inficatalog-api.onrender.com/api/docs/) |
| **API Documentation (Redoc)** | [https://inficatalog-api.onrender.com/api/redoc/](https://inficatalog-api.onrender.com/api/redoc/) |
| **GitHub Repository** | [https://github.com/AtharvKulkarni07/InfiCatalog](https://github.com/AtharvKulkarni07/InfiCatalog) |
| **Demo Credentials** | Username: `demo` &nbsp;\|&nbsp; Password: `Demo@12345` |

---

## 1. Project Overview

InfiCatalog is a full-stack product catalog platform engineered with a strict separation between **Global Catalog Exploration** (open to visitors and shoppers) and **My Workspace** (authenticated product lifecycle management with ownership-based access control).

### Core Highlights
- **Product Management:** Complete CRUD workflows for products (Name, Brand, Category, Description, Price, Image URL, Tags) with validation and owner-only editing/deleting permissions.
- **Authentication & Security:** JWT authentication (Access & Refresh tokens) via SimpleJWT, automated token rotation/refresh on 401, email-based password reset with secure tokens, and rate-limited endpoints.
- **Smart Search & GenAI:** Translates natural-language shopper requests (e.g., *"healthy zero sugar morning drinks under 250"*) into database queries using Google Gemini, grounded by real catalog facets, with rule-based fallback and Redis caching.
- **AI Authoring Tools:** One-click AI Product Description Generation and AI Tag Suggestions directly integrated into product creation and editing workflows.
- **High-Performance Caching:** Redis integration for facet aggregation caching and AI search query caching with automated Django signal-based cache invalidation.
- **Resilient UI/UX:** Responsive React design system, shareable URL state sync, debounced search, modal confirmations, animated toast notifications, and dedicated loading/empty/error states.

---

## 2. Technology Stack

| Layer | Technologies & Tools | Rationale |
|---|---|---|
| **Backend Framework** | Python 3.12, Django 5.2, Django REST Framework (DRF) | Robust REST architecture, ORM, authentication, and validation |
| **Authentication** | `djangorestframework-simplejwt` | Stateless JWT access/refresh token lifecycle |
| **Database** | PostgreSQL on **Supabase** (Transaction pooler) | Relational integrity, B-Tree indexed search fields, scalable hosting |
| **Caching Layer** | **Redis** (Upstash Redis in cloud / Redis 7 Alpine in Docker) via `django-redis` | Sub-millisecond facet reads and AI query deduplication with non-blocking fallback |
| **GenAI / LLM** | Google Gemini (`gemini-3.5-flash-lite` / REST API) | Cost-effective, low-latency natural language understanding |
| **API Documentation** | `drf-spectacular` (OpenAPI 3.0 / Swagger UI / Redoc) | Auto-generated, interactive schema documentation |
| **Frontend** | React 18, Vite, React Router 6, Axios | High-performance SPA with client-side routing and interceptors |
| **Styling** | Vanilla CSS Design System (Custom variables, responsive grid) | Zero runtime overhead, tailored theme, responsive down to mobile |
| **Deployment** | **Vercel** (Frontend) + **Render** (Backend Docker Web Service) | Global CDN edge caching for UI, containerized production backend |
| **CI / Containerization**| Docker, Docker Compose, GitHub Actions | Reproducible multi-service local environment and automated CI |

---

## 3. System Architecture & Flow

```
[ User Browser / Client ]
           │
           ▼
[ Vercel Edge CDN (React 18 SPA) ]
           │ (HTTPS / REST)
           ▼
[ Render Web Service (Gunicorn / WhiteNoise / Django DRF) ]
     │                 │                              │
     ▼                 ▼                              ▼
[ Supabase PostgreSQL ] [ Upstash Redis Cache ]   [ Google Gemini LLM API ]
- Products Table        - Facets Cache (30m TTL)  - Smart Search Parser
- Auth & Users          - AI Query Cache (1h TTL) - Description Generator
- B-Tree Indexes        - Invalidation Signals    - Tag Suggester
```

---

## 4. GenAI Implementation & Architecture

InfiCatalog implements three distinct GenAI capabilities with an emphasis on **domain grounding, reliability, and security**:

### A. Natural-Language Smart Search (Primary Feature)
Instead of allowing the LLM to search or hallucinate products directly, **the LLM acts strictly as a query translator**:
1. **Catalog Grounding:** The backend queries the current distinct `categories` and `brands` from the database (or Redis cache) and injects them into the system prompt.
2. **Structured Extraction:** Gemini translates ambiguous user prompts (e.g., *"cheap chips under 100 without sugar"*) into a strict JSON payload:
   - `search`: Cleaned search term (`"chips"`)
   - `category`: Grounded category (`"Snacks"`)
   - `brand`: Grounded brand (if mentioned)
   - `min_price` / `max_price`: Numerical price bounds (`max_price: 100`)
   - `ordering`: Price sorting (`"price"` or `"-price"`)
   - `exclude`: Exclusion keywords (`"sugar"`)
3. **Strict Output Sanitization:** All LLM outputs pass through `_sanitize_filters`:
   - Categories and brands are validated against real catalog data; hallucinations are dropped.
   - Prices are validated as non-negative floats with `min <= max`.
   - Ordering keys are restricted to a whitelist.
4. **Redis Query Caching:** MD5 hashes of user queries are cached for 1 hour, giving instant sub-5ms responses for repeated queries.
5. **Deterministic Rule-Based Fallback:** If the Gemini API key is unset, rate-limited, or times out, a regex-based fallback parser extracts prices ("under/over X"), matching brands, and sorting keywords. The application never breaks.
6. **Zero-Result Price Relaxation:** If a user specifies an overly restrictive price (e.g., "coffee under 50" where lowest is ₹90), the system automatically relaxes the price bound and returns category matches with an explanatory notice.

### B. AI Product Description Generator (`POST /api/ai/generate-description/`)
- Generates compelling 2-3 sentence marketing copy given a product's name, brand, and category.
- Form pre-fills automatically, allowing the user to review and edit before committing.

### C. AI Product Tag Suggestion (`POST /api/ai/suggest-tags/`)
- Recommends 3-5 normalized lowercase search tags for discoverability (e.g., `organic`, `gluten-free`, `crunchy`).

---

## 5. Redis Caching & Invalidation Flow

- **Facet Caching:** Distinct categories and brands are aggregated and cached under `catalog:facets:<scope>:<category>` with a 30-minute TTL.
- **Automated Cache Invalidation:** Django signals (`post_save` and `post_delete` on the `Product` model) automatically purge facet cache keys whenever any product is added, updated, or removed.
- **Fault-Tolerant Resilience:** Configured with `IGNORE_EXCEPTIONS: True`. If Redis is temporarily offline or restarting, requests fall back seamlessly to the database without returning 500 errors.

---

## 6. Local Setup Instructions

### Option 1: Docker Compose (Recommended — Zero Setup)
Prerequisites: Docker & Docker Compose installed.

```bash
# 1. Clone repository
git clone https://github.com/AtharvKulkarni07/InfiCatalog.git
cd InfiCatalog

# 2. Start all services (Backend, Frontend, Postgres, Redis)
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API & Swagger: `http://localhost:8000/api/docs/`
- Demo account and 16 products are seeded automatically on first boot.

---

### Option 2: Manual Local Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed demo products and demo user
python manage.py seed_products

# Run test suite
python manage.py test products.tests

# Start development server
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

---

## 7. Environment Variables Configuration

### Backend (`backend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | Yes | Django cryptographic key | `your-secure-secret-key` |
| `DJANGO_DEBUG` | No | Debug mode (False in production) | `False` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `DB_SSL_REQUIRE` | No | Require SSL for database connection | `True` |
| `REDIS_URL` | No | Redis connection URL (with TLS support) | `rediss://default:pass@host:6379` |
| `GEMINI_API_KEY` | No | Google Gemini API key | `AIzaSy...` |
| `GEMINI_MODEL` | No | Gemini model name | `gemini-3.5-flash-lite` |
| `CORS_ALLOWED_ORIGINS`| Yes | Allowed frontend origins | `https://infi-catalog.vercel.app` |
| `EMAIL_HOST_USER` | No | SMTP email for password reset | `your-email@gmail.com` |
| `EMAIL_HOST_PASSWORD` | No | SMTP app password | `your-app-password` |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL | `https://inficatalog-api.onrender.com/api` |

---

## 8. API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Register new account & obtain JWT tokens | No |
| `POST` | `/api/auth/login/` | Sign in & obtain JWT tokens | No |
| `POST` | `/api/auth/refresh/` | Refresh expired access token | No |
| `GET` | `/api/auth/me/` | Fetch authenticated user profile | Yes |
| `POST` | `/api/auth/password-reset/` | Request password reset email | No |
| `POST` | `/api/auth/password-reset-confirm/` | Reset password using UID & token | No |
| `GET` | `/api/products/` | Filter, search, sort, and paginate catalog | No |
| `POST` | `/api/products/` | Create new product | Yes |
| `GET` | `/api/products/{id}/` | Retrieve product details | No |
| `PUT / PATCH`| `/api/products/{id}/` | Update product (owner only) | Yes |
| `DELETE` | `/api/products/{id}/` | Delete product (owner only) | Yes |
| `GET` | `/api/products/facets/` | Cached categories, brands, & price stats | No |
| `POST` | `/api/ai/search/` | Natural-language query translation | No |
| `POST` | `/api/ai/generate-description/`| AI product description generator | Yes |
| `POST` | `/api/ai/suggest-tags/` | AI product tag suggestion | Yes |
| `GET` | `/api/health/` | Service health check | No |
| `GET` | `/api/docs/` | Interactive Swagger UI documentation | No |
| `GET` | `/api/redoc/` | Redoc API documentation | No |

---

## 9. Key Design Decisions

1. **Dual Catalog UX (Visitor vs Workspace):**
   Visitors can explore the global community catalog without registration. Authenticated users access a dedicated workspace for managing their personal listings.
2. **Grounded LLM Translations over Direct Search:**
   By feeding distinct database facets into Gemini, the LLM maps natural queries directly to indexed SQL filters (`brand`, `category`, `price`, `tags`), completely eliminating hallucinated catalog items.
3. **Resilient Fallback Chains:**
   Every cloud dependency (Gemini LLM, Redis Cache, Supabase) has an automatic in-memory or rule-based fallback. The platform never crashes or blocks users when an external service is unavailable.
4. **URL as Source of Truth:**
   All search queries, filters, sorting options, and pagination states sync directly to URL search parameters, ensuring full browser history navigation and shareable links.
5. **Standardized Error Envelope:**
   Every API failure is formatted consistently (`{"error": {"code": "...", "message": "...", "details": {...}}}`), providing clear feedback across all forms and API consumers.
