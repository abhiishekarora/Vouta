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
 * Auth state hook — restores user session instantly from local storage,
 * then validates/syncs session with GET /api/auth/me in the background.
 *
 * If /api/auth/me returns an explicit 401 (invalid/expired token), the session is cleared.
 * Network errors or cold starts (status 0, 502, 503) keep the existing user session active.
 */
export function useAuthState() {
  const [currentUser, setCurrentUser] = useState(() => api.userStorage.get());
  const [authLoading, setAuthLoading] = useState(() => !api.userStorage.get());

  useEffect(() => {
    api.auth.me()
      .then((res) => {
        if (res?.user) {
          api.userStorage.set(res.user);
          setCurrentUser(res.user);
        }
      })
      .catch((err) => {
        // ONLY redirect to login if server explicitly responded with 401 Unauthorized
        if (err.status === 401) {
          api.token.clear();
          api.userStorage.clear();
          setCurrentUser(null);
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleSetUser = (u) => {
    if (u) {
      api.userStorage.set(u);
    } else {
      api.token.clear();
      api.userStorage.clear();
    }
    setCurrentUser(u);
  };

  return { currentUser, setCurrentUser: handleSetUser, authLoading };
}
