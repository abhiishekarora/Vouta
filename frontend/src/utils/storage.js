import { useState, useEffect, useCallback, useRef } from "react";
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

const LOADERS = {
  goals:        () => api.goals.list(),
  transactions: () => api.transactions.list(),
  invoices:     () => api.invoices.list(),
  todos:        () => api.todos.list(),
  team:         () => api.team.list(),
  projects:     () => api.projects.list(),
  projectTasks: () => api.projectTasks.list(""),
  documents:    () => api.documents.list(),
};

/**
 * Fetches all console data from the API when enabled (user authenticated).
 *
 * `loading` is true only for the first load. Refetches after a save keep the current
 * screen mounted, so open modals, filters and the selected project are not reset.
 * Each resource loads independently: one failing endpoint doesn't blank the others.
 */
export function useConsoleData(enabled = true) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const loadedOnce = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!loadedOnce.current) setLoading(true);
    const keys = Object.keys(LOADERS);
    const results = await Promise.allSettled(keys.map((k) => LOADERS[k]()));

    setData((prev) => {
      const next = { ...prev };
      results.forEach((r, i) => { if (r.status === "fulfilled") next[keys[i]] = r.value; });
      return next;
    });
    // 401s are handled by useAuthState (signs out) — no message needed here
    const failed = results.find((r) => r.status === "rejected" && r.reason?.status !== 401);
    setError(failed ? failed.reason?.message || "Failed to load data." : null);
    loadedOnce.current = true;
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      fetchAll();
    } else {
      // Signed out: drop the previous user's data so the next sign-in starts clean.
      loadedOnce.current = false;
      setData(EMPTY);
      setError(null);
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
 * Any explicit 401 (from /me or any later API call) clears the session.
 * Network errors or cold starts (status 0, 502, 503) keep the existing user session active.
 */
export function useAuthState() {
  const [currentUser, setCurrentUser] = useState(() => api.userStorage.get());
  const [authLoading, setAuthLoading] = useState(() => !api.userStorage.get());

  useEffect(() => {
    const signOut = () => {
      api.token.clear();
      api.userStorage.clear();
      setCurrentUser(null);
    };
    window.addEventListener("vouta:unauthorized", signOut);

    api.auth.me()
      .then((res) => {
        if (res?.user) {
          api.userStorage.set(res.user);
          setCurrentUser(res.user);
        }
      })
      .catch(() => {
        // 401 is handled by the vouta:unauthorized listener; other errors keep the cached session
      })
      .finally(() => setAuthLoading(false));

    return () => window.removeEventListener("vouta:unauthorized", signOut);
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
