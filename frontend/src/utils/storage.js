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
 */
export function useConsoleData(enabled = true) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!enabled || !api.token.get()) {
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
 * Auth state hook - validates existing JWT on mount via /api/auth/me.
 */
export function useAuthState() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = api.token.get();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    api.auth.me()
      .then((res) => setCurrentUser(res?.user ?? null))
      .catch(() => {
        api.token.clear();
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  return { currentUser, setCurrentUser, authLoading };
}
