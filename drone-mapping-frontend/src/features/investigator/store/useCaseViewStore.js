import { create } from "zustand";
import { persist } from "zustand/middleware";

/*
 Tracks which view (table / grid / map) the investigator last used.
 Persisted to localStorage so it survives navigating away and coming
 back — search/filter/sort state stays in the URL (see CaseDashboard),
 this store is only for the view choice itself.
 */
export const useCaseViewStore = create(
  persist(
    (set) => ({
      view: "table", // 'table' | 'grid' | 'map'
      setView: (view) => set({ view }),
    }),
    { name: "investigator-case-view" },
  ),
);
