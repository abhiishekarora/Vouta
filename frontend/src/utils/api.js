/**
 * Vouta API Client
 * Centralised fetch wrapper that:
 *  - In development: calls /api/* — Vite proxy forwards to localhost:4000
 *  - In production (Vercel): calls VITE_API_URL (the backend Vercel URL) + /api/*
 *  - Attaches JWT Bearer token to every request (stored in sessionStorage)
 *  - Auto-clears token and reloads on 401
 */

// VITE_API_URL should be set in frontend/.env.production to your backend URL
// e.g. https://vouta-api.vercel.app
// Leave empty locally — Vite proxy handles it.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";


// ─── Token management ─────────────────────────────────────────────
export const token = {
  get: () => sessionStorage.getItem("vouta_token"),
  set: (t) => sessionStorage.setItem("vouta_token", t),
  clear: () => sessionStorage.removeItem("vouta_token"),
};

// ─── Core fetch wrapper ───────────────────────────────────────────
async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const t = token.get();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Auto-logout on 401
  if (res.status === 401) {
    token.clear();
    window.location.reload();
    return;
  }

  if (res.status === 204) return null; // No content (DELETE success)

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.details = data?.details;
    err.status = res.status;
    throw err;
  }

  return data;
}

const get    = (path)        => request("GET",    path);
const post   = (path, body)  => request("POST",   path, body);
const patch  = (path, body)  => request("PATCH",  path, body);
const del    = (path)        => request("DELETE",  path);

// ─── Auth ─────────────────────────────────────────────────────────
export const auth = {
  register: (data)  => post("/auth/register", data),
  login:    (data)  => post("/auth/login", data),
  me:       ()      => get("/auth/me"),
  profile:  (data)  => patch("/auth/profile", data),
};

// ─── Goals ────────────────────────────────────────────────────────
export const goals = {
  list:    ()           => get("/goals"),
  create:  (data)       => post("/goals", data),
  update:  (id, data)   => patch(`/goals/${id}`, data),
  remove:  (id)         => del(`/goals/${id}`),
};

// ─── Transactions (Ledger) ────────────────────────────────────────
export const transactions = {
  list:    ()     => get("/transactions"),
  create:  (data) => post("/transactions", data),
  remove:  (id)   => del(`/transactions/${id}`),
};

// ─── Invoices ─────────────────────────────────────────────────────
export const invoices = {
  list:         ()           => get("/invoices"),
  create:       (data)       => post("/invoices", data),
  updateStatus: (id, status) => patch(`/invoices/${id}/status`, { status }),
  remove:       (id)         => del(`/invoices/${id}`),
};

// ─── Todos ────────────────────────────────────────────────────────
export const todos = {
  list:   ()   => get("/todos"),
  create: (data) => post("/todos", data),
  toggle: (id)   => patch(`/todos/${id}/toggle`),
  remove: (id)   => del(`/todos/${id}`),
};

// ─── Team ─────────────────────────────────────────────────────────
export const team = {
  list:        ()     => get("/team"),
  create:      (data) => post("/team", data),
  toggleLeave: (id)   => patch(`/team/${id}/leave`),
  remove:      (id)   => del(`/team/${id}`),
};

// ─── Projects ─────────────────────────────────────────────────────
export const projects = {
  list:         ()           => get("/projects"),
  create:       (data)       => post("/projects", data),
  updateStatus: (id, status) => patch(`/projects/${id}/status`, { status }),
  remove:       (id)         => del(`/projects/${id}`),
};

// ─── Project Tasks (Kanban) ───────────────────────────────────────
export const projectTasks = {
  list:   (projectId) => get(`/project-tasks?projectId=${projectId}`),
  create: (data)      => post("/project-tasks", data),
  move:   (id, status)=> patch(`/project-tasks/${id}/move`, { status }),
  remove: (id)        => del(`/project-tasks/${id}`),
};

// ─── Documents ────────────────────────────────────────────────────
export const documents = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/documents${qs ? `?${qs}` : ""}`);
  },
  create: (data) => post("/documents", data),
  remove: (id)   => del(`/documents/${id}`),
};
