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
 * Fetches all console data from the API and provides
 * individual refresh functions per resource.
 */
export function useConsoleData() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [goals, transactions, invoices, todos, team, projects, projectTasks, documents] =
        await Promise.all([
          api.goals.list(),
          api.transactions.list(),
          api.invoices.list(),
          api.todos.list(),
          api.team.list(),
          api.projects.list(),
          api.projectTasks.list(""),   // fetch all tasks for this user
          api.documents.list(),
        ]);

      setData({ goals, transactions, invoices, todos, team, projects, projectTasks, documents });
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Optimistic local update helpers
  const updateResource = (key, updater) =>
    setData((prev) => ({ ...prev, [key]: updater(prev[key]) }));

  return { data, setData, loading, error, refetch: fetchAll, updateResource };
}

/**
 * Auth state hook — validates existing JWT on mount via /api/auth/me.
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
