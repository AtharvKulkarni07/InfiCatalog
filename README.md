<div align="center">

# ⚡ InfiCatalog — AI-Powered Product Management & Search Platform

**An enterprise-grade, full-stack product catalog and discovery platform featuring natural-language AI query translation, automated description & tag generation, real-time facet filtering, Redis caching, and UUID-based REST APIs.**

Built for the **Infilect Full Stack Development Intern Technical Assignment**.

---

[![Django](https://img.shields.io/badge/Django-5.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.3-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-3.5%20Flash-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://infi-catalog.vercel.app)
[![Render](https://img.shields.io/badge/Render-Docker%20Live-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://inficatalog-api.onrender.com)
[![Tests](https://img.shields.io/badge/Unit%20Tests-14%2F14%20Passing-success?style=for-the-badge&logo=checkmarx&logoColor=white)](#3-local-setup-instructions)
[![Security](https://img.shields.io/badge/OWASP-Hardened-blue?style=for-the-badge&logo=securityscorecard&logoColor=white)](#6-key-design-decisions)

---

### 🌐 Quick Access Links

| Environment / Resource | URL | Status / Notes |
|---|---|---|
| **Live Web Application** | [infi-catalog.vercel.app](https://infi-catalog.vercel.app) | Production SPA on Vercel Edge CDN |
| **Backend API Health Check** | [/api/health/](https://inficatalog-api.onrender.com/api/health/) | JSON health status & database connectivity |
| **Interactive API Documentation** | [Swagger UI Docs](https://inficatalog-api.onrender.com/api/docs/) | OpenAPI 3.0 schema browser |
| **Alternative API Documentation** | [Redoc Browser](https://inficatalog-api.onrender.com/api/redoc/) | Three-panel API reference |
| **Source Code Repository** | [GitHub: AtharvKulkarni07/InfiCatalog](https://github.com/AtharvKulkarni07/InfiCatalog) | Main branch with CI workflows |
| **Demo Account Credentials** | `Username: demo` &nbsp;\|&nbsp; `Password: Demo@12345` | Pre-seeded with catalog items |

</div>

---

## 📑 Table of Contents
1. [Project Overview](#1-project-overview)
   - [Core Capabilities](#core-capabilities)
   - [Dual-Catalog Paradigm](#dual-catalog-paradigm)
   - [System Architecture Diagram](#system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Local Setup Instructions](#3-local-setup-instructions)
   - [Option A: Docker Compose (Zero Setup)](#option-a-docker-compose-recommended)
   - [Option B: Manual Setup (Backend & Frontend)](#option-b-manual-local-setup)
   - [Running Automated Tests](#running-the-automated-test-suite)
4. [Environment Variables / Configuration](#4-environment-variables--configuration)
   - [Backend Configuration](#backend-configuration-backendenv)
   - [Frontend Configuration](#frontend-configuration-frontendenv)
5. [Deployment Details](#5-deployment-details)
   - [Cloud Infrastructure Topology](#cloud-infrastructure-topology)
   - [Production Resilience & Cold Start Handling](#production-resilience--cold-start-handling)
6. [Key Design Decisions](#6-key-design-decisions)
   - [Engineering Highlights & Security Matrix](#engineering-highlights)
   - [Complete REST API Reference Matrix](#complete-rest-api-reference-matrix)

---

## 1. Project Overview

**InfiCatalog** is a modern, responsive web application designed for high-performance catalog management and natural product discovery. It addresses the friction of traditional e-commerce catalogs by replacing rigid, error-prone keyword forms with a **Unified Smart Search** powered by Google Gemini, grounded in real database inventory.

### Core Capabilities

- 📦 **End-to-End Product Lifecycle (CRUD):** Create, retrieve, update, and delete catalog listings with comprehensive validation (Name, Brand, Category, Description, Price, Image URL, Tags) using tamper-resistant UUIDv4 identifiers.
- 🧠 **Unified Smart Search & GenAI:** Translates natural conversational queries (e.g., *"crispy late-night snacks under 150 without sugar"*) into grounded, validated database queries with zero hallucinated items.
- ✨ **AI Authoring Suite:** One-click marketing description generator and tag recommender integrated directly into product creation workflows.
- ⚡ **Redis In-Memory Caching:** High-speed caching for dynamic facet aggregations and AI queries with automated Django signal-based cache invalidation.
- 🛡️ **Cybersecurity Hardening:** JWT access/refresh token rotation, owner-only authorization guards, private-subnet SSRF protection on image URLs, and strict OWASP security headers.
- 📱 **Adaptive Widescreen Design:** Engineered for mobile phones, tablets, laptops, and ultra-wide desktop monitors with zero wasted gutter space.

### Dual-Catalog Paradigm

| Feature | 🌐 Global Catalog (Public) | 💼 My Workspace (Authenticated) |
|---|---|---|
| **Target Audience** | Open to all visitors and shoppers | Registered product managers and sellers |
| **Authentication** | None required | JWT Bearer Token |
| **Catalog Scope** | Entire verified catalog across all users | Personal catalog items owned by user |
| **Actions Allowed** | Search, filter, sort, view details | Full CRUD, AI description/tag drafting |
| **Permissions** | Read-Only (`GET`) | Full Ownership Control (`POST`, `PUT`, `DELETE`) |

### System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Mobile, Tablet, Desktop)"]
        UI["React 18 SPA (Vite + Vanilla CSS)"]
        Cache["Client In-Memory Facet Cache"]
    end

    subgraph CDN ["Edge Delivery"]
        Vercel["Vercel Edge Network (CDN + SSL)"]
    end

    subgraph Backend ["Application Layer (Render Container)"]
        Gunicorn["Gunicorn WSGI (4 Threads / Worker)"]
        WhiteNoise["WhiteNoise Static Engine"]
        DRF["Django REST Framework 5.2"]
        Security["Security Middleware & OWASP Headers"]
    end

    subgraph Services ["Data & AI Services"]
        Postgres[("Supabase PostgreSQL\n(B-Tree Indexes + UUIDv4)")]
        Redis[("Upstash Redis\n(TLS Cache + Signal Invalidation)")]
        Gemini["Google Gemini 3.5 Flash\n(Query Translation & Grounding)"]
        Fallback["Rule-Based Regex Fallback Engine"]
    end

    UI --> Vercel
    Vercel --> Gunicorn
    Gunicorn --> WhiteNoise
    Gunicorn --> Security
    Security --> DRF
    DRF --> Postgres
    DRF --> Redis
    DRF --> Gemini
    Gemini -.->|On Timeout/Offline| Fallback
```

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose & Engineering Rationale |
|---|---|---|---|
| **Frontend Framework** | **React** | `18.3.1` | Declarative component hierarchy and fast virtual DOM updates |
| **Frontend Tooling** | **Vite** | `6.0.0` | Sub-second HMR and optimized production asset bundling |
| **Routing** | **React Router DOM** | `6.28.0` | Client-side routing with URL search-params synchronization |
| **HTTP Client** | **Axios** | `1.7.9` | Request/response interceptors, automatic JWT refresh, and retry logic |
| **Styling** | **Vanilla CSS** | Modern CSS3 | Zero runtime CSS-in-JS overhead; tailored dark/navy design system |
| **Backend Framework** | **Django** | `5.2` | Enterprise-grade ORM, security defaults, migration management |
| **REST Layer** | **Django REST Framework** | `3.15.2` | Structured serializers, pagination, viewsets, and permissions |
| **Authentication** | **SimpleJWT** | `5.4.0` | Stateless JWT access (5m) & refresh (1d) lifecycle with token rotation |
| **Database** | **PostgreSQL** | `16` (Supabase) | ACID compliance, UUID primary keys, and indexed filter lookups |
| **Caching Layer** | **Redis** | `7.0` (Upstash) | Sub-millisecond facet aggregation cache and AI query deduplication |
| **GenAI Engine** | **Google Gemini** | `3.5 Flash` | Context-grounded natural-language query extraction and authoring |
| **WSGI Server** | **Gunicorn** | `26.2.0` | Production WSGI with multithreaded workers (`gthread`) |
| **Static Assets** | **WhiteNoise** | `6.12.0` | Efficient static file compression and caching directly from Gunicorn |
| **API Schema** | **drf-spectacular** | `0.28.0` | OpenAPI 3.0 schema generation with interactive Swagger UI and Redoc |
| **DevOps / CI** | **Docker & GitHub Actions** | Latest | Containerized reproducible deployments and automated test execution |

---

## 3. Local Setup Instructions

You can run InfiCatalog locally using either **Docker Compose** (recommended for zero-config startup) or **Manual Setup**.

### Option A: Docker Compose (Recommended)

> [!TIP]
> Docker Compose provisions the Backend, Frontend, PostgreSQL database, and Redis cache with pre-seeded data in a single command.

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
# 1. Clone the repository
git clone https://github.com/AtharvKulkarni07/InfiCatalog.git
cd InfiCatalog

# 2. Start all services
docker compose up --build
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API & Swagger:** `http://localhost:8000/api/docs/`
- **Pre-seeded Credentials:** `Username: demo` &nbsp;|&nbsp; `Password: Demo@12345`

---

### Option B: Manual Local Setup

#### Step 1: Backend Setup (Python 3.12+)

```bash
cd backend

# 1. Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux / macOS:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Apply database migrations
python manage.py migrate

# 4. Seed demo catalog and credentials
python manage.py seed_products

# 5. Start development server
python manage.py runserver 8000
```
Backend will be available at `http://localhost:8000`.

#### Step 2: Frontend Setup (Node.js 18+)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Launch Vite development server
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

### Running the Automated Test Suite

The repository includes a comprehensive 14-test suite covering authentication, permissions, UUID resolution, facet caching, AI search, and query relaxation.

```bash
# Run backend test suite
cd backend
python manage.py test products.tests --noinput
```

**Verified Test Results:**
```
Creating test database for alias 'default'...
..............
----------------------------------------------------------------------
Ran 14 tests in 8.516s

OK
Destroying test database for alias 'default'...
```

---

## 4. Environment Variables / Configuration

### Backend Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and configure the following:

| Variable | Required | Default | Description | Example |
|---|:---:|---|---|---|
| `DJANGO_SECRET_KEY` | **Yes** | — | Cryptographic signing key | `django-insecure-prod-key-xyz` |
| `DJANGO_DEBUG` | No | `False` | Debug mode (always `False` in prod) | `False` |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `DB_SSL_REQUIRE` | No | `True` | Enforce SSL for database connections | `True` |
| `REDIS_URL` | No | — | Redis connection URL (supports TLS) | `rediss://default:token@host.upstash.io:6379` |
| `GEMINI_API_KEY` | No | — | Google AI Studio Gemini API Key | `AIzaSy...` (falls back to rule engine) |
| `GEMINI_MODEL` | No | `gemini-3.5-flash-lite` | Gemini model identifier | `gemini-3.5-flash-lite` |
| `CORS_ALLOWED_ORIGINS`| **Yes** | — | Allowed frontend origins (comma-separated)| `https://infi-catalog.vercel.app,http://localhost:5173` |
| `ALLOWED_HOSTS` | **Yes** | `*` | Allowed host headers | `localhost,127.0.0.1,.onrender.com` |
| `SEED_DEMO_DATA` | No | `false` | Automatically seed demo data on boot | `true` |

### Frontend Configuration (`frontend/.env`)

| Variable | Required | Default | Description | Example |
|---|:---:|---|---|---|
| `VITE_API_URL` | **Yes** | `http://localhost:8000/api` | Base URL pointing to the REST API | `https://inficatalog-api.onrender.com/api` |

---

## 5. Deployment Details

InfiCatalog is deployed across a decoupled, multi-cloud production architecture:

```
                  ┌─────────────────────────────────────────┐
                  │           Vercel Edge Network           │
                  │   - Global CDN Distribution             │
                  │   - SPA Client-Side Rewrite Routing     │
                  │   - HTTPS TLS 1.3 Termination           │
                  └────────────────────┬────────────────────┘
                                       │ HTTPS REST Calls
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Render Docker Web Service         │
                  │   - Gunicorn (2 Workers, 4 Threads/ea)  │
                  │   - WhiteNoise Compressed Static Files  │
                  │   - Dual Port Binding (10000 & 8000)    │
                  └─────────┬──────────────┬──────────────┬─┘
                            │              │              │
                            ▼              ▼              ▼
                  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                  │   Supabase   │ │Upstash Redis │ │Google Gemini │
                  │  PostgreSQL  │ │  Serverless  │ │ 3.5 Flash AI │
                  └──────────────┘ └──────────────┘ └──────────────┘
```

### Production Resilience & Cold Start Handling (Self-Owned Solution)

Render free-tier web services spin down after 15 minutes of inactivity, requiring ~30–50 seconds to complete a cold-boot. Instead of relying on external third-party monitoring platforms, InfiCatalog implements a **100% self-owned, multi-tier provision**:

1. **GitHub Actions Scheduled Keep-Alive (`.github/workflows/keep_alive.yml`):**
   A native repository workflow scheduled via cron (`*/14 * * * *`) that pings the Render `/api/health/` endpoint every 14 minutes. This prevents the container from ever reaching the 15-minute inactivity threshold, keeping it continuously warm 24/7.
2. **Frontend In-App Instant Pre-Warm & Heartbeat (`api.js`):**
   The moment any user visits `https://infi-catalog.vercel.app`, `api.js` immediately dispatches an asynchronous background ping to `/api/health/` before the user even navigates or searches. While the browser tab remains open, a lightweight 8-minute heartbeat maintains active container status.
3. **Standalone Self-Hosted Python Worker (`scripts/keep_alive.py`):**
   A self-contained worker utility included directly in the codebase that can be executed on any server or machine (`python scripts/keep_alive.py [URL] [INTERVAL]`).
4. **Axios 60-Second Timeout & Auto-Retry:**
   Frontend Axios client configured with a `60000ms` timeout and an automatic 2-second retry interceptor for transient 502/503 cold boots on `GET` requests.
5. **Gunicorn Multithreading:**
   Gunicorn runs with `--workers 2 --threads 4 --worker-class gthread` in `backend/start.sh`, allowing concurrent I/O without blocking worker processes.

---

## 6. Key Design Decisions

### Engineering Highlights

1. **UUIDv4 Public Identifiers (Anti-IDOR Protection):**
   Database primary keys remain internal integers for optimal join indexing, while public endpoints expose immutable `UUIDv4` identifiers (`/api/products/<uuid>/`). This eliminates Insecure Direct Object References (IDOR), prevents competitive volume scraping, and hardens API security.

2. **Grounded GenAI Translation with Deterministic Fallback:**
   Rather than asking an LLM to generate product listings from scratch (which risks hallucination), Gemini is used strictly as a **structured query translator**. It parses natural prompts and validates extracted categories and brands against real database facets. If the LLM times out or hits API limits, an instant regex-based rule engine takes over seamlessly.

3. **Redis Caching with Automated Model Signal Invalidation:**
   Category and brand aggregations are cached with a 30-minute TTL. Django signals (`post_save` and `post_delete` on `Product`) automatically purge cache keys whenever products are created, edited, or deleted, guaranteeing 100% data consistency. Redis operations run in non-blocking mode (`IGNORE_EXCEPTIONS: True`).

4. **Single-Query Database Pagination:**
   Eliminated duplicate pre-pagination `.exists()` queries in `ProductViewSet.list()`. Pagination count and data retrieval are computed in a single database round-trip, saving 50–100ms per catalog page load.

5. **Widescreen Responsive Dashboard:**
   Rather than locking the desktop interface into a narrow 1180px box, the layout expands to `min(1560px, calc(100% - 64px))`. The product grid dynamically fills modern 1440px/1920px displays with 4–5 cards per row, collapsing smoothly to 2-column and 1-column layouts on tablets and phones.

6. **Cybersecurity & OWASP Hardening:**
   - **SSRF Prevention:** Product image URLs are strictly validated to block private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, loopback, link-local).
   - **HTTP Security Headers:** `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.
   - **Owner-Only Authorization:** Mutating actions (`PUT`, `PATCH`, `DELETE`) verify ownership at both serializer and query levels.

---

### Complete REST API Reference Matrix

All public product endpoints support standard UUID identifiers.

| Method | Endpoint | Description | Auth Required | Cache Layer |
|:---:|---|---|:---:|:---:|
| `POST` | `/api/auth/register/` | Register new user account & issue JWT tokens | Public | — |
| `POST` | `/api/auth/login/` | Authenticate with username/email & obtain JWT | Public | — |
| `POST` | `/api/auth/refresh/` | Refresh expired access token | Public | — |
| `GET` | `/api/auth/me/` | Retrieve authenticated user profile | **Bearer JWT** | — |
| `POST` | `/api/auth/password-reset/` | Request secure password reset email | Public | — |
| `POST` | `/api/auth/password-reset-confirm/` | Confirm password reset via UID and token | Public | — |
| `GET` | `/api/products/` | Filter, search, sort, and paginate catalog items | Public | In-Memory (Client) |
| `POST` | `/api/products/` | Create a new catalog product | **Bearer JWT** | Purges Facets |
| `GET` | `/api/products/{uuid}/` | Retrieve single product details by UUID | Public | — |
| `PUT` | `/api/products/{uuid}/` | Update full product listing (owner only) | **Bearer JWT** | Purges Facets |
| `PATCH`| `/api/products/{uuid}/` | Partial product update (owner only) | **Bearer JWT** | Purges Facets |
| `DELETE`| `/api/products/{uuid}/`| Delete product listing (owner only) | **Bearer JWT** | Purges Facets |
| `GET` | `/api/products/facets/` | Aggregate distinct categories, brands, price stats | Public | **Redis (30m TTL)** |
| `POST` | `/api/ai/search/` | Translate natural-language query to structured filters | Public | **Redis (1h TTL)** |
| `POST` | `/api/ai/generate-description/` | Generate 2-3 sentence marketing description | **Bearer JWT** | — |
| `POST` | `/api/ai/suggest-tags/` | Recommends 3-5 normalized search tags | **Bearer JWT** | — |
| `GET` | `/api/health/` | Service liveness and database connectivity check | Public | — |
| `GET` | `/api/docs/` | Interactive Swagger UI API Documentation | Public | WhiteNoise |
| `GET` | `/api/redoc/` | Alternative Redoc API Documentation | Public | WhiteNoise |

---

<div align="center">

**Developed with precision by Atharv Kulkarni**  
[GitHub Profile](https://github.com/AtharvKulkarni07) &nbsp;•&nbsp; [LinkedIn Profile](https://www.linkedin.com/in/atharvkulkarni07) &nbsp;•&nbsp; [Live App](https://infi-catalog.vercel.app)

</div>
