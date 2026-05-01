# ToolStack CRM

A multi-tenant SaaS CRM with Chrome Extension support.

## Tech Stack

| Layer | Technology |
|---|---|
| API Gateway | Python / FastAPI |
| CRM Backend | Node.js / Express |
| Frontend | React SPA |
| Chrome Extension | Manifest V3 |
| Database | MongoDB |
| Auth | JWT + HttpOnly cookies |

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB 6+ (with authentication enabled)

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in ALL required values
# Never commit .env to version control
```

**Required env vars** (server will refuse to start if missing):
- `JWT_SECRET` — min 32 chars
- `JWT_REFRESH_SECRET` — min 32 chars
- `COOKIES_ENCRYPTION_KEY` — exactly 64 hex chars
- `MONGO_URL` — MongoDB connection string (use authenticated URL in production)
- `INITIAL_ADMIN_EMAIL` — bootstrap admin email
- `INITIAL_ADMIN_PASSWORD` — bootstrap admin password (min 12 chars)
- `ALLOWED_ORIGINS` — comma-separated list of allowed frontend origins

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # Encryption key
```

### 3. Install & Run

```bash
# Backend
cd backend
yarn install
node server-crm.js

# Gateway (separate terminal)
pip install -r backend/requirements.txt
python backend/server.py

# Frontend (separate terminal)
cd frontend
yarn install
yarn start
```

### 4. Default Admin

On first startup, an admin account is bootstrapped from `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`.
**Change the password immediately after first login.**

## Running Tests

Tests require environment variables — never hardcode credentials:

```bash
export TEST_GATEWAY_URL=http://localhost:8001
export TEST_ADMIN_EMAIL=admin@yourdomain.com
export TEST_ADMIN_PASSWORD=your-password

cd tests
python backend_test.py
```

## Security Notes

- MongoDB must have authentication enabled in any non-local environment
- `ALLOWED_ORIGINS` must list only your exact frontend URLs — no wildcards
- All session bundle data (cookies, localStorage) is encrypted at rest with AES-256-GCM
- JWT tokens expire in 15 minutes; refresh tokens in 7 days
