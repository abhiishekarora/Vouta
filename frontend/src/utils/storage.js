import { useState, useEffect, useCallback } from "react";
import * as api from "./api";

const EMPTY = {
  goals: [],
  transactions: [],
  invoices: [],
  todos: [],
  team: [],
  projects: [],
  projectTasks: [],
  documents: [],
};

/**
 * Fetches all console data from the API when enabled (user authenticated).
 *
 * Session validity is now determined entirely by the httpOnly cookie managed
 * by the browser. We no longer check localStorage for a token — if the
 * cookie is absent or expired, the first API call will receive a 401 and
 * the error handler in useAuthState will redirect to the login screen.
 */
export function useConsoleData(enabled = true) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [goals, transactions, invoices, todos, team, projects, projectTasks, documents] =
        await Promise.all([
          api.goals.list(),
          api.transactions.list(),
          api.invoices.list(),
          api.todos.list(),
          api.team.list(),
          api.projects.list(),
          api.projectTasks.list(""),
          api.documents.list(),
        ]);

      setData({ goals, transactions, invoices, todos, team, projects, projectTasks, documents });
      setError(null);
    } catch (err) {
      if (err.status !== 401) {
        setError(err.message || "Failed to load data.");
      }
      // 401s are handled by useAuthState — no action needed here
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchAll();
    }
  }, [fetchAll, enabled]);

  // Optimistic local update helpers
  const updateResource = (key, updater) =>
    setData((prev) => ({ ...prev, [key]: updater(prev[key]) }));

  return { data, setData, loading, error, refetch: fetchAll, updateResource };
}

/**
 * Auth state hook — validates session on mount via GET /api/auth/me.
 *
 * The browser automatically sends the httpOnly auth cookie on this request.
 * If the cookie is missing or expired, the server returns 401 and we show
 * the login screen. No token reading from JS storage required.
 */
export function useAuthState() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Always attempt /me — the browser sends the cookie if it exists.
    // If the cookie is absent or expired, /me returns 401 and we stay logged out.
    api.auth.me()
      .then((res) => setCurrentUser(res?.user ?? null))
      .catch(() => {
        // 401 or network error — user is not authenticated
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  return { currentUser, setCurrentUser, authLoading };
}
