import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCaseViewStore = create(
  persist(
    (set) => ({
      view: "table", // 'table' | 'grid' | 'map'
      setView: (view) => set({ view }),
    }),
    { name: "investigator-case-view" },
  ),
);
