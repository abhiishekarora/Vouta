/**
 * Vouta API Client
 *
 * Auth token strategy:
 *  - Dual auth: Uses httpOnly cookie set by backend AND localStorage token fallback.
 *  - Sends `credentials: "include"` (cookie) + `Authorization: Bearer <token>` (if present).
 *  - This ensures cross-origin compatibility even if browser blocks cross-site cookies.
 */

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const token = {
  get: () => {
    try {
      return localStorage.getItem("vouta_token");
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      if (t) localStorage.setItem("vouta_token", t);
    } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem("vouta_token");
      localStorage.removeItem("vouta_user");
    } catch {}
  },
};

export const userStorage = {
  get: () => {
    try {
      const u = localStorage.getItem("vouta_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  set: (u) => {
    try {
      if (u) localStorage.setItem("vouta_user", JSON.stringify(u));
    } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem("vouta_user");
    } catch {}
  },
};

// ─── Helper for fetch headers ────────────────────────────────────
function getHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const tok = token.get();
  if (tok) {
    headers["Authorization"] = `Bearer ${tok}`;
  }
  return headers;
}

// ─── Core JSON fetch wrapper ─────────────────────────────────────
async function request(method, path, body) {
  const headers = getHeaders({ "Content-Type": "application/json" });

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (netErr) {
    const err = new Error("Network error. Unable to connect to server.");
    err.status = 0;
    throw err;
  }

  // Parse JSON response safely if available
  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (res.status === 204) return null; // No content

  if (!res.ok) {
    let defaultMsg = `Request failed (${res.status})`;
    if (res.status === 401) {
      if (path === "/auth/login") {
        defaultMsg = "Invalid email or password.";
      } else {
        defaultMsg = "Session expired. Please sign in.";
      }
    }

    const err = new Error(data?.error || data?.message || defaultMsg);
    err.details = data?.details;
    err.status = res.status;
    throw err;
  }

  return data;
}

// ─── File upload — multipart/form-data ───────────────────────────
async function uploadFile(path, file) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = getHeaders(); // Do NOT set Content-Type for FormData

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    });
  } catch (netErr) {
    const err = new Error("Network error during file upload.");
    err.status = 0;
    throw err;
  }

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Upload failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// ─── File download — opens blob in new tab ────────────────────────
async function downloadFile(path) {
  const headers = getHeaders();

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers,
    });
  } catch (netErr) {
    throw new Error("Network error during download.");
  }

  if (res.status === 401) {
    throw new Error("Session expired. Please sign in.");
  }

  if (!res.ok) {
    throw new Error(`Could not retrieve file (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  // Open in a new tab so PDF viewers and image viewers can render inline
  window.open(url, "_blank", "noopener,noreferrer");

  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const get   = (path)       => request("GET",    path);
const post  = (path, body) => request("POST",   path, body);
const patch = (path, body) => request("PATCH",  path, body);
const del   = (path)       => request("DELETE", path);

// Auth
export const auth = {
  register:     (data) => post("/auth/register", data),
  login:        (data) => post("/auth/login", data),
  logout:       ()     => post("/auth/logout"),
  me:           ()     => get("/auth/me"),
  profile:      (data) => patch("/auth/profile", data),
  getMembers:   ()     => get("/auth/members"),
  inviteMember: (data) => post("/auth/invite", data),
  updateRole:   (id, role) => patch(`/auth/members/${id}/role`, { role }),
  removeMember: (id)   => del(`/auth/members/${id}`),
};

// Goals
export const goals = {
  list:   ()         => get("/goals"),
  create: (data)     => post("/goals", data),
  update: (id, data) => patch(`/goals/${id}`, data),
  remove: (id)       => del(`/goals/${id}`),
};

// Transactions (Ledger)
export const transactions = {
  list:   ()     => get("/transactions"),
  create: (data) => post("/transactions", data),
  remove: (id)   => del(`/transactions/${id}`),
};

// Invoices
export const invoices = {
  list:         ()           => get("/invoices"),
  create:       (data)       => post("/invoices", data),
  updateStatus: (id, status) => patch(`/invoices/${id}/status`, { status }),
  remove:       (id)         => del(`/invoices/${id}`),
  upload:       (id, file)   => uploadFile(`/invoices/${id}/upload`, file),
  viewFile:     (id)         => downloadFile(`/invoices/${id}/file`),
  removeFile:   (id)         => del(`/invoices/${id}/file`),
};

// Todos
export const todos = {
  list:   ()     => get("/todos"),
  create: (data) => post("/todos", data),
  toggle: (id)   => patch(`/todos/${id}/toggle`),
  remove: (id)   => del(`/todos/${id}`),
};

// Team
export const team = {
  list:        ()     => get("/team"),
  create:      (data) => post("/team", data),
  toggleLeave: (id)   => patch(`/team/${id}/leave`),
  remove:      (id)   => del(`/team/${id}`),
};

// Projects
export const projects = {
  list:         ()           => get("/projects"),
  create:       (data)       => post("/projects", data),
  updateStatus: (id, status) => patch(`/projects/${id}/status`, { status }),
  remove:       (id)         => del(`/projects/${id}`),
};

// Project Tasks (Kanban)
export const projectTasks = {
  list:   (projectId) => get(`/project-tasks?projectId=${projectId}`),
  create: (data)      => post("/project-tasks", data),
  move:   (id, status)=> patch(`/project-tasks/${id}/move`, { status }),
  remove: (id)        => del(`/project-tasks/${id}`),
};

// Documents
export const documents = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/documents${qs ? `?${qs}` : ""}`);
  },
  create:     (data)     => post("/documents", data),
  remove:     (id)       => del(`/documents/${id}`),
  upload:     (id, file) => uploadFile(`/documents/${id}/upload`, file),
  viewFile:   (id)       => downloadFile(`/documents/${id}/file`),
  removeFile: (id)       => del(`/documents/${id}/file`),
};
