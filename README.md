# Vouta Business Console

Full-stack Indian Business Management Console with React frontend and Node.js + PostgreSQL backend.

```
d:\Vouta\
├── frontend/     ← React 18 + Vite SPA
└── backend/      ← Express API + PostgreSQL
```

---

## Quick Start

### 1 — Set up PostgreSQL

Create a database named `vouta`:
```sql
CREATE DATABASE vouta;
```

### 2 — Configure backend environment

```bash
cd backend
copy .env.example .env
```

Edit `backend\.env` and set:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/vouta
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
```

### 3 — Run database migrations

```bash
cd backend
npm run migrate
```

### 4 — Start backend server (port 4000)

```bash
cd backend
npm run dev
```

### 5 — Start frontend dev server (port 3000)

```bash
cd frontend
npm run dev
```

Frontend automatically proxies all `/api/*` requests to `http://localhost:4000`.

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/register` | ✗ | Register new user |
| `POST` | `/api/auth/login` | ✗ | Login, returns JWT |
| `GET`  | `/api/auth/me` | ✓ | Current user profile |
| `PATCH`| `/api/auth/profile` | ✓ | Update profile |
| `GET/POST/PATCH/DELETE` | `/api/goals` | ✓ | Goals CRUD |
| `GET/POST/DELETE` | `/api/transactions` | ✓ | Ledger CRUD |
| `GET/POST/DELETE` | `/api/invoices` | ✓ | Invoices CRUD |
| `PATCH` | `/api/invoices/:id/status` | ✓ | Update invoice status |
| `GET/POST/DELETE` | `/api/todos` | ✓ | Todos CRUD |
| `PATCH` | `/api/todos/:id/toggle` | ✓ | Toggle task done |
| `GET/POST/DELETE` | `/api/team` | ✓ | Team members CRUD |
| `PATCH` | `/api/team/:id/leave` | ✓ | Toggle on-leave |
| `GET/POST/DELETE` | `/api/projects` | ✓ | Projects CRUD |
| `PATCH` | `/api/projects/:id/status` | ✓ | Update project status |
| `GET/POST/DELETE` | `/api/project-tasks` | ✓ | Kanban tasks CRUD |
| `PATCH` | `/api/project-tasks/:id/move` | ✓ | Move task column |
| `GET/POST/DELETE` | `/api/documents` | ✓ | Documents CRUD |
| `GET` | `/health` | ✗ | Server health check |

---

## Security Features

- **bcrypt** (cost 12) for password hashing — never MD5/SHA
- **JWT** Bearer tokens with configurable expiry
- **Constant-time** password comparison (prevents timing attacks)
- **Helmet** security headers on all responses
- **CORS** restricted to explicit origin allowlist
- **Rate limiting** — 10 auth req/15 min, 120 global req/min per IP
- **Zod** schema validation on all request bodies
- **User-scoped queries** — every DB query filters by `user_id` (prevents IDOR)
- **Parameterized SQL** — no string interpolation, zero SQL injection risk
- **1 MB** body size limit (prevents large payload DoS)
- **SSL** enforced in production (`NODE_ENV=production`)

---

## Production Build

```bash
# Build frontend static assets
cd frontend
npm run build

# Serve backend + static files together (optional: add express.static)
cd backend
NODE_ENV=production npm start
```
