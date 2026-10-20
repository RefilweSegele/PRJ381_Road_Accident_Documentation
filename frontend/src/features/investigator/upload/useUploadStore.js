import { create } from "zustand";

const EMPTY = { images: [], gcpData: [], flightLog: null };

export const useUploadStore = create((set, get) => ({
    images: [],
    gcpData: [],
    flightLog: null, // set when the Flight Log form is submitted

    setImages: (newImages) => set({ images: newImages }),
    setGcpData: (data) => set({ gcpData: data }),
    setFlightLog: (data) => set({ flightLog: data }),

    // Validation: flags if there are fewer than 7 GCPs
    isValidGcpCount: () => get().gcpData.length >= 7,
}));
  caseId: null,
  ...EMPTY,

  // Called when the wizard opens for a case. Clears everything if the case changed,
  // so images from one case never end up attached to another.
  ensureCase: (caseId) => {
    if (get().caseId === caseId) return;
    set({ caseId, ...EMPTY });
  },

  setImages: (images) => set({ images }),
  clearImages: () => set({ images: [] }),
  setGcpData: (gcpData) => set({ gcpData }),
  setFlightLog: (flightLog) => set({ flightLog }),

  // Advisory only: the UI warns below 7 GCPs but does not block upload.
  isValidGcpCount: () => get().gcpData.length >= 7,
}));
